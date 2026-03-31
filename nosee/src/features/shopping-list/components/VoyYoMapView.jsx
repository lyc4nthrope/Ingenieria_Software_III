import { useState, useCallback } from 'react';
import { StoreOnlyMap } from '@/features/orders/components/StoreOnlyMap';
import { parseStoreCoords } from '@/features/orders/utils/parseStoreCoords';
import { getStoreEmoji } from '@/features/shopping-list/utils/shoppingListUtils';
import { cn } from '@/lib/cn';

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
  const [panelOpen, setPanelOpen]             = useState(true);
  const [checkedKeys, setCheckedKeys]         = useState(new Set());
  const [newProductInput, setNewProductInput] = useState('');
  const [pendingProducts, setPendingProducts] = useState([]);
  // pendingProduct shape: { tempId: string, name: string, status: 'loading'|'done'|'error' }

  const toggleCheck = useCallback((key) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleAddProduct = useCallback(() => {
    const name = newProductInput.trim();
    if (!name) return;
    const tempId = `pending-${Date.now()}`;
    setPendingProducts((prev) => [...prev, { tempId, name, status: 'loading' }]);
    setNewProductInput('');
    onAddProduct?.(name, tempId, (status) => {
      setPendingProducts((prev) => prev.map((p) => p.tempId === tempId ? { ...p, status } : p));
    });
  }, [newProductInput, onAddProduct]);

  const stores    = result?.stores ?? [];
  const totalCost = result?.totalCost ?? 0;
  const gmapsUrl  = buildGoogleMapsUrl(stores, userCoords);
  const truncated = stores.length > MAX_GMAPS_WAYPOINTS;

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* ── Mapa full-screen ── */}
      <StoreOnlyMap stores={stores} userCoords={userCoords} />

      {/* ── Panel izquierdo colapsable ── */}
      <div
        className={cn(
          'absolute top-0 left-0 h-full z-[1000]',
          'flex flex-col overflow-x-hidden',
          'bg-bg-surface transition-[width] duration-200 ease-[ease]',
          panelOpen
            ? 'w-[300px] border-r border-border overflow-y-auto'
            : 'w-0 overflow-y-hidden border-r-0',
        )}
      >
        {panelOpen && (
          <div className="flex flex-col gap-[10px] p-3 min-w-[300px]">
            {/* Header */}
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-extrabold text-text-primary">
                🛒 Tu ruta de compra
              </span>
              <span className="text-[11px] text-text-muted">
                {stores.length} {stores.length === 1 ? 'tienda' : 'tiendas'} · Total: ${totalCost.toLocaleString('es-CO')} COP
              </span>
            </div>

            {/* Google Maps button */}
            {gmapsUrl && (
              <div className="flex flex-col gap-1">
                <a
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    'flex items-center justify-center gap-1.5',
                    'px-3.5 py-2.5 rounded-md',
                    'bg-[#4285F4] text-white',
                    'text-[13px] font-bold no-underline',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  )}
                >
                  🗺️ Abrir en Google Maps
                </a>
                {truncated && (
                  <span className="text-[10px] text-text-muted text-center">
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
                <div
                  key={si}
                  className="bg-bg-elevated border border-border rounded-md overflow-hidden"
                >
                  {/* Store header */}
                  <div className="flex justify-between items-center px-3 py-2 border-b border-border bg-bg-surface text-[12px] font-bold text-text-primary">
                    <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
                    <span className="text-accent">${subtotal.toLocaleString('es-CO')}</span>
                  </div>

                  {/* Products */}
                  <ul className="list-none m-0 p-0">
                    {s.products.map((p, pi) => {
                      const ckKey  = `${si}-${pi}`;
                      const isDone = checkedKeys.has(ckKey);
                      return (
                        <li
                          key={pi}
                          className={cn(
                            'flex items-center gap-2 px-3 py-[7px] text-[12px]',
                            pi < s.products.length - 1 && 'border-b border-border',
                          )}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isDone}
                            onChange={() => toggleCheck(ckKey)}
                            className="shrink-0 cursor-pointer accent-[var(--accent)] w-3.5 h-3.5 min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                          />
                          {/* Avatar */}
                          <div className="w-7 h-7 rounded-full shrink-0 bg-bg-accent-soft border border-accent flex items-center justify-center text-[11px] font-extrabold text-accent uppercase overflow-hidden">
                            {p.photo_url ? (
                              <img
                                src={p.photo_url}
                                alt=""
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              (p.item?.productName ?? p.productName ?? '?')[0]
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                'font-semibold text-text-primary truncate',
                                isDone && 'opacity-50 line-through',
                              )}
                            >
                              {p.item?.productName ?? p.productName ?? 'Producto'}
                            </div>
                            <div className="text-text-muted text-[10px]">
                              ×{p.item?.quantity || 1} · ${(p.price || 0).toLocaleString('es-CO')} c/u
                            </div>
                          </div>
                          <span className="font-bold text-accent shrink-0">
                            ${((p.price || 0) * (p.item?.quantity || 1)).toLocaleString('es-CO')}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}

            {/* Pending products (optimizando...) */}
            {pendingProducts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold text-text-secondary uppercase">
                  Buscando opciones...
                </span>
                {pendingProducts.map((pp) => (
                  <div
                    key={pp.tempId}
                    className="flex items-center gap-2 px-3 py-2 bg-bg-elevated border border-border rounded-md"
                  >
                    <div className="w-7 h-7 rounded-full shrink-0 bg-bg-accent-soft border border-accent flex items-center justify-center text-[11px] font-extrabold text-accent uppercase">
                      {pp.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="text-[12px] font-semibold text-text-primary">{pp.name}</div>
                      {pp.status === 'loading' && (
                        <div className="text-[11px] text-accent italic">⏳ Optimizando...</div>
                      )}
                      {pp.status === 'error' && (
                        <div className="text-[11px] text-[var(--error)]">
                          Error al cargar ·{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setPendingProducts((prev) => prev.filter((p) => p.tempId !== pp.tempId));
                              onAddProduct?.(pp.name);
                            }}
                            className="bg-transparent border-none text-accent cursor-pointer text-[11px] font-bold p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            Reintentar
                          </button>
                        </div>
                      )}
                      {pp.status === 'done' && (
                        <div className="text-[11px] text-[var(--success,#16a34a)]">✓ Cargado</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add-product input */}
            <div className="flex gap-1.5 pt-1 mt-1 border-t border-border">
              <input
                type="text"
                value={newProductInput}
                onChange={(e) => setNewProductInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProductInput.trim()) handleAddProduct();
                }}
                placeholder="Agregar producto..."
                className={cn(
                  'flex-1 px-2.5 py-2 text-[12px]',
                  'rounded-md border border-border',
                  'bg-bg-base text-text-primary',
                  'outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              />
              <button
                type="button"
                onClick={handleAddProduct}
                disabled={!newProductInput.trim()}
                className={cn(
                  'px-3 py-2 min-h-[44px] min-w-[44px]',
                  'rounded-md border-none',
                  'bg-accent text-white text-[12px] font-bold',
                  'transition-opacity duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  newProductInput.trim()
                    ? 'cursor-pointer opacity-100'
                    : 'cursor-not-allowed opacity-50',
                )}
              >
                <span aria-hidden="true">+</span>
                <span className="sr-only">Agregar producto</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Toggle button (always visible) ── */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className={cn(
          'absolute top-1/2 -translate-y-1/2 z-[1001]',
          'w-6 h-12 min-h-[44px]',
          'flex items-center justify-center',
          'bg-bg-surface border border-border',
          'cursor-pointer text-[12px] text-text-secondary',
          'transition-[left] duration-200 ease-[ease]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          panelOpen
            ? 'left-[300px] border-l-0 rounded-r-sm'
            : 'left-0 rounded-sm',
        )}
        aria-label={panelOpen ? 'Ocultar panel' : 'Mostrar panel'}
      >
        {panelOpen ? '◀' : '▶'}
      </button>
    </div>
  );
}
