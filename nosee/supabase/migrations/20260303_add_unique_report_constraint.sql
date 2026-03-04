-- Agregar constraint UNIQUE en reports para evitar reportes duplicados del mismo usuario
-- Un usuario solo puede reportar una publicación una vez

-- Primero, eliminar reportes duplicados si existen (mantener el más reciente)
DELETE FROM reports
WHERE id NOT IN (
  SELECT MAX(id)
  FROM reports
  GROUP BY publication_id, reporter_user_id
);

-- Luego, agregar el constraint UNIQUE
ALTER TABLE reports
ADD CONSTRAINT reports_unique_reporter_per_publication 
UNIQUE(publication_id, reporter_user_id);

-- Crear índice para mejor performance en búsquedas
CREATE INDEX idx_reports_user_publication 
ON reports(reporter_user_id, publication_id);
