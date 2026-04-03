-- Add payment_method column to orders table
-- Tracks whether the client will pay in cash (efectivo) or bank transfer (transferencia)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'transferencia'
  CHECK (payment_method IN ('efectivo', 'transferencia'));
