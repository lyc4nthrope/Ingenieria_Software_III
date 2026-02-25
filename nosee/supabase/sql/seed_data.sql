-- ============================================================  NO EJECUTAR SOLO REFERENCIA
-- seed.sql — Datos iniciales para desarrollo 
--
-- Ejecutar DESPUÉS de aplicar todas las migraciones.
-- NUNCA ejecutar en producción (usa datos de ejemplo).
--
-- Uso:
--   supabase db reset          (aplica migraciones + seed)
--   psql $DB_URL < seed.sql   (solo el seed)
-- ============================================================

-- ── Roles (idempotente) ───────────────────────────────────────
INSERT INTO public.roles (id, name) VALUES
  (1, 'Admin'),
  (2, 'User'),
  (3, 'Manager'),
  (4, 'Repartidor');
-- Reiniciar secuencia para que el próximo auto-id empiece en 5
SELECT setval('public.roles_id_seq', 4, true);

-- ── Nota sobre usuarios de prueba ────────────────────────────
-- Los usuarios de Supabase Auth no se pueden insertar directamente
-- en SQL. Para crear un admin de prueba en desarrollo local:
--
--   1. Regístrate normalmente en la app (http://localhost:5173/registro)
--   2. Confirma el email (o activa "autoconfirm" en config.toml)
--   3. Luego ejecuta el siguiente UPDATE cambiando el email:

/*
UPDATE public.users
SET role_id = 3   -- Admin
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'admin@test.com' LIMIT 1
);
*/

-- ── Datos de ejemplo para desarrollo ─────────────────────────
-- (Se agregan automáticamente cuando usas la app en local)

-- Si quieres datos de ejemplo ficticios sin usar la UI, puedes
-- insertar directamente en auth.users usando el cliente de admin:
--
--   supabase auth admin create-user --email dev@test.com --password Dev1234!
--   supabase auth admin create-user --email admin@test.com --password Admin1234! --role admin