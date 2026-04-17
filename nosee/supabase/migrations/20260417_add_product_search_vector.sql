-- Búsqueda full-text de productos con tsvector + GIN index
-- Reemplaza el seed-match ILIKE + fallback table scan en publications.api.js

-- 0. Extensión unaccent (elimina tildes y diacríticos en español)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 1. Columna search_vector en products (nullable, sin default)
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- 2. Backfill: productos CON marca
UPDATE products p
SET search_vector = to_tsvector(
  'simple',
  unaccent(lower(p.name || ' ' || COALESCE(b.name, '')))
)
FROM brands b
WHERE b.id = p.brand_id;

-- 3. Backfill: productos SIN marca
UPDATE products
SET search_vector = to_tsvector(
  'simple',
  unaccent(lower(name))
)
WHERE brand_id IS NULL;

-- 4. Índice GIN sobre search_vector
CREATE INDEX idx_products_search_vector
  ON products USING gin(search_vector);

-- 5. Función trigger: reconstruye search_vector al insertar/actualizar producto
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    unaccent(lower(
      NEW.name || ' ' || COALESCE((SELECT name FROM brands WHERE id = NEW.brand_id), '')
    ))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_product_search_vector
BEFORE INSERT OR UPDATE OF name, brand_id
ON products
FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- 6. Función trigger: actualiza search_vector en batch cuando cambia el nombre de una marca
CREATE OR REPLACE FUNCTION update_products_search_vector_on_brand_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    UPDATE products
    SET search_vector = to_tsvector(
      'simple',
      unaccent(lower(name || ' ' || COALESCE(NEW.name, '')))
    )
    WHERE brand_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_products_search_vector_on_brand_change
AFTER UPDATE OF name ON brands
FOR EACH ROW EXECUTE FUNCTION update_products_search_vector_on_brand_change();

-- 7. RPC search_products: retorna product_id + rank ordenados por relevancia
CREATE OR REPLACE FUNCTION search_products(p_query text)
RETURNS TABLE (product_id int, rank real)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id::int AS product_id,
    ts_rank(p.search_vector, plainto_tsquery('simple', unaccent(lower(p_query))))::real AS rank
  FROM products p
  WHERE
    p_query IS NOT NULL
    AND trim(p_query) <> ''
    AND p.search_vector IS NOT NULL
    AND p.search_vector @@ plainto_tsquery('simple', unaccent(lower(p_query)))
  ORDER BY rank DESC
  LIMIT 200;
$$;
