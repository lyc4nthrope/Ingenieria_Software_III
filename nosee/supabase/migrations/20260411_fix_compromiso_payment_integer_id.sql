-- Migration: fix_compromiso_payment_integer_id
-- Date: 2026-04-11
--
-- Corrige confirm_compromiso_payment y advance_order_status para usar
-- orders.id INTEGER en lugar de UUID, consistente con el esquema real del proyecto
-- (documentado en 20260404_fix_accept_order_current_schema.sql).
--
-- Raíz del bug: el pago de compromiso era aprobado por MercadoPago (status: approved)
-- pero el RPC fallaba con "invalid input syntax for type uuid: 59" porque la función
-- todavía declaraba p_order_id como UUID.

-- ═══════════════════════════════════════════════════════════════════════════════
-- confirm_compromiso_payment
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.confirm_compromiso_payment(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.confirm_compromiso_payment(
  p_order_id    INTEGER,
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
  FROM public.orders
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

  UPDATE public.orders
  SET
    status                = 'comprando',
    compromiso_paid_at    = now(),
    compromiso_payment_id = p_payment_id
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_compromiso_payment(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_compromiso_payment(INTEGER, TEXT) TO authenticated;


-- ═══════════════════════════════════════════════════════════════════════════════
-- advance_order_status
-- Mismo bug latente: declaraba p_order_id UUID.
-- ═══════════════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.advance_order_status(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.advance_order_status(p_order_id INTEGER, p_new_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id  UUID := auth.uid();
  v_dealer_id  UUID;
  v_cur_status TEXT;
  v_from_seq   TEXT[] := ARRAY['comprando', 'en_camino', 'llegando'];
  v_to_seq     TEXT[] := ARRAY['en_camino', 'llegando',  'entregado'];
  v_step       INT;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT dealer_id, status INTO v_dealer_id, v_cur_status
  FROM public.orders
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

  UPDATE public.orders
  SET status = p_new_status
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.advance_order_status(INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_order_status(INTEGER, TEXT) TO authenticated;
