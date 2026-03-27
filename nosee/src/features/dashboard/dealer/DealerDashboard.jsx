/**
 * DealerDashboard.jsx — Dashboard del repartidor (Proceso 4)
 *
 * Conectado a Supabase real. Tabs:
 *   disponibles — pedidos pendientes que el repartidor puede aceptar
 *   activos     — pedido asignado al repartidor, checklist y avance de estado
 *   ruta        — mapa con tiendas del pedido activo y dirección de entrega
 *   historial   — pedidos entregados por este repartidor
 *
 * GPS: cuando hay un pedido activo, envía la ubicación a dealer_locations
 *      cada 15 segundos via Supabase upsert.
 *
 * Realtime: suscripción a cambios en orders para:
 *   - Nuevos pedidos disponibles (tab "disponibles" se actualiza en vivo)
 *   - Cambios en el pedido activo (el usuario puede cancelar)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/services/supabase.client';
import {
  getAvailableOrders,
  getDealerActiveOrders,
  acceptOrder,
  advanceOrderStatus,
  confirmPayment,
  abandonOrder,
  upsertDealerLocation,
  updateProductPrice,
  logPriceCorrection,
} from '@/services/api/orders.api';
import { getPaymentByOrderId, getReceiptSignedUrl } from '@/services/api/payments.api';
import { getDealerBankAccounts } from '@/services/api/bankAccounts.api';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { PriceReportInline } from '@/features/orders/components/PriceReportInline';

// Etiquetas y próximo estado para cada transición.
// 'llegando' y 'pendiente_pago' no tienen avance directo desde el repartidor:
//   llegando       → el usuario paga → orders.status = pendiente_pago
//   pendiente_pago → repartidor confirma pago → confirmPayment() → entregado
const NEXT_LABEL = {
  aceptado:  '🛒 Llegué a la tienda',
  comprando: '🛵 Terminé las compras',
  en_camino: '🔔 Llegué a la puerta',
};
const NEXT_STATUS = {
  aceptado:  'comprando',
  comprando: 'en_camino',
  en_camino: 'llegando',
};

// ─── Helpers para leer el JSONB guardado por CreateOrderPage ─────────────────
function extractItems(order) {
  // order.stores es un array [{store, products:[{item:{productName,quantity},price}]}]
  if (!Array.isArray(order.stores) || order.stores.length === 0) return [];
  return order.stores.flatMap((s) =>
    (s.products ?? []).map((p) => p.item?.productName ?? '?')
  );
}

function extractStores(order) {
  if (!Array.isArray(order.stores)) return [];
  return order.stores;
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function DealerDashboard() {
  const { t }  = useLanguage();
  const td     = t.dealerDashboard;
  const dealer = useAuthStore((s) => s.user);

  // ── Estado ──────────────────────────────────────────────────────────────
  const [activeTab,       setActiveTab]       = useState('disponibles');
  const [available,       setAvailable]       = useState([]);
  const [activeOrders,    setActiveOrders]    = useState([]);
  const [history,         setHistory]         = useState([]);
  const [loadingAvail,    setLoadingAvail]    = useState(true);
  const [loadingActive,   setLoadingActive]   = useState(true);
  const [acceptingId,     setAcceptingId]     = useState(null);  // id del pedido que se está aceptando
  const [acceptError,     setAcceptError]     = useState(null);
  const [noBankWarning,   setNoBankWarning]   = useState(false); // aviso sin cuentas bancarias
  const [advancingId,     setAdvancingId]     = useState(null);  // id del pedido que se está avanzando
  const [advanceError,    setAdvanceError]    = useState(null);  // { id, msg } del pedido que falló al avanzar
  const [confirmingId,    setConfirmingId]    = useState(null);  // id del pedido con pago pendiente de confirmación
  const [confirmError,    setConfirmError]    = useState(null);  // { id, msg } del pedido que falló al confirmar
  const [abandoningId,    setAbandoningId]    = useState(null);  // id del pedido que se está abandonando
  const [abandonError,    setAbandonError]    = useState(null);  // { id, msg } del pedido que falló al abandonar
  const [newOrderAlert,   setNewOrderAlert]   = useState(false); // banner de nuevo pedido disponible
  const [loadAvailError,  setLoadAvailError]  = useState(null);  // error al cargar disponibles
  // Checklist local por pedido: { [orderId]: { [productKey]: boolean } }
  const [checklist,       setChecklist]       = useState({});

  const gpsIntervalRef    = useRef(null);
  const initializedRef    = useRef(false); // para no mostrar alerta en la carga inicial

  // ── Carga inicial ────────────────────────────────────────────────────────
  const loadAvailable = useCallback(async () => {
    setLoadingAvail(true);
    setLoadAvailError(null);
    const { data, error } = await getAvailableOrders({ limit: 30 });
    if (error) {
      console.error('[DealerDashboard] getAvailableOrders error:', error);
      setLoadAvailError(`Error al cargar pedidos: ${error.message}`);
    }
    setAvailable(data);
    setLoadingAvail(false);
  }, []);

  const loadActive = useCallback(async () => {
    setLoadingActive(true);
    const { data } = await getDealerActiveOrders();
    setActiveOrders(data);
    setLoadingActive(false);
  }, []);

  const loadHistory = useCallback(async () => {
    // Pedidos entregados por este repartidor — RLS filtra dealer_id = auth.uid()
    const { data } = await supabase
      .from('orders')
      .select('id, local_id, status, total_estimated, delivery_fee, created_at, delivery_address')
      .eq('status', 'entregado')
      .order('created_at', { ascending: false })
      .limit(50);
    setHistory(data ?? []);
  }, []);

  useEffect(() => {
    Promise.all([loadAvailable(), loadActive(), loadHistory()]).then(() => {
      initializedRef.current = true;
    });
  }, [loadAvailable, loadActive, loadHistory]);

  // ── GPS tracking ─────────────────────────────────────────────────────────
  // Solo envía ubicación mientras haya un pedido activo (respeta batería y privacidad).
  // Se detiene automáticamente cuando no hay pedidos activos.
  useEffect(() => {
    const hasActive = activeOrders.length > 0;

    if (hasActive && dealer?.id) {
      // Enviar ubicación inmediatamente y luego cada 15 segundos
      const sendLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(
          (pos) => upsertDealerLocation(dealer.id, pos.coords.latitude, pos.coords.longitude, true),
          () => {} // fallo silencioso — GPS puede no estar disponible en desktop
        );
      };
      sendLocation();
      gpsIntervalRef.current = setInterval(sendLocation, 15_000);
    } else {
      // Sin pedido activo: marcar como no disponible si hay fila en dealer_locations
      clearInterval(gpsIntervalRef.current);
      if (dealer?.id) {
        navigator.geolocation?.getCurrentPosition(
          (pos) => upsertDealerLocation(dealer.id, pos.coords.latitude, pos.coords.longitude, false),
          () => {}
        );
      }
    }

    return () => clearInterval(gpsIntervalRef.current);
  }, [activeOrders.length, dealer?.id]);

  // ── Supabase Realtime ────────────────────────────────────────────────────
  // Suscripción 1: INSERT de nuevos pedidos → si status es pendiente_repartidor,
  //   actualiza la lista de disponibles. Se usa INSERT (no '*') para máxima fiabilidad.
  // Suscripción 2: UPDATE de pedidos → detecta los asignados a este repartidor
  //   y cambios de estado (entregado, cancelado).
  // Nota: REPLICA IDENTITY FULL está habilitado en orders para que los filtros
  //   de columna en postgres_changes funcionen correctamente.
  useEffect(() => {
    if (!dealer?.id) return;

    const channel = supabase
      .channel(`dealer-orders-watch-${dealer.id}`)
      // Nuevos pedidos creados por usuarios
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'orders',
      }, (payload) => {
        if (payload.new?.status !== 'pendiente_repartidor') return;
        loadAvailable();
        if (initializedRef.current) {
          setNewOrderAlert(true);
          setActiveTab((prev) => prev === 'activos' ? prev : 'disponibles');
        }
      })
      // Pedidos que cambian a pendiente_repartidor (ej: cancelación y re-apertura)
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `status=eq.pendiente_repartidor`,
      }, () => {
        loadAvailable();
      })
      // Cambios en los pedidos asignados a este repartidor
      .on('postgres_changes', {
        event:  'UPDATE',
        schema: 'public',
        table:  'orders',
        filter: `dealer_id=eq.${dealer.id}`,
      }, (payload) => {
        const updated = payload.new;
        if (!updated) return;

        if (updated.status === 'entregado') {
          setActiveOrders((prev) => prev.filter((o) => o.id !== updated.id));
          setHistory((prev) => [updated, ...prev]);
        } else if (updated.status === 'cancelado') {
          setActiveOrders((prev) => prev.filter((o) => o.id !== updated.id));
          loadAvailable(); // puede volver a estar disponible
        } else {
          setActiveOrders((prev) =>
            prev.map((o) => o.id === updated.id ? { ...o, ...updated } : o)
          );
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [dealer?.id, loadAvailable]);

  // ── Aceptar pedido ───────────────────────────────────────────────────────
  const handleAccept = async (orderId) => {
    setAcceptingId(orderId);
    setAcceptError(null);
    setNoBankWarning(false);

    // Guard: verificar que el repartidor tenga al menos una cuenta bancaria
    if (dealer?.id) {
      const { data: accounts } = await getDealerBankAccounts(dealer.id);
      if (!accounts || accounts.length === 0) {
        setNoBankWarning(true);
        setAcceptingId(null);
        return;
      }
    }

    const { error } = await acceptOrder(orderId);

    if (error) {
      // 'order_not_available': otro repartidor llegó primero
      const msg = error.message?.includes('order_not_available')
        ? 'Este pedido ya fue tomado por otro repartidor.'
        : 'Error al aceptar el pedido. Intentá de nuevo.';
      setAcceptError(msg);
      // Refrescar disponibles para que el pedido desaparezca de la lista
      loadAvailable();
    } else {
      // Mover de "disponibles" a "activos"
      setAvailable((prev) => prev.filter((o) => o.id !== orderId));
      loadActive();
      setActiveTab('activos');
    }

    setAcceptingId(null);
  };

  // ── Rechazar pedido disponible ───────────────────────────────────────────
  // Solo quita el pedido de la vista local del repartidor.
  // No modifica el estado en BD — el pedido sigue disponible para otros.
  const handleCancel = (orderId) => {
    setAvailable((prev) => prev.filter((o) => o.id !== orderId));
  };

  // ── Actualizar precio de producto ────────────────────────────────────────
  const handlePriceReport = async (order, storeIdx, productIdx, newPrice) => {
    const productName = order.stores?.[storeIdx]?.products?.[productIdx]?.item?.productName;
    const { error, newStores, newTotal, oldPrice } = await updateProductPrice(
      order.id, storeIdx, productIdx, newPrice
    );
    if (!error) {
      setActiveOrders((prev) =>
        prev.map((o) =>
          o.id === order.id
            ? { ...o, stores: newStores, total_estimated: newTotal }
            : o
        )
      );
      logPriceCorrection({ orderId: order.id, storeIdx, productIdx, productName, oldPrice, newPrice, role: 'dealer' });
      console.info(`[PrecioCorregido-dealer] ${productName}: $${oldPrice} → $${newPrice}`);
    }
    return { error };
  };

  // ── Avanzar estado del pedido ────────────────────────────────────────────
  const handleAdvance = async (order) => {
    const newStatus = NEXT_STATUS[order.status];
    if (!newStatus) return;

    setAdvancingId(order.id);
    setAdvanceError(null);
    const { error } = await advanceOrderStatus(order.id, newStatus);

    if (!error) {
      if (newStatus === 'entregado') {
        setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
        setHistory((prev) => [{ ...order, status: 'entregado' }, ...prev]);
      } else {
        setActiveOrders((prev) =>
          prev.map((o) => o.id === order.id ? { ...o, status: newStatus } : o)
        );
      }
    } else {
      setAdvanceError({ id: order.id, msg: 'No se pudo actualizar el estado. Revisá tu conexión e intentá de nuevo.' });
    }

    setAdvancingId(null);
  };

  // ── Confirmar pago del usuario ───────────────────────────────────────────
  // Se llama cuando el repartidor verifica el comprobante (o el efectivo) y
  // marca el pedido como entregado llamando al RPC confirm_payment() en Supabase.
  const handleConfirmPayment = async (order) => {
    setConfirmingId(order.id);
    setConfirmError(null);
    const { error } = await confirmPayment(order.id);
    if (!error) {
      setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
      setHistory((prev) => [{ ...order, status: 'entregado' }, ...prev]);
    } else {
      setConfirmError({ id: order.id, msg: 'No se pudo confirmar el pago. Revisá tu conexión e intentá de nuevo.' });
    }
    setConfirmingId(null);
  };

  // ── Abandonar pedido activo (vuelve al pool) ─────────────────────────────
  const handleAbandon = async (order) => {
    setAbandoningId(order.id);
    setAbandonError(null);
    const { error } = await abandonOrder(order.id);
    if (!error) {
      setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
    } else {
      setAbandonError({ id: order.id, msg: 'No se pudo abandonar el pedido. Revisá tu conexión e intentá de nuevo.' });
    }
    setAbandoningId(null);
  };

  // ── Toggle checklist ────────────────────────────────────────────────────
  const toggleCheck = (orderId, key) => {
    setChecklist((prev) => ({
      ...prev,
      [orderId]: { ...(prev[orderId] ?? {}), [key]: !(prev[orderId]?.[key]) },
    }));
  };

  // ── Stats sidebar ────────────────────────────────────────────────────────
  const totalEarned = history.reduce((s, h) => s + Number(h.delivery_fee ?? 0), 0);

  const STATUS_INFO = {
    pendiente_repartidor: { label: 'Disponible',     color: 'var(--warning)',       bg: 'var(--warning-soft)' },
    aceptado:             { label: 'Aceptado',        color: 'var(--accent)',        bg: 'var(--accent-soft)' },
    comprando:            { label: 'Comprando',       color: 'var(--warning)',       bg: 'var(--warning-soft)' },
    en_camino:            { label: 'En camino',       color: 'var(--success)',       bg: 'var(--success-soft)' },
    llegando:             { label: 'En la puerta',    color: 'var(--accent)',        bg: 'var(--accent-soft)' },
    pendiente_pago:       { label: 'Esperando pago', color: '#92400e',              bg: '#fef3c7' },
    entregado:            { label: 'Entregado',       color: 'var(--success)',       bg: 'var(--success-soft)' },
    cancelado:            { label: 'Cancelado',       color: 'var(--error)',         bg: 'var(--error-soft)' },
  };

  // Pedido activo para la tab "ruta"
  const routeOrder = activeOrders[0] ?? null;

  return (
    <div style={r.root} className="dash-root">
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={r.sidebar} className="dash-sidebar">
        <div style={r.onlineBox} className="dash-online-box">
          <span style={r.onlineDot} />
          <span style={r.onlineLabel}>
            {activeOrders.length > 0 ? 'En servicio' : td.onlineLabel}
          </span>
        </div>

        <nav style={r.nav}>
          {[
            { key: 'disponibles', icon: '📋', label: 'Disponibles', badge: available.length },
            { key: 'activos',     icon: '◉',  label: td.navActive,  badge: activeOrders.length },
            { key: 'ruta',        icon: '🗺',  label: td.navRoute },
            { key: 'historial',   icon: '◎',  label: td.navHistory },
          ].map((item) => (
            <button
              key={item.key}
              style={{ ...r.navItem, ...(activeTab === item.key ? r.navActive : {}) }}
              onClick={() => setActiveTab(item.key)}
            >
              <span style={r.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge > 0 && <span style={r.navBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={r.quickStats} className="dash-quick-stats">
          <div style={r.quickStat}>
            <div style={r.qValue}>{activeOrders.length}</div>
            <div style={r.qLabel}>{td.statActive}</div>
          </div>
          <div style={r.quickStat}>
            <div style={r.qValue}>{history.length}</div>
            <div style={r.qLabel}>{td.statToday}</div>
          </div>
          <div style={r.quickStat}>
            <div style={r.qValue}>${(totalEarned / 1000).toFixed(0)}k</div>
            <div style={r.qLabel}>{td.statEarned}</div>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main style={r.main} className="dash-main">

        {/* ── Alerta de nuevo pedido ──────────────────────────────── */}
        {newOrderAlert && (
          <div style={r.newOrderBanner}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <span style={{ flex: 1, fontWeight: 700 }}>¡Nuevo pedido disponible!</span>
            <button
              type="button"
              style={r.newOrderDismiss}
              onClick={() => setNewOrderAlert(false)}
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Tab: Disponibles ───────────────────────────────────── */}
        {activeTab === 'disponibles' && (
          <>
            <header style={r.header}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 style={{ ...r.headerTitle, flex: 1 }}>Pedidos disponibles</h1>
                <button style={r.refreshBtn} onClick={loadAvailable} disabled={loadingAvail}>
                  ↻ Actualizar
                </button>
              </div>
              <p style={r.headerSub}>
                {loadingAvail
                  ? 'Cargando...'
                  : `${available.length} pedido${available.length !== 1 ? 's' : ''} esperando repartidor`}
              </p>
            </header>

            {acceptError && (
              <div style={r.errorBanner}>{acceptError}</div>
            )}

            {loadAvailError && (
              <div style={r.errorBanner}>{loadAvailError}</div>
            )}

            {noBankWarning && (
              <div style={{ ...r.errorBanner, background: 'var(--warning-soft, #fef9c3)', borderColor: 'var(--warning, #ca8a04)', color: '#92400e' }}>
                <strong>⚠️ Configurá tus datos de cobro antes de aceptar pedidos.</strong>{' '}
                Andá a tu <a href="/perfil" style={{ color: 'inherit', fontWeight: 700 }}>perfil</a> → sección "Métodos de cobro" y agregá al menos una cuenta bancaria.
              </div>
            )}

            {loadingAvail ? (
              <div style={r.empty}><span style={{ fontSize: 32 }}>⏳</span><p>Cargando pedidos...</p></div>
            ) : available.length === 0 ? (
              <div style={r.empty}>
                <span style={{ fontSize: 40 }}>◎</span>
                <p>No hay pedidos disponibles en este momento.</p>
              </div>
            ) : (
              <div style={r.orderList}>
                {available.map((order) => (
                  <AvailableOrderCard
                    key={order.id}
                    order={order}
                    accepting={acceptingId === order.id}
                    onAccept={() => handleAccept(order.id)}
                    onCancel={() => handleCancel(order.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Activos ────────────────────────────────────────── */}
        {activeTab === 'activos' && (
          <>
            <header style={r.header}>
              <h1 style={r.headerTitle}>{td.activeTitle}</h1>
              <p style={r.headerSub}>
                {loadingActive ? 'Cargando...' : td.activeSub(activeOrders.length)}
              </p>
            </header>

            {loadingActive ? (
              <div style={r.empty}><span style={{ fontSize: 32 }}>⏳</span><p>Cargando...</p></div>
            ) : activeOrders.length === 0 ? (
              <div style={r.empty}>
                <span style={{ fontSize: 40 }}>◎</span>
                <p>{td.noOrders}</p>
                <button
                  style={r.refreshBtn}
                  onClick={() => setActiveTab('disponibles')}
                >
                  Ver pedidos disponibles →
                </button>
              </div>
            ) : (
              <div style={r.orderList}>
                {activeOrders.map((order) => (
                  <ActiveOrderCard
                    key={order.id}
                    order={order}
                    statusInfo={STATUS_INFO}
                    checklist={checklist[order.id] ?? {}}
                    onToggleCheck={(key) => toggleCheck(order.id, key)}
                    advancing={advancingId === order.id}
                    advanceError={advanceError?.id === order.id ? advanceError.msg : null}
                    onAdvance={() => { setAdvanceError(null); handleAdvance(order); }}
                    onPriceReport={(si, pi, newPrice) => handlePriceReport(order, si, pi, newPrice)}
                    confirmingPayment={confirmingId === order.id}
                    confirmError={confirmError?.id === order.id ? confirmError.msg : null}
                    onConfirmPayment={() => { setConfirmError(null); handleConfirmPayment(order); }}
                    abandoning={abandoningId === order.id}
                    abandonError={abandonError?.id === order.id ? abandonError.msg : null}
                    onAbandon={() => { setAbandonError(null); handleAbandon(order); }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Ruta ───────────────────────────────────────────── */}
        {activeTab === 'ruta' && (
          <>
            <header style={r.header}>
              <h1 style={r.headerTitle}>{td.routeTitle}</h1>
              <p style={r.headerSub}>
                {routeOrder
                  ? `Ruta activa: ${routeOrder.local_id ?? `#${routeOrder.id}`}`
                  : 'Sin pedido activo'}
              </p>
            </header>

            {routeOrder ? (
              <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${BORDER}` }}>
                <OrderRouteMap
                  stores={extractStores(routeOrder)}
                  userCoords={routeOrder.delivery_coords ?? null}
                  driverLocation={null}
                  mapHeight="520px"
                />
              </div>
            ) : (
              <div style={r.empty}>
                <span style={{ fontSize: 44 }}>🗺</span>
                <p>Acepta un pedido para ver la ruta aquí.</p>
              </div>
            )}
          </>
        )}

        {/* ── Tab: Historial ──────────────────────────────────────── */}
        {activeTab === 'historial' && (
          <>
            <header style={r.header}>
              <h1 style={r.headerTitle}>{td.historyTitle}</h1>
              <p style={r.headerSub}>{history.length} entregas completadas</p>
            </header>

            {history.length === 0 ? (
              <div style={r.empty}>
                <span style={{ fontSize: 40 }}>◎</span>
                <p>Aún no tenés entregas completadas.</p>
              </div>
            ) : (
              <div style={r.historyList}>
                {history.map((h) => (
                  <div key={h.id} style={r.historyRow}>
                    <div style={r.histId}>{h.local_id ?? `#${h.id}`}</div>
                    <div style={r.histClient}>{h.delivery_address ?? '—'}</div>
                    <div style={r.histTotal}>+${Number(h.delivery_fee ?? 0).toLocaleString('es-CO')}</div>
                    <span style={{ ...r.statusBadge, background: 'var(--success-soft)', color: 'var(--success)' }}>
                      Entregado
                    </span>
                    <div style={r.histDate}>
                      {new Date(h.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// ─── AvailableOrderCard ───────────────────────────────────────────────────────
// Tarjeta de pedido disponible para aceptar. El repartidor ve qué tiene que
// comprar, en qué tiendas y a dónde entregar antes de comprometerse.
function AvailableOrderCard({ order, accepting, onAccept, onCancel }) {
  const items  = extractItems(order);
  const stores = extractStores(order);
  const total  = Number(order.total_estimated ?? 0) + Number(order.delivery_fee ?? 0);

  return (
    <article style={r.orderCard}>
      {/* Encabezado */}
      <div style={r.orderTop}>
        <div style={r.orderId}>{order.local_id ?? `#${order.id}`}</div>
        <span style={{ ...r.statusBadge, background: 'var(--warning-soft)', color: '#92400e' }}>
          Disponible
        </span>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>
          {new Date(order.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Dirección de entrega */}
      <div style={r.orderAddress}>
        📍 {order.delivery_address ?? 'Dirección no especificada'}
      </div>

      {/* Tiendas a visitar */}
      {stores.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <p style={r.sectionMini}>Tiendas a visitar ({stores.length})</p>
          <div style={r.orderItems}>
            {stores.map((s, i) => (
              <span key={i} style={r.itemChip}>
                {Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪'} {s.store?.name ?? 'Tienda'}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Productos */}
      {items.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <p style={r.sectionMini}>Productos ({items.length})</p>
          <div style={r.orderItems}>
            {items.slice(0, 6).map((item, i) => (
              <span key={i} style={r.itemChip}>{item}</span>
            ))}
            {items.length > 6 && (
              <span style={{ ...r.itemChip, color: MUTED }}>+{items.length - 6} más</span>
            )}
          </div>
        </div>
      )}

      {/* Footer: total, botón cancelar y botón aceptar */}
      <div style={r.orderFooter}>
        <div>
          <div style={r.orderTotal}>${total.toLocaleString('es-CO')} COP</div>
          <div style={{ fontSize: 11, color: MUTED }}>
            compras + ${Number(order.delivery_fee ?? 0).toLocaleString('es-CO')} domicilio
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={r.cancelBtn}
            onClick={onCancel}
            disabled={accepting}
          >
            ✕ Ignorar
          </button>
          <button
            style={{ ...r.advanceBtn, ...(accepting ? { opacity: 0.7 } : {}) }}
            onClick={onAccept}
            disabled={accepting}
          >
            {accepting ? 'Aceptando...' : '✓ Aceptar pedido'}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── ActiveOrderStepper ───────────────────────────────────────────────────────
// Indicador visual de las 5 fases del proceso de entrega.
// Cada paso tiene: ícono, label corto, estado (completado / activo / pendiente).
const STEPS = [
  { key: 'aceptado',       icon: '✓',  label: 'Aceptado'  },
  { key: 'comprando',      icon: '🛒', label: 'Comprando' },
  { key: 'en_camino',      icon: '🛵', label: 'En camino' },
  { key: 'llegando',       icon: '🔔', label: 'En puerta' },
  { key: 'entregado',      icon: '✅', label: 'Entregado' },
];

// Mapea cada status de BD al índice del paso activo en el stepper
const STATUS_STEP = {
  aceptado:       0,
  comprando:      1,
  en_camino:      2,
  llegando:       3,
  pendiente_pago: 3,  // misma fase visual que "en la puerta", esperando pago
  entregado:      4,
};

function ActiveOrderStepper({ status }) {
  const activeIdx = STATUS_STEP[status] ?? 0;

  return (
    <div style={st.root}>
      {STEPS.map((step, idx) => {
        const done    = idx < activeIdx;
        const current = idx === activeIdx;
        return (
          <div key={step.key} style={st.stepWrap}>
            {/* Línea conectora izquierda */}
            {idx > 0 && (
              <div style={{ ...st.line, background: done || current ? ACCENT : BORDER }} />
            )}

            {/* Círculo del paso */}
            <div style={{
              ...st.circle,
              background:   done    ? ACCENT : current ? ACCENT : 'transparent',
              borderColor:  done || current ? ACCENT : BORDER,
              color:        done || current ? '#fff'  : MUTED,
              boxShadow:    current ? `0 0 0 4px ${ACCENT}28` : 'none',
              transform:    current ? 'scale(1.15)' : 'scale(1)',
              transition:   'all 0.2s ease',
            }}>
              {done ? '✓' : step.icon}
            </div>

            {/* Label */}
            <span style={{
              ...st.label,
              color:      current ? ACCENT : done ? 'var(--text-primary)' : MUTED,
              fontWeight: current ? 700 : 500,
            }}>
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const st = {
  root: {
    display: 'flex', alignItems: 'flex-start',
    padding: '12px 4px 8px',
    position: 'relative',
  },
  stepWrap: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 4, position: 'relative',
  },
  line: {
    position: 'absolute', top: 13, right: '50%',
    width: '100%', height: 2,
  },
  circle: {
    width: 28, height: 28, borderRadius: '50%',
    border: '2px solid', fontSize: 12, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1, flexShrink: 0,
  },
  label: {
    fontSize: 10, textAlign: 'center',
    letterSpacing: '0.02em', lineHeight: 1.2,
    maxWidth: 52,
  },
};

// ─── ActiveOrderCard ──────────────────────────────────────────────────────────
// Tarjeta del pedido asignado al repartidor. Muestra checklist de productos
// cuando está "comprando" y el botón para avanzar al siguiente estado.
// Cuando status = 'pendiente_pago' muestra el comprobante del usuario (si existe)
// y el botón para confirmar la recepción del pago.
function ActiveOrderCard({ order, statusInfo, checklist, onToggleCheck, advancing, advanceError, onAdvance, onPriceReport, confirmingPayment, confirmError, onConfirmPayment, abandoning, abandonError, onAbandon }) {
  const si     = statusInfo[order.status] ?? statusInfo.aceptado;
  const stores = extractStores(order);
  const [expanded,       setExpanded]       = useState(true);
  const [payment,        setPayment]        = useState(null);   // { receipt_url, payment_method }
  const [loadingPay,     setLoadingPay]     = useState(false);
  const [abandonConfirm, setAbandonConfirm] = useState(false);

  // Cargar el comprobante cuando el pedido pasa a pendiente_pago
  useEffect(() => {
    if (order.status !== 'pendiente_pago') return;
    setLoadingPay(true);
    getPaymentByOrderId(order.id).then(async ({ data }) => {
      if (data?.external_reference) {
        // La URL firmada expira en 1h — regenerar para garantizar acceso al comprobante
        const { url } = await getReceiptSignedUrl(data.external_reference);
        setPayment({ ...data, receipt_url: url ?? data.receipt_url });
      } else {
        setPayment(data);
      }
      setLoadingPay(false);
    });
  }, [order.status, order.id]);

  // Contar productos completados del checklist
  const allProducts = stores.flatMap((s, si) =>
    (s.products ?? []).map((p, pi) => ({ key: `${si}-${pi}`, name: p.item?.productName ?? '?', qty: p.item?.quantity ?? 1 }))
  );
  const checked = allProducts.filter((p) => checklist[p.key]).length;

  return (
    <article style={{ ...r.orderCard, ...r.orderCardSelected }}>
      {/* Encabezado */}
      <div style={{ ...r.orderTop, cursor: 'pointer' }} onClick={() => setExpanded((v) => !v)}>
        <div style={r.orderId}>{order.local_id ?? `#${order.id}`}</div>
        <span style={{ ...r.statusBadge, background: si.bg, color: si.color }}>
          {si.label}
        </span>
        {allProducts.length > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>
            {checked}/{allProducts.length} ✓
          </span>
        )}
        <span style={{ fontSize: 12, color: MUTED }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {/* Stepper de progreso */}
      <ActiveOrderStepper status={order.status} />

      {/* Dirección de entrega */}
      <div style={r.orderAddress}>
        📍 {order.delivery_address ?? 'Dirección no especificada'}
      </div>

      {/* Checklist por tienda (solo cuando expanded) */}
      {expanded && stores.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {stores.map((s, si) => (
            <div key={si} style={r.storeBlock}>
              <div style={r.storeBlockTitle}>
                {Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪'} {s.store?.name ?? 'Tienda'}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {(s.products ?? []).map((p, pi) => {
                  const key = `${si}-${pi}`;
                  const done = !!checklist[key];
                  return (
                    <li
                      key={pi}
                      style={{
                        ...r.checkItem,
                        ...(done ? r.checkItemDone : {}),
                      }}
                    >
                      <span
                        style={{ ...r.checkbox, ...(done ? r.checkboxDone : {}), cursor: 'pointer', flexShrink: 0 }}
                        onClick={() => onToggleCheck(key)}
                      >
                        {done ? '✓' : ''}
                      </span>
                      <span style={{ flex: 1 }} onClick={() => onToggleCheck(key)}>
                        {p.item?.productName ?? '?'}
                        <span style={{ color: MUTED, fontSize: 12 }}>
                          {' '}×{p.item?.quantity ?? 1}
                        </span>
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                        <span style={{ fontSize: 12, color: MUTED }}>
                          ${Number(p.price ?? 0).toLocaleString('es-CO')}
                        </span>
                        <PriceReportInline
                          currentPrice={p.price ?? 0}
                          onConfirm={(newPrice) => onPriceReport(si, pi, newPrice)}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Panel de pago — solo cuando status = pendiente_pago */}
      {order.status === 'pendiente_pago' && (
        <div style={{
          padding: '12px 14px', borderRadius: 8,
          background: '#fef3c7', border: '1px solid #fde68a',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {loadingPay ? (
            <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>Cargando comprobante...</p>
          ) : payment ? (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                💳 Pago enviado por el usuario
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                Método: <strong>{payment.payment_method}</strong>
              </p>
              {payment.receipt_url && (
                <a
                  href={payment.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 600 }}
                >
                  📎 Ver comprobante de pago
                </a>
              )}
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400e' }}>
                💵 Pago en efectivo
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#92400e' }}>
                El usuario indicó que pagará en efectivo al recibir el pedido.
              </p>
            </>
          )}
          <button
            style={{
              marginTop: 4, padding: '9px 16px',
              borderRadius: 6, border: 'none',
              background: '#065f46', color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: confirmingPayment ? 'not-allowed' : 'pointer',
              opacity: confirmingPayment ? 0.6 : 1,
            }}
            onClick={onConfirmPayment}
            disabled={confirmingPayment}
          >
            {confirmingPayment ? 'Confirmando...' : '✅ Confirmar pago recibido'}
          </button>
        </div>
      )}

      {/* Footer: total + botón avanzar (solo estados con transición directa) */}
      <div style={r.orderFooter}>
        <div>
          <div style={r.orderTotal}>
            ${(Number(order.total_estimated ?? 0) + Number(order.delivery_fee ?? 0)).toLocaleString('es-CO')}
          </div>
          <div style={{ fontSize: 11, color: MUTED }}>total a cobrar</div>
        </div>
        {order.status === 'llegando' && (
          <div style={{ fontSize: 12, color: MUTED, fontStyle: 'italic', maxWidth: 200, textAlign: 'right' }}>
            Esperando que el usuario realice el pago...
          </div>
        )}
        {NEXT_LABEL[order.status] && (
          <button
            style={{ ...r.advanceBtn, ...(advancing ? { opacity: 0.7 } : {}) }}
            onClick={onAdvance}
            disabled={advancing}
          >
            {advancing ? 'Actualizando...' : NEXT_LABEL[order.status]}
          </button>
        )}
      </div>

      {/* Errores de avance / confirmación de pago */}
      {(advanceError || confirmError) && (
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626', background: '#fee2e2', padding: '6px 10px', borderRadius: 6 }}>
          {advanceError || confirmError}
        </p>
      )}

      {/* Botón de abandono — con confirmación inline */}
      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, marginTop: 4 }}>
        {abandonError && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#dc2626', background: '#fee2e2', padding: '6px 10px', borderRadius: 6 }}>
            {abandonError}
          </p>
        )}
        {!abandonConfirm ? (
          <button
            type="button"
            onClick={() => setAbandonConfirm(true)}
            disabled={abandoning}
            style={{
              width: '100%', padding: '7px 12px',
              borderRadius: 6, border: `1px solid ${BORDER}`,
              background: 'transparent', color: MUTED,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >
            {abandoning ? 'Abandonando...' : '↩ Abandonar pedido'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#92400e', fontWeight: 600 }}>
              ¿Seguro? El pedido volverá al pool para otro repartidor.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setAbandonConfirm(false)}
                style={{
                  flex: 1, padding: '7px 0',
                  borderRadius: 6, border: `1px solid ${BORDER}`,
                  background: 'transparent', color: MUTED,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setAbandonConfirm(false); onAbandon(); }}
                disabled={abandoning}
                style={{
                  flex: 1, padding: '7px 0',
                  borderRadius: 6, border: 'none',
                  background: '#dc2626', color: '#fff',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  opacity: abandoning ? 0.6 : 1,
                }}
              >
                {abandoning ? '...' : 'Sí, abandonar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const ACCENT  = 'var(--accent)';
const BG      = 'var(--bg-base)';
const SURFACE = 'var(--bg-surface)';
const BORDER  = 'var(--border)';
const TEXT    = 'var(--text-primary)';
const MUTED   = 'var(--text-secondary)';

const r = {
  root: {
    display: 'flex', height: '100vh', overflow: 'hidden',
    background: BG, color: TEXT, fontFamily: "'DM Sans', 'Inter', sans-serif",
  },
  sidebar: {
    width: 228, background: SURFACE, borderRight: `1px solid ${BORDER}`,
    display: 'flex', flexDirection: 'column', padding: '24px 16px',
    height: '100%', flexShrink: 0,
  },
  onlineBox: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '7px 12px', background: `${ACCENT}12`,
    borderRadius: 8, marginBottom: 24,
  },
  onlineDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: ACCENT, boxShadow: `0 0 0 3px ${ACCENT}30`,
  },
  onlineLabel: { fontSize: 13, fontWeight: 600, color: ACCENT },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8,
    background: 'none', border: 'none', cursor: 'pointer',
    color: MUTED, fontSize: 14, fontWeight: 500, textAlign: 'left',
  },
  navActive: { background: `${ACCENT}18`, color: ACCENT, fontWeight: 700 },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  navBadge: {
    marginLeft: 'auto', background: ACCENT, color: '#fff',
    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
  },
  quickStats: {
    display: 'flex', gap: 8, padding: '16px 8px',
    borderTop: `1px solid ${BORDER}`, marginTop: 16,
  },
  quickStat: { flex: 1, textAlign: 'center' },
  qValue: { fontSize: 18, fontWeight: 800, color: ACCENT },
  qLabel: { fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px' },

  main: { flex: 1, padding: '32px 40px', maxWidth: 720, overflowY: 'auto', height: '100%' },
  header: { marginBottom: 28 },
  headerTitle: { fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' },
  headerSub: { color: MUTED, fontSize: 14, margin: '4px 0 0' },

  errorBanner: {
    marginBottom: 16, padding: '10px 14px',
    background: 'var(--error-soft, #fee2e2)', border: '1px solid var(--error, #dc2626)',
    borderRadius: 8, color: 'var(--error, #dc2626)', fontSize: 13,
  },
  orderList: { display: 'flex', flexDirection: 'column', gap: 14 },
  orderCard: {
    background: SURFACE, border: `1px solid ${BORDER}`,
    borderRadius: 12, padding: '18px 20px',
  },
  orderCardSelected: { borderColor: ACCENT, borderWidth: 2 },
  orderTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  orderId: { fontSize: 13, fontWeight: 700, color: MUTED, fontFamily: 'monospace' },
  statusBadge: { fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '3px 10px' },
  orderAddress: { fontSize: 13, color: MUTED, marginBottom: 12 },
  sectionMini: { fontSize: 11, color: MUTED, fontWeight: 600, textTransform: 'uppercase', margin: '0 0 5px' },
  orderItems: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  itemChip: {
    background: 'var(--bg-elevated)', border: `1px solid ${BORDER}`,
    borderRadius: 5, padding: '3px 10px', fontSize: 12, color: MUTED,
  },
  orderFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  orderTotal: { fontSize: 20, fontWeight: 800, color: ACCENT, letterSpacing: '-0.5px' },
  advanceBtn: {
    background: ACCENT, color: '#fff', border: 'none',
    borderRadius: 8, padding: '9px 18px',
    fontWeight: 700, fontSize: 13, cursor: 'pointer',
  },
  cancelBtn: {
    background: 'transparent', color: 'var(--error, #dc2626)',
    border: '1px solid var(--error, #dc2626)',
    borderRadius: 8, padding: '9px 14px',
    fontWeight: 600, fontSize: 13, cursor: 'pointer',
  },
  refreshBtn: {
    background: 'transparent', border: `1px solid ${BORDER}`,
    borderRadius: 8, padding: '8px 16px',
    color: MUTED, fontSize: 13, cursor: 'pointer', marginTop: 4,
  },
  storeBlock: {
    background: 'var(--bg-elevated)', borderRadius: 8,
    padding: '10px 14px', border: `1px solid ${BORDER}`,
  },
  storeBlockTitle: { fontSize: 13, fontWeight: 700, marginBottom: 8 },
  checkItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 0', borderBottom: `1px solid ${BORDER}`,
    cursor: 'pointer', fontSize: 13,
  },
  checkItemDone: { opacity: 0.5, textDecoration: 'line-through' },
  checkbox: {
    width: 18, height: 18, borderRadius: 4,
    border: `2px solid ${BORDER}`, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 700,
  },
  checkboxDone: {
    background: ACCENT, borderColor: ACCENT, color: '#fff',
  },
  historyList: { display: 'flex', flexDirection: 'column', gap: 0 },
  historyRow: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '14px 0', borderBottom: `1px solid ${BORDER}`, fontSize: 14,
  },
  histId: { fontFamily: 'monospace', color: MUTED, minWidth: 100 },
  histClient: { flex: 1, fontSize: 12, color: MUTED },
  histTotal: { fontWeight: 700, color: ACCENT },
  histDate: { fontSize: 12, color: MUTED },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: 300, gap: 12, color: MUTED, fontSize: 14,
  },
  newOrderBanner: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '12px 16px', marginBottom: 20,
    background: `${ACCENT}18`, border: `2px solid ${ACCENT}`,
    borderRadius: 10, color: ACCENT, fontSize: 14,
    animation: 'pulse-border 1s ease-in-out 3',
  },
  newOrderDismiss: {
    background: 'none', border: 'none', color: ACCENT,
    fontSize: 16, cursor: 'pointer', padding: '0 4px', fontWeight: 700,
  },
};
