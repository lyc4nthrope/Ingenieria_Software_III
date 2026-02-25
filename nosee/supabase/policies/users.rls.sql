-- ============================================================
-- RLS Policies: public.users
--
-- Reglas:
--   SELECT  → cualquier usuario autenticado puede ver cualquier perfil
--             (necesario para mostrar el nombre del autor de una publicación)
--   INSERT  → solo el trigger handle_new_user (SECURITY DEFINER)
--   UPDATE  → solo el propio usuario puede editar su perfil
--             los Admin pueden editar cualquier perfil
--   DELETE  → solo Admin (o CASCADE desde auth.users)
--
-- Roles en BD:
--   id=1 'Usuario'  | id=2 'Moderador' | id=3 'Admin' | id=4 'Repartidor'
-- ============================================================

-- Limpiar políticas anteriores
DROP POLICY IF EXISTS "users_select_authenticated"  ON public.users;
DROP POLICY IF EXISTS "users_insert_own"            ON public.users;
DROP POLICY IF EXISTS "users_update_own"            ON public.users;
DROP POLICY IF EXISTS "users_update_admin"          ON public.users;
DROP POLICY IF EXISTS "users_delete_admin"          ON public.users;
DROP POLICY IF EXISTS "roles_select_authenticated"  ON public.roles;

-- ── SELECT ────────────────────────────────────────────────────
-- Cualquier usuario autenticado puede ver perfiles
CREATE POLICY "users_select_authenticated"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- ── INSERT ────────────────────────────────────────────────────
-- Solo el propio usuario puede insertar su fila (o el trigger SECURITY DEFINER)
-- En la práctica, el trigger lo hace automáticamente; esto es un fallback seguro.
CREATE POLICY "users_insert_own"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ── UPDATE (propio usuario) ───────────────────────────────────
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── UPDATE (Admin puede actualizar cualquier usuario) ─────────
CREATE POLICY "users_update_admin"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'Admin'
    )
  );

-- ── DELETE (solo Admin) ───────────────────────────────────────
CREATE POLICY "users_delete_admin"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid() AND r.name = 'Admin'
    )
  );

-- ── Roles: solo lectura para todos los autenticados ──────────
CREATE POLICY "roles_select_authenticated"
  ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);