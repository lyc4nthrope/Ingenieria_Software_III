-- Migration: add_checked_items
-- Date: 2026-04-11
--
-- Agrega la columna checked_items al pedido para que el repartidor pueda
-- marcar los productos comprados y el cliente vea el progreso en tiempo real.
--
-- Formato del JSONB: { "si-pi": true }
-- Donde si = storeIndex, pi = productIndex dentro de orders.stores[si].products[pi].

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checked_items JSONB NOT NULL DEFAULT '{}';
