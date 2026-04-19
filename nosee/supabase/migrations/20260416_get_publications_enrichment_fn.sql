-- Consolida queries de enriquecimiento de publicaciones en una sola función
-- Reemplaza: supabase.auth.getUser() + query reports + query user_votes (3 round trips → 1 RPC)
-- Usa SECURITY DEFINER para bypasear RLS de reports (los usuarios normales no pueden leer reports ajenos)

CREATE OR REPLACE FUNCTION get_publications_enrichment(
  p_publication_ids bigint[]
)
RETURNS TABLE (
  publication_id bigint,
  user_vote smallint,
  report_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pid.id::bigint                                                                AS publication_id,
    pv.vote_type                                                                  AS user_vote,
    COUNT(r.id) FILTER (WHERE LOWER(COALESCE(r.status, '')) != 'rejected')::int  AS report_count
  FROM unnest(p_publication_ids) AS pid(id)
  LEFT JOIN publication_votes pv
    ON pv.publication_id = pid.id AND pv.user_id = auth.uid()
  LEFT JOIN reports r
    ON r.reported_id = pid.id::text AND r.reported_type = 'publication'
  GROUP BY pid.id, pv.vote_type;
$$;
