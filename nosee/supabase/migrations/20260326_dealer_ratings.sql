-- Migration: dealer_ratings — calificaciones al repartidor post-entrega
-- Date: 2026-03-26
--
-- Al finalizar un pedido (status='entregado'), el usuario puede calificar
-- al repartidor con 1-5 estrellas y un comentario opcional.
-- UNIQUE(order_id) garantiza una sola calificación por pedido.

CREATE TABLE IF NOT EXISTS public.dealer_ratings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  dealer_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stars       INTEGER     NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice: calcular promedio de un repartidor por dealer_id
CREATE INDEX IF NOT EXISTS idx_dealer_ratings_dealer_id
  ON public.dealer_ratings(dealer_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
ALTER TABLE public.dealer_ratings ENABLE ROW LEVEL SECURITY;

-- El usuario solo puede insertar una calificación de su propio pedido
CREATE POLICY "dealer_ratings_insert_own" ON public.dealer_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = dealer_ratings.order_id
        AND o.user_id = auth.uid()
        AND o.status = 'entregado'
    )
  );

-- El usuario puede leer calificaciones que él hizo
CREATE POLICY "dealer_ratings_select_own_user" ON public.dealer_ratings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- El repartidor puede leer las calificaciones que le hicieron
CREATE POLICY "dealer_ratings_select_dealer" ON public.dealer_ratings
  FOR SELECT TO authenticated
  USING (dealer_id = auth.uid());
