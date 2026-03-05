/**
 * StoreDetailModal.jsx
 * Modal de detalle de tienda: muestra ubicación en mapa y publicaciones recientes.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getStorePublications, getStoreEvidences } from '@/services/api/stores.api';

const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const DEFAULT_ZOOM = 16;

function ensureLeafletLoaded() {
  if (window.L) return Promise.resolve(window.L);
  if (window.__leafletLoaderPromise) return window.__leafletLoaderPromise;

  window.__leafletLoaderPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-leaflet-css="${LEAFLET_CSS_URL}"]`)) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS_URL;
      css.dataset.leafletCss = LEAFLET_CSS_URL;
      document.head.appendChild(css);
    }

    const existing = document.querySelector(`script[data-leaflet-js="${LEAFLET_JS_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Leaflet')));
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.dataset.leafletJs = LEAFLET_JS_URL;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
    document.body.appendChild(script);
  }).catch((err) => {
    window.__leafletLoaderPromise = null;
    throw err;
  });

  return window.__leafletLoaderPromise;
}

function StoreMap({ latitude, longitude, storeName, td }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const L = await ensureLeafletLoaded();
        if (!mounted || !containerRef.current) return;
        if (mapRef.current) return;

        // Fix default marker icons
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const map = L.map(containerRef.current).setView([latitude, longitude], DEFAULT_ZOOM);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        L.marker([latitude, longitude])
          .addTo(map)
          .bindPopup(storeName)
          .openPopup();
      } catch (err) {
        if (mounted) setError(err.message);
      }
    }

    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return <div style={mapStyles.error}>{td.mapLoadError}</div>;
  }

  return <div ref={containerRef} style={mapStyles.container} />;
}

const mapStyles = {
  container: {
    width: '100%',
    height: '220px',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    zIndex: 0,
  },
  error: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
};

function PublicationMini({ pub, onNavigate }) {
  return (
    <button
      type="button"
      style={miniStyles.card}
      onClick={() => onNavigate(pub.id)}
      title={pub.product?.name || ''}
    >
      {pub.photo_url && (
        <img
          src={pub.photo_url}
          alt={pub.product?.name || ''}
          style={miniStyles.img}
        />
      )}
      <div style={miniStyles.info}>
        <div style={miniStyles.name}>{pub.product?.name || '—'}</div>
        <div style={miniStyles.price}>
          ${pub.price?.toLocaleString('es-CO')}
        </div>
        <div style={miniStyles.link}>Ver detalle →</div>
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

export default function StoreDetailModal({ store, onClose }) {
  const { t } = useLanguage();
  const td = t.storesPage.storeDetail;
  const navigate = useNavigate();

  const [publications, setPublications] = useState([]);
  const [loadingPubs, setLoadingPubs] = useState(true);
  const [evidences, setEvidences] = useState([]);
  const [expandedEvidence, setExpandedEvidence] = useState(null);

  const isPhysical = store.type === 'physical';
  const hasLocation = isPhysical && Number.isFinite(store.latitude) && Number.isFinite(store.longitude);

  useEffect(() => {
    let cancelled = false;
    setLoadingPubs(true);

    Promise.all([
      getStorePublications(store.id, 6),
      isPhysical ? getStoreEvidences(store.id) : Promise.resolve({ success: true, data: [] }),
    ]).then(([pubsRes, evidRes]) => {
      if (!cancelled) {
        setPublications(pubsRes.success ? pubsRes.data : []);
        setEvidences(evidRes.success ? evidRes.data : []);
        setLoadingPubs(false);
      }
    });

    return () => { cancelled = true; };
  }, [store.id, isPhysical]);

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
              <h2 style={styles.storeName}>{store.name}</h2>
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
              {store.address || td.noAddress}
            </span>
          </div>

          {!isPhysical && store.website_url && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>{td.website}</span>
              <a
                href={store.website_url}
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
                <p style={styles.muted}>{td.noEvidences}</p>
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
                        src={ev.image_url}
                        alt={store.name}
                        style={styles.evidenceImg}
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
                role="button"
                tabIndex={0}
                src={expandedEvidence}
                alt={store.name}
                style={styles.lightboxImg}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Mapa */}
          <div style={styles.section}>
            {hasLocation ? (
              <StoreMap
                latitude={store.latitude}
                longitude={store.longitude}
                storeName={store.name}
                td={td}
              />
            ) : (
              <div style={styles.noLocation}>
                <span aria-hidden="true">🌐 </span>
                {td.noLocation}
              </div>
            )}
          </div>

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
    background: 'rgba(0,0,0,0.55)',
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
    background: 'rgba(34,197,94,0.12)',
    color: '#16a34a',
  },
  badgeVirtual: {
    background: 'rgba(99,102,241,0.12)',
    color: '#6366f1',
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
    background: 'rgba(0,0,0,0.9)',
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
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff',
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
