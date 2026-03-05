/**
 * StoreCard.jsx
 * Tarjeta visual de una tienda para el listado de tiendas.
 */

import { memo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const StoreCard = memo(function StoreCard({ store, onViewDetail }) {
  const { t } = useLanguage();
  const ts = t.storesPage;

  const isPhysical = store.type === 'physical';

  return (
    <div style={styles.card}>
      <div style={styles.iconArea} aria-hidden="true">
        {isPhysical ? '🏬' : '🌐'}
      </div>

      <div style={styles.info}>
        <p style={styles.name}>{store.name}</p>

        <div style={styles.badge}>
          <span style={{ ...styles.typeBadge, ...(isPhysical ? styles.badgePhysical : styles.badgeVirtual) }}>
            {isPhysical ? ts.physical : ts.virtual}
          </span>
        </div>

        {isPhysical && store.address && (
          <p style={styles.address}>
            <span aria-hidden="true">📍 </span>
            {store.address}
          </p>
        )}

        {!isPhysical && store.website_url && (
          <p style={styles.address}>
            <span aria-hidden="true">🔗 </span>
            <span style={styles.urlText}>{store.website_url}</span>
          </p>
        )}
      </div>

      <button
        type="button"
        style={styles.detailBtn}
        onClick={() => onViewDetail?.(store)}
        aria-label={`${ts.viewDetail}: ${store.name}`}
      >
        {ts.viewDetail}
      </button>
    </div>
  );
});

export default StoreCard;

const styles = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    transition: 'box-shadow 0.2s',
  },
  iconArea: {
    fontSize: '28px',
    flexShrink: 0,
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--accent-soft)',
    borderRadius: 'var(--radius-md)',
  },
  info: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  name: {
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    display: 'flex',
  },
  typeBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 8px',
    borderRadius: '99px',
  },
  badgePhysical: {
    background: 'var(--success-soft)',
    color: 'var(--success)',
  },
  badgeVirtual: {
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
  },
  address: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  urlText: {
    fontFamily: 'monospace',
  },
  detailBtn: {
    flexShrink: 0,
    padding: '8px 14px',
    background: 'var(--accent)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
