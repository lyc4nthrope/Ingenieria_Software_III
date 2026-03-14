/**
 * ShoppingListPage.jsx — Proceso 3
 *
 * Sección superior (solo si hay pedidos guardados):
 *   - Carrusel horizontal de pedidos por ID
 *   - Mapa de ruta del pedido seleccionado
 *   - Desglose de productos del pedido seleccionado
 *
 * Sección inferior:
 *   - Lista de compras actual (ítems agregados desde Productos)
 *   - Botón "Crear Pedido Optimizado"
 */

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';
import { useLanguage } from '@/contexts/LanguageContext';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';

// ─── Iconos ───────────────────────────────────────────────────────────────────
const CartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.69l1.38-7.3H6" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

const TagIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

// ─── Sección de pedidos ───────────────────────────────────────────────────────
function OrdersSection({ orders, removeOrder }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const order = orders[selectedIdx];
  if (!order) return null;

  const { result, userCoords, createdAt } = order;
  const date = new Date(createdAt).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <div style={styles.ordersSection}>
      {/* Título */}
      <h2 style={styles.sectionTitle}>🛒 Mis Pedidos</h2>

      {/* Carrusel de pedidos */}
      <div style={styles.carousel}>
        {orders.map((o, i) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setSelectedIdx(i)}
            style={{
              ...styles.carouselPill,
              ...(i === selectedIdx ? styles.carouselPillActive : {}),
            }}
          >
            <span style={styles.pillId}>#{o.id.slice(-6)}</span>
            <span style={styles.pillDate}>
              {new Date(o.createdAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
            </span>
          </button>
        ))}
      </div>

      {/* Info del pedido seleccionado */}
      <div style={styles.orderCard}>
        <div style={styles.orderCardHeader}>
          <div>
            <span style={styles.orderIdLabel}>Pedido</span>
            <span style={styles.orderIdValue}> #{order.id}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={styles.orderDate}>{date}</span>
            <button
              type="button"
              onClick={() => {
                removeOrder(order.id);
                setSelectedIdx((prev) => Math.max(0, prev - 1));
              }}
              style={styles.removeOrderBtn}
              aria-label="Eliminar pedido"
            >
              <TrashIcon />
            </button>
          </div>
        </div>

        {/* Totales */}
        <div style={styles.orderMeta}>
          <span style={styles.orderMetaItem}>
            💰 Total: <strong>${result.totalCost.toLocaleString('es-CO')} COP</strong>
          </span>
          {result.savings > 0 && (
            <span style={{ ...styles.orderMetaItem, color: 'var(--success, #16a34a)' }}>
              🏷️ Ahorro: {result.savingsPct}%
            </span>
          )}
          <span style={styles.orderMetaItem}>
            🏪 {result.stores.length} {result.stores.length === 1 ? 'tienda' : 'tiendas'}
          </span>
        </div>

        {/* Desglose por tienda */}
        <div style={styles.storeList}>
          {result.stores.map((s, si) => {
            const storeName = s.store?.name ?? 'Tienda desconocida';
            const storeEmoji = Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪';
            return (
              <details key={si} style={styles.storeDetail}>
                <summary style={styles.storeSummary}>
                  {storeEmoji} {storeName}
                  <span style={styles.storeCount}>
                    {s.products.length} producto{s.products.length !== 1 ? 's' : ''}
                  </span>
                </summary>
                <ul style={styles.productList}>
                  {s.products.map((p, pi) => (
                    <li key={pi} style={styles.productItem}>
                      <span style={styles.productName}>
                        {p.item.productName} ×{p.item.quantity}
                      </span>
                      <span style={styles.productPrice}>
                        ${(p.price * p.item.quantity).toLocaleString('es-CO')}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </div>

      {/* Mapa de ruta */}
      <div style={styles.mapContainer}>
        <OrderRouteMap
          key={order.id}
          stores={result.stores}
          userCoords={userCoords}
        />
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

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(
      selected.size === items.length
        ? new Set()
        : new Set(items.map((i) => i.id))
    );
  };

  const handleCreateOrder = () => {
    if (selected.size === 0) return;
    navigate('/pedido/nuevo', {
      state: { items: items.filter((i) => selected.has(i.id)) },
    });
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Cabecera */}
        <div style={styles.header}>
          <CartIcon />
          <div>
            <h1 style={styles.title}>{ts.title}</h1>
            <p style={styles.subtitle}>{ts.subtitle}</p>
          </div>
        </div>

        {/* ── Sección de pedidos (solo si hay) ─────────────────────────── */}
        {orders.length > 0 && (
          <OrdersSection orders={orders} removeOrder={removeOrder} />
        )}

        {/* ── Divisor ───────────────────────────────────────────────────── */}
        {orders.length > 0 && items.length > 0 && (
          <div style={styles.divider}>
            <span style={styles.dividerLabel}>Lista de compras</span>
          </div>
        )}

        {/* ── Sección de ítems ──────────────────────────────────────────── */}
        {items.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🛒</div>
            <p style={styles.emptyTitle}>{ts.emptyTitle}</p>
            <p style={styles.emptySubtitle}>{ts.emptySubtitle}</p>
            <Link to="/publicaciones" style={styles.goToProductsBtn}>
              <TagIcon />
              {ts.goToProducts}
            </Link>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div style={styles.toolbar}>
              <label style={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={selected.size === items.length}
                  onChange={toggleAll}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {selected.size > 0 ? ts.selectedCount(selected.size) : 'Seleccionar todo'}
                </span>
              </label>
              <button type="button" onClick={clearList} style={styles.clearBtn}>
                {ts.clearList}
              </button>
            </div>

            {/* Lista */}
            <ul style={styles.list}>
              {items.map((item) => (
                <li key={item.id} style={styles.listItem}>
                  <label style={styles.itemLabel}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      style={styles.checkbox}
                    />
                    <div style={styles.itemInfo}>
                      <span style={styles.itemName}>{item.productName}</span>
                      {item.storeName && (
                        <span style={styles.itemStore}>🏪 {item.storeName}</span>
                      )}
                      {item.price && (
                        <span style={styles.itemPrice}>
                          ${item.price.toLocaleString('es-CO')} COP
                        </span>
                      )}
                    </div>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      removeItem(item.id);
                      setSelected((prev) => { const n = new Set(prev); n.delete(item.id); return n; });
                    }}
                    style={styles.removeBtn}
                    aria-label={`${ts.removeItem} ${item.productName}`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>

            {/* Atajo a Productos para agregar más */}
            <Link to="/publicaciones" style={styles.addMoreLink}>
              <TagIcon />
              {ts.addMore}
            </Link>

            {/* Crear pedido */}
            <div style={styles.footer}>
              <button
                type="button"
                onClick={handleCreateOrder}
                disabled={selected.size === 0}
                style={{
                  ...styles.createOrderBtn,
                  opacity: selected.size === 0 ? 0.5 : 1,
                  cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                {ts.createOrder}
              </button>
              {selected.size === 0 && (
                <p style={styles.hint}>{ts.selectAtLeastOne}</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    flex: 1,
    padding: '24px 16px',
    maxWidth: '680px',
    margin: '0 auto',
    width: '100%',
  },
  container: { display: 'flex', flexDirection: 'column', gap: '20px' },
  header: { display: 'flex', alignItems: 'center', gap: '14px', color: 'var(--accent)' },
  title: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 },

  // ── Pedidos ──────────────────────────────────────────────────────────────
  ordersSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  carousel: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    paddingBottom: '4px',
    scrollbarWidth: 'none',
  },
  carouselPill: {
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  },
  carouselPillActive: {
    borderColor: 'var(--accent)',
    background: 'var(--accent)',
    color: '#fff',
  },
  pillId: {
    fontSize: '12px',
    fontWeight: 800,
    fontFamily: 'monospace',
  },
  pillDate: {
    fontSize: '10px',
    opacity: 0.8,
  },
  orderCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  orderCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
  },
  orderIdLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
  },
  orderIdValue: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--accent)',
    fontFamily: 'monospace',
  },
  orderDate: { fontSize: '12px', color: 'var(--text-muted)' },
  removeOrderBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
  },
  orderMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border)',
  },
  orderMetaItem: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  storeList: {
    padding: '8px 0',
  },
  storeDetail: {
    borderBottom: '1px solid var(--border)',
  },
  storeSummary: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    cursor: 'pointer',
    listStyle: 'none',
    userSelect: 'none',
  },
  storeCount: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 400,
  },
  productList: {
    listStyle: 'none',
    margin: 0,
    padding: '0 0 8px',
  },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '6px 24px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    borderTop: '1px solid var(--border)',
  },
  productName: { color: 'var(--text-primary)' },
  productPrice: { fontWeight: 700, color: 'var(--accent)' },
  mapContainer: {
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },

  // ── Divisor ───────────────────────────────────────────────────────────────
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--text-muted)',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  dividerLabel: {
    whiteSpace: 'nowrap',
  },

  // ── Lista de ítems ────────────────────────────────────────────────────────
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
  },
  emptyIcon: { fontSize: '48px' },
  emptyTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  emptySubtitle: { fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 },
  goToProductsBtn: {
    marginTop: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 20px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 700,
    textDecoration: 'none',
  },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  selectAll: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' },
  clearBtn: {
    background: 'none', border: 'none', fontSize: '12px',
    color: 'var(--error)', cursor: 'pointer', padding: '4px 8px',
  },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' },
  listItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '12px 14px',
  },
  itemLabel: { display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', flex: 1 },
  checkbox: { width: '16px', height: '16px', cursor: 'pointer' },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  itemName: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  itemStore: { fontSize: '12px', color: 'var(--text-muted)' },
  itemPrice: { fontSize: '12px', color: 'var(--accent)', fontWeight: 600 },
  removeBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '6px', borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center',
  },
  addMoreLink: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '8px 14px', border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: 600,
    color: 'var(--text-secondary)', textDecoration: 'none',
    alignSelf: 'flex-start',
  },
  footer: { display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px' },
  createOrderBtn: {
    padding: '14px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff', fontWeight: 800,
    fontSize: '15px', textAlign: 'center',
  },
  hint: { fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', margin: 0 },
};
