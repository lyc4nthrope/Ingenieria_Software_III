-- Migration: payment support en orders — flujo de pago sin pasarela externa
-- Date: 2026-03-26
--
-- Agrega a la tabla orders:
--   1. Estado 'pendiente_pago' entre 'llegando' y 'entregado'
--   2. Columnas payment_method y payment_receipt_url
--   3. Actualiza advance_order_status para: llegando → pendiente_pago
--   4. Nueva función confirm_payment: pendiente_pago → entregado (solo dealer)
--   5. Política RLS para que el usuario actualice su método de pago
--
-- FLUJO DE PAGO:
--   Repartidor llega → 'llegando'
--   Repartidor click "Solicitar pago" → advance_order_status → 'pendiente_pago'
--   Usuario ve pantalla de pago con datos bancarios del repartidor
--   Usuario elige método:
--     a) Transferencia → sube foto del comprobante → payment_receipt_url se guarda
--     b) Efectivo → payment_method='efectivo', sin receipt
--   Repartidor ve el comprobante (o la confirmación de efectivo)
--   Repartidor click "Confirmar pago" → confirm_payment → 'entregado'


-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. Ampliar el CHECK constraint de status para incluir 'pendiente_pago'
-- ═══════════════════════════════════════════════════════════════════════════════
-- Primero eliminamos el constraint viejo, luego lo recreamos con el nuevo valor.

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
  CHECK (status IN (
    'pendiente_repartidor',
    'aceptado',
    'comprando',
    'en_camino',
    'llegando',
    'pendiente_pago',   -- nuevo: repartidor llegó, esperando que usuario pague
    'entregado',
    'cancelado',
    'usuario_se_encarga'
  ));


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. Columnas de pago en orders
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method      TEXT CHECK (payment_method IN ('transferencia', 'efectivo')),
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT;  -- URL Cloudinary del comprobante (solo transferencia)


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. Actualizar advance_order_status: llegando → pendiente_pago
-- ═══════════════════════════════════════════════════════════════════════════════
-- Reemplazamos la función para cambiar la última transición de la secuencia:
--   Antes: llegando → entregado
--   Ahora: llegando → pendiente_pago
-- 'entregado' ahora lo maneja confirm_payment (función separada).

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
  v_from_seq   TEXT[] := ARRAY['aceptado',  'comprando', 'en_camino', 'llegando'];
  v_to_seq     TEXT[] := ARRAY['comprando', 'en_camino', 'llegando',  'pendiente_pago'];
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


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. Nueva función: confirm_payment — repartidor confirma recepción de pago
-- ═══════════════════════════════════════════════════════════════════════════════
-- Solo el repartidor asignado puede llamarla.
-- Solo funciona cuando el pedido está en 'pendiente_pago'.
-- Avanza directamente a 'entregado'.

CREATE OR REPLACE FUNCTION confirm_payment(p_order_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  UUID := auth.uid();
  v_dealer_id  UUID;
  v_cur_status TEXT;
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

  IF v_cur_status != 'pendiente_pago' THEN
    RAISE EXCEPTION 'invalid_status_for_payment: %', v_cur_status;
  END IF;

  UPDATE orders
  SET status = 'entregado'
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION confirm_payment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirm_payment(UUID) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. RLS: el usuario puede actualizar payment_method y payment_receipt_url
--    de sus propios pedidos cuando están en 'pendiente_pago'
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE POLICY "orders_update_payment_by_user" ON public.orders
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND status = 'pendiente_pago')
  WITH CHECK (user_id = auth.uid());


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. Realtime: aseguramos que orders tenga REPLICA IDENTITY FULL
--    (necesario para filtros de columna en suscripciones Realtime)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders REPLICA IDENTITY FULL;
