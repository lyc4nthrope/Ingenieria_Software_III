-- Migration: orders y dealer_locations — fundamento del Proceso 4
-- Date: 2026-03-19
--
-- Crea las dos tablas que conectan el Proceso 3 (pedido confirmado por el usuario)
-- con el Proceso 4 (repartidor que acepta, compra y entrega).
--
-- DISEÑO GENERAL:
--   orders            — el pedido confirmado. Es la fuente de verdad.
--   dealer_locations  — ubicación GPS del repartidor (upsert por dealer_id).
--                       Una fila por repartidor, se sobreescribe ~cada 15s.
--
-- FLUJO DE ESTADOS DE UN PEDIDO (campo `status`):
--
--   [usuario elige domicilio]
--   pendiente_repartidor → aceptado → comprando → en_camino → llegando → entregado
--                                                                         ↑
--                                                              (pago procesado aquí)
--   [usuario elige "voy yo"]
--   usuario_se_encarga   (estado terminal, no involucra al repartidor)
--
--   [cancelación]
--   cancelado            (puede ocurrir antes de 'comprando')
--
-- SEGURIDAD:
--   Las transiciones de estado las manejan funciones SECURITY DEFINER para:
--     1. Evitar race conditions (FOR UPDATE bloquea la fila).
--     2. Validar reglas de negocio (solo el repartidor asignado puede avanzar su pedido).
--     3. No exponer UPDATE directo desde el cliente, que sería inseguro con RLS.


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. TABLA: orders
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Actores
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dealer_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,

  -- ID legible generado en el cliente (ej: "NSE-M0ABC123").
  -- Se muestra al usuario en la UI. No es el PK real.
  local_id         TEXT        NOT NULL,

  -- Estado del pedido. CHECK garantiza que nunca haya un valor inválido en DB.
  status           TEXT        NOT NULL DEFAULT 'pendiente_repartidor'
                               CHECK (status IN (
                                 'pendiente_repartidor',  -- esperando que un repartidor acepte
                                 'aceptado',              -- repartidor asignado, en camino a tienda
                                 'comprando',             -- repartidor comprando en tiendas
                                 'en_camino',             -- repartidor en camino a entregar
                                 'llegando',              -- repartidor llegó a la puerta
                                 'entregado',             -- entregado y pagado exitosamente
                                 'cancelado',             -- cancelado
                                 'usuario_se_encarga'     -- el usuario eligió "voy yo"
                               )),

  -- Modo de entrega: true = domicilio (Proceso 4), false = voy yo
  delivery_mode    BOOLEAN     NOT NULL DEFAULT false,

  -- Dirección y coordenadas de entrega (ingresadas por el usuario en Proceso 3).
  -- Pueden ser NULL si el usuario no ingresó una dirección manual ni usó GPS.
  delivery_address TEXT,
  delivery_coords  JSONB,   -- { "lat": -4.123, "lng": -75.456 }

  -- Resultado de la optimización: tiendas y productos asignados.
  -- JSONB porque la estructura varía (múltiples tiendas, múltiples productos por tienda).
  stores           JSONB       NOT NULL DEFAULT '[]',
  items            JSONB       NOT NULL DEFAULT '[]',

  -- Costos en COP. Usamos INTEGER para evitar problemas de punto flotante con dinero.
  total_cost       INTEGER     NOT NULL DEFAULT 0,
  delivery_fee     INTEGER     NOT NULL DEFAULT 0,
  savings          INTEGER     NOT NULL DEFAULT 0,

  -- Estrategia de optimización usada en Proceso 3.
  strategy         TEXT        CHECK (strategy IN ('price', 'fewest_stores', 'balanced')),

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Función genérica para updated_at automático ───────────────────────────────
-- OR REPLACE: si ya existe por otra tabla, la sobrescribe (idempotente).
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: cada UPDATE en orders actualiza automáticamente updated_at.
-- Esto evita que el cliente tenga que pasar updated_at manualmente.
CREATE TRIGGER tr_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ── Índices ───────────────────────────────────────────────────────────────────
-- El usuario consulta sus pedidos ordenados por fecha (más recientes primero).
CREATE INDEX IF NOT EXISTS idx_orders_user_id
  ON public.orders(user_id, created_at DESC);

-- El repartidor consulta pedidos disponibles (filtra por status='pendiente_repartidor').
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON public.orders(status);

-- El repartidor consulta sus pedidos asignados (filtra por dealer_id = su ID).
CREATE INDEX IF NOT EXISTS idx_orders_dealer_id
  ON public.orders(dealer_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- El usuario solo puede insertar pedidos a su nombre.
CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- El usuario puede leer sus propios pedidos.
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- El repartidor puede leer:
--   a) Pedidos disponibles (status='pendiente_repartidor') para decidir si aceptar.
--   b) Pedidos que ya tiene asignados (dealer_id = su ID).
-- Separamos en dos políticas para que sean OR independientes (más legible).
CREATE POLICY "orders_select_available_for_dealer" ON public.orders
  FOR SELECT TO authenticated
  USING (
    status = 'pendiente_repartidor'
    AND EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'Repartidor'
    )
  );

CREATE POLICY "orders_select_assigned_to_dealer" ON public.orders
  FOR SELECT TO authenticated
  USING (
    dealer_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'Repartidor'
    )
  );

