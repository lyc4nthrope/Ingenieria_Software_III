import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase.client';
import { useLanguage } from '@/contexts/LanguageContext';
import { s, CLOSE_BTN_STYLE, TEXT, BORDER, MUTED } from '../adminStyles';
import { DetailRow, SectionHeader, StatusBadge } from '../components/AdminPrimitives';
import {
  REPORT_STATUS_OPTIONS,
  SEVERITY_COLORS,
  REPORT_SEVERITY,
  normalizeReportStatus,
} from '../adminConstants';

export function ReportDetailsModal({ report, onClose, onSave }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [status, setStatus] = useState(() => normalizeReportStatus(report.status));
  const [actionTaken, setActionTaken] = useState(report.actionTaken || '');
  const [modNotes, setModNotes] = useState(report.modNotes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pub, setPub] = useState(report.publicationSummary || null);
  const [pubDeleted, setPubDeleted] = useState(false);

  // Si no hay publicationSummary (publicación oculta/inactiva), intentar fetch directo
  useEffect(() => {
    if (pub || !report.publicationId) return;
    supabase
      .from('price_publications')
      .select('id, price, is_active, products(name, base_quantity, brand:brands(name), unit_type:unit_types(name, abbreviation)), store:stores(name)')
      .eq('id', report.publicationId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const quantity = data.products?.base_quantity;
          const unitAbbr = data.products?.unit_type?.abbreviation || data.products?.unit_type?.name;
          setPub({
            productName: data.products?.name || '—',
            brand: data.products?.brand?.name || '—',
            unit: quantity && unitAbbr ? `${quantity} ${unitAbbr}` : '—',
            store: data.store?.name || '—',
            price: typeof data.price === 'number'
              ? data.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
              : '—',
            isActive: data.is_active,
          });
          if (data.is_active === false) setPubDeleted(true);
        } else {
          setPubDeleted(true);
        }
      });
  }, [pub, report.publicationId]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await onSave({ status, actionTaken, modNotes });
    setSaving(false);
    setSaved(true);
  };

  const sev = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.baja;
  const typeLabel = td.reportTypes?.[report.rawType] || report.rawType || '—';
  const severityLabel = td.severityLabels?.[report.severity] || report.severity?.toUpperCase() || '—';

  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.reportDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>{typeof td.reportDetailSubtitle === 'function' ? td.reportDetailSubtitle(report.id) : `ID: ${report.id}`}</p>
          </div>
          <button onClick={onClose} title={td.cancel} aria-label={td.cancel} style={CLOSE_BTN_STYLE}>✕</button>
        </div>

        {/* Badges de tipo, severidad y estado */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <span style={{ ...s.severityBadge, background: sev.bg, color: sev.text }}>{severityLabel}</span>
          <span style={{ ...s.badge, background: 'var(--info-soft)', color: 'var(--text-secondary)' }}>{typeLabel}</span>
          <span style={s.statusPill}>{td.statusLabels?.[normalizeReportStatus(report.status)] || report.status}</span>
        </div>

        {/* Info del reporte */}
        <div style={{ ...s.section, marginBottom: 16 }}>
          <div style={{ ...s.sectionHead, marginBottom: 10 }}>
            <span style={s.sectionTitle}>{td.reportInfoTitle}</span>
          </div>
          <div style={s.detailGrid}>
            <DetailRow label={td.labelReason} value={typeLabel} />
            <DetailRow label={td.labelReportedBy} value={report.reporter || td.anonymous} />
            <DetailRow label={td.labelReportedUser} value={report.reported || td.unknown} />
            <DetailRow label={td.labelReportDate} value={report.createdAt ? new Date(report.createdAt).toLocaleString('es-CO') : '—'} />
            {report.resolvedAt && <DetailRow label={td.labelResolvedDate} value={new Date(report.resolvedAt).toLocaleString('es-CO')} />}
            {report.reviewer && <DetailRow label={td.labelReviewedBy} value={report.reviewer} />}
          </div>
        </div>

        {/* Descripción del reporte */}
        {report.description && (
          <div style={{ ...s.section, marginBottom: 16 }}>
            <div style={{ ...s.sectionHead, marginBottom: 8 }}>
              <span style={s.sectionTitle}>{td.labelDescription}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: TEXT, lineHeight: 1.5, background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
              {report.description}
            </p>
          </div>
        )}

        {/* Publicación relacionada */}
        {(pub || (report.publicationId && pubDeleted)) && (
          <div style={{ ...s.section, marginBottom: 16 }}>
            <div style={{ ...s.sectionHead, marginBottom: 10 }}>
              <span style={s.sectionTitle}>{td.labelReportedPub}</span>
              {pubDeleted && (
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--error-soft)', color: 'var(--error)', borderRadius: 4, padding: '2px 8px' }}>
                  {pub ? td.pubDeactivated : td.pubDeletedLabel}
                </span>
              )}
            </div>
            {pub ? (
              <div style={s.detailGrid}>
                <DetailRow label={td.colProduct} value={pub.productName} />
                <DetailRow label={td.colBrand} value={pub.brand} />
                <DetailRow label={td.colUnit} value={pub.unit} />
                <DetailRow label={td.colStore} value={pub.store} />
                <DetailRow label={td.colPrice} value={pub.price} />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
                {td.pubHiddenCompletely(report.publicationId)}
              </p>
            )}
          </div>
        )}

        {/* Imagen de evidencia */}
        {report.evidenceUrl && (
          <div style={{ ...s.section, marginBottom: 16 }}>
            <div style={{ ...s.sectionHead, marginBottom: 10 }}>
              <span style={s.sectionTitle}>{td.labelEvidence}</span>
            </div>
            <img
              src={report.evidenceUrl}
              alt={td.evidenceAlt}
              style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <a href={report.evidenceUrl} target="_blank" rel="noreferrer" style={{ ...s.linkBtn, display: 'block', marginTop: 6, fontSize: 12 }}>
              {td.viewOriginalImage}
            </a>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '16px 0' }} />

        {/* Campos editables */}
        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>{td.filterStatusLabel}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={s.filterSelect}>
            {REPORT_STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>{td.statusLabels?.[item] || item}</option>
            ))}
          </select>
        </label>

        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>{td.labelActionTaken}</span>
          <textarea
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            placeholder={td.actionTakenPlaceholder}
            style={s.modalTextarea}
            rows={3}
          />
        </label>

        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>{td.labelModNotes}</span>
          <textarea
            value={modNotes}
            onChange={(e) => setModNotes(e.target.value)}
            placeholder={td.modNotesPlaceholder}
            style={s.modalTextarea}
            rows={3}
          />
        </label>

        {saved && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>
            ✓ {td.reportSavedOk}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={s.btnDismiss}>{td.cancel}</button>
          <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving}>
            {saving ? '...' : td.saveReportBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportDetailsModal;
