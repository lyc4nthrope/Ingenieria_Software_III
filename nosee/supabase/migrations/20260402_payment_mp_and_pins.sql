-- Migration: columnas faltantes en orders + RPCs de pago y seguridad
-- Date: 2026-04-02
--
-- AGREGA:
--   1. Columnas que el JS ya usaba pero no estaban en el schema:
--      payment_receipt_url, delivery_pin, confirmed_at
--
--   2. RPC confirm_order_payment  — pendiente_pago → pendiente_repartidor
--      Llamada por la Edge Function process-mp-payment tras aprobar el pago.
--      Usa auth.uid() para validar que solo el dueño del pedido puede confirmar.
--
--   3. RPC verify_delivery_pin    — repartidor ingresa PIN al entregar → entregado
--      Solo el repartidor asignado puede llamarla; retorna boolean.
--
--   4. RPC cancel_order_by_user   — usuario cancela desde estados pre-entrega
--      Bloquea cancelación en estados terminales.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. COLUMNAS FALTANTES EN orders
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS delivery_pin        TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at        TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RPC: confirm_order_payment
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Cambia el pedido de 'pendiente_pago' a 'pendiente_repartidor'.
-- Solo el dueño del pedido puede llamarla (auth.uid() == user_id).
-- FOR UPDATE: evita doble-confirmación si el cliente hace doble click.

CREATE OR REPLACE FUNCTION public.confirm_order_payment(p_order_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_owner_id  UUID;
  v_status    TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT user_id, status
  INTO   v_owner_id, v_status
  FROM   orders
  WHERE  id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_owner_id != v_caller_id THEN
    RAISE EXCEPTION 'not_your_order';
  END IF;

  IF v_status != 'pendiente_pago' THEN
    RAISE EXCEPTION 'invalid_status: %', v_status;
  END IF;

  UPDATE orders
  SET status = 'pendiente_repartidor'
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_order_payment(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_order_payment(INTEGER) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RPC: verify_delivery_pin
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- El repartidor ingresa el PIN de 4 dígitos que le muestra el cliente.
-- Si coincide y el pedido está en 'llegando' → avanza a 'entregado' y retorna true.
-- Si el PIN es incorrecto → retorna false sin modificar el estado.
-- Solo el repartidor asignado al pedido puede llamarla.

CREATE OR REPLACE FUNCTION public.verify_delivery_pin(p_order_id INTEGER, p_pin TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_dealer_id UUID;
  v_stored_pin TEXT;
  v_status     TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT dealer_id, delivery_pin, status
  INTO   v_dealer_id, v_stored_pin, v_status
  FROM   orders
  WHERE  id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_dealer_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'not_your_order';
  END IF;

  IF v_status != 'llegando' THEN
    RAISE EXCEPTION 'invalid_status: %', v_status;
  END IF;

  IF v_stored_pin IS DISTINCT FROM p_pin THEN
    RETURN false;
  END IF;

  UPDATE orders
  SET status = 'entregado'
  WHERE id = p_order_id;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_delivery_pin(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_delivery_pin(INTEGER, TEXT) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. RPC: cancel_order_by_user
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- El usuario cancela su propio pedido.
-- Permitido en cualquier estado excepto los terminales:
--   entregado, cancelado, usuario_se_encarga
-- FOR UPDATE: evita race condition si el repartidor acepta al mismo tiempo.

CREATE OR REPLACE FUNCTION public.cancel_order_by_user(p_order_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_owner_id  UUID;
  v_status    TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT user_id, status
  INTO   v_owner_id, v_status
  FROM   orders
  WHERE  id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_owner_id != v_caller_id THEN
    RAISE EXCEPTION 'not_your_order';
  END IF;

  IF v_status IN ('entregado', 'cancelado', 'usuario_se_encarga') THEN
    RAISE EXCEPTION 'cannot_cancel_terminal_state: %', v_status;
  END IF;

  UPDATE orders
  SET status = 'cancelado'
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_by_user(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order_by_user(INTEGER) TO authenticated;
