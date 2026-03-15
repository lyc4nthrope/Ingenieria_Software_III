-- Migration: polymorphic reports with reported_id + reported_type
-- Date: 2026-03-13
--
-- Extends `reports` para soportar publicaciones, tiendas, productos,
-- marcas y usuarios como entidades reportables.
--
-- Diseño: un solo `reported_id TEXT` + `reported_type VARCHAR` como discriminador.
-- TEXT en lugar de UUID porque publication_id es bigint — los tipos de PK
-- varían entre tablas, así que usamos texto para ser agnósticos al tipo.

-- ─── 1. Agregar reported_type con default para las filas existentes ───────────
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS reported_type VARCHAR NOT NULL DEFAULT 'publication';

-- ─── 2. Agregar reported_id como TEXT (agnóstico al tipo de PK) ───────────────
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS reported_id TEXT;

-- ─── 3. Migrar datos existentes (publication_id → reported_id con cast) ───────
UPDATE reports
SET reported_id = publication_id::TEXT
WHERE reported_type = 'publication'
  AND publication_id IS NOT NULL;

-- ─── 4. Hacer reported_id NOT NULL ───────────────────────────────────────────
ALTER TABLE reports
  ALTER COLUMN reported_id SET NOT NULL;

-- ─── 5. Quitar el DEFAULT de reported_type ────────────────────────────────────
ALTER TABLE reports
  ALTER COLUMN reported_type DROP DEFAULT;

-- ─── 6. Eliminar constraint único anterior (publication_id + reporter_user_id) ─
ALTER TABLE reports
  DROP CONSTRAINT IF EXISTS reports_unique_reporter_per_publication;

-- ─── 7. Eliminar columnas nullable del esquema anterior ───────────────────────
ALTER TABLE reports
  DROP COLUMN IF EXISTS publication_id,
  DROP COLUMN IF EXISTS store_id,
  DROP COLUMN IF EXISTS product_id,
  DROP COLUMN IF EXISTS brand_id;

-- ─── 8. Limpiar índices del esquema anterior (si existían) ───────────────────
DROP INDEX IF EXISTS reports_unique_publication;
DROP INDEX IF EXISTS reports_unique_store;
DROP INDEX IF EXISTS reports_unique_product;
DROP INDEX IF EXISTS reports_unique_brand;
DROP INDEX IF EXISTS reports_unique_user;
DROP INDEX IF EXISTS idx_reports_reporter_search;
DROP INDEX IF EXISTS idx_reports_reported_type;
DROP INDEX IF EXISTS idx_reports_store_id;
DROP INDEX IF EXISTS idx_reports_product_id;
DROP INDEX IF EXISTS idx_reports_brand_id;

-- ─── 9. Constraint único: un usuario no puede reportar el mismo elemento dos veces
ALTER TABLE reports
  ADD CONSTRAINT reports_unique_reporter_target
  UNIQUE (reporter_user_id, reported_type, reported_id);

-- ─── 10. Índice para búsquedas por entidad ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reports_type_id
  ON reports(reported_type, reported_id);
