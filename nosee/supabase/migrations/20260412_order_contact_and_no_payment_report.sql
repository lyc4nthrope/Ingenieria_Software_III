-- Migration: order_contact_and_no_payment_report
-- Date: 2026-04-12
--
-- 1. Agrega campos de contacto del cliente a orders (nombre, teléfono,
--    apartamento, instrucciones) para que el repartidor los vea durante la entrega.
-- 2. Agrega RPC cancel_order_no_payment: permite al repartidor cancelar un pedido
--    en estado 'llegando' cuando el cliente no pagó. Separado de advance_order_status
--    porque cancelado no es parte del flujo progresivo normal.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. COLUMNAS DE CONTACTO EN orders
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_name         TEXT,
  ADD COLUMN IF NOT EXISTS delivery_phone        TEXT,
  ADD COLUMN IF NOT EXISTS delivery_apartment    TEXT,
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RPC cancel_order_no_payment
-- Solo el repartidor asignado puede llamarlo, y solo en estado 'llegando'.
-- El frontend registra el reporte en la tabla reports por separado.
-- ═══════════════════════════════════════════════════════════════════════════════

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
  SET status = 'cancelado'
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_no_payment(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_order_no_payment(INTEGER) TO authenticated;
