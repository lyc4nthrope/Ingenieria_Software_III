import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { getStoreEmoji } from '../utils/shoppingListUtils';
import { resv } from '../styles/shoppingListStyles';

// ─── Vista "Voy yo" — lista + mapa ───────────────────────────────────────────
export function VoyYoMapView({ result, userCoords, onDone }) {
  const { stores, totalCost } = result;
  return (
    <>
      <style>{`
        .voyyo-layout {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 760px) {
          .voyyo-layout { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button type="button" onClick={onDone} style={resv.backBtn}>← Volver</button>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
            🚶 Voy yo — Lista de compras
          </h2>
        </div>
        <div className="voyyo-layout">
          {/* Izquierda: lista de productos por tienda */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{
              padding: '12px 16px',
              background: 'var(--bg-surface)', border: '2px solid var(--accent)',
              borderRadius: 'var(--radius-md)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Total estimado
              </span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)' }}>
                ${totalCost.toLocaleString('es-CO')} <span style={{ fontSize: '12px', fontWeight: 500 }}>COP</span>
              </span>
            </div>
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
                          <div style={resv.prodMeta}>×{p.item.quantity || 1} · ${p.price.toLocaleString('es-CO')} c/u</div>
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
            <button type="button" onClick={onDone} style={{
              padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
              background: 'var(--bg-surface)', color: 'var(--text-secondary)',
              fontWeight: 700, fontSize: '13px', cursor: 'pointer', width: '100%',
            }}>
              ✓ Listo, terminé mis compras
            </button>
          </div>
          {/* Derecha: mapa grande */}
          <div style={{ position: 'sticky', top: '80px' }}>
            <OrderRouteMap
              stores={stores}
              userCoords={userCoords}
              driverLocation={null}
              mapHeight="480px"
            />
          </div>
        </div>
      </div>
    </>
  );
}
