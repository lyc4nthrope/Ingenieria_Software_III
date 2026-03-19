import { getPubStatusConf } from './profileUtils';

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

export default PublicationMiniCard;
