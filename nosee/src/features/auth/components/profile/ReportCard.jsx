import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { updateOwnReport, deleteOwnReport } from '@/services/api/users.api';
import { inputStyle } from './profileStyles';
import { REASON_LABELS, REASON_OPTIONS, STATUS_CONFIG } from './profileUtils';

// ─── Tarjeta de reporte ───────────────────────────────────────────────────────
function ReportCard({ report, userId, onRefresh }) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(report.reason || 'other');
  const [description, setDescription] = useState(report.description || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const REPORTED_TYPE_LABELS = {
    publication: { label: 'Publicación', icon: '🏷️' },
    store:       { label: 'Tienda',       icon: '🏪' },
    product:     { label: 'Producto',     icon: '📦' },
    brand:       { label: 'Marca',        icon: '🔖' },
    user:        { label: 'Usuario',      icon: '👤' },
  };

  const statusKey = report.status?.toUpperCase() || 'PENDING';
  const statusConf = STATUS_CONFIG[statusKey] || STATUS_CONFIG.PENDING;
  const isPending = statusKey === 'PENDING';
  const isResolved = statusKey === 'RESOLVED';
  const isRejected = statusKey === 'REJECTED';
  const showResolution = (isResolved || isRejected) && (report.mod_notes || report.action_taken);

  const date = report.created_at
    ? new Date(report.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const result = await updateOwnReport(report.id, userId, { reason, description });
    setSaving(false);
    if (!result.success) { setError(result.error || 'No se pudo actualizar'); return; }
    setEditing(false);
    onRefresh();
  };

  const handleCancel = () => {
    setReason(report.reason || 'other');
    setDescription(report.description || '');
    setEditing(false);
    setError(null);
  };

  const handleDelete = async () => {
    if (!window.confirm(t.profile.confirmDeleteReport)) return;
    setDeleting(true);
    setError(null);
    const result = await deleteOwnReport(report.id);
    setDeleting(false);
    if (!result.success) { setError(result.error || 'No se pudo eliminar'); return; }
    onRefresh();
  };

  return (
    <div style={{
      background: 'var(--bg-base)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '14px 16px', marginBottom: '10px',
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
          {REASON_LABELS[report.reason] || report.reason}
        </span>
        <span style={{
          fontSize: '11px', padding: '2px 9px', borderRadius: '999px', fontWeight: 600,
          background: statusConf.bg, color: statusConf.color, border: `1px solid ${statusConf.border}`,
        }}>
          {statusConf.label}
        </span>
        {report.reported_type && REPORTED_TYPE_LABELS[report.reported_type] && (
          <span style={{
            fontSize: '11px', padding: '2px 9px', borderRadius: '999px', fontWeight: 500,
            background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
            border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            {REPORTED_TYPE_LABELS[report.reported_type].icon}
            {REPORTED_TYPE_LABELS[report.reported_type].label}
          </span>
        )}
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{date}</span>
      </div>

      {/* Descripción actual (si no está editando) */}
      {!editing && report.description && (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>
          {report.description}
        </p>
      )}

      {/* Resolución (si está resuelto o rechazado) */}
      {!editing && showResolution && (
        <div style={{
          background: statusConf.bg, border: `1px solid ${statusConf.border}`,
          borderRadius: 'var(--radius-sm)', padding: '10px 12px', marginBottom: '8px',
        }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: statusConf.color, margin: '0 0 4px' }}>
            {isResolved ? t.profile.resolvedLabel : t.profile.rejectedLabel}
          </p>
          {report.action_taken && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 2px' }}>
              <strong>Acción tomada:</strong> {report.action_taken}
            </p>
          )}
          {report.mod_notes && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              <strong>Notas del moderador:</strong> {report.mod_notes}
            </p>
          )}
          {report.resolved_at && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {new Date(report.resolved_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>
      )}

      {/* Formulario de edición */}
      {editing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="report-reason" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Razón del reporte</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ ...inputStyle, background: 'var(--bg-surface)' }}
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label htmlFor="report-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Descripción (opcional)</label>
            <textarea
              id="report-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t.profile.reportDetailPlaceholder}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {error && <p style={{ fontSize: '12px', color: 'var(--error)', margin: 0 }}>⚠ {error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCancel} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'none',
              fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--accent)', color: 'var(--text-primary)',
              fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {/* Botones (solo si PENDING y no está en modo edición) */}
      {isPending && !editing && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setEditing(true)} style={{
            border: '1px solid var(--border)', background: 'none',
            borderRadius: 'var(--radius-sm)', padding: '5px 12px',
            fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
          }}>
            ✏ Modificar reporte
          </button>
          <button onClick={handleDelete} disabled={deleting} style={{
            border: '1px solid var(--error, #e53e3e)', background: 'none',
            borderRadius: 'var(--radius-sm)', padding: '5px 12px',
            fontSize: '12px', color: 'var(--error, #e53e3e)', cursor: deleting ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            opacity: deleting ? 0.6 : 1,
          }}>
            🗑 {deleting ? 'Eliminando...' : 'Eliminar reporte'}
          </button>
        </div>
      )}
      {isPending && !editing && error && (
        <p style={{ fontSize: '12px', color: 'var(--error)', margin: '6px 0 0' }}>⚠ {error}</p>
      )}
    </div>
  );
}

export default ReportCard;
