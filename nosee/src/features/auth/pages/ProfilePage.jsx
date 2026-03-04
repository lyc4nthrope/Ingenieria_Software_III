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



function ProfileActivitySection({ user }) {
  const [activity, setActivity] = useState({ publications: [], products: [], stores: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingId, setSavingId] = useState(null);

  const loadActivity = async () => {
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
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadActivity();
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditPublication = async (publication) => {
    const nextPrice = window.prompt('Nuevo precio', publication.price);
    if (nextPrice === null) return;
    const nextDescription = window.prompt('Nueva descripción', publication.description || '');
    if (nextDescription === null) return;

    setSavingId(`pub-${publication.id}`);
    const result = await updatePublication(publication.id, {
      price: Number(nextPrice),
      description: nextDescription,
    });
    setSavingId(null);

    if (!result.success) {
      alert(result.error || 'No se pudo actualizar la publicación');
      return;
    }
    loadActivity();
  };

  const handleEditProduct = async (product) => {
    const nextName = window.prompt('Nuevo nombre de producto', product.name || '');
    if (nextName === null) return;

    setSavingId(`product-${product.id}`);
    const result = await updateProduct(product.id, { name: nextName });
    setSavingId(null);

    if (!result.success) {
      alert(result.error || 'No se pudo actualizar el producto');
      return;
    }
    loadActivity();
  };

  const handleEditStore = async (store) => {
    const nextName = window.prompt('Nuevo nombre de tienda', store.name || '');
    if (nextName === null) return;
    const nextAddress = window.prompt('Nueva dirección', store.address || '');
    if (nextAddress === null) return;
    const nextWebsite = window.prompt('Nuevo sitio web', store.website_url || '');
    if (nextWebsite === null) return;

    setSavingId(`store-${store.id}`);
    const result = await updateStore(store.id, {
      name: nextName,
      address: nextAddress,
      websiteUrl: nextWebsite,
    });
    setSavingId(null);

    if (!result.success) {
      alert(result.error || 'No se pudo actualizar la tienda');
      return;
    }
    loadActivity();
  };

  const handleEditReport = async (report) => {
    const nextReason = window.prompt('Nueva razón del reporte', report.reason || 'other');
    if (nextReason === null) return;
    const nextDescription = window.prompt('Nueva descripción', report.description || '');
    if (nextDescription === null) return;

    setSavingId(`report-${report.id}`);
    const result = await updateOwnReport(report.id, user.id, {
      reason: nextReason,
      description: nextDescription,
    });
    setSavingId(null);

    if (!result.success) {
      alert(result.error || 'No se pudo actualizar el reporte');
      return;
    }
    loadActivity();
  };

  const sectionStyle = {
    marginTop: '20px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '20px 24px',
  };

  const itemStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px 0',
    borderBottom: '1px solid var(--border)',
  };

  const list = (title, rows, renderText, onEdit, keyPrefix) => (
    <div style={{ marginTop: '16px' }}>
      <h3 style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '0 0 8px' }}>{title} ({rows.length})</h3>
      {rows.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Sin registros</p>
      ) : (
        rows.map((row) => (
          <div key={`${keyPrefix}-${row.id}`} style={itemStyle}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{renderText(row)}</div>
            <button
              onClick={() => onEdit(row)}
              disabled={savingId === `${keyPrefix}-${row.id}`}
              style={{
                border: '1px solid var(--border)',
                background: 'none',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 10px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
            >
              {savingId === `${keyPrefix}-${row.id}` ? 'Guardando...' : 'Modificar'}
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div style={sectionStyle}>
      <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
        Mi actividad publicada
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
        Aquí puedes ver y modificar tus publicaciones de precios, productos, tiendas y reportes.
      </p>

      {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando actividad...</p>}
      {error && <p style={{ fontSize: '13px', color: '#dc2626' }}>⚠️ {error}</p>}

      {!loading && !error && (
        <>
          {list(
            'Publicaciones de precios',
            activity.publications || [],
            (publication) => `${publication.product?.name || 'Producto'} en ${publication.store?.name || 'Tienda'} · $${Number(publication.price || 0).toLocaleString()}`,
            handleEditPublication,
            'pub',
          )}

          {list(
            'Productos creados / usados',
            activity.products || [],
            (product) => product.name || 'Producto sin nombre',
            handleEditProduct,
            'product',
          )}

          {list(
            'Tiendas creadas',
            activity.stores || [],
            (store) => `${store.name}${store.address ? ` · ${store.address}` : ''}`,
            handleEditStore,
            'store',
          )}

          {list(
            'Reportes enviados',
            activity.reports || [],
            (report) => `${report.reason} · ${report.status || 'PENDING'}`,
            handleEditReport,
            'report',
          )}
        </>
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
