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
  cancelAvailableOrder,
  advanceOrderStatus,
  verifyDeliveryPin,
  upsertDealerLocation,
  updateProductPrice,
  logPriceCorrection,
  requestPriceAdjustment,
  PRICE_ADJUSTMENT_THRESHOLD,
} from '@/services/api/orders.api';
import { useDeliveryTimer } from '@/features/orders/hooks/useDeliveryTimer';
import { getDealerBankAccounts } from '@/services/api/bankAccounts.api';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { PriceReportInline } from '@/features/orders/components/PriceReportInline';

// Etiquetas y próximo estado para cada transición
const NEXT_LABEL = {
  aceptado:  '🛒 Llegué a la tienda',
  comprando: '🛵 Terminé las compras',
  en_camino: '🔔 Llegué a la puerta',
  llegando:  '✅ Entrega completada',
};
const NEXT_STATUS = {
  aceptado:  'comprando',
  comprando: 'en_camino',
  en_camino: 'llegando',
  llegando:  'entregado',
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
  const [cancelingId,     setCancelingId]     = useState(null);  // id del pedido que se está cancelando
  const [noBankWarning,   setNoBankWarning]   = useState(false); // aviso sin cuentas bancarias
  const [advancingId,     setAdvancingId]     = useState(null);  // id del pedido que se está avanzando
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

  // ── Cancelar pedido disponible ───────────────────────────────────────────
  const handleCancel = async (orderId) => {
    setCancelingId(orderId);
    const { error } = await cancelAvailableOrder(orderId);
    if (!error) {
      setAvailable((prev) => prev.filter((o) => o.id !== orderId));
    }
    setCancelingId(null);
  };

  // ── Actualizar precio de producto (Caso B: >5% → solicitar aprobación) ──
  const handlePriceReport = async (order, storeIdx, productIdx, newPrice) => {
    const product      = order.stores?.[storeIdx]?.products?.[productIdx];
    const productName  = product?.item?.productName;
    const originalPrice = product?.price ?? 0;

    // Caso B: si el nuevo precio supera el umbral del 5%, solicitar aprobación al cliente
    if (originalPrice > 0 && newPrice > originalPrice * (1 + PRICE_ADJUSTMENT_THRESHOLD)) {
      const { error } = await requestPriceAdjustment({
        orderId:        order.id,
        storeIdx,
        productIdx,
        productName,
        originalPrice,
        requestedPrice: newPrice,
      });
      return { error, pending: true };
    }

    // Cambio menor al 5% — actualizar directamente
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
    }
    return { error };
  };

  // ── Avanzar estado del pedido ────────────────────────────────────────────
  // Nota: la transición llegando → entregado se maneja via handleVerifyPin (RF-03).
  // handleAdvance solo cubre aceptado/comprando/en_camino/llegando y cancelado (entrega fallida).
  const handleAdvance = async (order) => {
    const newStatus = NEXT_STATUS[order.status];
    if (!newStatus || newStatus === 'entregado') return; // entregado requiere PIN

    setAdvancingId(order.id);
    const { error } = await advanceOrderStatus(order.id, newStatus);

    if (!error) {
      const now = new Date().toISOString();
      setActiveOrders((prev) =>
        prev.map((o) => o.id === order.id
          ? { ...o, status: newStatus, ...(newStatus === 'llegando' ? { llegando_at: now, updated_at: now } : {}) }
          : o
        )
      );
    }

    setAdvancingId(null);
  };

  // ── Verificar PIN del cliente para cerrar el pedido (RF-03) ──────────────
  const handleVerifyPin = async (order, pin) => {
    setAdvancingId(order.id);
    const { data: ok, error } = await verifyDeliveryPin(order.id, pin);
    setAdvancingId(null);

    if (error || !ok) {
      return { success: false };
    }

    setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
    setHistory((prev) => [{ ...order, status: 'entregado' }, ...prev]);
    return { success: true };
  };

  // ── Marcar entrega fallida (Caso D: timer vencido) ────────────────────────
  const handleDeliveryFailed = async (order) => {
    setAdvancingId(order.id);
    const { error } = await advanceOrderStatus(order.id, 'cancelado');
    setAdvancingId(null);
    if (!error) {
      setActiveOrders((prev) => prev.filter((o) => o.id !== order.id));
      setHistory((prev) => [{ ...order, status: 'cancelado' }, ...prev]);
    }
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
    pendiente_repartidor: { label: 'Disponible',          color: 'var(--warning)',       bg: 'var(--warning-soft)' },
    aceptado:             { label: 'Aceptado',             color: 'var(--accent)',        bg: 'var(--accent-soft)' },
    pendiente_compromiso: { label: 'Esp. compromiso',      color: '#92400e',              bg: 'var(--warning-soft, #fef9c3)' },
    comprando:            { label: 'Comprando',            color: 'var(--warning)',       bg: 'var(--warning-soft)' },
    en_camino:            { label: 'En camino',            color: 'var(--success)',       bg: 'var(--success-soft)' },
    llegando:             { label: 'En la puerta',         color: 'var(--accent)',        bg: 'var(--accent-soft)' },
    entregado:            { label: 'Entregado',            color: 'var(--success)',       bg: 'var(--success-soft)' },
    cancelado:            { label: 'Cancelado',            color: 'var(--error)',         bg: 'var(--error-soft)' },
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
                    canceling={cancelingId === order.id}
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
                    onAdvance={() => handleAdvance(order)}
                    onVerifyPin={(pin) => handleVerifyPin(order, pin)}
                    onDeliveryFailed={() => handleDeliveryFailed(order)}
                    onPriceReport={(si, pi, newPrice) => handlePriceReport(order, si, pi, newPrice)}
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
function AvailableOrderCard({ order, accepting, canceling, onAccept, onCancel }) {
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
            style={{ ...r.cancelBtn, ...(canceling ? { opacity: 0.7 } : {}) }}
            onClick={onCancel}
            disabled={canceling || accepting}
          >
            {canceling ? '...' : '✕ Cancelar'}
          </button>
          <button
            style={{ ...r.advanceBtn, ...(accepting ? { opacity: 0.7 } : {}) }}
            onClick={onAccept}
            disabled={accepting || canceling}
          >
            {accepting ? 'Aceptando...' : '✓ Aceptar pedido'}
          </button>
        </div>
      </div>
    </article>
  );
}

