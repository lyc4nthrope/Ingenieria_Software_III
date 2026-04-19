-- Desnormalizar contadores de votos en price_publications
-- Elimina la necesidad de prefetchear hasta 2500 filas para el sort "validated"

-- 1. Agregar columnas
ALTER TABLE price_publications
  ADD COLUMN validated_count INT NOT NULL DEFAULT 0,
  ADD COLUMN downvoted_count INT NOT NULL DEFAULT 0;

-- 2. Backfill con datos existentes
UPDATE price_publications pp
SET
  validated_count = COALESCE((
    SELECT COUNT(*) FROM publication_votes pv
    WHERE pv.publication_id = pp.id AND pv.vote_type = 1
  ), 0),
  downvoted_count = COALESCE((
    SELECT COUNT(*) FROM publication_votes pv
    WHERE pv.publication_id = pp.id AND pv.vote_type = -1
  ), 0);

-- 3. Índice para el sort server-side (validated_count DESC)
CREATE INDEX idx_price_publications_validated_count
  ON price_publications (validated_count DESC)
  WHERE is_active = true;

-- 4. Índice en publication_votes para el trigger
CREATE INDEX idx_publication_votes_publication_id
  ON publication_votes (publication_id);

-- 5. Función del trigger
CREATE OR REPLACE FUNCTION update_publication_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      UPDATE price_publications SET validated_count = validated_count + 1 WHERE id = NEW.publication_id;
    ELSIF NEW.vote_type = -1 THEN
      UPDATE price_publications SET downvoted_count = downvoted_count + 1 WHERE id = NEW.publication_id;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      UPDATE price_publications SET validated_count = GREATEST(validated_count - 1, 0) WHERE id = OLD.publication_id;
    ELSIF OLD.vote_type = -1 THEN
      UPDATE price_publications SET downvoted_count = GREATEST(downvoted_count - 1, 0) WHERE id = OLD.publication_id;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Revertir voto anterior
    IF OLD.vote_type = 1 THEN
      UPDATE price_publications SET validated_count = GREATEST(validated_count - 1, 0) WHERE id = OLD.publication_id;
    ELSIF OLD.vote_type = -1 THEN
      UPDATE price_publications SET downvoted_count = GREATEST(downvoted_count - 1, 0) WHERE id = OLD.publication_id;
    END IF;
    -- Aplicar voto nuevo
    IF NEW.vote_type = 1 THEN
      UPDATE price_publications SET validated_count = validated_count + 1 WHERE id = NEW.publication_id;
    ELSIF NEW.vote_type = -1 THEN
      UPDATE price_publications SET downvoted_count = downvoted_count + 1 WHERE id = NEW.publication_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger
CREATE TRIGGER trg_update_vote_counts
AFTER INSERT OR UPDATE OR DELETE ON publication_votes
FOR EACH ROW EXECUTE FUNCTION update_publication_vote_counts();
