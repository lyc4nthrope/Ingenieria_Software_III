-- Desnormalizar active_reports_count en price_publications y evidence_count en stores
-- Elimina 4 queries paralelas de enrichSearchRankingSignals() para el sort "best_match"

-- ─── 1. Agregar columnas ─────────────────────────────────────────────────────
ALTER TABLE price_publications
  ADD COLUMN active_reports_count INT NOT NULL DEFAULT 0;

ALTER TABLE stores
  ADD COLUMN evidence_count INT NOT NULL DEFAULT 0;

-- ─── 2. Backfill active_reports_count ────────────────────────────────────────
-- Cuenta reportes activos (no rechazados) de tipo 'publication' por publicación
UPDATE price_publications pp
SET active_reports_count = COALESCE((
  SELECT COUNT(*) FROM reports r
  WHERE r.reported_id = pp.id::TEXT
    AND r.reported_type = 'publication'
    AND LOWER(COALESCE(r.status, '')) != 'rejected'
), 0);

-- ─── 3. Backfill evidence_count ──────────────────────────────────────────────
-- Cuenta todas las evidencias por tienda
UPDATE stores s
SET evidence_count = COALESCE((
  SELECT COUNT(*) FROM store_evidences se
  WHERE se.store_id = s.id
), 0);

-- ─── 4. Índice para el sort server-side (active_reports_count en best_match) ──
CREATE INDEX idx_price_publications_active_reports
  ON price_publications (active_reports_count)
  WHERE is_active = true;

-- ─── 5. Índice en store_evidences para el trigger (performance) ───────────────
CREATE INDEX IF NOT EXISTS idx_store_evidences_store_id
  ON store_evidences (store_id);

-- ─── 6. Función del trigger: reports → active_reports_count ──────────────────
CREATE OR REPLACE FUNCTION update_publication_report_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Solo contar reportes activos (no rechazados) de tipo 'publication'
    IF NEW.reported_type = 'publication'
       AND LOWER(COALESCE(NEW.status, '')) != 'rejected' THEN
      UPDATE price_publications
        SET active_reports_count = active_reports_count + 1
        WHERE id = NEW.reported_id::BIGINT;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrementar solo si era un reporte activo de tipo 'publication'
    IF OLD.reported_type = 'publication'
       AND LOWER(COALESCE(OLD.status, '')) != 'rejected' THEN
      UPDATE price_publications
        SET active_reports_count = GREATEST(active_reports_count - 1, 0)
        WHERE id = OLD.reported_id::BIGINT;
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Transición no-rechazado → rechazado: decrementar
    IF OLD.reported_type = 'publication'
       AND LOWER(COALESCE(OLD.status, '')) != 'rejected'
       AND LOWER(COALESCE(NEW.status, '')) = 'rejected' THEN
      UPDATE price_publications
        SET active_reports_count = GREATEST(active_reports_count - 1, 0)
        WHERE id = NEW.reported_id::BIGINT;

    -- Transición rechazado → no-rechazado: incrementar
    ELSIF OLD.reported_type = 'publication'
       AND LOWER(COALESCE(OLD.status, '')) = 'rejected'
       AND LOWER(COALESCE(NEW.status, '')) != 'rejected' THEN
      UPDATE price_publications
        SET active_reports_count = active_reports_count + 1
        WHERE id = NEW.reported_id::BIGINT;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ─── 7. Trigger: reports → price_publications ─────────────────────────────────
CREATE TRIGGER trg_update_publication_report_count
AFTER INSERT OR UPDATE OR DELETE ON reports
FOR EACH ROW EXECUTE FUNCTION update_publication_report_count();

-- ─── 8. Función del trigger: store_evidences → evidence_count ─────────────────
CREATE OR REPLACE FUNCTION update_store_evidence_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stores SET evidence_count = evidence_count + 1 WHERE id = NEW.store_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stores SET evidence_count = GREATEST(evidence_count - 1, 0) WHERE id = OLD.store_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ─── 9. Trigger: store_evidences → stores ─────────────────────────────────────
CREATE TRIGGER trg_update_store_evidence_count
AFTER INSERT OR DELETE ON store_evidences
FOR EACH ROW EXECUTE FUNCTION update_store_evidence_count();
