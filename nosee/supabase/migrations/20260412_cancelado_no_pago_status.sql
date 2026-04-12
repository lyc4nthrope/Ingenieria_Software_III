-- Migration: cancelado_no_pago_status
-- Date: 2026-04-12
--
-- Cambia la RPC cancel_order_no_payment para setear el estado a
-- 'cancelado_no_pago' en lugar de 'cancelado', permitiendo al cliente
-- distinguir esta cancelación de las demás y hacer un contrareporte.

CREATE OR REPLACE FUNCTION public.cancel_order_no_payment(p_order_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_dealer_id UUID;
  v_status    TEXT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT dealer_id, status INTO v_dealer_id, v_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_dealer_id IS DISTINCT FROM v_caller_id THEN
    RAISE EXCEPTION 'not_your_order';
  END IF;

  IF v_status != 'llegando' THEN
    RAISE EXCEPTION 'invalid_status: expected llegando, got %', v_status;
  END IF;

  UPDATE public.orders
  SET status = 'cancelado_no_pago'
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_no_payment(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order_no_payment(INTEGER) TO authenticated;
