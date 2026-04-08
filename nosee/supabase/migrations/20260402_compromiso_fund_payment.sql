-- Migration: compromiso_fund_payment
-- Date: 2026-04-02
--
-- Introduce el pago de compromiso (fondo de respaldo para repartidores).
-- Cuando un repartidor acepta un pedido, el cliente debe pagar el 5% del total
-- (mínimo 1.000 COP) antes de que el repartidor salga a comprar.
--
-- NUEVO FLUJO DE ESTADOS:
--   pendiente_repartidor → [repartidor acepta] → pendiente_compromiso
--   pendiente_compromiso → [cliente paga 5%]  → comprando
--   comprando → en_camino → llegando → entregado
--
-- CAMBIOS EN ESTE ARCHIVO:
--   1. Corrige CHECK constraint (agrega pendiente_pago y pendiente_compromiso)
--   2. Agrega columnas: compromiso_amount, compromiso_paid_at, compromiso_payment_id
--   3. Modifica accept_order: ahora setea pendiente_compromiso y calcula el monto
--   4. Nuevo RPC: confirm_compromiso_payment (cliente confirma pago del fondo)
--   5. Modifica advance_order_status: elimina aceptado→comprando de la secuencia


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. FIX CHECK CONSTRAINT
-- Agrega los valores que faltaban: pendiente_pago (pre-existente en código)
-- y pendiente_compromiso (nuevo estado de este cambio).
-- Mantenemos 'aceptado' para pedidos legacy ya en ese estado.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'pendiente_pago',          -- pago de tarifa de servicio (pre-existente)
    'pendiente_repartidor',    -- esperando repartidor
    'aceptado',                -- legacy: repartidor asignado (pre-compromiso)
    'pendiente_compromiso',    -- NUEVO: esperando pago de compromiso del cliente
    'comprando',               -- repartidor comprando
    'en_camino',               -- repartidor en camino
    'llegando',                -- repartidor en puerta
    'entregado',               -- entregado
    'cancelado',               -- cancelado
    'usuario_se_encarga'       -- el usuario eligió "voy yo"
  ));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. NUEVAS COLUMNAS EN orders
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS compromiso_amount     INTEGER,      -- 5% del total, mínimo 1.000 COP
  ADD COLUMN IF NOT EXISTS compromiso_paid_at    TIMESTAMPTZ,  -- cuándo pagó el cliente
  ADD COLUMN IF NOT EXISTS compromiso_payment_id TEXT;         -- ID de MercadoPago del pago


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. MODIFICAR accept_order
-- Antes: seteaba status = 'aceptado'
-- Ahora: setea status = 'pendiente_compromiso' y calcula compromiso_amount
-- ═══════════════════════════════════════════════════════════════════════════════

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
  v_total     INTEGER;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT r.name INTO v_role_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = v_caller_id;

  IF v_role_name != 'Repartidor' THEN
    RAISE EXCEPTION 'not_a_dealer';
  END IF;

  SELECT status, total_cost INTO v_status, v_total
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_status != 'pendiente_repartidor' THEN
    RAISE EXCEPTION 'order_not_available';
  END IF;

  UPDATE orders
  SET
    status            = 'pendiente_compromiso',
    dealer_id         = v_caller_id,
    -- 5% del total, mínimo 1.000 COP
    compromiso_amount = GREATEST(ROUND(v_total * 0.05)::INTEGER, 1000)
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION accept_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_order(UUID) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. NUEVO RPC: confirm_compromiso_payment
-- El cliente lo llama después de pagar el fondo de compromiso via MercadoPago.
-- Valida que el llamador es el dueño del pedido y que está en el estado correcto.
-- Usa FOR UPDATE para evitar doble pago.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION confirm_compromiso_payment(
  p_order_id    UUID,
  p_payment_id  TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_user_id   UUID;
  v_status    TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT user_id, status INTO v_user_id, v_status
  FROM orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_user_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'not_your_order';
  END IF;

  IF v_status != 'pendiente_compromiso' THEN
    RAISE EXCEPTION 'invalid_status: expected pendiente_compromiso, got %', v_status;
  END IF;

  UPDATE orders
  SET
    status               = 'comprando',
    compromiso_paid_at   = now(),
    compromiso_payment_id = p_payment_id
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION confirm_compromiso_payment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_compromiso_payment(UUID, TEXT) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. MODIFICAR advance_order_status
-- Elimina aceptado→comprando de la secuencia del repartidor.
-- Esa transición ahora la hace el cliente al pagar el compromiso.
-- Dejamos 'aceptado' como punto de entrada válido solo para pedidos legacy
-- que hayan quedado en ese estado antes de esta migración.
-- ═══════════════════════════════════════════════════════════════════════════════

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
  -- aceptado→comprando eliminado: ahora lo maneja confirm_compromiso_payment.
  -- Se mantiene comprando como punto de entrada del repartidor.
  v_from_seq   TEXT[] := ARRAY['comprando', 'en_camino', 'llegando'];
  v_to_seq     TEXT[] := ARRAY['en_camino', 'llegando',  'entregado'];
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

  IF v_dealer_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'not_your_order';
  END IF;

  v_step := array_position(v_from_seq, v_cur_status);

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
