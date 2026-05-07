-- Migration: RPC hard_delete_publication
-- Date: 2026-05-06
--
-- Reemplaza la orquestación client-side de eliminación permanente:
--   DELETE votes → DELETE reports → DELETE comments → DELETE publication
-- con una única transacción server-side atómica.
--
-- Contexto de `reported_id`:
--   La tabla `reports` usa diseño polimórfico (20260313_polymorphic_reports.sql):
--   reported_id es TEXT (agnóstico al tipo de PK), por eso se castea p_publication_id::TEXT.
--
-- Solo role_id = 3 (Admin) puede ejecutar eliminación permanente.
--
-- Excepciones:
--   not_authenticated    → usuario no tiene sesión
--   publication_not_found → la publicación no existe
--   not_authorized       → el usuario no es Admin

CREATE OR REPLACE FUNCTION hard_delete_publication(p_publication_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_role_id    INT;
  v_pub_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM price_publications WHERE id = p_publication_id
  ) INTO v_pub_exists;

  IF NOT v_pub_exists THEN
    RAISE EXCEPTION 'publication_not_found';
  END IF;

  SELECT role_id INTO v_role_id
    FROM users
   WHERE id = v_user_id;

  IF COALESCE(v_role_id, 0) != 3 THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Eliminar dependencias en orden antes de la publicación
  DELETE FROM publication_votes
   WHERE publication_id = p_publication_id;

  -- reported_id es TEXT en la tabla reports (diseño polimórfico)
  DELETE FROM reports
   WHERE reported_type = 'publication'
     AND reported_id   = p_publication_id::TEXT;

  DELETE FROM comments
   WHERE publication_id = p_publication_id;

  DELETE FROM price_publications
   WHERE id = p_publication_id;

END;
$$;

REVOKE ALL ON FUNCTION hard_delete_publication(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION hard_delete_publication(BIGINT) TO authenticated;
