-- Migration: add_service_fee
-- Date: 2026-04-03
--
-- Separa la tarifa de servicio (plataforma) del costo de domicilio (repartidor).
--
-- ANTES: delivery_fee se cobraba como "tarifa de servicio" en pendiente_pago.
-- AHORA: service_fee = 2.000 COP + 3% del total de productos → cobro de plataforma.
--        delivery_fee sigue siendo el costo del domicilio que se le paga al repartidor
--        al momento de la entrega (método efectivo/transferencia/pasarela).

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS service_fee INTEGER NOT NULL DEFAULT 0;
