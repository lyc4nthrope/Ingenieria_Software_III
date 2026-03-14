/**
 * StoreDetailModal.jsx
 * Modal de detalle de tienda: muestra ubicación en mapa y publicaciones recientes.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStorePublications, getStoreEvidences, updateStore } from '@/services/api/stores.api';
import { optimizeCloudinaryUrl } from '@/services/cloudinary';
import StoreMapPicker from '@/features/stores/components/StoreMapPicker';

function PublicationMini({ pub, onNavigate, viewDetailLabel }) {
  return (
    <button
      type="button"
      style={miniStyles.card}
      onClick={() => onNavigate(pub.id)}
      title={pub.product?.name || ''}
    >
      {pub.photo_url && (
        <img
          src={optimizeCloudinaryUrl(pub.photo_url, { width: 200 })}
          alt={pub.product?.name || ''}
          style={miniStyles.img}
          loading="lazy"
          decoding="async"
        />
      )}
      <div style={miniStyles.info}>
        <div style={miniStyles.name}>{pub.product?.name || '—'}</div>
        <div style={miniStyles.price}>
          ${pub.price?.toLocaleString('es-CO')}
        </div>
        <div style={miniStyles.link}>{viewDetailLabel}</div>
      </div>
    </button>
  );
}

const miniStyles = {
  card: {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    background: 'var(--bg-muted, var(--bg-surface))',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    alignItems: 'center',
    width: '100%',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  img: {
    width: '48px',
    height: '48px',
    objectFit: 'cover',
    borderRadius: 'var(--radius-sm, 4px)',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  price: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--accent)',
  },
  link: {
    fontSize: '11px',
    color: 'var(--accent)',
    marginTop: '2px',
  },
};

export default function StoreDetailModal({ store, onClose, onStoreUpdated }) {
  const { t } = useLanguage();
  const td = t.storesPage.storeDetail;
  const ts = t.storeDetailModal;
  const navigate = useNavigate();

  const [publications, setPublications] = useState([]);
  const [loadingPubs, setLoadingPubs] = useState(true);
  const [evidences, setEvidences] = useState([]);
  const [expandedEvidence, setExpandedEvidence] = useState(null);
  const [evidenceError, setEvidenceError] = useState(null);
  const [localStore, setLocalStore] = useState(store);
  const [editAddress, setEditAddress] = useState(store.address || '');
  const [editLatitude, setEditLatitude] = useState(
    Number.isFinite(Number(store.latitude)) ? String(store.latitude) : ''
  );
  const [editLongitude, setEditLongitude] = useState(
    Number.isFinite(Number(store.longitude)) ? String(store.longitude) : ''
  );
  const [savingStore, setSavingStore] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const isPhysical = localStore.type === 'physical';

  useEffect(() => {
    setLocalStore(store);
    setEditAddress(store.address || '');
    setEditLatitude(Number.isFinite(Number(store.latitude)) ? String(store.latitude) : '');
    setEditLongitude(Number.isFinite(Number(store.longitude)) ? String(store.longitude) : '');
    setSaveMessage('');
  }, [store]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPubs(true);
    setEvidenceError(null);

    (async () => {
      try {
        const [pubsRes, evidRes] = await Promise.allSettled([
          getStorePublications(localStore.id, 6),
          isPhysical ? getStoreEvidences(localStore.id) : Promise.resolve({ success: true, data: [] }),
        ]);

        if (cancelled) return;

        const pubsValue = pubsRes.status === "fulfilled" ? pubsRes.value : { success: false, data: [] };
        const evidValue = evidRes.status === "fulfilled" ? evidRes.value : { success: false, data: [] };

        setPublications(pubsValue.success ? pubsValue.data : []);
        setEvidences(evidValue.success ? evidValue.data : []);

        if (!evidValue.success && isPhysical) {
          setEvidenceError(evidValue.error || td.noEvidences);
        }
      } finally {
        if (!cancelled) setLoadingPubs(false);
      }
    })();

    return () => { cancelled = true; };
  }, [localStore.id, isPhysical, td.noEvidences]);

  const handleSaveStore = async () => {
    if (!isPhysical) return;
    setSavingStore(true);
    setSaveMessage('');
    const parsedLat = Number(editLatitude);
    const parsedLon = Number(editLongitude);
    const payload = {
      address: editAddress,
      latitude: Number.isFinite(parsedLat) ? parsedLat : undefined,
      longitude: Number.isFinite(parsedLon) ? parsedLon : undefined,
    };

    const result = await updateStore(localStore.id, payload);
    setSavingStore(false);

    if (!result.success) {
      setSaveMessage(result.error || ts.errorUpdate);
      return;
    }

    const updatedStore = {
      ...localStore,
      ...result.data,
      address: result.data.address ?? localStore.address,
      latitude: result.data.latitude,
      longitude: result.data.longitude,
    };

    setLocalStore((prev) => ({
      ...prev,
      ...result.data,
      address: result.data.address ?? prev.address,
      latitude: result.data.latitude,
      longitude: result.data.longitude,
    }));

    if (typeof onStoreUpdated === "function") {
      onStoreUpdated(updatedStore);
    }

    if (typeof window !== "undefined") {
      const detail = {
        storeId: updatedStore.id,
        updatedStore,
        updatedAt: Date.now(),
      };
      window.dispatchEvent(new CustomEvent("nosee:store-updated", { detail }));
      try {
        window.localStorage.setItem("NOSEE_STORE_UPDATED_AT", String(detail.updatedAt));
      } catch {
        // Ignorar errores de storage en modo privado/restringido.
      }
    }

    setSaveMessage(ts.successUpdate);
  };

  // Cerrar con Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={td.title}
      style={styles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span aria-hidden="true" style={styles.icon}>{isPhysical ? '🏬' : '🌐'}</span>
            <div>
              <h2 style={styles.storeName}>{localStore.name}</h2>
              <span style={{ ...styles.typeBadge, ...(isPhysical ? styles.badgePhysical : styles.badgeVirtual) }}>
                {isPhysical ? t.storesPage.physical : t.storesPage.virtual}
              </span>
            </div>
          </div>
          <button
            type="button"
            aria-label={td.close}
            onClick={onClose}
            style={styles.closeBtn}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Info básica */}
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>{td.address}</span>
            <span style={styles.infoValue}>
              {localStore.address || td.noAddress}
            </span>
          </div>

          {!isPhysical && localStore.website_url && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>{td.website}</span>
              <a
                href={localStore.website_url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                {td.visitWebsite} ↗
              </a>
            </div>
          )}

          {/* Evidencias (fotos de la tienda) */}
          {isPhysical && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>{td.evidences}</h3>
              {loadingPubs ? null : evidences.length === 0 ? (
                <p style={styles.muted}>{evidenceError || td.noEvidences}</p>
              ) : (
                <div style={styles.evidenceGrid}>
                  {evidences.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      aria-label={`${td.evidences}: ${store.name}`}
                      style={styles.evidenceBtn}
                      onClick={() => setExpandedEvidence(ev.image_url)}
                    >
                      <img
                        src={optimizeCloudinaryUrl(ev.image_url, { width: 400 })}
                        alt={localStore.name}
                        style={styles.evidenceImg}
                        loading="lazy"
                        decoding="async"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lightbox de evidencia */}
          {expandedEvidence && (
            <div
              role="dialog"
              aria-modal="true"
              aria-label={td.evidences}
              style={styles.lightboxOverlay}
              onClick={() => setExpandedEvidence(null)}
              onKeyDown={(e) => { if (e.key === 'Escape') setExpandedEvidence(null); }}
            >
              <button
                type="button"
                aria-label={td.close}
                style={styles.lightboxClose}
                onClick={() => setExpandedEvidence(null)}
              >
                ✕
              </button>
              <img
                src={expandedEvidence}
                alt={localStore.name}
                style={styles.lightboxImg}
              />
            </div>
          )}

          {/* Edición de dirección y mapa (tienda física) */}
          {isPhysical ? (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>{ts.editAddress}</h3>
              <StoreMapPicker
                latitude={Number.isFinite(Number(editLatitude)) ? Number(editLatitude) : null}
                longitude={Number.isFinite(Number(editLongitude)) ? Number(editLongitude) : null}
                address={editAddress}
                onLocationChange={({ latitude, longitude, address }) => {
                  setEditLatitude(
                    Number.isFinite(Number(latitude)) ? String(Number(latitude)) : ''
                  );
                  setEditLongitude(
                    Number.isFinite(Number(longitude)) ? String(Number(longitude)) : ''
                  );
                  if (typeof address === 'string') setEditAddress(address);
                }}
                onAddressChange={(value) => setEditAddress(value)}
              />
              <button
                type="button"
                onClick={handleSaveStore}
                disabled={savingStore}
                style={styles.saveBtn}
              >
                {savingStore ? ts.saving : ts.saveLocation}
              </button>
              {saveMessage ? <span style={styles.saveMsg}>{saveMessage}</span> : null}
            </div>
          ) : (
            <div style={styles.section}>
              <div style={styles.noLocation}>
                <span aria-hidden="true">🌐 </span>
                {td.noLocation}
              </div>
            </div>
          )}

          {/* Publicaciones destacadas */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>{td.featuredProducts}</h3>
            {loadingPubs ? (
              <p style={styles.muted}>{td.loadingProducts}</p>
            ) : publications.length === 0 ? (
              <p style={styles.muted}>{td.noProducts}</p>
            ) : (
              <div style={styles.pubGrid}>
                {publications.map((pub) => (
                  <PublicationMini
                    key={pub.id}
                    pub={pub}
                    viewDetailLabel={ts.viewDetail}
                    onNavigate={(id) => {
                      onClose();
                      navigate(`/publicaciones?pub=${id}`);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
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
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg, 12px)',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '20px 20px 16px',
    borderBottom: '1px solid var(--border)',
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  icon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  storeName: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  typeBadge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '99px',
    marginTop: '4px',
  },
  badgePhysical: {
    background: 'var(--success-soft)',
    color: 'var(--success)',
  },
  badgeVirtual: {
    background: 'var(--info-soft)',
    color: 'var(--info)',
  },
  closeBtn: {
    flexShrink: 0,
    background: 'var(--bg-muted, rgba(0,0,0,0.06))',
    border: 'none',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
  },
  body: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'baseline',
    fontSize: '14px',
  },
  infoLabel: {
    fontWeight: 600,
    color: 'var(--text-secondary)',
    flexShrink: 0,
  },
  infoValue: {
    color: 'var(--text-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  saveBtn: {
    alignSelf: 'flex-start',
    border: '1px solid var(--accent)',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    borderRadius: 'var(--radius-sm, 6px)',
    padding: '6px 10px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  saveMsg: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  link: {
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 500,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  noLocation: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-muted, rgba(0,0,0,0.03))',
  },
  pubGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
    gap: '8px',
  },
  evidenceGrid: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  evidenceBtn: {
    padding: 0,
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    cursor: 'pointer',
    background: 'none',
    transition: 'opacity 0.15s',
  },
  evidenceImg: {
    width: '100px',
    height: '100px',
    objectFit: 'cover',
    display: 'block',
  },
  lightboxOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay-heavy)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1100,
    cursor: 'pointer',
  },
  lightboxClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'var(--accent-soft)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: 'var(--text-primary)',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImg: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    objectFit: 'contain',
    borderRadius: 'var(--radius-md)',
    cursor: 'default',
  },
  muted: {
    margin: 0,
    fontSize: '13px',
    color: 'var(--text-muted)',
  },
};
