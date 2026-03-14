/**
 * ShoppingListPage.jsx — Proceso 3
 *
 * Layout dos columnas:
 *   Izquierda — tabs: "Mi Lista" | productos del pedido seleccionado
 *   Derecha   — carrusel de pedidos (más grande) + mapa de ruta
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';
import { useLanguage } from '@/contexts/LanguageContext';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';

// ─── Iconos ───────────────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

// Tarifa estimada de domicilio — placeholder hasta implementar Proceso 4
const DELIVERY_FEE = 8_000; // COP

// ─── Tarjeta de estado de domicilio ───────────────────────────────────────────
function DeliveryCard({ order, onCancel }) {
  const { deliveryStatus, cancellationCharged } = order;
  if (!deliveryStatus || deliveryStatus === null) return null;

  const configs = {
    searching: {
      icon: '🛵', bg: 'var(--warning-soft, #fef9c3)', border: 'var(--warning, #ca8a04)',
      color: '#92400e',
      title: 'Buscando repartidor...',
      desc: 'Tu pedido está en cola de asignación',
      showCancel: true, cancelFree: true,
    },
    found: {
      icon: '✓', bg: 'var(--bg-elevated)', border: 'var(--accent)',
      color: 'var(--accent)',
      title: 'Repartidor asignado',
      desc: 'Sigue su ubicación en tiempo real en el mapa →',
      showCancel: true, cancelFree: false,
    },
    en_camino: {
      icon: '🛵', bg: 'var(--success-soft, #dcfce7)', border: 'var(--success, #16a34a)',
      color: 'var(--success, #16a34a)',
      title: 'En camino a tu ubicación',
      desc: 'Sigue su posición en tiempo real en el mapa →',
      showCancel: false, cancelFree: false, showFee: true,
    },
    cancelled: {
      icon: '✗', bg: 'var(--error-soft, #fee2e2)', border: 'var(--error, #dc2626)',
      color: 'var(--error, #dc2626)',
      title: 'Envío cancelado',
      desc: cancellationCharged
        ? 'Se cobrará el costo del domicilio — el pedido no fue comprado'
        : 'Cancelado sin costo adicional',
      showCancel: false, cancelFree: false,
    },
  };

  const cfg = configs[deliveryStatus];
  if (!cfg) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '10px 14px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: cfg.color }}>
            {cfg.icon}
          </span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>
            {cfg.title}
          </span>
        </div>
        {cfg.showCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              flexShrink: 0, padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${cfg.border}`,
              background: 'transparent', color: cfg.color,
              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {cfg.cancelFree ? 'Cancelar envío' : 'Cancelar (se cobra domicilio)'}
          </button>
        )}
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '23px' }}>
        {cfg.desc}
      </span>
      {cfg.showFee && (
        <span style={{
          fontSize: '11px', fontWeight: 700, paddingLeft: '23px',
          color: 'var(--success, #16a34a)',
        }}>
          Costo domicilio estimado: ${DELIVERY_FEE.toLocaleString('es-CO')} COP
          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · tarifa Proceso 4</span>
        </span>
      )}
    </div>
  );
}

// ─── Columna izquierda ────────────────────────────────────────────────────────
function LeftColumn({ items, removeItem, clearList, selectedOrder, onShowList, onCancelDelivery }) {
  const { t } = useLanguage();
  const ts = t.shoppingList;
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => new Set());
  // false = desglosado (Lista + Dom.), true = suma total
  const [showTotalSum, setShowTotalSum] = useState(false);

  const toggle = (id) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelected(selected.size === items.length ? new Set() : new Set(items.map((i) => i.id)));

  const handleCreateOrder = () => {
    if (selected.size === 0) return;
    navigate('/pedido/nuevo', { state: { items: items.filter((i) => selected.has(i.id)) } });
  };

  // ── Vista: productos del pedido seleccionado ──────────────────────────────
  if (selectedOrder) {
    const { result, id, createdAt } = selectedOrder;
    const date = new Date(createdAt).toLocaleDateString('es-CO', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
    const allProducts = result.stores.flatMap((s) =>
      s.products.map((p) => ({ ...p, storeName: s.store?.name ?? 'Tienda', storeEmoji: Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪' }))
    );

    return (
      <div style={left.col}>
        {/* Header con botón volver */}
        <div style={left.orderHeader}>
          <button type="button" onClick={onShowList} style={left.backBtn} title="Ver mi lista">
            ← Mi lista
          </button>
          <div style={left.orderHeaderInfo}>
            <span style={left.orderRef}>#{id.slice(-8)}</span>
            <span style={left.orderDate}>{date}</span>
          </div>
        </div>

        {/* Tarjeta de domicilio */}
        {selectedOrder.deliveryMode && (
          <DeliveryCard order={selectedOrder} onCancel={onCancelDelivery} />
        )}

        {/* Totales rápidos */}
        <div style={left.orderStats}>
          {/* Stat de total — toggleable cuando hay domicilio en camino */}
          {selectedOrder.deliveryMode && selectedOrder.deliveryStatus === 'en_camino' ? (
            <button
              type="button"
              onClick={() => setShowTotalSum((v) => !v)}
              style={{ ...left.stat, cursor: 'pointer', border: '1px solid var(--accent)', position: 'relative' }}
              title={showTotalSum ? 'Ver desglose' : 'Ver total combinado'}
            >
              {showTotalSum ? (
                <>
                  <span style={left.statVal}>${(result.totalCost + DELIVERY_FEE).toLocaleString('es-CO')}</span>
                  <span style={left.statLabel}>Total c/ dom.</span>
                  <span style={{ fontSize: '9px', color: 'var(--accent)', marginTop: '1px' }}>← desglosar</span>
                </>
              ) : (
                <>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>
                    ${result.totalCost.toLocaleString('es-CO')}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}> + </span>
                    ${DELIVERY_FEE.toLocaleString('es-CO')}
                  </span>
                  <span style={left.statLabel}>Lista + Domicilio</span>
                  <span style={{ fontSize: '9px', color: 'var(--accent)', marginTop: '1px' }}>→ ver total</span>
                </>
              )}
            </button>
          ) : (
            <div style={left.stat}>
              <span style={left.statVal}>${result.totalCost.toLocaleString('es-CO')}</span>
              <span style={left.statLabel}>Total COP</span>
            </div>
          )}
          {result.savings > 0 && (
            <div style={left.stat}>
              <span style={{ ...left.statVal, color: 'var(--success, #16a34a)' }}>
                {result.savingsPct}%
              </span>
              <span style={left.statLabel}>Ahorro</span>
            </div>
          )}
          <div style={left.stat}>
            <span style={left.statVal}>{result.stores.length}</span>
            <span style={left.statLabel}>{result.stores.length === 1 ? 'Tienda' : 'Tiendas'}</span>
          </div>
          <div style={left.stat}>
            <span style={left.statVal}>{allProducts.length}</span>
            <span style={left.statLabel}>{allProducts.length === 1 ? 'Producto' : 'Productos'}</span>
          </div>
        </div>

        {/* Productos del pedido agrupados por tienda */}
        <div style={left.orderProductsWrap}>
          {result.stores.map((s, si) => {
            const emoji = Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪';
            const subtotal = s.products.reduce((a, p) => a + (p.price || 0) * p.item.quantity, 0);
            return (
              <div key={si} style={left.storeBlock}>
                <div style={left.storeBlockHeader}>
                  <span style={left.storeBlockName}>{emoji} {s.store?.name ?? 'Tienda'}</span>
                  <span style={left.storeBlockTotal}>${subtotal.toLocaleString('es-CO')}</span>
                </div>
                <ul style={left.orderProdList}>
                  {s.products.map((p, pi) => (
                    <li key={pi} style={left.orderProdItem}>
                      <div>
                        <div style={left.orderProdName}>{p.item.productName}</div>
                        <div style={left.orderProdMeta}>×{p.item.quantity} · ${p.price.toLocaleString('es-CO')} c/u</div>
                      </div>
                      <span style={left.orderProdTotal}>
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
    );
  }

  // ── Vista: mi lista de compras ────────────────────────────────────────────
  return (
    <div style={left.col}>
      {items.length === 0 ? (
        <div style={left.empty}>
          <p style={left.emptyText}>Tu lista está vacía</p>
          <Link to="/publicaciones" style={left.addLink}>
            <PlusIcon /> {ts.goToProducts}
          </Link>
        </div>
      ) : (
        <>
          <div style={left.toolbar}>
            <label style={left.checkAll}>
              <input
                type="checkbox"
                checked={selected.size === items.length && items.length > 0}
                onChange={toggleAll}
              />
              <span style={left.checkAllLabel}>
                {selected.size > 0 ? `${selected.size} seleccionados` : 'Todos'}
              </span>
            </label>
            <button type="button" onClick={clearList} style={left.clearBtn}>Limpiar</button>
          </div>

          <ul style={left.list}>
            {items.map((item) => (
              <li key={item.id} style={left.item}>
                <label style={left.itemLabel}>
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    style={{ flexShrink: 0 }}
                  />
                  <div style={left.itemText}>
                    <span style={left.itemName}>{item.productName}</span>
                    {item.price && (
                      <span style={left.itemPrice}>${item.price.toLocaleString('es-CO')}</span>
                    )}
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    removeItem(item.id);
                    setSelected((p) => { const n = new Set(p); n.delete(item.id); return n; });
                  }}
                  style={left.removeBtn}
                  aria-label={`Eliminar ${item.productName}`}
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>

          <Link to="/publicaciones" style={left.addMore}>
            <PlusIcon /> Agregar productos
          </Link>

          <button
            type="button"
            onClick={handleCreateOrder}
            disabled={selected.size === 0}
            style={{
              ...left.orderBtn,
              opacity: selected.size === 0 ? 0.45 : 1,
              cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            {ts.createOrder}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Columna derecha: carrusel + mapa ─────────────────────────────────────────
function RightPanel({ orders, selectedIdx, onSelect, onRemove }) {
  const order = orders[selectedIdx];
  if (!order) return null;
  const { result, userCoords } = order;

  return (
    <div style={right.root}>
      {/* Carrusel más grande */}
      <div style={right.carousel}>
        {orders.map((o, i) => {
          const active = i === selectedIdx;
          const d = new Date(o.createdAt);
          const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(i)}
              style={{ ...right.pill, ...(active ? right.pillActive : {}) }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={right.pillId}>#{o.id.slice(-6)}</span>
                {o.deliveryMode && <span title="Domicilio">🛵</span>}
              </span>
              <span style={{ ...right.pillDate, ...(active ? { opacity: 0.85 } : {}) }}>
                {label}
              </span>
              {active && (
                <span style={right.pillTotal}>
                  ${result.totalCost.toLocaleString('es-CO')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Barra de info del pedido activo */}
      <div style={right.meta}>
        <div style={right.metaLeft}>
          <span style={right.metaId}>{order.id}</span>
          <span style={right.metaStores}>
            {result.stores.length} {result.stores.length === 1 ? 'tienda' : 'tiendas'} ·{' '}
            {result.stores.reduce((a, s) => a + s.products.length, 0)} productos
          </span>
        </div>
        <button
          type="button"
          onClick={() => onRemove(order.id)}
          style={right.deleteBtn}
          title="Eliminar pedido"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Mapa */}
      <div style={right.mapWrap}>
        <OrderRouteMap
          key={order.id}
          stores={result.stores}
          userCoords={userCoords}
          driverLocation={order.driverLocation ?? null}
        />
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ShoppingListPage() {
  const { t } = useLanguage();
  const ts = t.shoppingList;

  const { items, removeItem, clearList, orders, removeOrder, updateOrderDelivery } = useShoppingListStore();

  // idx del pedido seleccionado en el carrusel; null = mostrar lista
  const [selectedIdx, setSelectedIdx] = useState(null);
  const timerRef = useRef(null);

  const hasOrders = orders.length > 0;

  // ── Simulación de estado de domicilio en tiempo real ──────────────────────
  const selectedOrder = selectedIdx !== null ? orders[selectedIdx] ?? null : null;

  useEffect(() => {
    clearTimeout(timerRef.current);
    clearInterval(timerRef.current);

    if (!selectedOrder?.deliveryMode) return;
    const { deliveryStatus, id, userCoords } = selectedOrder;
    if (deliveryStatus === 'cancelled' || deliveryStatus === null) return;

    if (deliveryStatus === 'searching') {
      timerRef.current = setTimeout(() => {
        const center = userCoords ?? { lat: 4.711, lng: -74.0721 };
        updateOrderDelivery(id, {
          deliveryStatus: 'found',
          driverLocation: {
            lat: center.lat + (Math.random() - 0.5) * 0.04,
            lng: center.lng + (Math.random() - 0.5) * 0.04,
          },
        });
      }, 5000);
    } else if (deliveryStatus === 'found') {
      timerRef.current = setTimeout(() => {
        updateOrderDelivery(id, { deliveryStatus: 'en_camino' });
      }, 3000);
    } else if (deliveryStatus === 'en_camino') {
      timerRef.current = setInterval(() => {
        const current = useShoppingListStore.getState().orders.find((o) => o.id === id);
        if (!current?.driverLocation || !current?.userCoords) return;
        const { driverLocation: dl, userCoords: uc } = current;
        updateOrderDelivery(id, {
          driverLocation: {
            lat: dl.lat + (uc.lat - dl.lat) * 0.12 + (Math.random() - 0.5) * 0.0008,
            lng: dl.lng + (uc.lng - dl.lng) * 0.12 + (Math.random() - 0.5) * 0.0008,
          },
        });
      }, 3000);
    }

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(timerRef.current);
    };
  }, [selectedOrder?.id, selectedOrder?.deliveryStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelectOrder = (i) => setSelectedIdx(i);
  const handleShowList = () => setSelectedIdx(null);
  const handleRemoveOrder = (id) => {
    removeOrder(id);
    setSelectedIdx((prev) => (prev === null ? null : Math.max(0, prev - 1)));
  };
  const handleCancelDelivery = () => {
    if (!selectedOrder) return;
    const charged = selectedOrder.deliveryStatus !== 'searching';
    updateOrderDelivery(selectedOrder.id, {
      deliveryStatus: 'cancelled',
      cancellationCharged: charged,
    });
  };

  return (
    <div className="home-wrapper">
      <style>{`
        .lista-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 700px) {
          .lista-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* Cabecera centrada */}
      <div style={page.header}>
        <h1 style={page.title}>
          {hasOrders ? '🛒 Lista & Pedidos' : '🛒 Mi Lista de Compras'}
        </h1>
        <p style={page.subtitle}>
          {hasOrders
            ? 'Gestiona tus productos pendientes y revisa el historial de tus pedidos'
            : ts.subtitle}
        </p>
        {items.length > 0 && (
          <span style={page.badge}>{items.length} {items.length === 1 ? 'producto' : 'productos'} en lista</span>
        )}
      </div>

      {hasOrders ? (
        <div className="lista-grid">
          {/* Izquierda */}
          <LeftColumn
            items={items}
            removeItem={removeItem}
            clearList={clearList}
            selectedOrder={selectedOrder}
            onShowList={handleShowList}
            onCancelDelivery={handleCancelDelivery}
          />

          {/* Derecha */}
          <RightPanel
            orders={orders}
            selectedIdx={selectedIdx ?? 0}
            onSelect={handleSelectOrder}
            onRemove={handleRemoveOrder}
          />

        </div>
      ) : (
        /* Sin pedidos: columna única centrada */
        <div style={page.solo}>
          <LeftColumn
            items={items}
            removeItem={removeItem}
            clearList={clearList}
            selectedOrder={null}
            onShowList={handleShowList}
          />
        </div>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const page = {
  root: {},
  header: {
    textAlign: 'center', marginBottom: '24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
  },
  title: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '13px', color: 'var(--text-muted)', margin: 0 },
  badge: {
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '999px', fontSize: '12px', fontWeight: 600,
    padding: '3px 12px', textAlign: 'center',
  },
  solo: { maxWidth: '480px', margin: '0 auto', width: '100%' },
};

const left = {
  col: { display: 'flex', flexDirection: 'column', gap: '10px' },

  // ── Vista pedido ────────────────────────────────────────────────────────
  orderHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  backBtn: {
    background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
    color: 'var(--accent)', cursor: 'pointer', padding: 0,
  },
  orderHeaderInfo: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' },
  orderRef: { fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' },
  orderDate: { fontSize: '11px', color: 'var(--text-muted)' },

  orderStats: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px',
  },
  stat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
    padding: '10px 8px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  statVal: { fontSize: '15px', fontWeight: 800, color: 'var(--accent)' },
  statLabel: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },

  orderProductsWrap: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    maxHeight: '420px', overflowY: 'auto',
  },
  storeBlock: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
  },
  storeBlockHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 14px', background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
  },
  storeBlockName: {},
  storeBlockTotal: { fontSize: '12px', fontWeight: 700, color: 'var(--accent)' },
  orderProdList: { listStyle: 'none', margin: 0, padding: 0 },
  orderProdItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px', borderBottom: '1px solid var(--border)',
    fontSize: '13px',
  },
  orderProdName: { fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' },
  orderProdMeta: { fontSize: '11px', color: 'var(--text-muted)' },
  orderProdTotal: { fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '8px' },

  // ── Vista lista ─────────────────────────────────────────────────────────
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px',
    padding: '24px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  emptyText: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  addLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', background: 'var(--accent)', color: '#fff',
    borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 700,
    textDecoration: 'none', marginTop: '4px',
  },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' },
  checkAll: { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' },
  checkAllLabel: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 },
  clearBtn: { background: 'none', border: 'none', fontSize: '12px', color: 'var(--error)', cursor: 'pointer', padding: '2px 4px' },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' },
  item: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '10px 12px',
  },
  itemLabel: { display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1 },
  itemText: { display: 'flex', flexDirection: 'column', gap: '1px' },
  itemName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' },
  itemPrice: { fontSize: '11px', color: 'var(--accent)', fontWeight: 600 },
  removeBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '5px', borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center', flexShrink: 0,
  },
  addMore: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '7px 12px', border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: 600,
    color: 'var(--text-secondary)', textDecoration: 'none', alignSelf: 'flex-start',
  },
  orderBtn: {
    padding: '12px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff', fontWeight: 800,
    fontSize: '14px', textAlign: 'center', width: '100%', marginTop: '4px',
  },
};

const right = {
  root: { display: 'flex', flexDirection: 'column', gap: '10px' },

  carousel: {
    display: 'flex', gap: '8px', overflowX: 'auto',
    paddingBottom: '4px', scrollbarWidth: 'none',
  },
  pill: {
    flexShrink: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
    padding: '10px 18px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'var(--bg-surface)',
    cursor: 'pointer', transition: 'all 0.15s',
    minWidth: '90px',
  },
  pillActive: {
    background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  pillId: { fontSize: '14px', fontWeight: 800, fontFamily: 'monospace' },
  pillDate: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 },
  pillTotal: { fontSize: '11px', fontWeight: 700, marginTop: '2px' },

  meta: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  metaLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  metaId: { fontSize: '12px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)' },
  metaStores: { fontSize: '12px', color: 'var(--text-muted)' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
  },

  mapWrap: {
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
    border: '1px solid var(--border)',
  },
};
