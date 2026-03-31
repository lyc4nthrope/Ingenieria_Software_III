import { getStoreEmoji } from '../utils/shoppingListUtils';

// ─── Vista Resultado de Optimización ─────────────────────────────────────────
export function ResultView({ result, deliveryMode, onBack, onConfirm }) {
  const { stores, totalCost, noResultItems } = result;
  const isDelivery = deliveryMode === 'delivery';
  const modeLabel = isDelivery ? 'Pedido con domicilio' : 'Lista para recoger yo';
  const confirmLabel = isDelivery ? 'Confirmar pedido' : 'Confirmar lista';

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-[13px] font-semibold text-accent cursor-pointer bg-transparent border-none p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ← Volver
        </button>
        <h2 className="text-[1.1rem] font-extrabold text-primary m-0">
          Resultado de Optimización
        </h2>
        <span className="inline-flex items-center gap-[5px] self-start px-2.5 py-1 rounded-full bg-accent-soft text-accent border border-accent text-xs font-bold">
          {isDelivery ? '🛵' : '🚶'} {modeLabel}
        </span>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center px-4 py-3 bg-surface border border-line rounded-md">
        <span className="text-[13px] text-secondary font-semibold">Total</span>
        <span className="text-[18px] font-extrabold text-accent">
          ${totalCost.toLocaleString('es-CO')} COP
        </span>
      </div>

      {/* Sin resultados */}
      {noResultItems.length > 0 && (
        <div className="bg-warning-soft border border-[var(--warning,#ca8a04)] rounded-md px-3.5 py-2.5 text-primary">
          <p className="m-0 font-semibold text-[13px]">Sin publicación elegida:</p>
          {noResultItems.map((item) => (
            <p key={item.id} className="mt-1 mb-0 text-[13px] text-muted">
              • {item.productName}
            </p>
          ))}
        </div>
      )}

      {/* Desglose por tienda */}
      <div className="flex flex-col gap-2">
        {stores.map((s, si) => {
          const emoji = getStoreEmoji(s.store?.store_type_id);
          const subtotal = s.products.reduce((a, p) => a + p.price * (p.item.quantity || 1), 0);
          return (
            <div key={si} className="bg-surface border border-line rounded-md overflow-hidden">
              <div className="flex justify-between items-center px-3.5 py-[9px] bg-elevated border-b border-line text-[13px] font-bold text-primary">
                <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
                <span className="text-accent text-[13px] font-bold">
                  ${subtotal.toLocaleString('es-CO')}
                </span>
              </div>
              <ul className="list-none m-0 p-0">
                {s.products.map((p, pi) => (
                  <li key={pi} className="flex justify-between items-center px-3.5 py-2 border-b border-line text-[13px]">
                    <div>
                      <div className="font-semibold text-primary mb-0.5">{p.item.productName}</div>
                      <div className="text-[11px] text-muted">
                        ×{p.item.quantity || 1} · ${p.price.toLocaleString('es-CO')} c/u
                      </div>
                    </div>
                    <span className="font-bold text-primary shrink-0 ml-2">
                      ${(p.price * (p.item.quantity || 1)).toLocaleString('es-CO')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Botón confirmar */}
      <button
        type="button"
        onClick={onConfirm}
        className="w-full py-3.5 rounded-md border-none bg-accent text-white font-extrabold text-[15px] cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
