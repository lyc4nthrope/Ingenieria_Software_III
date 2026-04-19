-- Habilitar pg_trgm para text similarity scoring (word_similarity)
-- Crear índice GIN sobre products.name para búsqueda por trigrama
-- Crear RPC search_publications_ranked: scoring + paginación server-side

-- 1. Extensión pg_trgm
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Índice GIN en products.name para word_similarity()
CREATE INDEX IF NOT EXISTS idx_products_name_trgm
  ON products USING gin(name gin_trgm_ops);

-- 3. Función RPC search_publications_ranked
CREATE OR REPLACE FUNCTION search_publications_ranked(
  p_product_ids  bigint[],
  p_store_ids    uuid[],
  p_min_price    numeric,
  p_max_price    numeric,
  p_search_query text,
  p_offset       int,
  p_limit        int
)
RETURNS TABLE (
  id                    bigint,
  price                 numeric,
  photo_url             text,
  description           text,
  confidence_score      numeric,
  is_active             boolean,
  created_at            timestamp,
  validated_count       int,
  downvoted_count       int,
  active_reports_count  int,
  user_id               uuid,
  product_id            int,
  store_id              uuid,
  composite_score       numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH candidates AS (
    SELECT
      pp.id,
      pp.price,
      pp.photo_url,
      pp.description,
      pp.confidence_score,
      pp.is_active,
      pp.created_at,
      pp.validated_count,
      pp.downvoted_count,
      pp.active_reports_count,
      pp.user_id,
      pp.product_id,
      pp.store_id,
      -- textScore: word_similarity sobre nombre del producto, neutro 0.5 si no hay query
      CASE
        WHEN p_search_query IS NOT NULL AND p_search_query != ''
          THEN COALESCE(word_similarity(p_search_query, pr.name), 0.5)
        ELSE 0.5
      END::numeric AS text_score,
      -- priceScore: 1 - normalización min-max dentro del conjunto candidato
      COALESCE(
        1.0 - (pp.price - MIN(pp.price) OVER())
              / NULLIF(MAX(pp.price) OVER() - MIN(pp.price) OVER(), 0),
        0.5
      )::numeric AS price_score,
      -- reputationScore: reputation_points del autor normalizado a [0,1]
      LEAST(COALESCE(u.reputation_points, 0) / 1000.0, 1.0)::numeric AS reputation_score,
      -- evidenceScore: evidence_count de la tienda normalizado a [0,1]
      LEAST(COALESCE(s.evidence_count, 0) / 5.0, 1.0)::numeric AS evidence_score
    FROM price_publications pp
    JOIN products pr   ON pr.id  = pp.product_id
    LEFT JOIN stores s ON s.id   = pp.store_id
    LEFT JOIN users  u ON u.id   = pp.user_id
    WHERE pp.is_active = true
      AND (
        array_length(p_product_ids, 1) IS NULL
        OR pp.product_id = ANY(p_product_ids)
      )
      AND (
        array_length(p_store_ids, 1) IS NULL
        OR pp.store_id = ANY(p_store_ids)
      )
      AND (p_min_price IS NULL OR pp.price >= p_min_price)
      AND (p_max_price IS NULL OR pp.price <= p_max_price)
  )
  SELECT
    c.id,
    c.price,
    c.photo_url,
    c.description,
    c.confidence_score,
    c.is_active,
    c.created_at,
    c.validated_count,
    c.downvoted_count,
    c.active_reports_count,
    c.user_id,
    c.product_id,
    c.store_id,
    -- composite_score: pesos renormalizados (distanceScore 0.14 removido, pesos renormalizados a 1.0)
    (
      -- textScore:       0.47
      0.47 * c.text_score
      -- priceScore:      0.21
    + 0.21 * c.price_score
      -- voteScore:       0.12  ratio validados / (validados + downvotados), neutro 0.5
    + 0.12 * COALESCE(
               c.validated_count::numeric
               / NULLIF(c.validated_count + c.downvoted_count, 0),
               0.5
             )
      -- reportScore:     0.07  inverso de active_reports (hasta 5 = 100% penalización)
    + 0.07 * (1.0 - LEAST(c.active_reports_count / 5.0, 1.0))
      -- recencyScore:    0.06  decae a 0 en 90 días
    + 0.06 * GREATEST(
               1.0 - EXTRACT(EPOCH FROM (NOW() - c.created_at)) / (90.0 * 86400),
               0.0
             )
      -- reputationScore: 0.05
    + 0.05 * c.reputation_score
      -- evidenceScore:   0.02
    + 0.02 * c.evidence_score
    )::numeric AS composite_score
  FROM candidates c
  ORDER BY composite_score DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;
