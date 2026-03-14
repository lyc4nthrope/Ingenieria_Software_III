/**
 * ShoppingListPage.jsx — Proceso 3
 *
 * Layout de dos columnas:
 *   Izquierda — lista de productos a comprar
 *   Derecha   — carrusel de pedidos + mapa de ruta (solo si hay pedidos)
 */

import { useState } from 'react';
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

// ─── Columna derecha: carrusel + mapa ─────────────────────────────────────────
function OrdersPanel({ orders, removeOrder }) {
  const [idx, setIdx] = useState(0);
  const order = orders[idx];
  if (!order) return null;
  const { result, userCoords } = order;

  return (
    <div style={panel.root}>
      {/* Carrusel */}
      <div style={panel.carousel}>
        {orders.map((o, i) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setIdx(i)}
            style={{ ...panel.pill, ...(i === idx ? panel.pillActive : {}) }}
          >
            #{o.id.slice(-6)}
          </button>
        ))}
      </div>

      {/* Info mínima del pedido */}
      <div style={panel.meta}>
        <span style={panel.metaId}>{order.id}</span>
        <span style={panel.metaSep}>·</span>
        <span>${result.totalCost.toLocaleString('es-CO')} COP</span>
        <span style={panel.metaSep}>·</span>
        <span>{result.stores.length} {result.stores.length === 1 ? 'tienda' : 'tiendas'}</span>
        <button
          type="button"
          onClick={() => {
            removeOrder(order.id);
            setIdx((p) => Math.max(0, p - 1));
          }}
          style={panel.deleteBtn}
          title="Eliminar pedido"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Mapa */}
      <div style={panel.mapWrap}>
        <OrderRouteMap key={order.id} stores={result.stores} userCoords={userCoords} />
      </div>

      {/* Desglose compacto */}
      <div style={panel.breakdown}>
        {result.stores.map((s, si) => (
          <details key={si} style={panel.storeRow}>
            <summary style={panel.storeSummary}>
              <span>{Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪'} {s.store?.name ?? 'Tienda'}</span>
              <span style={panel.storeTotal}>
                ${s.products.reduce((a, p) => a + (p.price || 0) * p.item.quantity, 0).toLocaleString('es-CO')}
              </span>
            </summary>
            <ul style={panel.productList}>
              {s.products.map((p, pi) => (
                <li key={pi} style={panel.productItem}>
                  <span>{p.item.productName} ×{p.item.quantity}</span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                    ${(p.price * p.item.quantity).toLocaleString('es-CO')}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ShoppingListPage() {
  const { t } = useLanguage();
  const ts = t.shoppingList;
  const navigate = useNavigate();

  const { items, removeItem, clearList, orders, removeOrder } = useShoppingListStore();
  const [selected, setSelected] = useState(() => new Set());

  const toggle = (id) =>
    setSelected((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    setSelected(selected.size === items.length ? new Set() : new Set(items.map((i) => i.id)));

  const handleCreateOrder = () => {
    if (selected.size === 0) return;
    navigate('/pedido/nuevo', { state: { items: items.filter((i) => selected.has(i.id)) } });
  };

  const hasOrders = orders.length > 0;

  return (
    <div style={page.root}>
      {/* Estilos responsivos */}
      <style>{`
        .lista-grid { display: grid; grid-template-columns: minmax(240px, 380px) 1fr; gap: 20px; align-items: start; }
        @media (max-width: 680px) { .lista-grid { grid-template-columns: 1fr; } }
        .lista-carousel::-webkit-scrollbar { display: none; }
        details.lista-store > summary { list-style: none; }
        details.lista-store > summary::-webkit-details-marker { display: none; }
      `}</style>

      {/* Cabecera */}
      <div style={page.header}>
        <h1 style={page.title}>🛒 {ts.title}</h1>
        {items.length > 0 && (
          <span style={page.badge}>{items.length}</span>
        )}
      </div>

      {hasOrders ? (
        /* ── Layout dos columnas ── */
        <div className="lista-grid">

          {/* Izquierda: lista de productos */}
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
                {/* Toolbar */}
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
                  <button type="button" onClick={clearList} style={left.clearBtn}>
                    Limpiar
                  </button>
                </div>

                {/* Items */}
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

          {/* Derecha: carrusel + mapa */}
          <OrdersPanel orders={orders} removeOrder={removeOrder} />
        </div>
      ) : (
        /* ── Sin pedidos: columna única centrada ── */
        <div style={page.solo}>
          {items.length === 0 ? (
            <div style={left.empty}>
              <div style={{ fontSize: '40px', marginBottom: '8px' }}>🛒</div>
              <p style={left.emptyText}>{ts.emptyTitle}</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                {ts.emptySubtitle}
              </p>
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
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const page = {
  root: { flex: 1, padding: '20px 20px', maxWidth: '1100px', margin: '0 auto', width: '100%' },
  header: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' },
  title: { fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  badge: {
    background: 'var(--accent)', color: '#fff', borderRadius: '999px',
    fontSize: '11px', fontWeight: 700, padding: '2px 8px', minWidth: '20px', textAlign: 'center',
  },
  solo: { maxWidth: '480px' },
};

const left = {
  col: { display: 'flex', flexDirection: 'column', gap: '10px' },
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
  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 2px',
  },
  checkAll: { display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer' },
  checkAllLabel: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 },
  clearBtn: {
    background: 'none', border: 'none', fontSize: '12px',
    color: 'var(--error)', cursor: 'pointer', padding: '2px 4px',
  },
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

const panel = {
  root: { display: 'flex', flexDirection: 'column', gap: '10px' },
  carousel: {
    display: 'flex', gap: '6px', overflowX: 'auto',
    paddingBottom: '2px', scrollbarWidth: 'none',
  },
  pill: {
    flexShrink: 0, padding: '5px 12px', borderRadius: '999px',
    border: '1px solid var(--border)', background: 'var(--bg-surface)',
    fontSize: '11px', fontWeight: 800, fontFamily: 'monospace',
    color: 'var(--text-secondary)', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  pillActive: {
    background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff',
  },
  meta: {
    display: 'flex', alignItems: 'center', gap: '8px',
    fontSize: '12px', color: 'var(--text-muted)',
    padding: '6px 10px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  metaId: { fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent)', fontSize: '11px' },
  metaSep: { opacity: 0.4 },
  deleteBtn: {
    marginLeft: 'auto', background: 'none', border: 'none',
    color: 'var(--text-muted)', cursor: 'pointer', padding: '2px',
    display: 'flex', alignItems: 'center',
  },
  mapWrap: {
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  breakdown: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
  },
  storeRow: { borderBottom: '1px solid var(--border)' },
  storeSummary: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 14px', fontSize: '13px', fontWeight: 600,
    color: 'var(--text-primary)', cursor: 'pointer', userSelect: 'none',
  },
  storeTotal: { fontSize: '12px', fontWeight: 700, color: 'var(--accent)' },
  productList: { listStyle: 'none', margin: 0, padding: '0 0 6px' },
  productItem: {
    display: 'flex', justifyContent: 'space-between',
    padding: '5px 20px', fontSize: '12px', color: 'var(--text-secondary)',
    borderTop: '1px solid var(--border)',
  },
};
