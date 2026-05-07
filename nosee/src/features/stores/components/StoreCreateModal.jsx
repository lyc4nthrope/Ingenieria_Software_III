/**
 * StoreCreateModal
 *
 * Modal para crear una tienda desde el formulario de publicaciones.
 * Layout idéntico al de CreateStorePage/StoreForm:
 *   - Tienda física: 2 columnas (formulario + evidencias | mapa), 1 columna en móvil.
 *   - Tienda virtual: 1 columna siempre.
 */

import { useEffect, useId, useRef } from 'react';
import { useStoreCreation } from '@/features/stores/hooks/useStoreCreation';
import { StoreTypeEnum } from '@/features/stores/schemas';
import StoreTypeSwitch from '@/features/stores/components/StoreTypeSwitch';
import StoreMapPicker from '@/features/stores/components/StoreMapPicker';
import StoreEvidenceUploader from '@/features/stores/components/StoreEvidenceUploader';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useIsMobile';

export default function StoreCreateModal({ initialName = '', onSuccess, onClose }) {
  const { t } = useLanguage();
  const tc = t.storeCreateModal;
  const isMobile = useIsMobile();
  const dialogRef = useRef(null);

  const {
    formData,
    errors,
    isSubmitting,
    submitError,
    updateField,
    setLocation,
    addEvidenceFile,
    removeEvidenceFile,
    submit,
  } = useStoreCreation({ mode: 'create' });

  const titleId = useId();
  const nameId  = useId();
  const urlId   = useId();

  // Mover foco al diálogo al abrirse para que lectores de pantalla lo anuncien
  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

  // Pre-rellenar nombre desde la búsqueda (solo en el primer render)
  useEffect(() => {
    if (initialName) updateField('name', initialName);
  }, [initialName, updateField]);

  const isPhysical = formData.type === StoreTypeEnum.PHYSICAL;
  const twoCol = isPhysical && !isMobile;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await submit();
    if (result.success) {
      onSuccess(result.data?.store ?? result.data);
    }
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={s.overlay} onClick={handleOverlayClick}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={s.card}
        tabIndex={-1}
      >
        {/* Header */}
        <div style={s.header}>
          <h3 id={titleId} style={s.title}>{tc.title}</h3>
          <button style={s.closeBtn} onClick={onClose} type="button" aria-label={tc.close}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {submitError && (
          <div role="alert" style={s.errorBox}>⚠ {submitError}</div>
        )}

        <form
          onSubmit={handleSubmit}
          style={twoCol ? s.formGrid : s.formSingle}
          noValidate
        >
          {/* ── Columna izquierda ── */}
          <div style={s.leftCol}>
            {/* Tipo */}
            <div style={s.group}>
              <span style={s.label} id="modal-type-label">{tc.typeLabel}</span>
              <StoreTypeSwitch
                value={formData.type}
                onChange={(v) => updateField('type', v)}
                ariaLabelledBy="modal-type-label"
              />
            </div>

            {/* Nombre */}
            <div style={s.group}>
              <label htmlFor={nameId} style={s.label}>{tc.nameLabel}</label>
              <input
                id={nameId}
                type="text"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={tc.namePlaceholder}
                style={s.input}
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
              />
              {errors.name && <span style={s.fieldError}>{errors.name}</span>}
            </div>

            {/* URL (virtual) */}
            {!isPhysical && (
              <div style={s.group}>
                <label htmlFor={urlId} style={s.label}>{tc.urlLabel}</label>
                <input
                  id={urlId}
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => updateField('websiteUrl', e.target.value)}
                  placeholder="https://mitienda.com"
                  style={s.input}
                  aria-required="true"
                  aria-invalid={Boolean(errors.websiteUrl)}
                />
                {errors.websiteUrl && <span style={s.fieldError}>{errors.websiteUrl}</span>}
              </div>
            )}

            {/* Evidencias (física) — ocupa el espacio restante */}
            {isPhysical && (
              <StoreEvidenceUploader
                evidenceFiles={formData.evidenceFiles}
                onAddEvidence={addEvidenceFile}
                onRemoveEvidence={removeEvidenceFile}
                error={errors.evidenceUrls}
                containerStyle={s.evidenceContainer}
              />
            )}

            {/* Acciones */}
            <div style={s.actions}>
              <button type="button" onClick={onClose} style={s.cancelBtn}>
                {tc.cancel}
              </button>
              <button type="submit" style={s.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? tc.creating : tc.create}
              </button>
            </div>
          </div>

          {/* ── Columna derecha: mapa (física) — o debajo en móvil ── */}
          {isPhysical && (
            <div style={s.rightCol}>
              <StoreMapPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                address={formData.address}
                onLocationChange={setLocation}
                onAddressChange={(v) => updateField('address', v)}
                error={errors.location}
                disableDragging={isMobile}
              />
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
    overflowY: 'auto',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    width: '100%',
    maxWidth: '980px',
    boxShadow: 'var(--shadow-lg)',
    marginTop: '16px',
    marginBottom: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    flexShrink: 0,
    background: 'var(--bg-elevated)',
    border: '2px solid var(--border)',
    borderRadius: '50%',
    width: 34,
    height: 34,
    fontSize: 18,
    fontWeight: 800,
    cursor: 'pointer',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  errorBox: {
    background: 'var(--error-soft)',
    border: '1px solid rgba(248,113,113,0.3)',
    color: 'var(--error)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    marginBottom: '16px',
  },
  /* 2 columnas: izquierda fija, derecha flexible */
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 300px) 1fr',
    gap: '20px',
    alignItems: 'stretch',
  },
  /* 1 columna */
  formSingle: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  leftCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  evidenceContainer: {
    flex: 1,
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
  },
  fieldError: {
    fontSize: '12px',
    color: 'var(--error)',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
  },
  cancelBtn: {
    flex: 1,
    padding: '11px',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    fontFamily: 'inherit',
  },
  submitBtn: {
    flex: 2,
    padding: '11px',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'var(--accent)',
    color: 'var(--bg-base)',
    fontFamily: 'inherit',
  },
};
