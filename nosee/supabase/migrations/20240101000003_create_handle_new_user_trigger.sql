-- ============================================================
-- Migración: 20240101000003_create_handle_new_user_trigger.sql
--
-- Cuando Supabase Auth crea un nuevo usuario (INSERT en auth.users),
-- este trigger crea automáticamente su fila en public.users.
--
-- Esto garantiza que siempre exista un perfil, incluso si el
-- signUp se hace desde fuera de la app (ej: dashboard de Supabase).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER                      -- corre como owner, no como el usuario que hace signup
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  -- Intentar leer full_name del metadata del registro
  v_full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    ''
  );

  INSERT INTO public.users (id, full_name, role_id, is_verified)
  VALUES (
    NEW.id,
    v_full_name,
    1,        -- rol 'Usuario' por defecto
    FALSE     -- pendiente de verificación de email
  )
  ON CONFLICT (id) DO NOTHING;   -- evitar duplicados si users.api.js también hace upsert

  RETURN NEW;
END;
$$;

-- Asociar al evento de inserción en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ── Trigger: marcar is_verified cuando Supabase confirma el email ──────────
-- auth.users.email_confirmed_at se actualiza cuando el usuario hace clic
-- en el link de confirmación. Sincronizamos ese estado a public.users.

CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo actuar cuando email_confirmed_at pasa de NULL → valor
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.users
    SET    is_verified = TRUE,
           updated_at  = NOW()
    WHERE  id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
CREATE TRIGGER on_auth_user_email_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_verified();