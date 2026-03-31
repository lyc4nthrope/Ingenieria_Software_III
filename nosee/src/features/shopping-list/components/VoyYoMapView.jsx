import { useState } from 'react';
import { StoreOnlyMap } from '@/features/orders/components/StoreOnlyMap';
import { parseStoreCoords } from '@/features/orders/utils/parseStoreCoords';
import { getStoreEmoji } from '@/features/shopping-list/utils/shoppingListUtils';

const MAX_GMAPS_WAYPOINTS = 8;

function buildGoogleMapsUrl(stores, userCoords) {
  const positions = stores
    .map((s) => parseStoreCoords(s.store?.location))
    .filter((p) => p?.lat && p?.lng)
    .slice(0, MAX_GMAPS_WAYPOINTS);

  if (positions.length === 0) return null;

  const destination = positions[positions.length - 1];
  const waypoints   = positions.slice(0, -1);

  let url = `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`;
  if (userCoords?.lat && userCoords?.lng) {
    url += `&origin=${userCoords.lat},${userCoords.lng}`;
  }
  if (waypoints.length > 0) {
    url += `&waypoints=${waypoints.map((p) => `${p.lat},${p.lng}`).join('|')}`;
  }
  return url;
}

export function VoyYoMapView({ result, userCoords, onAddProduct, onRemoveOrder }) {
  const [panelOpen, setPanelOpen] = useState(true);

  const stores      = result?.stores ?? [];
  const totalCost   = result?.totalCost ?? 0;
  const gmapsUrl    = buildGoogleMapsUrl(stores, userCoords);
  const truncated   = stores.length > MAX_GMAPS_WAYPOINTS;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '500px' }}>
      {/* ── Mapa full-screen ── */}
      <StoreOnlyMap stores={stores} userCoords={userCoords} />

      {/* ── Panel izquierdo colapsable ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, height: '100%',
        width: panelOpen ? '300px' : '0px',
        zIndex: 1000,
        background: 'var(--bg-surface)',
        borderRight: panelOpen ? '1px solid var(--border)' : 'none',
        overflowY: panelOpen ? 'auto' : 'hidden',
        overflowX: 'hidden',
        transition: 'width 0.2s ease',
        display: 'flex', flexDirection: 'column',
      }}>
        {panelOpen && (
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '300px' }}>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                🛒 Tu ruta de compra
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {stores.length} {stores.length === 1 ? 'tienda' : 'tiendas'} · Total: ${totalCost.toLocaleString('es-CO')} COP
              </span>
            </div>

            {/* Google Maps button */}
            {gmapsUrl && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '10px 14px', borderRadius: 'var(--radius-md)',
                    background: '#4285F4', color: '#fff',
                    fontSize: '13px', fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  🗺️ Abrir en Google Maps
                </a>
                {truncated && (
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Mostrando las primeras {MAX_GMAPS_WAYPOINTS} tiendas en la ruta
                  </span>
                )}
              </div>
            )}

            {/* Stores + products list */}
            {stores.map((s, si) => {
              const emoji    = getStoreEmoji(s.store?.store_type_id);
              const subtotal = s.products.reduce((a, p) => a + (p.price || 0) * (p.item?.quantity || 1), 0);
              return (
                <div key={si} style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', overflow: 'hidden',
                }}>
                  {/* Store header */}
                  <div style={{
                    padding: '8px 12px', display: 'flex', justifyContent: 'space-between',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)',
                    background: 'var(--bg-surface)',
                  }}>
                    <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
                    <span style={{ color: 'var(--accent)' }}>${subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  {/* Products */}
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                    {s.products.map((p, pi) => (
                      <li key={pi} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '7px 12px',
                        borderBottom: pi < s.products.length - 1 ? '1px solid var(--border)' : 'none',
                        fontSize: '12px',
                      }}>
                        {/* Avatar */}
                        <div style={{
                          width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                          background: 'var(--accent-soft)', border: '1px solid var(--accent)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase',
                          overflow: 'hidden',
                        }}>
                          {p.photo_url ? (
                            <img src={p.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                          ) : (
                            (p.item?.productName ?? p.productName ?? '?')[0]
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.item?.productName ?? p.productName ?? 'Producto'}
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                            ×{p.item?.quantity || 1} · ${(p.price || 0).toLocaleString('es-CO')} c/u
                          </div>
                        </div>
                        <span style={{ fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                          ${((p.price || 0) * (p.item?.quantity || 1)).toLocaleString('es-CO')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Toggle button (always visible) ── */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        style={{
          position: 'absolute',
          top: '50%', transform: 'translateY(-50%)',
          left: panelOpen ? '300px' : '0px',
          zIndex: 1001,
          width: '24px', height: '48px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderLeft: panelOpen ? 'none' : '1px solid var(--border)',
          borderRadius: panelOpen ? '0 var(--radius-sm) var(--radius-sm) 0' : 'var(--radius-sm)',
          cursor: 'pointer', fontSize: '12px', color: 'var(--text-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'left 0.2s ease',
        }}
        aria-label={panelOpen ? 'Ocultar panel' : 'Mostrar panel'}
      >
        {panelOpen ? '◀' : '▶'}
      </button>
    </div>
  );
}
