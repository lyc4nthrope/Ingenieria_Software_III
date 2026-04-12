-- Migration: add_missing_statuses
-- Date: 2026-04-12
--
-- Agrega 'comprobante_subido' y 'cancelado_no_pago' al CHECK CONSTRAINT de orders.status.
-- 'comprobante_subido' : el usuario pagó el total final; el repartidor confirma con PIN.
-- 'cancelado_no_pago'  : el repartidor reportó que el usuario no pagó en efectivo.

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'pendiente_pago',          -- pago de tarifa de servicio
    'pendiente_repartidor',    -- esperando repartidor
    'aceptado',                -- legacy: repartidor asignado
    'pendiente_compromiso',    -- esperando pago de compromiso del repartidor
    'comprando',               -- repartidor comprando
    'en_camino',               -- repartidor en camino
    'llegando',                -- repartidor en puerta
    'comprobante_subido',      -- usuario pagó total final; pendiente confirmación PIN
    'entregado',               -- entregado
    'cancelado',               -- cancelado
    'cancelado_no_pago',       -- repartidor reportó no pago
    'usuario_se_encarga'       -- el usuario eligió "voy yo"
  ));
