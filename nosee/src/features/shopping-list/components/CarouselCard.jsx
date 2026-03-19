import { getStoreEmoji } from '../utils/shoppingListUtils';
import { carousel } from '../styles/shoppingListStyles';

// ─── Tarjeta de publicación en carrusel ───────────────────────────────────────
export function CarouselCard({ pub, globalIdx, isSelected, onSelect, onDetail }) {
  const isBest = globalIdx === 0;
  const storeEmoji = getStoreEmoji(pub.store?.store_type_id);
  const quantity = pub.product?.base_quantity ?? pub.quantity ?? pub.unit_quantity ?? null;
  const unit = pub.product?.unit_type?.abbreviation ?? pub.product?.unit_type?.name ?? pub.unit ?? pub.measurement_unit ?? null;
  const hasUnitInfo = quantity !== null || unit !== null;

  const productName = pub.product?.name ?? pub.productName ?? pub.product_name ?? 'producto';
  const storeName = pub.store?.name ?? 'tienda';
  const price = (pub.price ?? 0).toLocaleString('es-CO');

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${isSelected ? 'Seleccionado: ' : ''}${productName} en ${storeName} por $${price} COP`}
      onClick={() => onSelect(pub)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(pub); }}
      style={{ ...carousel.card, ...(isSelected ? carousel.cardSelected : {}), cursor: 'pointer' }}
    >
      {isBest && <span style={carousel.bestBadge}>★ Mejor Opción</span>}
      {isSelected && !isBest && <span style={carousel.selectedBadge}>✓ Seleccionado</span>}
      <span style={carousel.storeName}>{storeEmoji} {pub.store?.name ?? 'Tienda'}</span>
      <span style={carousel.price}>
        ${(pub.price ?? 0).toLocaleString('es-CO')}
        <span style={carousel.currency}> COP</span>
      </span>
      <span style={carousel.prodName}>{pub.product?.name ?? pub.productName ?? pub.product_name ?? '—'}</span>
      {hasUnitInfo && (
        <span style={carousel.unitQty}>
          {[quantity, unit].filter(Boolean).join(' ')}
        </span>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onDetail(pub); }}
        style={carousel.detailBtn}
      >
        Ver detalle
      </button>
    </div>
  );
}
