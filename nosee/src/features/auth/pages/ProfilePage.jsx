/**
 * ProfilePage - Página de perfil del usuario autenticado
 * Ruta protegida: solo accesible si hay sesión activa.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore, selectAuthUser, selectAuthStatus } from '@/features/auth/store/authStore';
import ProfileCard from '@/features/auth/components/ProfileCard';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { alertsApi } from '@/services/api';
import { getUserProfileActivity, updateOwnReport } from '@/services/api/users.api';
import { updatePublication } from '@/services/api/publications.api';

// ─── Sección de alertas de precio ────────────────────────────────────────────
function PriceAlertsSection() {
  const { t } = useLanguage();
  const tpa = t.profile.priceAlerts;
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const result = await alertsApi.getUserAlerts();
    if (result.success) setAlerts(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!productId || !targetPrice) return;
    setSaving(true);
    setError(null);
    const result = await alertsApi.createAlert({
      productId: Number(productId),
      targetPrice: Number(targetPrice),
    });
    if (result.success) {
      setProductId('');
      setTargetPrice('');
      fetchAlerts();
    } else {
      setError(result.error);
    }
    setSaving(false);
  };

  const handleDelete = async (alertId) => {
    await alertsApi.deleteAlert(alertId);
    fetchAlerts();
  };

  return (
    <div style={{
      marginTop: '20px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px 24px',
    }}>
      <h2
        id="price-alerts-title"
        style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}
      >
        <span aria-hidden="true">🔔 </span>{tpa.title}
      </h2>
      <p id="price-alerts-desc" style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        {tpa.description}
      </p>

      {/* Formulario nueva alerta */}
      <form
        onSubmit={handleCreate}
        aria-labelledby="price-alerts-title"
        aria-describedby="price-alerts-desc"
        style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'flex-end' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
          <label htmlFor="alert-product-id" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {tpa.productIdLabel} <span aria-hidden="true">*</span>
            <span className="sr-only">{tpa.required}</span>
          </label>
          <input
            id="alert-product-id"
            type="number"
            placeholder={tpa.productIdPlaceholder}
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            required
            aria-required="true"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'alert-form-error' : undefined}
            style={inputStyle}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
          <label htmlFor="alert-target-price" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {tpa.targetPriceLabel} <span aria-hidden="true">*</span>
            <span className="sr-only">{tpa.required}</span>
          </label>
          <input
            id="alert-target-price"
            type="number"
            placeholder={tpa.targetPricePlaceholder}
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            min="0"
            step="0.01"
            required
            aria-required="true"
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          aria-busy={saving}
          style={{ ...btnStyle, alignSelf: 'flex-end' }}
        >
          {saving ? tpa.saving : tpa.addAlert}
        </button>
      </form>

      {error && (
        <p
          id="alert-form-error"
          role="alert"
          style={{ fontSize: '13px', color: '#dc2626', marginBottom: '12px' }}
        >
          <span aria-hidden="true">⚠ </span>{error}
        </p>
      )}

      {/* Lista de alertas */}
      {loading ? (
        <p role="status" aria-live="polite" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          {tpa.loading}
        </p>
      ) : alerts.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{tpa.empty}</p>
      ) : (
        <ul
          aria-label={tpa.listLabel}
          style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}
        >
          {alerts.map((a) => {
            const productName = a.products?.name ?? tpa.unknownProduct(a.product_id);
            const priceFormatted = Number(a.target_price).toLocaleString();
            return (
              <li key={a.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
              }}>
                <div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{productName}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                    ≤ ${priceFormatted}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  aria-label={tpa.deleteAriaLabel(productName, priceFormatted)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: '13px', minHeight: '44px', minWidth: '44px' }}
                >
                  {tpa.delete}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const inputStyle = {
  padding: '8px 12px', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)', fontSize: '13px',
  flex: 1, minWidth: '120px',
};
const btnStyle = {
  padding: '8px 16px', borderRadius: 'var(--radius-md)',
  border: 'none', background: 'var(--accent)', color: '#fff',
  fontSize: '13px', fontWeight: 600, cursor: 'pointer',
};

// ─── Modal de eliminación de cuenta ──────────────────────────────────────────
function DeleteAccountModal({ onClose, onConfirm, loading }) {
  const { t } = useLanguage();
  const tp = t.profile;
  const [step, setStep] = useState('choose');
  const [mode, setMode] = useState(null);
  const titleId = 'delete-modal-title';

  const handleChoose = (chosen) => {
    setMode(chosen);
    setStep(chosen === 'permanent' ? 'confirm-permanent' : 'confirm-deactivate');
  };

  const handleConfirm = () => {
    onConfirm(mode === 'permanent');
  };

  const handleKeyDown = (e, chosen) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleChoose(chosen);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          width: '100%', maxWidth: '480px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >

        {/* ── Paso 1: elegir modo ── */}
        {step === 'choose' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {tp.deleteModalTitle}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {tp.deleteModalSubtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleChoose('deactivate')}
              onKeyDown={(e) => handleKeyDown(e, 'deactivate')}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
                background: 'none', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {tp.deactivateTitle}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {tp.deactivateDesc}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleChoose('permanent')}
              onKeyDown={(e) => handleKeyDown(e, 'permanent')}
              style={{
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
                background: 'none', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fecaca'}
            >
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                {tp.permanentTitle}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {tp.permanentDesc}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                alignSelf: 'flex-end', background: 'none', border: 'none',
                fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              {tp.cancel}
            </button>
          </>
        )}

        {/* ── Paso 2a: confirmar desactivación ── */}
        {step === 'confirm-deactivate' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {tp.confirmDeactivateTitle}
              </h2>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
              }}>
                {tp.confirmDeactivateInfo}
                <br /><br />
                <strong style={{ color: 'var(--text-primary)' }}>{tp.confirmDeactivateDetail}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('choose')}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'none',
                  fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                {tp.back}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--accent)',
                  fontSize: '13px', fontWeight: '600', color: '#080C14',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? tp.processing : tp.confirmDeactivate}
              </button>
            </div>
          </>
        )}

        {/* ── Paso 2b: confirmar eliminación permanente ── */}
        {step === 'confirm-permanent' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', margin: '0 0 8px' }}>
                {tp.permanentModalTitle}
              </h2>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px', color: '#7f1d1d', lineHeight: 1.6,
              }}>
                {tp.permanentWarning}
                <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                  {tp.permanentItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('choose')}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'none',
                  fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                {tp.back}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: '#dc2626',
                  fontSize: '13px', fontWeight: '600', color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? tp.deleting : tp.confirmPermanent}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}



