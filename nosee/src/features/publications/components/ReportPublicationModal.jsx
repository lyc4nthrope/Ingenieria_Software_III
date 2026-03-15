<<<<<<< HEAD
import { useEffect, useMemo, useState, useId } from 'react';
import * as publicationsApi from '@/services/api/publications.api';
import { useLanguage } from '@/contexts/LanguageContext';

export function ReportPublicationModal({ publication, onClose, onSubmit }) {
  const { t } = useLanguage();
  const tr = t.reportModal;
  const REPORT_REASON_OPTIONS = [
    { value: 'fake_price', label: tr.reasons.fake_price },
    { value: 'wrong_photo', label: tr.reasons.wrong_photo },
    { value: 'spam', label: tr.reasons.spam },
    { value: 'offensive', label: tr.reasons.offensive },
    { value: 'other', label: tr.reasons.other },
  ];
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
          {publication?.product?.name || tr.publication} • {publication?.store?.name || tr.store} • ${publication?.price?.toLocaleString() || '0'}
        </h3>
        <p style={styles.subtitle}>
          {checkingStatus ? tr.verifying : tr.completeReason}
        </p>

        {hasReported && (
          <div role="alert" style={styles.alertBox}>
            <p style={{ margin: 0, color: 'var(--warning)', fontSize: '14px', fontWeight: 600 }}>
              {tr.alreadyReported}
            </p>
            <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
              {tr.reportedOn}{existingReport && new Date(existingReport.created_at).toLocaleString()}
            </p>
          </div>
        )}

        <div style={{ opacity: hasReported ? 0.5 : 1, pointerEvents: hasReported ? 'none' : 'auto' }}>
          <div style={styles.formGroup}>
            <label htmlFor="report-reason" style={styles.label}>{tr.reasonLabel}</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={styles.select}
              disabled={hasReported}
            >
              <option value="">{tr.selectReason}</option>
              {REPORT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="report-description" style={styles.label}>{tr.descriptionLabel}</label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder={tr.descriptionPlaceholder}
              style={styles.textarea}
              disabled={hasReported}
            />
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="report-evidence" style={styles.label}>{tr.evidenceLabel}</label>
            <div style={styles.fileInputWrapper}>
              <input
                id="report-evidence"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={styles.fileInputHidden}
                disabled={hasReported}
                aria-label={tr.selectEvidence}
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
                {evidenceFile ? evidenceFile.name : tr.selectImage}
              </label>
              {evidenceFile && (
                <span style={styles.fileSize}>{(evidenceFile.size / 1024).toFixed(1)} KB</span>
              )}
            </div>
            {evidencePreview && (
              <div style={styles.evidencePreviewWrap}>
                <img src={evidencePreview} alt={tr.evidencePreviewAlt} style={styles.evidencePreview} />
                <button
                  type="button"
                  style={styles.removeEvidenceButton}
                  onClick={() => setEvidenceFile(null)}
                  disabled={hasReported}
                >
                  {tr.removeEvidence}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={styles.actions}>
          <button type="button" style={styles.secondaryButton} onClick={handleClose}>
            {tr.cancel}
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
            {submitting ? tr.sending : hasReported ? tr.alreadyReportedBtn : tr.submit}
          </button>
        </div>
      </div>
    </div>
=======
/**
 * ReportPublicationModal.jsx
 *
 * Wrapper de compatibilidad sobre el ReportModal genérico.
 * Mantiene la misma API de props que antes para no romper PublicationCard.
 *
 * Props:
 *   publication - objeto con { id, product, store, price }
 *   onClose     - callback al cerrar
 *   onSubmit    - (legacy, ya no se usa; el modal llama al API directamente)
 */

import { ReportModal } from '@/components/ReportModal';

export function ReportPublicationModal({ publication, onClose }) {
  const targetName = [
    publication?.product?.name,
    publication?.store?.name,
    publication?.price != null ? `$${publication.price.toLocaleString()}` : null,
  ].filter(Boolean).join(' • ');

  return (
    <ReportModal
      targetType="publication"
      targetId={publication?.id}
      targetName={targetName}
      onClose={onClose}
    />
>>>>>>> prueba
  );
}

export default ReportPublicationModal;
