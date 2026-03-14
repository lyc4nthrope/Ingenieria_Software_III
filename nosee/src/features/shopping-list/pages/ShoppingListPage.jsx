/**
 * ShoppingListPage.jsx — Proceso 3, Paso 1
 *
 * El usuario construye su lista de compras: agrega productos con cantidad,
 * selecciona cuáles incluir en el pedido actual y presiona
 * "Crear Pedido Optimizado" para ir a /pedido/nuevo.
 *
 * La lista persiste en localStorage via shoppingListStore (Zustand).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Icono carrito ────────────────────────────────────────────────────────────
const CartIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.69l1.38-7.3H6" />
  </svg>
);

// ─── Icono papelera ───────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
);

export default function ShoppingListPage() {
  const { t } = useLanguage();
  const ts = t.shoppingList;
  const navigate = useNavigate();

  const { items, addItem, removeItem, clearList } = useShoppingListStore();

  // ── Formulario de entrada ──────────────────────────────────────────────────
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('');

  // ── Selección de ítems para el pedido ─────────────────────────────────────
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
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.id)));
    }
  };

  // ── Agregar ítem ───────────────────────────────────────────────────────────
  const handleAdd = (e) => {
    e.preventDefault();
    if (!productName.trim()) return;
    addItem(productName, quantity, unit);
    setProductName('');
    setQuantity(1);
    setUnit('');
  };

  // ── Crear pedido ───────────────────────────────────────────────────────────
  const handleCreateOrder = () => {
    if (selected.size === 0) return;
    const selectedItems = items.filter((i) => selected.has(i.id));
    // Pasamos los ítems seleccionados como state de navegación
    navigate('/pedido/nuevo', { state: { items: selectedItems } });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
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

        {/* Formulario agregar ítem */}
        <form onSubmit={handleAdd} style={styles.form}>
          <input
            type="text"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={ts.inputPlaceholder}
            style={styles.inputMain}
            aria-label={ts.inputPlaceholder}
          />
          <div style={styles.formRow}>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              min={1}
              style={styles.inputSmall}
              placeholder={ts.quantityPlaceholder}
              aria-label={ts.quantityPlaceholder}
            />
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={ts.unitPlaceholder}
              style={{ ...styles.inputSmall, flex: 2 }}
              aria-label={ts.unitPlaceholder}
            />
            <button type="submit" style={styles.addBtn} disabled={!productName.trim()}>
              {ts.addButton}
            </button>
          </div>
        </form>

        {/* Lista de ítems */}
        {items.length === 0 ? (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>🛒</div>
            <p style={styles.emptyTitle}>{ts.emptyTitle}</p>
            <p style={styles.emptySubtitle}>{ts.emptySubtitle}</p>
          </div>
        ) : (
          <>
            {/* Toolbar: seleccionar todo / vaciar */}
            <div style={styles.toolbar}>
              <label style={styles.selectAll}>
                <input
                  type="checkbox"
                  checked={selected.size === items.length && items.length > 0}
                  onChange={toggleAll}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {selected.size > 0 ? ts.selectedCount(selected.size) : 'Seleccionar todo'}
                </span>
              </label>
              <button
                type="button"
                onClick={clearList}
                style={styles.clearBtn}
              >
                {ts.clearList}
              </button>
            </div>

            {/* Ítems */}
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
                      <span style={styles.itemQty}>
                        {item.quantity}{item.unit ? ` ${item.unit}` : ''}
                      </span>
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

            {/* Botón crear pedido */}
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
    maxWidth: '640px',
    margin: '0 auto',
    width: '100%',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    color: 'var(--accent)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
  },
  inputMain: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontSize: '14px',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  formRow: {
    display: 'flex',
    gap: '8px',
  },
  inputSmall: {
    flex: 1,
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontSize: '13px',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  addBtn: {
    padding: '8px 20px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  empty: {
    textAlign: 'center',
    padding: '48px 24px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  emptyTitle: { fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' },
  emptySubtitle: { fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectAll: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    color: 'var(--error)',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
  },
  itemLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    flex: 1,
  },
  checkbox: { width: '16px', height: '16px', cursor: 'pointer' },
  itemInfo: { display: 'flex', flexDirection: 'column', gap: '2px' },
  itemName: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' },
  itemQty: { fontSize: '12px', color: 'var(--text-muted)' },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    alignItems: 'center',
  },
  footer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '8px',
  },
  createOrderBtn: {
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 800,
    fontSize: '15px',
    textAlign: 'center',
  },
  hint: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    margin: 0,
  },
};
