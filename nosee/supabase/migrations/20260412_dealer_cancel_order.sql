-- Migration: dealer_cancel_order
-- Date: 2026-04-12
--
-- 1. Agrega campos is_priority, dealer_cancel_type y dealer_cancel_reason a orders.
-- 2. RPC dealer_cancel_order: repartidor cancela su pedido activo con justificación,
--    el pedido vuelve al pool como prioritario y el cliente lo ve vía Realtime.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. COLUMNAS EN orders
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_priority          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dealer_cancel_type   TEXT,    -- 'minor' | 'emergency'
  ADD COLUMN IF NOT EXISTS dealer_cancel_reason TEXT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RPC dealer_cancel_order
-- Solo el repartidor asignado puede llamarlo. No aplica en llegando/entregado.
-- Limpia dealer_id para que el pedido vuelva al pool y lo marca como prioritario.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.dealer_cancel_order(
  p_order_id     INTEGER,
  p_cancel_type  TEXT,
  p_cancel_reason TEXT DEFAULT NULL
)
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

  -- No se puede cancelar si ya llegó, fue entregado o ya está cancelado
  IF v_status IN ('llegando', 'entregado', 'cancelado', 'cancelado_no_pago') THEN
    RAISE EXCEPTION 'invalid_status: cannot cancel from %', v_status;
  END IF;

  UPDATE public.orders
  SET
    status               = 'pendiente_repartidor',
    dealer_id            = NULL,
    is_priority          = true,
    dealer_cancel_type   = p_cancel_type,
    dealer_cancel_reason = p_cancel_reason
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.dealer_cancel_order(INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dealer_cancel_order(INTEGER, TEXT, TEXT) TO authenticated;
