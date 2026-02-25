-- ============================================================
-- sql/functions_and_triggers.sql
--
-- Referencia centralizada de todas las funciones y triggers.
-- Las migraciones individuales son el source of truth;
-- este archivo sirve para revisión y documentación.
-- ============================================================

-- ── 1. set_updated_at ─────────────────────────────────────────
-- Actualiza automáticamente updated_at en cualquier tabla
-- que tenga esa columna y el trigger asociado.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 2. handle_new_user ───────────────────────────────────────
-- Crea fila en public.users cuando Supabase Auth registra
-- un nuevo usuario. Lee full_name del metadata del signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, full_name, role_id, is_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    1,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── 3. handle_email_verified ──────────────────────────────────
-- Sincroniza is_verified = TRUE cuando Supabase confirma el email.

CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.users
    SET    is_verified = TRUE,
           updated_at  = NOW()
    WHERE  id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ── Registro de triggers ──────────────────────────────────────

-- Tabla: auth.users → public.users (nuevo usuario)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Tabla: auth.users → public.users (email verificado)
DROP TRIGGER IF EXISTS on_auth_user_email_verified ON auth.users;
CREATE TRIGGER on_auth_user_email_verified
  AFTER UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_verified();

-- Tabla: public.users → updated_at
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();