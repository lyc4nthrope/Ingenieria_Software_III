import { useEffect, useMemo, useState, useId } from 'react';
import * as publicationsApi from '@/services/api/publications.api';

const REPORT_REASON_OPTIONS = [
  { value: 'fake_price', label: 'Precio falso o engañoso' },
  { value: 'wrong_photo', label: 'La foto no coincide con la publicación' },
  { value: 'spam', label: 'Spam o contenido repetitivo' },
  { value: 'offensive', label: 'Contenido ofensivo o inapropiado' },
  { value: 'other', label: 'Otro motivo' },
];

export function ReportPublicationModal({ publication, onClose, onSubmit }) {
  const titleId = useId();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [hasReported, setHasReported] = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [fileInputHovered, setFileInputHovered] = useState(false);

  useEffect(() => {
    const checkReportStatus = async () => {
      setCheckingStatus(true);
      const result = await publicationsApi.checkUserReportStatus(publication.id);
      if (result.success && result.hasReported) {
        setHasReported(true);
        setExistingReport(result.existingReport);
      }
      setCheckingStatus(false);
    };
    checkReportStatus();
  }, [publication.id]);

  const evidencePreview = useMemo(() => {
    if (!evidenceFile) return null;
    return URL.createObjectURL(evidenceFile);
  }, [evidenceFile]);

  const handleFileChange = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    setEvidenceFile(file);
  };

  const handleClose = () => {
    if (submitting) return;
    onClose?.();
  };

  const handleSubmit = async () => {
    if (!publication?.id || !reason || submitting || hasReported) return;
    setSubmitting(true);
    await onSubmit?.({ publicationId: publication.id, reason, description, evidenceFile });
    setSubmitting(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleClose}
      onKeyDown={(e) => { if (e.key === 'Escape') handleClose(e); }}
      style={styles.overlay}
    >
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} style={styles.modal}>
        <h3 id={titleId} style={styles.title}>
          {publication?.product?.name || 'Publicación'} • {publication?.store?.name || 'Tienda'} • ${publication?.price?.toLocaleString() || '0'}
        </h3>
        <p style={styles.subtitle}>
          {checkingStatus ? 'Verificando estatus...' : 'Completa la razón del reporte'}
        </p>

        {hasReported && (
          <div role="alert" style={styles.alertBox}>
            <p style={{ margin: 0, color: 'var(--warning)', fontSize: '14px', fontWeight: 600 }}>
              ⚠️ Ya reportaste esta publicación
            </p>
            <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
              Reporte enviado el: {existingReport && new Date(existingReport.created_at).toLocaleString()}
            </p>
          </div>
        )}

        <div style={{ opacity: hasReported ? 0.5 : 1, pointerEvents: hasReported ? 'none' : 'auto' }}>
          <div style={styles.formGroup}>
            <label htmlFor="report-reason" style={styles.label}>Razón del reporte *</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={styles.select}
              disabled={hasReported}
            >
              <option value="">Selecciona una razón...</option>
              {REPORT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="report-description" style={styles.label}>Descripción (opcional)</label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Cuéntanos con más detalle por qué reportas esta publicación"
              style={styles.textarea}
              disabled={hasReported}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="report-evidence" style={styles.label}>Foto de evidencia (opcional)</label>
            <div style={styles.fileInputWrapper}>
              <input
                id="report-evidence"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={styles.fileInputHidden}
                disabled={hasReported}
                aria-label="Seleccionar imagen de evidencia"
              />
              <label
                htmlFor="report-evidence"
                style={{
                  ...styles.fileInputButton,
                  ...(fileInputHovered && !hasReported ? styles.fileInputButtonHover : {}),
                  opacity: hasReported ? 0.5 : 1,
                  cursor: hasReported ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={() => !hasReported && setFileInputHovered(true)}
                onMouseLeave={() => setFileInputHovered(false)}
              >
                <span aria-hidden="true">📸 </span>
                {evidenceFile ? evidenceFile.name : 'Seleccionar imagen'}
              </label>
              {evidenceFile && (
                <span style={styles.fileSize}>{(evidenceFile.size / 1024).toFixed(1)} KB</span>
              )}
            </div>
            {evidencePreview && (
              <div style={styles.evidencePreviewWrap}>
                <img src={evidencePreview} alt="Vista previa de la evidencia" style={styles.evidencePreview} />
                <button
                  type="button"
                  style={styles.removeEvidenceButton}
                  onClick={() => setEvidenceFile(null)}
                  disabled={hasReported}
                >
                  Quitar evidencia
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.secondaryButton} onClick={handleClose}>
            Cancelar
          </button>
          <button
            type="button"
            style={{
              ...styles.primaryButton,
              opacity: hasReported ? 0.5 : 1,
              cursor: hasReported ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSubmit}
            disabled={!reason || submitting || hasReported}
          >
            {submitting ? 'Enviando...' : hasReported ? 'Ya reportado' : 'Enviar reporte'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    width: 'min(520px, 100%)',
    color: 'var(--text-primary)',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subtitle: {
    marginTop: '8px',
    marginBottom: '18px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  formGroup: {
    marginBottom: '14px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: 'var(--text-primary)',
    marginBottom: '6px',
    fontWeight: 600,
  },
  alertBox: {
    padding: '12px 14px',
    borderRadius: 'var(--radius-sm)',
    marginBottom: '16px',
    background: 'var(--warning-soft)',
    border: '1px solid var(--warning)',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    resize: 'vertical',
  },
  fileInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  fileInputHidden: {
    display: 'none',
  },
  fileInputButton: {
    display: 'inline-block',
    padding: '8px 14px',
    background: 'var(--bg-surface)',
    border: '2px dashed var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    userSelect: 'none',
  },
  fileInputButtonHover: {
    borderColor: 'var(--text-muted)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
  },
  fileSize: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  evidencePreviewWrap: {
    marginTop: '8px',
    display: 'grid',
    gap: '8px',
  },
  evidencePreview: {
    width: '100%',
    maxHeight: '180px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
  },
  removeEvidenceButton: {
    border: '1px solid var(--error)',
    background: 'var(--error-soft)',
    color: 'var(--error)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 10px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '8px',
  },
  secondaryButton: {
    border: '1px solid var(--border-soft)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  primaryButton: {
    border: '1px solid var(--accent)',
    background: 'var(--accent)',
    color: 'var(--bg-base)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 14px',
    cursor: 'pointer',
    fontWeight: 700,
  },
};

export default ReportPublicationModal;
