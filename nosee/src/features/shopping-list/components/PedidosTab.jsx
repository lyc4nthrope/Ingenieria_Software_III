import { useState, useEffect, useRef } from 'react';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { DeliveryCard } from './DeliveryCard';
import { VoyYoMapView } from './VoyYoMapView';
import { TrashIcon, getStoreEmoji, DELIVERY_FEE } from '../utils/shoppingListUtils';
import { pedidos, resv } from '../styles/shoppingListStyles';
import { supabase } from '@/services/supabase.client';
import { PriceReportInline } from '@/features/orders/components/PriceReportInline';
import { updateProductPrice, logPriceCorrection } from '@/services/api/orders.api';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* ── Flecha arriba ── */}
      {canUp && (
        <button type="button" onClick={() => setPage((p) => p - 1)} style={sc.arrow}>▲</button>
      )}

      {/* ── Tarjetas de tienda ── */}
      {visible.map((s, relIdx) => {
        const si       = start + relIdx;
        const emoji    = getStoreEmoji(s.store?.store_type_id);
        const subtotal = s.products.reduce((a, p) => a + (p.price || 0) * (p.item?.quantity || 1), 0);
        const checked  = s.products.filter((_, pi) => checklist[`${orderId}-${si}-${pi}`]).length;
        return (
          <div key={si} style={resv.storeCard}>
            {/* Header tienda */}
            <div style={resv.storeHeader}>
              <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {checked > 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                    {checked}/{s.products.length} ✓
                  </span>
                )}
                <span style={{ color: 'var(--accent)', fontWeight: 700 }}>
                  ${subtotal.toLocaleString('es-CO')}
                </span>
              </div>
            </div>

            {/* Productos */}
            <ul style={resv.prodList}>
              {s.products.map((p, pi) => {
                const key  = `${orderId}-${si}-${pi}`;
                const done = !!checklist[key];
                return (
                  <li
                    key={pi}
                    style={{ ...resv.prodItem, ...(done ? { opacity: 0.55 } : {}) }}
                    onClick={() => toggleCheck(key)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, cursor: 'pointer' }}>
                      {/* Checkbox */}
                      <span style={{
                        width: 15, height: 15, borderRadius: 3, flexShrink: 0, marginTop: 2,
                        border: `2px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
                        background: done ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, fontWeight: 800, color: '#fff',
                      }}>
                        {done ? '✓' : ''}
                      </span>
                      <div style={done ? { textDecoration: 'line-through' } : {}}>
                        <div style={resv.prodName}>{p.item?.productName ?? p.productName ?? 'Producto'}</div>
                        <div style={resv.prodMeta}>×{p.item?.quantity || 1} · ${(p.price || 0).toLocaleString('es-CO')} c/u</div>
                      </div>
                    </div>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span style={{ ...resv.prodTotal, ...(done ? { textDecoration: 'line-through' } : {}) }}>
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
        <button type="button" onClick={() => setPage((p) => p + 1)} style={sc.arrow}>▼</button>
      )}

      {/* Indicador de página */}
      {total > STORE_PAGE_SIZE && (
        <p style={sc.pageInfo}>
          {start + 1}–{Math.min(start + STORE_PAGE_SIZE, total)} de {total} tiendas
        </p>
      )}
    </div>
  );
}

const sc = {
  arrow: {
    width: '100%', padding: '5px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--accent)',
    fontSize: '13px', fontWeight: 800, cursor: 'pointer', lineHeight: 1,
  },
  pageInfo: {
    margin: 0, fontSize: '11px', color: 'var(--text-muted)',
    textAlign: 'center', fontWeight: 600,
  },
};

// ─── Pestaña Mis Pedidos ───────────────────────────────────────────────────────
export function PedidosTab({ orders, removeOrder, updateOrderDelivery, emptyHint, variant = 'delivery', onAddProduct }) {
  const isPickup = variant === 'pickup';
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTotalSum, setShowTotalSum] = useState(false);
  const [checklist, setChecklist] = useState({});
  const updateOrderDeliveryRef = useRef(updateOrderDelivery);

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
      console.info(`[PrecioCorregido] ${productName}: $${oldPrice} → $${newPrice}`);
      return { error: null };
    }

    // Pedido en Supabase → actualizar BD y loguear en price_corrections
    const { error, newStores, newTotal, oldPrice } = await updateProductPrice(
      order.supabaseId, storeIdx, productIdx, newPrice
    );
    if (!error) {
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
      <div style={pedidos.empty}>
        <p style={pedidos.emptyText}>No hay pedidos aquí aún</p>
        <p style={pedidos.emptyHint}>
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
    <div style={pedidos.root}>
      {/* ── Carrusel de pedidos ─────────────────────────────────── */}
      <div style={pedidos.carousel}>
        {orders.map((o, i) => {
          const active = i === selectedIdx;
          const d = new Date(o.createdAt);
          const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => { setSelectedIdx(i); setShowTotalSum(false); }}
              style={{ ...pedidos.pill, ...(active ? pedidos.pillActive : {}) }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={pedidos.pillId}>#{o.id.slice(-6)}</span>
                {o.deliveryMode && <span title="Domicilio">🛵</span>}
              </span>
              <span style={{ ...pedidos.pillDate, ...(active ? { opacity: 0.85 } : {}) }}>
                {label}
              </span>
              {active && (
                <span style={pedidos.pillTotal}>
                  ${o.result.totalCost.toLocaleString('es-CO')}
                </span>
              )}
              {isPickup && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRemove(o.id); }}
                  style={{ background: 'none', border: 'none', color: active ? '#fff' : 'var(--error)', cursor: 'pointer', padding: '2px 4px', fontSize: '12px', fontWeight: 800 }}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* ── Header del pedido activo ── */}
          {!isPickup && (
            <div style={pedidos.orderHeader}>
              <div style={pedidos.orderHeaderLeft}>
                <span style={pedidos.orderRef}>#{selectedOrder.id.slice(-8)}</span>
                <span style={pedidos.orderDate}>{date}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(selectedOrder.id)}
                style={pedidos.deleteBtn}
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
            <div style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', overflow: 'hidden',
            }}>
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-elevated)',
                borderBottom: '1px solid var(--border)',
                fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
                textTransform: 'uppercase', letterSpacing: '0.04em',
              }}>
                {allProducts.length} {allProducts.length === 1 ? 'producto' : 'productos'} en tu pedido
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {allProducts.slice(0, 5).map((p, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 14px',
                    borderBottom: i < Math.min(allProducts.length, 5) - 1 ? '1px solid var(--border)' : 'none',
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                      background: 'var(--accent-soft)', border: '1px solid var(--accent)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', fontWeight: 800, color: 'var(--accent)',
                      textTransform: 'uppercase',
                    }}>
                      {(p.item?.productName ?? p.productName ?? '?')[0]}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.item?.productName ?? p.productName ?? 'Producto'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        ×{p.item?.quantity || 1} · {p.storeName}
                      </div>
                    </div>
                    {/* Price */}
                    <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                      ${((p.price || 0) * (p.item?.quantity || 1)).toLocaleString('es-CO')}
                    </span>
                  </li>
                ))}
                {allProducts.length > 5 && (
                  <li style={{ padding: '8px 14px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                    +{allProducts.length - 5} productos más
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* ── Totales rápidos ── */}
          <div style={pedidos.stats}>
            {selectedOrder.deliveryMode && selectedOrder.deliveryStatus === 'en_camino' ? (
              <button
                type="button"
                onClick={() => setShowTotalSum((v) => !v)}
                style={{ ...pedidos.stat, cursor: 'pointer', border: '1px solid var(--accent)', position: 'relative' }}
                title={showTotalSum ? 'Ver desglose' : 'Ver total combinado'}
              >
                {showTotalSum ? (
                  <>
                    <span style={pedidos.statVal}>${(result.totalCost + DELIVERY_FEE).toLocaleString('es-CO')}</span>
                    <span style={pedidos.statLabel}>Total c/ dom.</span>
                    <span style={{ fontSize: '9px', color: 'var(--accent)', marginTop: '1px' }}>← desglosar</span>
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>
                      ${result.totalCost.toLocaleString('es-CO')}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}> + </span>
                      ${DELIVERY_FEE.toLocaleString('es-CO')}
                    </span>
                    <span style={pedidos.statLabel}>Lista + Domicilio</span>
                    <span style={{ fontSize: '9px', color: 'var(--accent)', marginTop: '1px' }}>→ ver total</span>
                  </>
                )}
              </button>
            ) : (
              <div style={pedidos.stat}>
                <span style={pedidos.statVal}>${result.totalCost.toLocaleString('es-CO')}</span>
                <span style={pedidos.statLabel}>Total COP</span>
              </div>
            )}
            {result.savings > 0 && (
              <div style={pedidos.stat}>
                <span style={{ ...pedidos.statVal, color: 'var(--success, #16a34a)' }}>{result.savingsPct}%</span>
                <span style={pedidos.statLabel}>Ahorro</span>
              </div>
            )}
            <div style={pedidos.stat}>
              <span style={pedidos.statVal}>{result.stores.length}</span>
              <span style={pedidos.statLabel}>{result.stores.length === 1 ? 'Tienda' : 'Tiendas'}</span>
            </div>
            <div style={pedidos.stat}>
              <span style={pedidos.statVal}>{allProducts.length}</span>
              <span style={pedidos.statLabel}>{allProducts.length === 1 ? 'Producto' : 'Productos'}</span>
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
          <div style={pedidos.mapCol}>
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
            className="pickup-map-col"
            style={{ ...pedidos.mapCol, height: '600px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}
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
