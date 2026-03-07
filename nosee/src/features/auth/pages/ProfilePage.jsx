/**
 * ProfilePage - Página de perfil del usuario autenticado
 * Ruta protegida: solo accesible si hay sesión activa.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthStore, selectAuthUser, selectAuthStatus } from '@/features/auth/store/authStore';
import ProfileCard from '@/features/auth/components/ProfileCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { alertsApi } from '@/services/api';
import { getUserProfileActivity, updateOwnReport, deleteOwnReport } from '@/services/api/users.api';
import { updatePublication } from '@/services/api/publications.api';
import { supabase } from '@/services/supabase.client';

const PASSWORD_RULES = [
  { label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
  { label: 'Una letra mayúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Un número', test: (v) => /\d/.test(v) },
];

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ─── Sección de alertas de precio ────────────────────────────────────────────
function PriceAlertsSection() {
  const { t } = useLanguage();
  const tpa = t.profile.priceAlerts;
  const [alerts, setAlerts] = useState([]);
  const [matchingAlerts, setMatchingAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productQuery, setProductQuery] = useState('');
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [showProductOptions, setShowProductOptions] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const productComboRef = useRef(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    const result = await alertsApi.getUserAlerts();
    if (result.success) setAlerts(result.data);
    const matchesResult = await alertsApi.checkMatchingAlerts();
    if (matchesResult.success) {
      setMatchingAlerts(matchesResult.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  useEffect(() => {
    const query = productQuery.trim();
    if (query.length < 2) {
      setProductOptions([]);
      setSearchingProducts(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearchingProducts(true);
      const result = await alertsApi.searchAlertProducts(query, 8);
      if (result.success) {
        setProductOptions(result.data || []);
      } else {
        setProductOptions([]);
      }
      setSearchingProducts(false);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [productQuery]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!productComboRef.current) return;
      if (!productComboRef.current.contains(event.target)) {
        setShowProductOptions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedProduct?.productId) {
      setError(tpa.selectProductError);
      return;
    }
    if (!targetPrice) return;
    setSaving(true);
    setError(null);
    const result = await alertsApi.createAlert({
      productId: Number(selectedProduct.productId),
      targetPrice: Number(targetPrice),
    });
    if (result.success) {
      setProductQuery('');
      setSelectedProduct(null);
      setProductOptions([]);
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
          <label htmlFor="alert-product-combobox" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {tpa.productLabel} <span aria-hidden="true" style={{ color: 'var(--error)' }}>*</span>
            <span className="sr-only">{tpa.required}</span>
          </label>
          <div ref={productComboRef} style={{ position: 'relative' }}>
            <input
              id="alert-product-combobox"
              type="text"
              placeholder={tpa.productPlaceholder}
              value={productQuery}
              onChange={(e) => {
                const next = e.target.value;
                setProductQuery(next);
                setSelectedProduct(null);
                setShowProductOptions(true);
              }}
              onFocus={() => setShowProductOptions(true)}
              required
              aria-required="true"
              aria-autocomplete="list"
              aria-expanded={showProductOptions}
              aria-controls="alert-product-options"
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'alert-form-error' : undefined}
              style={inputStyle}
            />

            {showProductOptions && (
              <div
                id="alert-product-options"
                role="listbox"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 'calc(100% + 6px)',
                  zIndex: 50,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  boxShadow: '0 8px 22px rgba(0,0,0,0.16)',
                  maxHeight: '260px',
                  overflowY: 'auto',
                }}
              >
                {searchingProducts ? (
                  <p style={{ margin: 0, padding: '10px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {tpa.searchingProducts}
                  </p>
                ) : productQuery.trim().length < 2 ? (
                  <p style={{ margin: 0, padding: '10px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {tpa.searchHint}
                  </p>
                ) : productOptions.length === 0 ? (
                  <p style={{ margin: 0, padding: '10px 12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {tpa.noProductResults}
                  </p>
                ) : (
                  productOptions.map((option) => {
                    const displayName = option.brandName
                      ? `${option.productName} · ${option.brandName}`
                      : option.productName;
                    const currentPrice = Number(option.price || 0).toLocaleString();
                    return (
                      <button
                        key={option.publicationId}
                        type="button"
                        role="option"
                        aria-selected={selectedProduct?.publicationId === option.publicationId}
                        onClick={() => {
                          setSelectedProduct(option);
                          setProductQuery(displayName);
                          setShowProductOptions(false);
                          setError(null);
                        }}
                        style={{
                          width: '100%',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          background: selectedProduct?.publicationId === option.publicationId ? 'var(--bg-base)' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          gap: '10px',
                          padding: '10px 12px',
                          textAlign: 'left',
                        }}
                      >
                        <img
                          src={option.photoUrl || 'https://via.placeholder.com/56x56?text=Foto'}
                          alt={displayName}
                          style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
                          onError={(event) => {
                            event.currentTarget.src = 'https://via.placeholder.com/56x56?text=Foto';
                          }}
                        />
                        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {displayName}
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                            ${currentPrice} · {option.storeName || tpa.unknownStore}
                          </span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: '120px' }}>
          <label htmlFor="alert-target-price" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {tpa.targetPriceLabel} <span aria-hidden="true" style={{ color: 'var(--error)' }}>*</span>
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
          style={{ fontSize: '13px', color: 'var(--error)', marginBottom: '12px' }}
        >
          <span aria-hidden="true">⚠ </span>{error}
        </p>
      )}

      {matchingAlerts.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{
            marginBottom: '12px',
            padding: '10px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(16,185,129,0.35)',
            background: 'rgba(16,185,129,0.12)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {tpa.matchesTitle}
          </p>
          <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-secondary)' }}>
            {matchingAlerts.slice(0, 3).map((match) => {
              const name = match?.publication?.products?.name || tpa.unknownProduct(match?.alert?.product_id);
              const currentPrice = Number(match?.publication?.price || 0).toLocaleString();
              const target = Number(match?.alert?.target_price || 0).toLocaleString();
              return (
                <li key={match?.alert?.id} style={{ fontSize: '12px' }}>
                  {tpa.matchItem(name, currentPrice, target)}
                </li>
              );
            })}
          </ul>
        </div>
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
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: '13px', minHeight: '44px', minWidth: '44px' }}
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
  border: 'none', background: 'var(--accent)', color: 'var(--text-primary)',
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
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(e); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
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
                border: '1px solid var(--error-soft)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
                background: 'none', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--error)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--error-soft)'}
            >
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--error)' }}>
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
                  fontSize: '13px', fontWeight: '600', color: 'var(--bg-base)',
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
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--error)', margin: '0 0 8px' }}>
                {tp.permanentModalTitle}
              </h2>
              <div style={{
                background: 'var(--error-soft)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px', color: 'var(--error)', lineHeight: 1.6,
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
                  border: 'none', background: 'var(--error)',
                  fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)',
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
  PENDING: { label: 'Pendiente', color: 'var(--warning)', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  pending: { label: 'Pendiente', color: 'var(--warning)', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  IN_REVIEW: { label: 'En revisión', color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'rgba(56,189,248,0.3)' },
  in_review: { label: 'En revisión', color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'rgba(56,189,248,0.3)' },
  RESOLVED: { label: 'Resuelto', color: 'var(--success)', bg: 'var(--success-soft)', border: 'rgba(52,211,153,0.3)' },
  resolved: { label: 'Resuelto', color: 'var(--success)', bg: 'var(--success-soft)', border: 'rgba(52,211,153,0.3)' },
  REJECTED: { label: 'Rechazado', color: 'var(--error)', bg: 'var(--error-soft)', border: 'rgba(239,68,68,0.3)' },
  rejected: { label: 'Rechazado', color: 'var(--error)', bg: 'var(--error-soft)', border: 'rgba(239,68,68,0.3)' },
};

// is_active: true = activa, false = inactiva
const getPubStatusConf = (isActive) =>
  isActive !== false
    ? { label: 'Activa', color: 'var(--success)', bg: 'var(--success-soft)' }
    : { label: 'Inactiva', color: 'var(--text-muted)', bg: 'var(--bg-elevated)' };

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
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
          {storeName}
        </p>
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
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{date}</p>
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
    <div role="button" tabIndex={0} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(e); }} style={{
      position: 'fixed', inset: 0, background: 'var(--overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{
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
          <label htmlFor="edit-pub-price" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Precio *</label>
          <input
            id="edit-pub-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="1"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="edit-pub-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Descripción</label>
          <textarea
            id="edit-pub-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {error && <p style={{ fontSize: '13px', color: 'var(--error)', margin: 0 }}>⚠ {error}</p>}

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
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!window.confirm('¿Eliminar este reporte? Esta acción no se puede deshacer.')) return;
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
              placeholder="Describe el problema con más detalle..."
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
      {error && <p style={{ fontSize: '13px', color: 'var(--error)' }}>⚠️ {error}</p>}

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

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!PASSWORD_RULES.every((r) => r.test(pwForm.newPassword))) {
      errors.newPassword = 'La contraseña no cumple los requisitos';
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (Object.keys(errors).length > 0) { setPwErrors(errors); return; }

    setPwLoading(true);
    setPwErrors({});
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    setPwLoading(false);

    if (error) {
      setPwErrors({ server: error.message });
    } else {
      setPwSuccess(true);
      setPwForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setPwSuccess(false);
        setShowPasswordForm(false);
      }, 2500);
    }
  };

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
          {!showPasswordForm ? (
            <Button variant="secondary" size="md" onClick={() => { setShowPasswordForm(true); setPwSuccess(false); setPwErrors({}); }}>
              {tp.changePassword}
            </Button>
          ) : (
            <form onSubmit={handleChangePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                Nueva contraseña
              </p>

              {pwErrors.server && (
                <div role="alert" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--error-soft)', color: 'var(--error)', fontSize: '13px', border: '1px solid rgba(248,113,113,0.25)' }}>
                  {pwErrors.server}
                </div>
              )}

              {pwSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--success-soft)', color: 'var(--success)', fontSize: '13px', fontWeight: '600' }}>
                  ✓ Contraseña actualizada correctamente
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Input
                  label="Nueva contraseña"
                  id="profile-new-password"
                  name="newPassword"
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => { setPwForm((p) => ({ ...p, newPassword: e.target.value })); setPwErrors((p) => ({ ...p, newPassword: '' })); }}
                  placeholder="Mínimo 8 caracteres"
                  error={pwErrors.newPassword}
                  iconRight={
                    <button type="button" onClick={() => setShowPw((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} tabIndex={-1} aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      <EyeIcon open={showPw} />
                    </button>
                  }
                  autoComplete="new-password"
                  required
                  disabled={pwLoading}
                />

                {pwForm.newPassword.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(pwForm.newPassword);
                      return (
                        <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: met ? 'var(--success)' : 'var(--text-muted)' }}>
                          <span style={{ opacity: met ? 1 : 0.4 }}><CheckIcon /></span>
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Input
                label="Confirmar contraseña"
                id="profile-confirm-password"
                name="confirmPassword"
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => { setPwForm((p) => ({ ...p, confirmPassword: e.target.value })); setPwErrors((p) => ({ ...p, confirmPassword: '' })); }}
                placeholder="Repite tu nueva contraseña"
                error={pwErrors.confirmPassword}
                autoComplete="new-password"
                required
                disabled={pwLoading}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="submit" size="md" loading={pwLoading} disabled={pwLoading}>
                  Guardar contraseña
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => { setShowPasswordForm(false); setPwForm({ newPassword: '', confirmPassword: '' }); setPwErrors({}); }} disabled={pwLoading}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

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
        border: '1px solid var(--error-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--error)', marginBottom: '6px' }}>
          {tp.dangerZoneTitle}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
          {tp.dangerZoneDesc}
        </p>

        {deleteError && (
          <div style={{
            background: 'var(--error-soft)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            fontSize: '13px', color: 'var(--error)', marginBottom: '12px',
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
            border: '1px solid var(--error)',
            background: 'none',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--error)',
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
