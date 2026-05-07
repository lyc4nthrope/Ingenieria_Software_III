-- Migration: RPC create_publication
-- Date: 2026-05-06
--
-- Consolida las 4+ llamadas Supabase client-side de createPublication en 1 operación atómica:
--   getUser() → verify user active/verified → check duplicate 24h → fetch reputation → INSERT
--
-- La moderación de texto e imagen queda en el cliente (requiere librerías JS).
-- El RPC recibe datos que ya pasaron los checks de moderación client-side.
--
-- Excepciones:
--   not_authenticated      → usuario no tiene sesión
--   account_not_enabled    → is_active = false
--   email_not_verified     → is_verified = false
--   duplicate_publication  → mismo user+product+store en las últimas 24h

CREATE OR REPLACE FUNCTION create_publication(
  p_product_id   INT,
  p_store_id     UUID,
  p_price        NUMERIC,
  p_photo_url    TEXT,
  p_description  TEXT DEFAULT ''
)
RETURNS TABLE (
  id               BIGINT,
  product_id       INT,
  store_id         UUID,
  user_id          UUID,
  price            NUMERIC,
  photo_url        TEXT,
  description      TEXT,
  confidence_score NUMERIC,
  created_at       TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID;
  v_is_active   BOOLEAN;
  v_is_verified BOOLEAN;
  v_rep_points  INT;
  v_confidence  NUMERIC;
  v_dup_id      BIGINT;
  v_description TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT is_active, is_verified, reputation_points
    INTO v_is_active, v_is_verified, v_rep_points
    FROM users
   WHERE id = v_user_id;

  IF NOT FOUND OR v_is_active IS FALSE THEN
    RAISE EXCEPTION 'account_not_enabled';
  END IF;

  IF NOT v_is_verified THEN
    RAISE EXCEPTION 'email_not_verified';
  END IF;

  -- Duplicate check: mismo usuario + producto + tienda en las últimas 24 horas
  SELECT pp.id INTO v_dup_id
    FROM price_publications pp
   WHERE pp.user_id    = v_user_id
     AND pp.product_id = p_product_id
     AND pp.store_id   = p_store_id
     AND pp.created_at >= NOW() - INTERVAL '24 hours'
   LIMIT 1;

  IF v_dup_id IS NOT NULL THEN
    RAISE EXCEPTION 'duplicate_publication';
  END IF;

  -- confidence_score basado en reputación del usuario (misma fórmula que el cliente)
  v_confidence := LEAST(1.0, 0.5 + COALESCE(v_rep_points, 0) / 1000.0);

  -- Normalizar descripción vacía
  v_description := NULLIF(TRIM(COALESCE(p_description, '')), '');
  IF v_description IS NULL THEN
    v_description := 'No hay descripción';
  END IF;

  RETURN QUERY
  INSERT INTO price_publications (
    product_id, store_id, user_id, price,
    photo_url, description, confidence_score
  )
  VALUES (
    p_product_id, p_store_id, v_user_id, p_price,
    p_photo_url, v_description, v_confidence
  )
  RETURNING
    price_publications.id,
    price_publications.product_id,
    price_publications.store_id,
    price_publications.user_id,
    price_publications.price,
    price_publications.photo_url,
    price_publications.description,
    price_publications.confidence_score,
    price_publications.created_at;

  -- Incrementar reputación del autor (best-effort, reutiliza el RPC compartido)
  PERFORM public.increment_user_reputation(v_user_id, 5);

END;
$$;

REVOKE ALL ON FUNCTION create_publication(INT, UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_publication(INT, UUID, NUMERIC, TEXT, TEXT) TO authenticated;