// ─── Constantes para reportes ─────────────────────────────────────────────────
const REASON_LABELS = {
  fake_price: 'Precio falso o engañoso',
  wrong_photo: 'Foto no coincide con la publicación',
  spam: 'Spam o contenido repetitivo',
  offensive: 'Contenido ofensivo o inapropiado',
  other: 'Otro motivo',
};

const REASON_OPTIONS = [
  { value: 'fake_price', label: 'Precio falso o engañoso' },
  { value: 'wrong_photo', label: 'Foto no coincide con la publicación' },
  { value: 'spam', label: 'Spam o contenido repetitivo' },
  { value: 'offensive', label: 'Contenido ofensivo o inapropiado' },
  { value: 'other', label: 'Otro motivo' },
];

const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  pending: { label: 'Pendiente', color: '#92400e', bg: '#fef3c7', border: '#fde68a' },
  IN_REVIEW: { label: 'En revisión', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  in_review: { label: 'En revisión', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  RESOLVED: { label: 'Resuelto', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  resolved: { label: 'Resuelto', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' },
  REJECTED: { label: 'Rechazado', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
  rejected: { label: 'Rechazado', color: '#991b1b', bg: '#fef2f2', border: '#fecaca' },
};

// is_active: true = activa, false = inactiva
const getPubStatusConf = (isActive) =>
  isActive !== false
    ? { label: 'Activa', color: '#166534', bg: '#f0fdf4' }
    : { label: 'Inactiva', color: '#6b7280', bg: '#f3f4f6' };

// ─── Tarjeta de publicación (mini) ────────────────────────────────────────────
function PublicationMiniCard({ publication, onEdit, saving }) {
  const productName = publication.product?.name || 'Producto';
  const storeName = publication.store?.name || 'Tienda';
  const price = Number(publication.price || 0).toLocaleString('es-CO');
  const date = publication.created_at
    ? new Date(publication.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const statusConf = getPubStatusConf(publication.is_active);

  return (
    <div style={{
      display: 'flex', gap: '12px', alignItems: 'flex-start',
      padding: '12px 0', borderBottom: '1px solid var(--border)',
    }}>
      {/* Thumbnail */}
      <div style={{
        width: '60px', height: '60px', flexShrink: 0,
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {publication.photo_url ? (
          <img
            src={publication.photo_url}
            alt={productName}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontSize: '22px' }}>📦</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '2px' }}>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {productName}
          </span>
          <span style={{
            fontSize: '11px', padding: '1px 7px', borderRadius: '999px',
            background: statusConf.bg, color: statusConf.color, fontWeight: 500,
          }}>
            {statusConf.label}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {storeName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent)' }}>
            ${price}
          </span>
          {publication.description && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
              {publication.description}
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{date}</div>
      </div>

      {/* Acción */}
      <button
        onClick={() => onEdit(publication)}
        disabled={saving}
        style={{
          flexShrink: 0, border: '1px solid var(--border)', background: 'none',
          borderRadius: 'var(--radius-sm)', padding: '5px 12px',
          fontSize: '12px', color: 'var(--text-primary)', cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? 'Guardando...' : 'Editar'}
      </button>
    </div>
  );
}

// ─── Modal inline para editar publicación ─────────────────────────────────────
function EditPublicationModal({ publication, onClose, onSave }) {
  const [price, setPrice] = useState(String(publication.price || ''));
  const [description, setDescription] = useState(publication.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!price || isNaN(Number(price))) { setError('Ingresa un precio válido'); return; }
    setSaving(true);
    setError(null);
    const result = await updatePublication(publication.id, {
      price: Number(price),
      description,
    });
    setSaving(false);
    if (!result.success) { setError(result.error || 'No se pudo actualizar'); return; }
    onSave();
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '24px', width: '100%', maxWidth: '420px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Editar publicación
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          {publication.product?.name} · {publication.store?.name}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Precio *</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="1"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {error && <p style={{ fontSize: '13px', color: '#dc2626', margin: 0 }}>⚠ {error}</p>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', background: 'none',
            fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{
            ...btnStyle, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer',
          }}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Tarjeta de reporte ───────────────────────────────────────────────────────
function ReportCard({ report, userId, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState(report.reason || 'other');
  const [description, setDescription] = useState(report.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

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
            {isResolved ? 'Cómo fue resuelto:' : 'Motivo de rechazo:'}
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
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Razón del reporte</label>
            <select
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
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe el problema con más detalle..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
          {error && <p style={{ fontSize: '12px', color: '#dc2626', margin: 0 }}>⚠ {error}</p>}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleCancel} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)', background: 'none',
              fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer',
            }}>Cancelar</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              border: 'none', background: 'var(--accent)', color: '#fff',
              fontSize: '12px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}>{saving ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </div>
      )}

      {/* Botón editar (solo si PENDING y no está en modo edición) */}
      {isPending && !editing && (
        <button onClick={() => setEditing(true)} style={{
          border: '1px solid var(--border)', background: 'none',
          borderRadius: 'var(--radius-sm)', padding: '5px 12px',
          fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '4px',
        }}>
          ✏ Modificar reporte
        </button>
      )}
    </div>
  );
}

// ─── Sección de actividad del perfil ─────────────────────────────────────────
function ProfileActivitySection({ user }) {
  const [activity, setActivity] = useState({ publications: [], products: [], stores: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('publications');
  const [editingPub, setEditingPub] = useState(null);

  const loadActivity = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const result = await getUserProfileActivity(user.id);
    if (!result.success) {
      setError(result.error || 'No se pudo cargar tu actividad');
    } else {
      setActivity(result.data);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const publications = activity.publications || [];
  const reports = activity.reports || [];

  const tabStyle = (active) => ({
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div style={{
      marginTop: '20px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px 24px',
    }}>
      <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
        Mi actividad
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Tus publicaciones y los reportes que has enviado.
      </p>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '4px', width: 'fit-content',
      }}>
        <button style={tabStyle(activeTab === 'publications')} onClick={() => setActiveTab('publications')}>
          Publicaciones ({publications.length})
        </button>
        <button style={tabStyle(activeTab === 'reports')} onClick={() => setActiveTab('reports')}>
          Reportes ({reports.length})
        </button>
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando...</p>}
      {error && <p style={{ fontSize: '13px', color: '#dc2626' }}>⚠️ {error}</p>}

      {!loading && !error && (
        <>
          {/* ── Tab: Publicaciones ── */}
          {activeTab === 'publications' && (
            <div>
              {publications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                    Aún no has publicado ningún precio.
                  </p>
                </div>
              ) : (
                publications.map((pub) => (
                  <PublicationMiniCard
                    key={pub.id}
                    publication={pub}
                    onEdit={(p) => setEditingPub(p)}
                    saving={false}
                  />
                ))
              )}
            </div>
          )}

          {/* ── Tab: Reportes ── */}
          {activeTab === 'reports' && (
            <div>
              {reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🚩</div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                    No has enviado ningún reporte.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Los reportes pendientes pueden modificarse antes de ser revisados.
                  </p>
                  {reports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      userId={user.id}
                      onRefresh={loadActivity}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal para editar publicación */}
      {editingPub && (
        <EditPublicationModal
          publication={editingPub}
          onClose={() => setEditingPub(null)}
          onSave={() => { setEditingPub(null); loadActivity(); }}
        />
      )}
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t } = useLanguage();
  const tp = t.profile;
  const user = useAuthStore(selectAuthUser);
  const status = useAuthStore(selectAuthStatus);
  const { updateProfile, logout, deleteAccount } = useAuthStore();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteConfirm = async (permanent) => {
    setDeleteError(null);
    const result = await deleteAccount(permanent);
    if (result.success) {
      navigate('/');
    } else {
      setDeleteError(result.error);
    }
  };

  return (
    <main style={{
      flex: 1,
      maxWidth: '640px',
      margin: '0 auto',
      padding: '28px 16px',
      width: '100%',
    }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {tp.title}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {tp.subtitle}
        </p>
      </div>

      {/* Tarjeta de perfil */}
      <ProfileCard
        user={user}
        onUpdate={updateProfile}
        loading={status === 'loading'}
      />

      <ProfileActivitySection user={user} />

      {/* Sección de seguridad */}
      <div style={{
        marginTop: '20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '14px' }}>
          {tp.securityTitle}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button variant="secondary" size="md" onClick={() => navigate('/recuperar-contrasena')}>
            {tp.changePassword}
          </Button>
          <Button variant="danger" size="md" onClick={handleLogout} loading={status === 'loading'}>
            {tp.logout}
          </Button>
        </div>
      </div>

      {/* Alertas de precios */}
      <PriceAlertsSection />

      {/* Zona peligrosa */}
      <div style={{
        marginTop: '20px',
        background: 'var(--bg-surface)',
        border: '1px solid #fecaca',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#dc2626', marginBottom: '6px' }}>
          {tp.dangerZoneTitle}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
          {tp.dangerZoneDesc}
        </p>

        {deleteError && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            fontSize: '13px', color: '#991b1b', marginBottom: '12px',
          }}>
            ⚠️ {deleteError}
          </div>
        )}

        <button
          onClick={() => { setDeleteError(null); setShowDeleteModal(true); }}
          disabled={status === 'loading'}
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #dc2626',
            background: 'none',
            fontSize: '13px',
            fontWeight: '600',
            color: '#dc2626',
            cursor: 'pointer',
          }}
        >
          {tp.deleteAccount}
        </button>
      </div>

      {/* Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          loading={status === 'loading'}
        />
      )}
    </main>
  );
}
