import { getStoreEmoji } from '../utils/shoppingListUtils';
import { resv } from '../styles/shoppingListStyles';

// ─── Vista Resultado de Optimización ─────────────────────────────────────────
export function ResultView({ result, deliveryMode, onBack, onConfirm }) {
  const { stores, totalCost, noResultItems } = result;
  const isDelivery = deliveryMode === 'delivery';
  const modeLabel = isDelivery ? 'Pedido con domicilio' : 'Lista para recoger yo';
  const confirmLabel = isDelivery ? 'Confirmar pedido' : 'Confirmar lista';

  return (
    <div style={resv.root}>
      {/* Header */}
      <div style={resv.header}>
        <button type="button" onClick={onBack} style={resv.backBtn}>← Volver</button>
        <h2 style={resv.title}>Resultado de Optimización</h2>
        <span style={resv.modeBadge}>
          {isDelivery ? '🛵' : '🚶'} {modeLabel}
        </span>
      </div>

      {/* Total */}
      <div style={resv.totalRow}>
        <span style={resv.totalLabel}>Total</span>
        <span style={resv.totalValue}>${totalCost.toLocaleString('es-CO')} COP</span>
      </div>

      {/* Sin resultados */}
      {noResultItems.length > 0 && (
        <div style={resv.warning}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>Sin publicación elegida:</p>
          {noResultItems.map((item) => (
            <p key={item.id} style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              • {item.productName}
            </p>
          ))}
        </div>
      )}

      {/* Desglose por tienda */}
      <div style={resv.storeList}>
        {stores.map((s, si) => {
          const emoji = getStoreEmoji(s.store?.store_type_id);
          const subtotal = s.products.reduce((a, p) => a + p.price * (p.item.quantity || 1), 0);
          return (
            <div key={si} style={resv.storeCard}>
              <div style={resv.storeHeader}>
                <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
                <span style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 700 }}>
                  ${subtotal.toLocaleString('es-CO')}
                </span>
              </div>
              <ul style={resv.prodList}>
                {s.products.map((p, pi) => (
                  <li key={pi} style={resv.prodItem}>
                    <div>
                      <div style={resv.prodName}>{p.item.productName}</div>
                      <div style={resv.prodMeta}>
                        ×{p.item.quantity || 1} · ${p.price.toLocaleString('es-CO')} c/u
                      </div>
                    </div>
                    <span style={resv.prodTotal}>
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
      <button type="button" onClick={onConfirm} style={resv.confirmBtn}>
        {confirmLabel}
      </button>
    </div>
  );
}
