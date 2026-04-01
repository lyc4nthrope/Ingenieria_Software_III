import { getStoreEmoji } from '../utils/shoppingListUtils';

// ─── Tarjeta de publicación (vista vertical) ──────────────────────────────────
// Diseño full-width: muestra toda la info relevante en una fila clara.
export function CarouselCard({ pub, globalIdx, isSelected, onSelect, onDetail }) {
  const isBest     = globalIdx === 0;
  const storeEmoji = getStoreEmoji(pub.store?.store_type_id);
  const quantity   = pub.product?.base_quantity ?? pub.quantity ?? pub.unit_quantity ?? null;
  const unit       = pub.product?.unit_type?.abbreviation ?? pub.product?.unit_type?.name ?? pub.unit ?? pub.measurement_unit ?? null;
  const hasUnit    = quantity !== null || unit !== null;
  const isValidated = pub.is_validated ?? pub.validated ?? false;

  const productName = pub.product?.name ?? pub.productName ?? pub.product_name ?? 'Producto';
  const storeName   = pub.store?.name ?? 'Tienda';
  const price       = pub.price ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Seleccionado: ' : ''}${productName} en ${storeName} por $${price.toLocaleString('es-CO')} COP`}
      onClick={() => onSelect(pub)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(pub); }}
      style={{ ...s.card, ...(isSelected ? s.cardSelected : {}), ...(isBest ? s.cardBest : {}) }}
    >
      {/* ── Fila superior: badges ── */}
      {(isBest || isSelected || isValidated) && (
        <div style={s.badges}>
          {isBest && <span style={s.bestBadge}>★ Mejor precio</span>}
          {isSelected && <span style={s.selectedBadge}>✓ Seleccionado</span>}
          {isValidated && <span style={s.validBadge}>✔ Validado</span>}
        </div>
      )}

      {/* ── Fila principal ── */}
      <div style={s.mainRow}>
        {/* Precio */}
        <div style={s.priceBlock}>
          <span style={s.price}>${price.toLocaleString('es-CO')}</span>
          <span style={s.currency}>COP</span>
        </div>

        {/* Info del producto y tienda */}
        <div style={s.infoBlock}>
          <span style={s.prodName}>{productName}</span>
          <span style={s.storeLine}>
            {storeEmoji} {storeName}
            {hasUnit && (
              <span style={s.unitQty}> · {[quantity, unit].filter(Boolean).join(' ')}</span>
            )}
          </span>
        </div>

        {/* Acción */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDetail(pub); }}
          style={s.detailBtn}
          aria-label={`Ver detalle de ${productName}`}
        >
          Detalle
        </button>
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    padding: '10px 14px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    boxSizing: 'border-box',
    width: '100%',
  },
  cardSelected: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 2px var(--accent)',
    background: 'var(--accent-soft, rgba(99,102,241,0.07))',
  },
  cardBest: {
    borderColor: 'var(--success, #16a34a)',
  },
  badges: {
    display: 'flex',
    gap: '5px',
    flexWrap: 'wrap',
  },
  bestBadge: {
    fontSize: '10px', fontWeight: 800,
    color: 'var(--success, #16a34a)',
    background: 'var(--success-soft, #dcfce7)',
    padding: '1px 7px', borderRadius: '999px',
    letterSpacing: '0.03em',
  },
  selectedBadge: {
    fontSize: '10px', fontWeight: 800,
    color: 'var(--accent)',
    background: 'var(--accent-soft)',
    padding: '1px 7px', borderRadius: '999px',
  },
  validBadge: {
    fontSize: '10px', fontWeight: 700,
    color: '#0369a1',
    background: '#e0f2fe',
    padding: '1px 7px', borderRadius: '999px',
  },
  mainRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  priceBlock: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 0,
    minWidth: '72px',
  },
  price: {
    fontSize: '17px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    lineHeight: 1.1,
  },
  currency: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  infoBlock: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  prodName: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  storeLine: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  unitQty: {
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  detailBtn: {
    flexShrink: 0,
    padding: '5px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--accent)',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
};