// ─── ActiveOrderCard ──────────────────────────────────────────────────────────
// Tarjeta del pedido asignado al repartidor. Muestra checklist de productos
// cuando está "comprando" y el botón para avanzar al siguiente estado.
function ActiveOrderCard({ order, statusInfo, checklist, onToggleCheck, advancing, onAdvance, onVerifyPin, onDeliveryFailed, onPriceReport }) {
  const si     = statusInfo[order.status] ?? statusInfo.aceptado;
  const stores = extractStores(order);
  const [expanded, setExpanded] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(null);
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Timer de 10 min para el Caso D — solo activo cuando el repartidor llega a la puerta
  const timerStart = order.status === 'llegando' ? (order.llegando_at ?? order.updated_at ?? null) : null;
  const { formattedTime, isExpired } = useDeliveryTimer(timerStart);

  // Contar productos completados del checklist
  const allProducts = stores.flatMap((s, si) =>
    (s.products ?? []).map((p, pi) => ({ key: `${si}-${pi}`, name: p.item?.productName ?? '?', qty: p.item?.quantity ?? 1 }))
  );
  const checked = allProducts.filter((p) => checklist[p.key]).length;

  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) { setPinError('El PIN debe tener 4 dígitos'); return; }
    setPinError(null);
    setVerifyingPin(true);
    const { success } = await onVerifyPin(pinInput);
    setVerifyingPin(false);
    if (!success) {
      setPinError('PIN incorrecto. Pedile al cliente el PIN correcto.');
      setPinInput('');
    }
  };

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

      {/* Banner de espera de compromiso (estado pendiente_compromiso) */}
      {order.status === 'pendiente_compromiso' && (
        <div style={{
          padding: '12px 14px',
          background: 'var(--warning-soft, #fef9c3)',
          border: '1px solid var(--warning, #ca8a04)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>
            ⏳ Esperando pago de compromiso
          </span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            El cliente está confirmando el fondo de compromiso. Podrás salir a comprar cuando se acredite el pago.
          </span>
        </div>
      )}

      {/* Footer: total + botón avanzar / flujo PIN / timer */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Timer de espera cuando el repartidor ya llegó (Caso D) */}
        {order.status === 'llegando' && timerStart && (
          <div style={{
            padding: '8px 12px',
            background: isExpired ? 'var(--error-soft, #fee2e2)' : 'var(--bg-elevated)',
            border: `1px solid ${isExpired ? 'var(--error, #dc2626)' : 'var(--border)'}`,
            borderRadius: 6,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>{isExpired ? '⚠️' : '⏱'}</span>
            <span style={{ fontSize: 12, color: isExpired ? 'var(--error, #dc2626)' : MUTED, fontWeight: isExpired ? 700 : 400 }}>
              {isExpired ? 'Tiempo vencido' : `Tiempo de espera: ${formattedTime}`}
            </span>
          </div>
        )}

        <div style={r.orderFooter}>
          <div>
            <div style={r.orderTotal}>
              ${(Number(order.total_estimated ?? 0) + Number(order.delivery_fee ?? 0)).toLocaleString('es-CO')}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>total a cobrar</div>
          </div>

          {/* Botones de avance normales (todos excepto llegando → entregado) */}
          {NEXT_LABEL[order.status] && order.status !== 'llegando' && (
            <button
              style={{ ...r.advanceBtn, ...(advancing ? { opacity: 0.7 } : {}) }}
              onClick={onAdvance}
              disabled={advancing}
            >
              {advancing ? 'Actualizando...' : NEXT_LABEL[order.status]}
            </button>
          )}

          {/* Botón entrega fallida cuando timer vence (Caso D) */}
          {order.status === 'llegando' && isExpired && (
            <button
              style={{ ...r.advanceBtn, background: 'var(--error, #dc2626)', ...(advancing ? { opacity: 0.7 } : {}) }}
              onClick={onDeliveryFailed}
              disabled={advancing}
            >
              {advancing ? 'Procesando...' : '✗ Entrega fallida'}
            </button>
          )}
        </div>

        {/* Flujo PIN cuando llegó a la puerta y timer NO venció (RF-03) */}
        {order.status === 'llegando' && !isExpired && (
          <div style={{
            padding: '12px 14px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: MUTED }}>
              🔑 Pedile al cliente el PIN de entrega de 4 dígitos
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(null); }}
                style={{
                  flex: 1, padding: '8px 12px', fontSize: 18, fontWeight: 800,
                  letterSpacing: '0.3em', textAlign: 'center',
                  border: `1px solid ${pinError ? 'var(--error, #dc2626)' : 'var(--border)'}`,
                  borderRadius: 6, background: 'var(--bg-base)', color: 'var(--text-primary)',
                  outline: 'none',
                }}
              />
              <button
                style={{ ...r.advanceBtn, flexShrink: 0, ...(verifyingPin || advancing ? { opacity: 0.7 } : {}) }}
                onClick={handlePinSubmit}
                disabled={verifyingPin || advancing || pinInput.length !== 4}
              >
                {verifyingPin ? '...' : '✓ Verificar'}
              </button>
            </div>
            {pinError && (
              <div style={{ fontSize: 11, color: 'var(--error, #dc2626)', fontWeight: 600 }}>{pinError}</div>
            )}
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
