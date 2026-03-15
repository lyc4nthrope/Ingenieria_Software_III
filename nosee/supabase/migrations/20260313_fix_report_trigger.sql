-- Migration: fix tr_on_report_insert trigger for polymorphic reports
-- Date: 2026-03-13
--
-- El trigger anterior usaba NEW.publication_id (columna ya eliminada).
-- Lo reemplazamos para que use el nuevo diseño: reported_type + reported_id.
--
-- Nota: reports.api.js ya resuelve reported_user_id antes del INSERT,
-- este trigger actúa como fallback en caso de que no venga resuelto.

CREATE OR REPLACE FUNCTION fn_on_report_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo resolver si no viene ya seteado
    IF NEW.reported_user_id IS NULL THEN
        IF NEW.reported_type = 'publication' THEN
            SELECT user_id INTO NEW.reported_user_id
            FROM public.price_publications
            WHERE id = NEW.reported_id::BIGINT;

        ELSIF NEW.reported_type = 'store' THEN
            SELECT created_by INTO NEW.reported_user_id
            FROM public.stores
            WHERE id = NEW.reported_id::UUID;

        ELSIF NEW.reported_type = 'user' THEN
            NEW.reported_user_id := NEW.reported_id::UUID;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reasignar el trigger existente a la función actualizada
DROP TRIGGER IF EXISTS tr_on_report_insert ON public.reports;

CREATE TRIGGER tr_on_report_insert
    BEFORE INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION fn_on_report_insert();
