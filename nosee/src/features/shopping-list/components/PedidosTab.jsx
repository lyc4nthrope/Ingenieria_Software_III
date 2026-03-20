import { useState, useEffect, useRef } from 'react';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { DeliveryCard } from './DeliveryCard';
import { TrashIcon, getStoreEmoji, DELIVERY_FEE } from '../utils/shoppingListUtils';
import { pedidos } from '../styles/shoppingListStyles';
import { supabase } from '@/services/supabase.client';
import { PriceReportInline } from '@/features/orders/components/PriceReportInline';
import { updateProductPrice } from '@/services/api/orders.api';

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

const PROD_PAGE_SIZE = 3;

// ─── Sub-componente: lista paginada de productos por tienda ───────────────────
function StoreProdList({ store, si, orderId, checklist, toggleCheck, onPriceReport }) {
  const [page, setPage] = useState(0);
  const products  = store.products ?? [];
  const total     = products.length;
  const maxPage   = Math.max(0, Math.ceil(total / PROD_PAGE_SIZE) - 1);
  const start     = page * PROD_PAGE_SIZE;
  const visible   = products.slice(start, start + PROD_PAGE_SIZE);
  const canUp     = page > 0;
  const canDown   = page < maxPage;

  return (
    <div>
      {/* Flecha arriba */}
      {canUp && (
        <button type="button" onClick={() => setPage((p) => p - 1)} style={pp.arrow}>▲</button>
      )}

      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {visible.map((p, relIdx) => {
          const pi  = start + relIdx;
          const key = `${orderId}-${si}-${pi}`;
          const done = !!checklist[key];
          return (
            <li key={pi} style={{ ...pp.prodItem, ...(done ? { opacity: 0.5 } : {}) }}>
              <div
                style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1, cursor: 'pointer' }}
                onClick={() => toggleCheck(key)}
              >
                <span style={{
                  width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 2,
                  border: `2px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
                  background: done ? 'var(--accent)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: '#fff',
                }}>
                  {done ? '✓' : ''}
                </span>
                <div style={done ? { textDecoration: 'line-through' } : {}}>
                  <div style={pp.prodName}>{p.item.productName}</div>
                  <div style={pp.prodMeta}>×{p.item.quantity} · ${p.price.toLocaleString('es-CO')} c/u</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
                <span style={{ ...pp.prodTotal, ...(done ? { textDecoration: 'line-through' } : {}) }}>
                  ${(p.price * p.item.quantity).toLocaleString('es-CO')}
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

      {/* Flecha abajo */}
      {canDown && (
        <button type="button" onClick={() => setPage((p) => p + 1)} style={pp.arrow}>▼</button>
      )}

      {/* Indicador */}
      {total > PROD_PAGE_SIZE && (
        <p style={pp.pageInfo}>{start + 1}–{Math.min(start + PROD_PAGE_SIZE, total)} de {total} productos</p>
      )}
    </div>
  );
}

const pp = {
  prodItem: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    padding: '9px 0', borderBottom: '1px solid var(--border)',
  },
  prodName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' },
  prodMeta: { fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 },
  prodTotal: { fontSize: '13px', fontWeight: 700, color: 'var(--accent)' },
  arrow: {
    width: '100%', padding: '4px', margin: '2px 0',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', color: 'var(--accent)',
    fontSize: '12px', fontWeight: 800, cursor: 'pointer', lineHeight: 1,
  },
  pageInfo: {
    margin: '4px 0 0', fontSize: '11px', color: 'var(--text-muted)',
    textAlign: 'center', fontWeight: 600,
  },
};

// ─── Pestaña Mis Pedidos ───────────────────────────────────────────────────────
export function PedidosTab({ orders, removeOrder, updateOrderDelivery, emptyHint }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTotalSum, setShowTotalSum] = useState(false);
  const [checklist, setChecklist] = useState({});
  const updateOrderDeliveryRef = useRef(updateOrderDelivery);

  // Actualiza el precio de un producto en Supabase y en el estado local
  const handlePriceReport = async (order, storeIdx, productIdx, newPrice) => {
    if (!order.supabaseId) return { error: new Error('Sin supabaseId') };
    const { error, newStores, newTotal } = await updateProductPrice(
      order.supabaseId, storeIdx, productIdx, newPrice
    );
    if (!error) {
      updateOrderDelivery(order.id, {
        result: { ...order.result, stores: newStores, totalCost: newTotal },
      });
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
            </button>
          );
        })}
      </div>

      {/* ── Layout dos columnas: info izq + mapa derecha ──────── */}
      <div className="pedidos-layout">
        {/* Columna izquierda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* ── Header del pedido activo ── */}
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

          {/* ── Tarjeta de domicilio ── */}
          {selectedOrder.deliveryMode && (
            <DeliveryCard
              order={selectedOrder}
              onCancel={handleCancelDelivery}
              onPaymentSubmitted={handlePaymentSubmitted}
            />
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

          {/* ── Productos agrupados por tienda ── */}
          <div style={pedidos.productsWrap}>
            {result.stores.map((s, si) => {
              const emoji    = getStoreEmoji(s.store?.store_type_id);
              const subtotal = s.products.reduce((a, p) => a + (p.price || 0) * p.item.quantity, 0);
              const checked  = s.products.filter((_, pi) => checklist[`${selectedOrder.id}-${si}-${pi}`]).length;
              return (
                <div key={si} style={pedidos.storeBlock}>
                  <div style={pedidos.storeBlockHeader}>
                    <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {checked > 0 && (
                        <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>
                          {checked}/{s.products.length} ✓
                        </span>
                      )}
                      <span style={{ color: 'var(--accent)', fontSize: '12px' }}>
                        ${subtotal.toLocaleString('es-CO')}
                      </span>
                    </div>
                  </div>
                  <StoreProdList
                    store={s}
                    si={si}
                    orderId={selectedOrder.id}
                    checklist={checklist}
                    toggleCheck={toggleCheck}
                    onPriceReport={selectedOrder.supabaseId
                      ? (storeIdx, pi, newPrice) => handlePriceReport(selectedOrder, storeIdx, pi, newPrice)
                      : null}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna derecha: mapa rectangular */}
        <div style={pedidos.mapCol}>
          <OrderRouteMap
            key={selectedOrder.id}
            stores={result.stores}
            userCoords={userCoords}
            driverLocation={selectedOrder.driverLocation ?? null}
            mapHeight="480px"
          />
        </div>
      </div>
    </div>
  );
}
