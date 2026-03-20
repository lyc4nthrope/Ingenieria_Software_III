import { useState, useEffect, useRef } from 'react';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { useShoppingListStore } from '../store/shoppingListStore';
import { DeliveryCard } from './DeliveryCard';
import { TrashIcon, getStoreEmoji, DELIVERY_FEE } from '../utils/shoppingListUtils';
import { pedidos } from '../styles/shoppingListStyles';
import { supabase } from '@/services/supabase.client';

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

// ─── Pestaña Mis Pedidos ───────────────────────────────────────────────────────
export function PedidosTab({ orders, removeOrder, updateOrderDelivery, emptyHint }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTotalSum, setShowTotalSum] = useState(false);
  const timerRef = useRef(null);
  const updateOrderDeliveryRef = useRef(updateOrderDelivery);

  // Mantener la ref actualizada sin re-ejecutar los efectos
  useEffect(() => { updateOrderDeliveryRef.current = updateOrderDelivery; });

  const selectedOrder = orders[selectedIdx] ?? null;

  // ── REALTIME: estado del pedido (vía Supabase) ────────────────────────────
  // Se activa cuando el pedido tiene supabaseId (pedido guardado en Supabase).
  // Escucha UPDATE en la tabla orders → actualiza deliveryStatus y dealerId local.
  useEffect(() => {
    if (!selectedOrder?.supabaseId) return;

    // Carga inicial para sincronizar estado stale (ej: tab cerrada mientras el
    // repartidor avanzaba el estado).
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

    // Suscripción Realtime para cambios en tiempo real
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
  // Se activa cuando el pedido tiene un dealer asignado (dealerId).
  // Escucha cambios en dealer_locations → actualiza driverLocation para el mapa.
  useEffect(() => {
    const dealerId = selectedOrder?.dealerId;
    if (!dealerId) return;

    // Leer ubicación inicial
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

    // Suscripción Realtime para actualizaciones de GPS (~cada 15s)
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

  // ── SIMULACIÓN: fallback para pedidos sin supabaseId ──────────────────────
  // Pedidos creados antes de implementar Supabase (solo localStorage) siguen
  // usando la simulación de tiempos para demostrar el flujo.
  useEffect(() => {
    // Si hay supabaseId, el Realtime se encarga — no simular
    if (selectedOrder?.supabaseId) return;

    clearTimeout(timerRef.current);
    clearInterval(timerRef.current);

    if (!selectedOrder?.deliveryMode) return;
    const { deliveryStatus, id, userCoords } = selectedOrder;
    if (deliveryStatus === 'cancelled' || deliveryStatus === null) return;

    if (deliveryStatus === 'searching') {
      timerRef.current = setTimeout(() => {
        const center = userCoords ?? { lat: 4.711, lng: -74.0721 };
        updateOrderDeliveryRef.current(id, {
          deliveryStatus: 'found',
          driverLocation: {
            lat: center.lat + (Math.random() - 0.5) * 0.04,
            lng: center.lng + (Math.random() - 0.5) * 0.04,
          },
        });
      }, 5000);
    } else if (deliveryStatus === 'found') {
      timerRef.current = setTimeout(() => {
        updateOrderDeliveryRef.current(id, { deliveryStatus: 'en_camino' });
      }, 3000);
    } else if (deliveryStatus === 'en_camino') {
      timerRef.current = setInterval(() => {
        try {
          const current = useShoppingListStore.getState().orders?.find((o) => o.id === id);
          if (!current?.driverLocation || !current?.userCoords) return;
          const { driverLocation: dl, userCoords: uc } = current;
          updateOrderDeliveryRef.current(id, {
            driverLocation: {
              lat: dl.lat + (uc.lat - dl.lat) * 0.12 + (Math.random() - 0.5) * 0.0008,
              lng: dl.lng + (uc.lng - dl.lng) * 0.12 + (Math.random() - 0.5) * 0.0008,
            },
          });
        } catch {
          clearInterval(timerRef.current);
        }
      }, 3000);
    }

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(timerRef.current);
    };
  }, [selectedOrder?.id, selectedOrder?.deliveryStatus, selectedOrder?.deliveryMode, selectedOrder?.userCoords, selectedOrder?.supabaseId]);

  const handleRemove = (id) => {
    removeOrder(id);
    setSelectedIdx((prev) => Math.max(0, prev - 1));
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
              const emoji = getStoreEmoji(s.store?.store_type_id);
              const subtotal = s.products.reduce((a, p) => a + (p.price || 0) * p.item.quantity, 0);
              return (
                <div key={si} style={pedidos.storeBlock}>
                  <div style={pedidos.storeBlockHeader}>
                    <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
                    <span style={{ color: 'var(--accent)', fontSize: '12px' }}>
                      ${subtotal.toLocaleString('es-CO')}
                    </span>
                  </div>
                  <ul style={pedidos.prodList}>
                    {s.products.map((p, pi) => (
                      <li key={pi} style={pedidos.prodItem}>
                        <div>
                          <div style={pedidos.prodName}>{p.item.productName}</div>
                          <div style={pedidos.prodMeta}>×{p.item.quantity} · ${p.price.toLocaleString('es-CO')} c/u</div>
                        </div>
                        <span style={pedidos.prodTotal}>
                          ${(p.price * p.item.quantity).toLocaleString('es-CO')}
                        </span>
                      </li>
                    ))}
                  </ul>
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