-- NOTA: No hay política UPDATE directa para el cliente.
-- Los cambios de estado se hacen a través de funciones SECURITY DEFINER
-- definidas más abajo, que validan internamente las reglas de negocio.


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. FUNCIÓN: accept_order
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Por qué SECURITY DEFINER en vez de UPDATE directo con RLS:
--   Sin esta función, sería posible que dos repartidores acepten el mismo pedido
--   simultáneamente (race condition). El FOR UPDATE bloquea la fila durante la
--   transacción, garantizando que solo uno pueda cambiar el estado a 'aceptado'.
--   Con RLS puro no tenemos control de transacciones desde el cliente.

CREATE OR REPLACE FUNCTION accept_order(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_role_name TEXT;
  v_status    TEXT;
BEGIN
  -- Verificar sesión activa
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  -- Verificar que el llamador tiene rol Repartidor
  SELECT r.name INTO v_role_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = v_caller_id;

  IF v_role_name != 'Repartidor' THEN
    RAISE EXCEPTION 'not_a_dealer';
  END IF;

  -- Leer el pedido con FOR UPDATE: bloquea la fila hasta que la transacción termine.
  -- Esto evita que otro repartidor acepte el mismo pedido al mismo tiempo.
  SELECT status INTO v_status
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Verificar que el pedido sigue disponible
  IF v_status != 'pendiente_repartidor' THEN
    RAISE EXCEPTION 'order_not_available';
  END IF;

  UPDATE orders
  SET status = 'aceptado', dealer_id = v_caller_id
  WHERE id = p_order_id;
END;
$$;

-- Solo usuarios autenticados pueden ejecutar esta función.
REVOKE ALL ON FUNCTION accept_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_order(UUID) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. FUNCIÓN: advance_order_status
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- El repartidor llama a esta función para avanzar al siguiente estado.
-- Valida que la transición sea secuencial (no se puede saltar pasos).
-- Solo el repartidor asignado al pedido puede llamarla.

CREATE OR REPLACE FUNCTION advance_order_status(p_order_id UUID, p_new_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  UUID := auth.uid();
  v_dealer_id  UUID;
  v_cur_status TEXT;
  -- Transiciones válidas en orden secuencial:
  --   aceptado → comprando → en_camino → llegando → entregado
  v_from_seq   TEXT[] := ARRAY['aceptado',  'comprando', 'en_camino', 'llegando'];
  v_to_seq     TEXT[] := ARRAY['comprando', 'en_camino', 'llegando',  'entregado'];
  v_step       INT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT dealer_id, status INTO v_dealer_id, v_cur_status
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  -- Solo el repartidor asignado puede avanzar el estado
  IF v_dealer_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'not_your_order';
  END IF;

  -- Buscar el paso que corresponde al estado actual
  v_step := array_position(v_from_seq, v_cur_status);

  -- Verificar que la transición es la siguiente en la secuencia
  IF v_step IS NULL OR v_to_seq[v_step] != p_new_status THEN
    RAISE EXCEPTION 'invalid_transition: % -> %', v_cur_status, p_new_status;
  END IF;

  UPDATE orders
  SET status = p_new_status
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION advance_order_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION advance_order_status(UUID, TEXT) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. TABLA: dealer_locations
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Una fila por repartidor (UNIQUE en dealer_id).
-- Se actualiza con upsert cada ~15 segundos mientras el repartidor tiene
-- un pedido activo. El usuario con pedido activo la lee via Supabase Realtime.

CREATE TABLE IF NOT EXISTS public.dealer_locations (
  id           UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id    UUID             UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lat          DOUBLE PRECISION NOT NULL,
  lng          DOUBLE PRECISION NOT NULL,
  -- is_available: false cuando el repartidor está fuera de servicio
  is_available BOOLEAN          NOT NULL DEFAULT true,
  updated_at   TIMESTAMPTZ      NOT NULL DEFAULT now()
);

CREATE TRIGGER tr_dealer_locations_updated_at
  BEFORE UPDATE ON public.dealer_locations
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

ALTER TABLE public.dealer_locations ENABLE ROW LEVEL SECURITY;

-- El repartidor puede insertar, actualizar y leer su propia fila.
CREATE POLICY "dealer_locations_own" ON public.dealer_locations
  FOR ALL TO authenticated
  USING (dealer_id = auth.uid())
  WITH CHECK (dealer_id = auth.uid());

-- El usuario puede leer la ubicación del repartidor que tiene su pedido activo.
-- "Activo" = el pedido no está en estado terminal (entregado, cancelado, usuario_se_encarga).
CREATE POLICY "dealer_locations_read_for_user" ON public.dealer_locations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.dealer_id = dealer_locations.dealer_id
        AND o.user_id = auth.uid()
        AND o.status NOT IN ('entregado', 'cancelado', 'usuario_se_encarga')
    )
  );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. REALTIME
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Habilitar Supabase Realtime en ambas tablas para que el frontend pueda
-- suscribirse a cambios sin hacer polling.
--   - orders: el usuario ve en tiempo real cuando el repartidor cambia el estado.
--   - dealer_locations: el usuario ve el GPS del repartidor moverse en el mapa.

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dealer_locations;
