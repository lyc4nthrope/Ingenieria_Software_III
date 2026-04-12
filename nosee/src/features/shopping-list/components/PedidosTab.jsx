import { useState, useEffect, useRef } from 'react';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { DeliveryCard } from './DeliveryCard';
import { VoyYoMapView } from './VoyYoMapView';
import { TrashIcon, getStoreEmoji, calculateDeliveryFee } from '../utils/shoppingListUtils';
import { pedidos, resv } from '../styles/shoppingListStyles';
import { supabase } from '@/services/supabase.client';
import { PriceReportInline } from '@/features/orders/components/PriceReportInline';
import { PriceAdjustmentBanner } from '@/features/orders/components/PriceAdjustmentBanner';
import {
  updateProductPrice,
  logPriceCorrection,
  resolvePriceAdjustment,
  getPendingAdjustments,
  cancelOrderByUser,
} from '@/services/api/orders.api';
import { createPublication } from '@/services/api/publications.api';

// Mapa de estado de Supabase (tabla orders) → estado de UI local
// El repartidor avanza el estado en BD; aquí lo convertimos al nombre usado en DeliveryCard.
const STATUS_MAP = {
  pendiente_pago:         'pendiente_pago',
  pendiente_repartidor:   'searching',
  aceptado:               'pendiente_compromiso', // legacy: repartidor aceptó, cliente debe pagar compromiso
  pendiente_compromiso:   'pendiente_compromiso',
  comprando:              'comprando',
  en_camino:              'en_camino',
  llegando:               'llegando',
  entregado:              'entregado',
  cancelado:              'cancelled',
  cancelado_no_pago:      'cancelado_no_pago',
  usuario_se_encarga:     'auto_gestionado',
};

const STORE_PAGE_SIZE = 3;

