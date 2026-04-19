-- Migration: dealer_info_and_change
-- Date: 2026-04-12
--
-- 1. Agrega phone_number a users para que el repartidor pueda exponer su contacto.
-- 2. Actualiza verify_delivery_pin para aceptar tanto 'llegando' como 'comprobante_subido'.
-- 3. Nueva RPC request_dealer_change: el usuario desasigna al repartidor antes de que empiece a comprar.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. COLUMNA phone_number EN users
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. verify_delivery_pin — acepta llegando Y comprobante_subido
-- ═══════════════════════════════════════════════════════════════════════════════

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

  -- Acepta verificación tanto en 'llegando' (pago no procesado aún)
  -- como en 'comprobante_subido' (cliente ya pagó por pasarela)
  IF v_status NOT IN ('llegando', 'comprobante_subido') THEN
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
-- 3. request_dealer_change — el usuario puede cambiar de repartidor
--    Solo disponible en pendiente_compromiso (antes de que salga a comprar).
--    Limpia dealer_id para que el pedido vuelva al pool.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.request_dealer_change(p_order_id INTEGER)
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

  -- Solo se puede cambiar antes de que el repartidor empiece a comprar
  IF v_status NOT IN ('pendiente_compromiso', 'aceptado') THEN
    RAISE EXCEPTION 'invalid_status: cannot change dealer from %', v_status;
  END IF;

  UPDATE public.orders
  SET
    status    = 'pendiente_repartidor',
    dealer_id = NULL
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_dealer_change(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_dealer_change(INTEGER) TO authenticated;
