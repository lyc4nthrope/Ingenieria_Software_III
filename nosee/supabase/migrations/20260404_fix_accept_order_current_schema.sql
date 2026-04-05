-- Migration: fix_accept_order_current_schema
-- Date: 2026-04-04
--
-- Corrige la RPC accept_order para el esquema vigente.
-- El proyecto actual usa orders.id INTEGER y no tiene la columna total_cost.
-- Para evitar que la aceptacion del pedido falle, la funcion usa el esquema
-- vigente y calcula compromiso_amount con la regla actual del negocio:
-- 2000 COP + 3% de total_single_store_estimate.

DROP FUNCTION IF EXISTS public.accept_order(UUID);
DROP FUNCTION IF EXISTS public.accept_order(INTEGER);

CREATE OR REPLACE FUNCTION public.accept_order(p_order_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_role_name TEXT;
  v_status TEXT;
  v_total_single_store_estimate INTEGER;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT r.name INTO v_role_name
  FROM public.users u
  JOIN public.roles r ON r.id = u.role_id
  WHERE u.id = v_caller_id;

  IF v_role_name != 'Repartidor' THEN
    RAISE EXCEPTION 'not_a_dealer';
  END IF;

  SELECT status, total_single_store_estimate
  INTO v_status, v_total_single_store_estimate
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'order_not_found';
  END IF;

  IF v_status != 'pendiente_repartidor' THEN
    RAISE EXCEPTION 'order_not_available';
  END IF;

  UPDATE public.orders
  SET
    status = 'pendiente_compromiso',
    dealer_id = v_caller_id,
    compromiso_amount = 2000 + ROUND(COALESCE(v_total_single_store_estimate, 0) * 0.03)::INTEGER
  WHERE id = p_order_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_order(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_order(INTEGER) TO authenticated;
