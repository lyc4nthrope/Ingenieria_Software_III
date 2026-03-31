import { cn } from '@/lib/cn';
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
      className={cn(
        'flex flex-col gap-1 w-full box-border',
        'px-[14px] py-[10px]',
        'bg-surface border border-line rounded-md',
        'cursor-pointer transition-[border-color,box-shadow] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isSelected && 'border-accent shadow-[0_0_0_2px_var(--accent)] bg-accent-soft',
        isBest && !isSelected && 'border-success',
      )}
    >
      {/* ── Fila superior: badges ── */}
      {(isBest || isSelected || isValidated) && (
        <div className="flex flex-wrap gap-[5px]">
          {isBest && (
            <span className="text-[10px] font-extrabold tracking-[0.03em] text-success bg-success-soft px-[7px] py-[1px] rounded-full">
              ★ Mejor precio
            </span>
          )}
          {isSelected && (
            <span className="text-[10px] font-extrabold text-accent bg-accent-soft px-[7px] py-[1px] rounded-full">
              ✓ Seleccionado
            </span>
          )}
          {isValidated && (
            <span className="text-[10px] font-bold text-[#0369a1] bg-[#e0f2fe] px-[7px] py-[1px] rounded-full">
              ✔ Validado
            </span>
          )}
        </div>
      )}

      {/* ── Fila principal ── */}
      <div className="flex items-center gap-[10px]">
        {/* Precio */}
        <div className="flex flex-col items-end shrink-0 min-w-[72px]">
          <span className="text-[17px] font-extrabold text-primary leading-[1.1]">
            ${price.toLocaleString('es-CO')}
          </span>
          <span className="text-[10px] font-medium text-muted">COP</span>
        </div>

        {/* Info del producto y tienda */}
        <div className="flex flex-col flex-1 gap-[2px] min-w-0">
          <span className="text-[13px] font-bold text-primary truncate">{productName}</span>
          <span className="text-[11px] text-muted truncate">
            {storeEmoji} {storeName}
            {hasUnit && (
              <span className="font-semibold text-secondary">
                {' '}· {[quantity, unit].filter(Boolean).join(' ')}
              </span>
            )}
          </span>
        </div>

        {/* Acción */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDetail(pub); }}
          aria-label={`Ver detalle de ${productName}`}
          className={cn(
            'shrink-0 whitespace-nowrap',
            'min-h-[44px] px-[10px] py-[5px]',
            'rounded-sm border border-line bg-elevated',
            'text-[11px] font-bold text-accent',
            'cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          )}
        >
          Detalle
        </button>
      </div>
    </div>
  );
}
