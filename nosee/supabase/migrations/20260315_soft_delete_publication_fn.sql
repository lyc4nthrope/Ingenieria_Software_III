-- Migration: función RPC para soft-delete de publicaciones
-- Date: 2026-03-15
--
-- El UPDATE directo sobre price_publications falla con RLS 42501 porque
-- la política WITH CHECK no permite pasar is_active a false desde el cliente.
-- Esta función SECURITY DEFINER bypasea RLS pero valida la autorización internamente.

CREATE OR REPLACE FUNCTION soft_delete_publication(p_publication_id BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     UUID;
  v_pub_user_id UUID;
  v_role_id     INT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT user_id INTO v_pub_user_id
  FROM price_publications
  WHERE id = p_publication_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'publication_not_found';
  END IF;

  SELECT role_id INTO v_role_id
  FROM users
  WHERE id = v_user_id;

  IF v_pub_user_id != v_user_id AND COALESCE(v_role_id, 0) != 3 THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  UPDATE price_publications
  SET is_active = false
  WHERE id = p_publication_id;
END;
$$;

-- Solo usuarios autenticados pueden ejecutar esta función
REVOKE ALL ON FUNCTION soft_delete_publication(BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION soft_delete_publication(BIGINT) TO authenticated;
