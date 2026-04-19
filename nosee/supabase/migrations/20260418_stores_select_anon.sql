-- Permite a usuarios no autenticados ver tiendas activas y no ocultas
-- La policy existente (stores_select_visible_authenticated) solo cubre el rol authenticated.
-- Sin esta policy, RLS bloquea completamente a anon y la página /tiendas aparece vacía.

CREATE POLICY stores_select_visible_anon
  ON stores
  FOR SELECT
  TO anon
  USING (
    COALESCE(is_active, true) = true
    AND COALESCE(is_admin_hidden, false) = false
  );
