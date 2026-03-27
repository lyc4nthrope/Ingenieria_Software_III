-- ─────────────────────────────────────────────────────────────────────────────
-- fix: RPC submit_payment y cancel_order para el usuario
--
-- Problema: submitPaymentReceipt hacía un UPDATE directo a orders, pero la
-- RLS orders_update_payment_by_user exige que status = 'pendiente_pago' para
-- que el UPDATE sea permitido. Como el status estaba en 'llegando', el UPDATE
-- fallaba silenciosamente (0 rows). El flujo de pago quedaba completamente roto.
--
-- Solución: dos funciones SECURITY DEFINER que el usuario puede invocar y que
-- internamente hacen el UPDATE sin restricciones de RLS:
--   - submit_payment: transiciona llegando → pendiente_pago + guarda método/comprobante
--   - cancel_order:   transiciona pendiente_repartidor|aceptado → cancelado
-- ─────────────────────────────────────────────────────────────────────────────

-- ── submit_payment ────────────────────────────────────────────────────────────
-- Llamado por el usuario cuando confirma el pago (efectivo o transferencia).
-- Valida que el pedido le pertenece y está en 'llegando', luego avanza a
-- 'pendiente_pago' y guarda el método de pago y la URL del comprobante.
CREATE OR REPLACE FUNCTION public.submit_payment(
  p_order_id    INTEGER,
  p_method      TEXT,            -- 'efectivo' | 'transferencia'
  p_receipt_url TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM orders
    WHERE id       = p_order_id
      AND user_id  = auth.uid()
      AND status   = 'llegando'
  ) THEN
    RAISE EXCEPTION 'submit_payment: pedido no encontrado o no está en estado llegando';
  END IF;

  UPDATE orders SET
    status              = 'pendiente_pago',
    payment_method      = p_method,
    payment_receipt_url = p_receipt_url
  WHERE id = p_order_id;
END;
$$;

-- ── cancel_order ──────────────────────────────────────────────────────────────
-- Llamado por el usuario para cancelar su pedido de domicilio.
-- Solo permitido cuando el pedido está en 'pendiente_repartidor' o 'aceptado'.
-- Limpia dealer_id para liberar al repartidor (si ya había uno asignado).
CREATE OR REPLACE FUNCTION public.cancel_order(p_order_id INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM orders
    WHERE id       = p_order_id
      AND user_id  = auth.uid()
      AND status   IN ('pendiente_repartidor', 'aceptado')
  ) THEN
    RAISE EXCEPTION 'cancel_order: pedido no encontrado o no se puede cancelar en este estado';
  END IF;

  UPDATE orders SET
    status    = 'cancelado',
    dealer_id = NULL
  WHERE id = p_order_id;
END;
$$;
