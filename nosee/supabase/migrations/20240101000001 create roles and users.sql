
-- ============================================================
-- Migración: 20240101000001_create_roles_and_users.sql
-- Crea las tablas `roles` y `users` (perfil público)
-- ============================================================

-- ── Tabla roles ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.roles (
  id   SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

COMMENT ON TABLE public.roles IS 'Roles disponibles en el sistema';

-- Insertar roles base
INSERT INTO public.roles (id, name)
SELECT 1, 'Usuario' WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE id = 1);
INSERT INTO public.roles (id, name)
SELECT 2, 'Moderador' WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE id = 2);
INSERT INTO public.roles (id, name)
SELECT 3, 'Admin' WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE id = 3);
INSERT INTO public.roles (id, name)
SELECT 4, 'Repartidor' WHERE NOT EXISTS (SELECT 1 FROM public.roles WHERE id = 4);

-- ── Tabla users (perfil público) ─────────────────────────────
-- Extiende auth.users de Supabase.
-- El email VIVE en auth.users, no aquí (no se duplica).
CREATE TABLE IF NOT EXISTS public.users (
  id                UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         VARCHAR(255),
  role_id           INTEGER     NOT NULL DEFAULT 1 REFERENCES public.roles(id),
  reputation_points INTEGER     NOT NULL DEFAULT 0,
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users                   IS 'Perfiles públicos de usuario';
COMMENT ON COLUMN public.users.id                IS 'Mismo UUID que auth.users.id';
COMMENT ON COLUMN public.users.full_name         IS 'Nombre completo del usuario';
COMMENT ON COLUMN public.users.role_id           IS 'FK a roles.id';
COMMENT ON COLUMN public.users.reputation_points IS 'Puntos acumulados por aportes validados';
COMMENT ON COLUMN public.users.is_verified       IS 'true cuando el email fue confirmado';

-- Índice para búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_users_role_id ON public.users(role_id);

-- Habilitar Row Level Security (PostgreSQL)
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;