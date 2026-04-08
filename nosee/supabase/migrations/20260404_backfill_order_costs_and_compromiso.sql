-- Migration: backfill_order_costs_and_compromiso
-- Date: 2026-04-04
--
-- Normaliza costos en pedidos ya existentes segun las reglas actuales:
--   total_estimated = total_single_store_estimate + delivery_fee
--   compromiso_amount = 2000 COP + 3% de total_single_store_estimate

UPDATE public.orders
SET
  total_estimated = COALESCE(total_single_store_estimate, 0) + COALESCE(delivery_fee, 0),
  compromiso_amount = 2000 + ROUND(COALESCE(total_single_store_estimate, 0) * 0.03)::INTEGER,
  service_fee = 2000 + ROUND(COALESCE(total_single_store_estimate, 0) * 0.03)::INTEGER
WHERE
  COALESCE(total_estimated, -1) IS DISTINCT FROM COALESCE(total_single_store_estimate, 0) + COALESCE(delivery_fee, 0)
  OR COALESCE(compromiso_amount, -1) IS DISTINCT FROM 2000 + ROUND(COALESCE(total_single_store_estimate, 0) * 0.03)::INTEGER
  OR COALESCE(service_fee, -1) IS DISTINCT FROM 2000 + ROUND(COALESCE(total_single_store_estimate, 0) * 0.03)::INTEGER;