// ─── Paginador de tarjetas de tienda (máximo 3 a la vez) ──────────────────────
// Flechas ▲/▼ afuera del bloque de tarjetas, igual al estilo de VoyYoMapView.
function StoreCardPager({ stores, orderId, checklist, toggleCheck, onPriceReport, readOnly = false }) {
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
                    onClick={readOnly ? undefined : () => toggleCheck(key)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, cursor: readOnly ? 'default' : 'pointer' }}>
                      {/* Checkbox */}
                      {!readOnly && (
                        <span style={{
                          width: 15, height: 15, borderRadius: 3, flexShrink: 0, marginTop: 2,
                          border: `2px solid ${done ? 'var(--accent)' : 'var(--border)'}`,
                          background: done ? 'var(--accent)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, fontWeight: 800, color: '#fff',
                        }}>
                          {done ? '✓' : ''}
                        </span>
                      )}
                      <div style={done ? { textDecoration: 'line-through' } : {}}>
                        <div style={resv.prodName}>{p.item?.productName ?? p.productName ?? 'Producto'}</div>
                        {(() => {
                          const prod = p.publication?.product;
                          if (!prod) return null;
                          const detailStyle = { fontSize: '10px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
                          const unitDetail = [prod.base_quantity, prod.unit_type?.abbreviation ?? prod.unit_type?.name].filter(Boolean).join(' ');
                          return (
                            <>
                              {prod.name && <div style={detailStyle}>{prod.name}</div>}
                              {prod.brand?.name && <div style={detailStyle}>{prod.brand.name}</div>}
                              {unitDetail && <div style={detailStyle}>{unitDetail}</div>}
                            </>
                          );
                        })()}
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
  const [checklist, setChecklist] = useState({});
  const [pendingAdjustments, setPendingAdjustments] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
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
      .select('status, dealer_id, compromiso_amount, checked_items, delivery_pin, dealer_cancel_type, dealer_cancel_reason')
      .eq('id', selectedOrder.supabaseId)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const uiStatus = STATUS_MAP[data.status];
        const updates = {};
        if (uiStatus && uiStatus !== selectedOrder.deliveryStatus) {
          updates.deliveryStatus = uiStatus;
        }
        if (data.dealer_id) updates.dealerId = data.dealer_id;
        if (data.compromiso_amount) updates.compromisoAmount = data.compromiso_amount;
        if (data.delivery_pin && !selectedOrder.deliveryPin) {
          updates.deliveryPin = data.delivery_pin;
        }
        if (data.status === 'pendiente_repartidor' && data.dealer_cancel_reason) {
          updates.dealerCancelInfo = { type: data.dealer_cancel_type, reason: data.dealer_cancel_reason };
          updates.dealerId = null;
        }
        if (Object.keys(updates).length > 0) {
          updateOrderDeliveryRef.current(selectedOrder.id, updates);
        }
        if (data.checked_items && typeof data.checked_items === 'object') {
          applyDealerCheckedItems(selectedOrder.id, data.checked_items);
        }
      });

    const channel = supabase
      .channel(`order-status-${selectedOrder.supabaseId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${selectedOrder.supabaseId}` },
        (payload) => {
          const uiStatus = STATUS_MAP[payload.new?.status];
          if (uiStatus) {
            updateOrderDeliveryRef.current(selectedOrder.id, {
              deliveryStatus: uiStatus,
              ...(payload.new.dealer_id ? { dealerId: payload.new.dealer_id } : { dealerId: null }),
              ...(payload.new.status === 'llegando' ? { llegandoAt: payload.new.updated_at ?? payload.new.llegando_at ?? new Date().toISOString() } : {}),
              ...(payload.new.compromiso_amount ? { compromisoAmount: payload.new.compromiso_amount } : {}),
              // Motivo de cancelación del repartidor — visible al cliente en estado "searching"
              ...(payload.new.status === 'pendiente_repartidor' && payload.new.dealer_cancel_reason
                ? { dealerCancelInfo: { type: payload.new.dealer_cancel_type, reason: payload.new.dealer_cancel_reason } }
                : {}),
            });
          }
          if (payload.new?.checked_items && typeof payload.new.checked_items === 'object') {
            applyDealerCheckedItems(selectedOrder.id, payload.new.checked_items);
          }
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

  // ── REALTIME + CARGA INICIAL: ajustes de precio pendientes (Caso B) ───────
  useEffect(() => {
    if (!selectedOrder?.supabaseId || isPickup) return;

    // Cargar ajustes pendientes al montar
    getPendingAdjustments(selectedOrder.supabaseId).then(({ data }) => {
      setPendingAdjustments(data ?? []);
    });

    const channel = supabase
      .channel(`price-adj-${selectedOrder.supabaseId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'price_adjustment_requests', filter: `order_id=eq.${selectedOrder.supabaseId}` },
        (payload) => {
          if (payload.new?.status === 'pending') {
            setPendingAdjustments((prev) => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrder?.supabaseId]);

  // ── Aprobar ajuste de precio (Caso B) ─────────────────────────────────────
  const handleApproveAdjustment = async (adjustment) => {
    const { data, error } = await resolvePriceAdjustment(adjustment.id, true);
    if (error || !data) return;
    // Actualizar el precio en Supabase y en el store local
    await updateProductPrice(data.order_id, data.store_idx, data.product_idx, data.requested_price);
    setPendingAdjustments((prev) => prev.filter((a) => a.id !== adjustment.id));
    updateOrderDelivery(selectedOrder.id, { result: null }); // forzar re-fetch en próxima carga
  };

  // ── Rechazar ajuste de precio → cancela el pedido (Caso B) ────────────────
  const handleRejectAdjustment = async (adjustment) => {
    const { error } = await resolvePriceAdjustment(adjustment.id, false);
    if (error) return;
    await cancelOrderByUser(adjustment.order_id);
    setPendingAdjustments((prev) => prev.filter((a) => a.id !== adjustment.id));
  };

  const handleRemove = (id) => {
    removeOrder(id);
    setConfirmDeleteId(null);
    setSelectedIdx((prev) => Math.max(0, prev - 1));
  };

  // Convierte checked_items del repartidor ({ "si-pi": true }) al formato del checklist
  // del cliente ({ "localOrderId-si-pi": true }) y actualiza el estado.
  // Reconstruye desde cero para manejar correctamente los ítems desmarcados.
  const applyDealerCheckedItems = (localOrderId, dealerItems) => {
    setChecklist((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${localOrderId}-`)) delete next[k];
      });
      Object.entries(dealerItems).forEach(([key, val]) => {
        if (val) next[`${localOrderId}-${key}`] = true;
      });
      return next;
    });
  };

  const toggleCheck = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCancelDelivery = async () => {
    if (!selectedOrder?.supabaseId) return;
    const charged = selectedOrder.deliveryStatus !== 'searching';
    const { error } = await cancelOrderByUser(selectedOrder.supabaseId);
    if (!error) {
      updateOrderDelivery(selectedOrder.id, {
        deliveryStatus: 'cancelled',
        cancellationCharged: charged,
      });
    }
  };

  // Cuando el usuario sube el comprobante de pago al repartidor (estado 'llegando')
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
              onClick={() => setSelectedIdx(i)}
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
            <>
              <div style={pedidos.orderHeader}>
                <div style={pedidos.orderHeaderLeft}>
                  <span style={pedidos.orderRef}>#{selectedOrder.id.slice(-8)}</span>
                  <span style={pedidos.orderDate}>{date}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedOrder.id)}
                  style={pedidos.deleteBtn}
                  title="Eliminar pedido"
                >
                  <TrashIcon />
                </button>
              </div>

              {/* ── Confirmación de eliminación ── */}
              {confirmDeleteId === selectedOrder.id && (() => {
                const isActive = selectedOrder.deliveryMode &&
                  !['entregado', 'cancelled', 'auto_gestionado'].includes(selectedOrder.deliveryStatus);
                return (
                  <div style={{
                    padding: '12px 14px',
                    background: isActive ? 'var(--error-soft, #fee2e2)' : 'var(--bg-elevated)',
                    border: `1px solid ${isActive ? 'var(--error, #dc2626)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', flexDirection: 'column', gap: '8px',
                  }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: isActive ? 'var(--error, #dc2626)' : 'var(--text-primary)' }}>
                      {isActive ? '⚠️ Este pedido tiene un domicilio activo' : '¿Eliminás este pedido?'}
                    </p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      {isActive
                        ? 'Eliminar de tu vista no cancela el domicilio ni te exime del pago. El repartidor y la plataforma conservan el registro completo del pedido.'
                        : 'Se eliminará de tu historial local. Esta acción no se puede deshacer.'}
                    </p>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        style={{
                          flex: 1, padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border)',
                          background: 'transparent', color: 'var(--text-muted)',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(selectedOrder.id)}
                        style={{
                          flex: 1, padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)', border: 'none',
                          background: isActive ? 'var(--error, #dc2626)' : 'var(--text-muted)',
                          color: '#fff',
                          fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        {isActive ? 'Entiendo, eliminar igual' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {/* ── Tarjeta de domicilio ── */}
          {selectedOrder.deliveryMode && !isPickup && (
            <DeliveryCard
              order={selectedOrder}
              onCancel={handleCancelDelivery}
              onPaymentSubmitted={handlePaymentSubmitted}
            />
          )}

          {/* ── Banners de ajuste de precio pendientes (Caso B) ── */}
          {!isPickup && pendingAdjustments.length > 0 && pendingAdjustments.map((adj) => (
            <PriceAdjustmentBanner
              key={adj.id}
              adjustment={adj}
              onApprove={handleApproveAdjustment}
              onReject={handleRejectAdjustment}
            />
          ))}

          {/* ── Totales rápidos ── */}
          <div style={pedidos.stats}>
            {selectedOrder.deliveryMode ? (
              <>
                <div style={pedidos.stat}>
                  <span style={pedidos.statVal}>${result.totalCost.toLocaleString('es-CO')}</span>
                  <span style={pedidos.statLabel}>Productos</span>
                </div>
                <div style={pedidos.stat}>
                  <span style={pedidos.statVal}>
                    ${(selectedOrder.deliveryFee ?? calculateDeliveryFee(result?.stores, userCoords)).toLocaleString('es-CO')}
                  </span>
                  <span style={pedidos.statLabel}>Domicilio</span>
                </div>
                <div style={pedidos.stat}>
                  <span style={{ ...pedidos.statVal, color: 'var(--accent)' }}>
                    ${(result.totalCost + (selectedOrder.deliveryFee ?? calculateDeliveryFee(result?.stores, userCoords))).toLocaleString('es-CO')}
                  </span>
                  <span style={pedidos.statLabel}>Total</span>
                </div>
              </>
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
            onPriceReport={isPickup ? (storeIdx, pi, newPrice) => handlePriceReport(selectedOrder, storeIdx, pi, newPrice) : null}
            readOnly={!isPickup}
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
              showRoute={false}
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
