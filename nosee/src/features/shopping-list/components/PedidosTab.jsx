import { useState, useEffect, useRef } from 'react';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { DeliveryCard } from './DeliveryCard';
import { VoyYoMapView } from './VoyYoMapView';
import { TrashIcon, getStoreEmoji, DELIVERY_FEE } from '../utils/shoppingListUtils';
import { supabase } from '@/services/supabase.client';
import { PriceReportInline } from '@/features/orders/components/PriceReportInline';
import { updateProductPrice, logPriceCorrection } from '@/services/api/orders.api';
import { createPublication } from '@/services/api/publications.api';
import { cn } from '@/lib/cn';

// Mapa de estado de Supabase (tabla orders) → estado de UI local
// El repartidor avanza el estado en BD; aquí lo convertimos al nombre usado en DeliveryCard.
const STATUS_MAP = {
  pendiente_repartidor: 'searching',
  aceptado:             'found',
  comprando:            'comprando',
  en_camino:            'en_camino',
  llegando:             'llegando',
  entregado:            'entregado',
  cancelado:            'cancelled',
};

const STORE_PAGE_SIZE = 3;

// ─── Paginador de tarjetas de tienda (máximo 3 a la vez) ──────────────────────
// Flechas ▲/▼ afuera del bloque de tarjetas, igual al estilo de VoyYoMapView.
function StoreCardPager({ stores, orderId, checklist, toggleCheck, onPriceReport }) {
  const [page, setPage] = useState(0);
  const total   = stores.length;
  const maxPage = Math.max(0, Math.ceil(total / STORE_PAGE_SIZE) - 1);
  const start   = page * STORE_PAGE_SIZE;
  const visible = stores.slice(start, start + STORE_PAGE_SIZE);
  const canUp   = page > 0;
  const canDown = page < maxPage;

  return (
    <div className="flex flex-col gap-[6px]">
      {/* ── Flecha arriba ── */}
      {canUp && (
        <button
          type="button"
          onClick={() => setPage((p) => p - 1)}
          className="w-full py-[5px] bg-bg-elevated border border-line rounded-sm text-accent text-[13px] font-extrabold leading-none cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ▲
        </button>
      )}

      {/* ── Tarjetas de tienda ── */}
      {visible.map((s, relIdx) => {
        const si       = start + relIdx;
        const emoji    = getStoreEmoji(s.store?.store_type_id);
        const subtotal = s.products.reduce((a, p) => a + (p.price || 0) * (p.item?.quantity || 1), 0);
        const checked  = s.products.filter((_, pi) => checklist[`${orderId}-${si}-${pi}`]).length;
        return (
          <div key={si} className="bg-bg-surface border border-line rounded-md overflow-hidden">
            {/* Header tienda */}
            <div className="flex justify-between items-center px-[14px] py-[9px] bg-bg-elevated border-b border-line text-[13px] font-bold text-text-primary">
              <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
              <div className="flex items-center gap-2">
                {checked > 0 && (
                  <span className="text-[11px] text-accent font-extrabold">
                    {checked}/{s.products.length} ✓
                  </span>
                )}
                <span className="text-accent font-extrabold">
                  ${subtotal.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Productos */}
            <ul className="list-none m-0 p-0">
              {s.products.map((p, pi) => {
                const key  = `${orderId}-${si}-${pi}`;
                const done = !!checklist[key];
                return (
                  <li
                    key={pi}
                    className={cn(
                      'flex justify-between items-center px-[14px] py-2 border-b border-line text-[13px] cursor-pointer',
                      done && 'opacity-55',
                    )}
                    onClick={() => toggleCheck(key)}
                  >
                    <div className="flex items-start gap-2 flex-1 cursor-pointer">
                      {/* Checkbox */}
                      <span
                        className={cn(
                          'w-[15px] h-[15px] rounded-[3px] shrink-0 mt-[2px] border-2 flex items-center justify-center text-[9px] font-extrabold text-white',
                          done ? 'border-accent bg-accent' : 'border-line bg-transparent',
                        )}
                      >
                        {done ? '✓' : ''}
                      </span>
                      <div className={cn(done && 'line-through')}>
                        <div className="font-semibold text-text-primary mb-[2px]">
                          {p.item?.productName ?? p.productName ?? 'Producto'}
                        </div>
                        {(() => {
                          const prod = p.publication?.product;
                          if (!prod) return null;
                          const qty  = prod.base_quantity;
                          const unit = prod.unit_type?.abbreviation ?? prod.unit_type?.name;
                          const detail = [qty, unit].filter(Boolean).join(' ');
                          const text = [prod.name, detail].filter(Boolean).join(' · ');
                          return text ? (
                            <div className="text-[10px] text-text-muted overflow-hidden text-ellipsis whitespace-nowrap">
                              {text}
                            </div>
                          ) : null;
                        })()}
                        <div className="text-[11px] text-text-muted">
                          ×{p.item?.quantity || 1} · ${(p.price || 0).toLocaleString('es-CO')} c/u
                        </div>
                      </div>
                    </div>
                    <div
                      className="flex flex-col items-end gap-[3px] shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className={cn('font-bold text-text-primary shrink-0 ml-2', done && 'line-through')}>
                        ${((p.price || 0) * (p.item?.quantity || 1)).toLocaleString('es-CO')}
                      </span>
                      {onPriceReport && (
                        <PriceReportInline
                          currentPrice={p.price}
                          onConfirm={(newPrice) => onPriceReport(si, pi, newPrice)}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {/* ── Flecha abajo ── */}
      {canDown && (
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          className="w-full py-[5px] bg-bg-elevated border border-line rounded-sm text-accent text-[13px] font-extrabold leading-none cursor-pointer min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          ▼
        </button>
      )}

      {/* Indicador de página */}
      {total > STORE_PAGE_SIZE && (
        <p className="m-0 text-[11px] text-text-muted text-center font-semibold">
          {start + 1}–{Math.min(start + STORE_PAGE_SIZE, total)} de {total} tiendas
        </p>
      )}
    </div>
  );
}

// ─── Pestaña Mis Pedidos ───────────────────────────────────────────────────────
export function PedidosTab({ orders, removeOrder, updateOrderDelivery, emptyHint, variant = 'delivery', onAddProduct }) {
  const isPickup = variant === 'pickup';
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTotalSum, setShowTotalSum] = useState(false);
  const [checklist, setChecklist] = useState({});
  const updateOrderDeliveryRef = useRef(updateOrderDelivery);

  // Crea una publicación nueva con los datos de la publicación original pero con el precio corregido.
  // Fire-and-forget: no bloqueamos la UI si falla.
  const createCorrectedPublication = (order, storeIdx, productIdx, newPrice) => {
    const pub = order.result.stores[storeIdx]?.products[productIdx]?.publication;
    if (!pub?.product_id || !pub?.store_id || !pub?.photo_url) return;
    createPublication({
      productId:   pub.product_id,
      storeId:     pub.store_id,
      price:       newPrice,
      photoUrl:    pub.photo_url,
      currency:    pub.currency ?? 'COP',
      description: pub.description ?? null,
      latitude:    order.userCoords?.lat ?? null,
      longitude:   order.userCoords?.lng ?? null,
    }).catch((err) => console.warn('[createCorrectedPublication] error:', err));
  };

  // Actualiza el precio de un producto y registra la corrección en el log.
  // Funciona para pedidos en Supabase (Mis Pedidos) y locales (Mis Recogidas).
  const handlePriceReport = async (order, storeIdx, productIdx, newPrice) => {
    const productName = order.result.stores[storeIdx]?.products[productIdx]?.item?.productName;

    if (!order.supabaseId) {
      // Pedido local (Mis Recogidas sin Supabase) → solo actualizar localStorage
      const newStores = JSON.parse(JSON.stringify(order.result.stores));
      const oldPrice  = newStores[storeIdx]?.products?.[productIdx]?.price ?? 0;
      newStores[storeIdx].products[productIdx].price = newPrice;
      const newTotal = newStores.reduce(
        (sum, s) => sum + (s.products ?? []).reduce((ps, p) => ps + (p.price ?? 0) * (p.item?.quantity ?? 1), 0), 0
      );
      updateOrderDelivery(order.id, {
        result: { ...order.result, stores: newStores, totalCost: newTotal },
        priceCorrections: [
          ...(order.priceCorrections ?? []),
          { storeIdx, productIdx, productName, oldPrice, newPrice, ts: new Date().toISOString() },
        ],
      });
      createCorrectedPublication(order, storeIdx, productIdx, newPrice);
      console.info(`[PrecioCorregido] ${productName}: $${oldPrice} → $${newPrice}`);
      return { error: null };
    }

    // Pedido en Supabase → actualizar BD y loguear en price_corrections
    const { error, newStores, newTotal, oldPrice } = await updateProductPrice(
      order.supabaseId, storeIdx, productIdx, newPrice
    );
    if (!error) {
      createCorrectedPublication(order, storeIdx, productIdx, newPrice);
      updateOrderDelivery(order.id, {
        result: { ...order.result, stores: newStores, totalCost: newTotal },
        priceCorrections: [
          ...(order.priceCorrections ?? []),
          { storeIdx, productIdx, productName, oldPrice, newPrice, ts: new Date().toISOString() },
        ],
      });
      logPriceCorrection({ orderId: order.supabaseId, storeIdx, productIdx, productName, oldPrice, newPrice, role: 'user' });
      console.info(`[PrecioCorregido] ${productName}: $${oldPrice} → $${newPrice}`);
    }
    return { error };
  };

  // Mantener la ref actualizada sin re-ejecutar los efectos
  useEffect(() => { updateOrderDeliveryRef.current = updateOrderDelivery; });

  const selectedOrder = orders[selectedIdx] ?? null;

  // ── REALTIME: estado del pedido (vía Supabase) ────────────────────────────
  // Escucha UPDATE en orders para este pedido → actualiza deliveryStatus y dealerId.
  // Solo corre para pedidos de domicilio con supabaseId (guardados en Supabase).
  // La carga inicial sincroniza el estado en caso de que la app estuviera cerrada
  // mientras el repartidor avanzaba el estado.
  useEffect(() => {
    if (!selectedOrder?.deliveryMode || !selectedOrder?.supabaseId) return;

    supabase
      .from('orders')
      .select('status, dealer_id')
      .eq('id', selectedOrder.supabaseId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const uiStatus = STATUS_MAP[data.status];
        if (uiStatus && uiStatus !== selectedOrder.deliveryStatus) {
          updateOrderDeliveryRef.current(selectedOrder.id, {
            deliveryStatus: uiStatus,
            ...(data.dealer_id ? { dealerId: data.dealer_id } : {}),
          });
        }
      });

    const channel = supabase
      .channel(`order-status-${selectedOrder.supabaseId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${selectedOrder.supabaseId}` },
        (payload) => {
          const uiStatus = STATUS_MAP[payload.new?.status];
          if (!uiStatus) return;
          updateOrderDeliveryRef.current(selectedOrder.id, {
            deliveryStatus: uiStatus,
            ...(payload.new.dealer_id ? { dealerId: payload.new.dealer_id } : {}),
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.supabaseId, selectedOrder?.id]);

  // ── REALTIME: ubicación GPS del repartidor ─────────────────────────────────
  // Se activa cuando el repartidor es asignado (dealerId en el pedido).
  // Escucha dealer_locations → actualiza driverLocation en el mapa (~cada 15s).
  useEffect(() => {
    const dealerId = selectedOrder?.dealerId;
    if (!dealerId) return;

    supabase
      .from('dealer_locations')
      .select('lat, lng')
      .eq('dealer_id', dealerId)
      .single()
      .then(({ data }) => {
        if (data?.lat && data?.lng) {
          updateOrderDeliveryRef.current(selectedOrder.id, {
            driverLocation: { lat: data.lat, lng: data.lng },
          });
        }
      });

    const channel = supabase
      .channel(`dealer-loc-${dealerId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'dealer_locations', filter: `dealer_id=eq.${dealerId}` },
        (payload) => {
          if (!payload.new?.lat || !payload.new?.lng) return;
          updateOrderDeliveryRef.current(selectedOrder.id, {
            driverLocation: { lat: payload.new.lat, lng: payload.new.lng },
          });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.dealerId, selectedOrder?.id]);

  const handleRemove = (id) => {
    removeOrder(id);
    setSelectedIdx((prev) => Math.max(0, prev - 1));
  };

  const toggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCancelDelivery = () => {
    if (!selectedOrder) return;
    const charged = selectedOrder.deliveryStatus !== 'searching';
    updateOrderDelivery(selectedOrder.id, {
      deliveryStatus: 'cancelled',
      cancellationCharged: charged,
    });
  };

  // Cuando el usuario sube el comprobante de pago
  const handlePaymentSubmitted = ({ receiptUrl, method }) => {
    updateOrderDelivery(selectedOrder.id, {
      deliveryStatus: 'comprobante_subido',
      receiptUrl,
      paymentMethod: method,
    });
  };

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-10 bg-bg-surface border border-dashed border-line rounded-md text-center">
        <p className="m-0 text-[14px] font-semibold text-text-primary">No hay pedidos aquí aún</p>
        <p className="m-0 text-[12px] text-text-muted">
          {emptyHint ?? 'Ve a la pestaña Mi Lista, configura un pedido y aparecerá aquí.'}
        </p>
      </div>
    );
  }

  const { result, userCoords } = selectedOrder;
  const date = new Date(selectedOrder.createdAt).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const allProducts = result.stores.flatMap((s) =>
    s.products.map((p) => ({ ...p, storeName: s.store?.name ?? 'Tienda' }))
  );

  return (
    <div className="flex flex-col gap-[10px]">
      {/* ── Carrusel de pedidos ─────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {orders.map((o, i) => {
          const active = i === selectedIdx;
          const d = new Date(o.createdAt);
          const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => { setSelectedIdx(i); setShowTotalSum(false); }}
              className={cn(
                'shrink-0 flex flex-col items-center gap-[3px] px-[18px] py-[10px] rounded-md border cursor-pointer transition-all min-w-[90px] min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active
                  ? 'bg-accent border-accent text-white shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                  : 'bg-bg-surface border-line',
              )}
            >
              <span className="flex items-center gap-1">
                <span className="text-[14px] font-extrabold font-mono">#{o.id.slice(-6)}</span>
                {o.deliveryMode && <span title="Domicilio">🛵</span>}
              </span>
              <span className={cn('text-[11px] font-medium', active ? 'opacity-85' : 'text-text-muted')}>
                {label}
              </span>
              {active && (
                <span className="text-[11px] font-bold mt-[2px]">
                  ${o.result.totalCost.toLocaleString('es-CO')}
                </span>
              )}
              {isPickup && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove(o.id); }}
                  className={cn(
                    'bg-transparent border-none cursor-pointer px-1 py-[2px] text-[12px] font-extrabold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    active ? 'text-white' : 'text-error',
                  )}
                  aria-label="Eliminar recogida"
                >
                  ✕
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Layout dos columnas: info izq + mapa derecha ──────── */}
      <div className="pedidos-layout">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-[10px]">
          {/* ── Header del pedido activo ── */}
          {!isPickup && (
            <div className="flex items-center justify-between px-[14px] py-[10px] bg-bg-surface border border-line rounded-md">
              <div className="flex flex-col gap-[1px]">
                <span className="text-[13px] font-extrabold font-mono text-text-primary">
                  #{selectedOrder.id.slice(-8)}
                </span>
                <span className="text-[11px] text-text-muted">{date}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(selectedOrder.id)}
                className="flex items-center bg-transparent border-none text-text-muted cursor-pointer p-1 min-h-[44px] min-w-[44px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Eliminar pedido"
              >
                <TrashIcon />
              </button>
            </div>
          )}

          {/* ── Tarjeta de domicilio ── */}
          {selectedOrder.deliveryMode && !isPickup && (
            <DeliveryCard
              order={selectedOrder}
              onCancel={handleCancelDelivery}
              onPaymentSubmitted={handlePaymentSubmitted}
            />
          )}

          {/* ── Productos en el pedido (solo domicilio) ── */}
          {selectedOrder.deliveryMode && allProducts.length > 0 && (
            <div className="bg-bg-surface border border-line rounded-md overflow-hidden">
              <div className="px-[14px] py-[10px] bg-bg-elevated border-b border-line text-[12px] font-bold text-text-secondary uppercase tracking-[0.04em]">
                {allProducts.length} {allProducts.length === 1 ? 'producto' : 'productos'} en tu pedido
              </div>
              <ul className="list-none m-0 p-0">
                {allProducts.slice(0, 5).map((p, i) => (
                  <li
                    key={i}
                    className={cn(
                      'flex items-center gap-3 px-[14px] py-[10px]',
                      i < Math.min(allProducts.length, 5) - 1 && 'border-b border-line',
                    )}
                  >
                    {/* Avatar */}
                    <div className="w-[34px] h-[34px] rounded-full shrink-0 bg-bg-accent-soft border border-accent flex items-center justify-center text-[13px] font-extrabold text-accent uppercase">
                      {(p.item?.productName ?? p.productName ?? '?')[0]}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-bold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">
                        {p.item?.productName ?? p.productName ?? 'Producto'}
                      </div>
                      <div className="text-[11px] text-text-muted">
                        ×{p.item?.quantity || 1} · {p.storeName}
                      </div>
                    </div>
                    {/* Price */}
                    <span className="text-[13px] font-extrabold text-accent shrink-0">
                      ${((p.price || 0) * (p.item?.quantity || 1)).toLocaleString('es-CO')}
                    </span>
                  </li>
                ))}
                {allProducts.length > 5 && (
                  <li className="px-[14px] py-2 text-center text-[12px] text-text-muted font-semibold">
                    +{allProducts.length - 5} productos más
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ── Totales rápidos ── */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-2">
            {selectedOrder.deliveryMode && selectedOrder.deliveryStatus === 'en_camino' ? (
              <button
                type="button"
                onClick={() => setShowTotalSum((v) => !v)}
                className="flex flex-col items-center gap-[2px] px-2 py-[10px] bg-bg-surface border border-accent rounded-md cursor-pointer relative min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title={showTotalSum ? 'Ver desglose' : 'Ver total combinado'}
              >
                {showTotalSum ? (
                  <>
                    <span className="text-[15px] font-extrabold text-accent">
                      ${(result.totalCost + DELIVERY_FEE).toLocaleString('es-CO')}
                    </span>
                    <span className="text-[10px] text-text-muted uppercase tracking-[0.04em]">Total c/ dom.</span>
                    <span className="text-[9px] text-accent mt-[1px]">← desglosar</span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-extrabold text-accent leading-[1.2]">
                      ${result.totalCost.toLocaleString('es-CO')}
                      <span className="text-text-muted font-semibold"> + </span>
                      ${DELIVERY_FEE.toLocaleString('es-CO')}
                    </span>
                    <span className="text-[10px] text-text-muted uppercase tracking-[0.04em]">Lista + Domicilio</span>
                    <span className="text-[9px] text-accent mt-[1px]">→ ver total</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex flex-col items-center gap-[2px] px-2 py-[10px] bg-bg-surface border border-line rounded-md">
                <span className="text-[15px] font-extrabold text-accent">
                  ${result.totalCost.toLocaleString('es-CO')}
                </span>
                <span className="text-[10px] text-text-muted uppercase tracking-[0.04em]">Total COP</span>
              </div>
            )}
            {result.savings > 0 && (
              <div className="flex flex-col items-center gap-[2px] px-2 py-[10px] bg-bg-surface border border-line rounded-md">
                <span className="text-[15px] font-extrabold text-success">{result.savingsPct}%</span>
                <span className="text-[10px] text-text-muted uppercase tracking-[0.04em]">Ahorro</span>
              </div>
            )}
            <div className="flex flex-col items-center gap-[2px] px-2 py-[10px] bg-bg-surface border border-line rounded-md">
              <span className="text-[15px] font-extrabold text-accent">{result.stores.length}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-[0.04em]">
                {result.stores.length === 1 ? 'Tienda' : 'Tiendas'}
              </span>
            </div>
            <div className="flex flex-col items-center gap-[2px] px-2 py-[10px] bg-bg-surface border border-line rounded-md">
              <span className="text-[15px] font-extrabold text-accent">{allProducts.length}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-[0.04em]">
                {allProducts.length === 1 ? 'Producto' : 'Productos'}
              </span>
            </div>
          </div>

          {/* ── Productos agrupados por tienda (máx 3 tarjetas + flechas) ── */}
          <StoreCardPager
            stores={result.stores}
            orderId={selectedOrder.id}
            checklist={checklist}
            toggleCheck={toggleCheck}
            onPriceReport={(storeIdx, pi, newPrice) => handlePriceReport(selectedOrder, storeIdx, pi, newPrice)}
          />
        </div>

        {/* Columna derecha: mapa (delivery = ruta, pickup = VoyYoMapView) */}
        {!isPickup && (
          <div className="sticky top-[80px]">
            <OrderRouteMap
              key={selectedOrder.id}
              stores={result.stores}
              userCoords={userCoords}
              driverLocation={selectedOrder.driverLocation ?? null}
              mapHeight="480px"
            />
          </div>
        )}
        {isPickup && selectedOrder && (
          <div
            className="pickup-map-col sticky top-[80px] h-[600px] rounded-md overflow-hidden border border-line"
          >
            <VoyYoMapView
              result={selectedOrder.result}
              userCoords={selectedOrder.userCoords ?? null}
              onAddProduct={(name, tempId, cb) => onAddProduct?.(name, tempId, cb, selectedOrder.id)}
              onRemoveOrder={() => removeOrder(selectedOrder.id)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
