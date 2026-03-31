/**
 * ShoppingListPage.jsx — Proceso 3 (rediseño responsive v2)
 *
 * Cambios v2:
 * - Sidebar: colapsable en móvil con flecha toggle
 * - Botón agregar: solo símbolo +
 * - Ítems: checkbox con tachado al marcar
 * - Post-optimización: área completa del ítem es toggle del carrusel
 * - Carrusel: scroll infinito horizontal (10 por batch), tarjeta con nombre/unidad/cantidad
 * - Guardar lista: notificación + brillo en título del sidebar
 * - Domicilio/Voy yo: primer clic = seleccionar, segundo clic = confirmar
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';
import { useLanguage } from '@/contexts/LanguageContext';
import { ListaTab } from '../components/ListaTab';
import { PedidosTab } from '../components/PedidosTab';
import { SavedListsSidebar } from '../components/SavedListsSidebar';
import { page } from '../styles/shoppingListStyles';

// ─── Página ───────────────────────────────────────────────────────────────────
export default function ShoppingListPage() {
  useLanguage();

  const {
    items, addItem, removeItem, clearList,
    orders, addOrder, removeOrder, updateOrderDelivery,
    savedLists, saveList, loadSavedList, deleteSavedList,
  } = useShoppingListStore();

  const [activeTab, setActiveTab] = useState('lista');
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(flashTimerRef.current), []);

  const handleSaved = () => {
    setSavedFlash(true);
    clearTimeout(flashTimerRef.current);
    flashTimerRef.current = setTimeout(() => setSavedFlash(false), 2000);
  };

  const deliveryOrders = useMemo(() => orders.filter((o) => o.deliveryMode), [orders]);
  const pickupOrders   = useMemo(() => orders.filter((o) => !o.deliveryMode), [orders]);

  const tabs = useMemo(() => [
    { key: 'lista',     label: 'Mi Lista' },
    { key: 'pedidos',   label: 'Mis Pedidos',    badge: deliveryOrders.length },
    { key: 'recogidas', label: 'Mis Recogidas',  badge: pickupOrders.length },
  ], [deliveryOrders.length, pickupOrders.length]);

  return (
    <div className="home-wrapper">
      <style>{`
        .lista-layout {
          display: grid;
          grid-template-columns: 220px 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 680px) {
          .lista-layout { grid-template-columns: 1fr; }
        }
        .pedidos-layout {
          display: grid;
          grid-template-columns: 1fr 1.6fr;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 760px) {
          .pedidos-layout { grid-template-columns: 1fr; }
        }
        @keyframes savedFlash {
          0%, 100% { color: var(--text-secondary); }
          50% { color: var(--accent); text-shadow: 0 0 10px var(--accent); }
        }
      `}</style>

      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <div style={page.header}>
        <h1 style={page.title}>
          {activeTab === 'lista'     ? '🛒 Mi Lista de Compras' :
           activeTab === 'pedidos'   ? '🛵 Mis Pedidos'         :
                                       '🚶 Mis Recogidas'}
        </h1>
        {activeTab === 'lista' && items.length > 0 && (
          <span style={page.badge}>
            {items.length} {items.length === 1 ? 'producto' : 'productos'} en lista
          </span>
        )}
      </div>

      {/* ── Pestañas ─────────────────────────────────────────────── */}
      <div style={page.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              ...page.tabBtn,
              ...(activeTab === tab.key ? page.tabBtnActive : {}),
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{
                ...page.tabBadge,
                ...(activeTab === tab.key ? page.tabBadgeActive : {}),
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ────────────────────────────────────────────── */}
      {activeTab === 'lista' && (
        <div className="lista-layout">
          <SavedListsSidebar
            savedLists={savedLists}
            onLoad={loadSavedList}
            onDelete={deleteSavedList}
            flash={savedFlash}
          />
          <ListaTab
            items={items}
            addItem={addItem}
            removeItem={removeItem}
            clearList={clearList}
            saveList={saveList}
            addOrder={addOrder}
            onSaved={handleSaved}
            onConfirmedDelivery={() => setActiveTab('pedidos')}
            onConfirmedPickup={() => setActiveTab('recogidas')}
          />
        </div>
      )}
      {activeTab === 'pedidos' && (
        <PedidosTab
          orders={deliveryOrders}
          removeOrder={removeOrder}
          updateOrderDelivery={updateOrderDelivery}
          emptyHint="Confirma un pedido con 🛵 Domicilio y aparecerá aquí."
        />
      )}
      {activeTab === 'recogidas' && (
        <PedidosTab
          orders={pickupOrders}
          removeOrder={removeOrder}
          updateOrderDelivery={updateOrderDelivery}
          emptyHint="Confirma un pedido con 🚶 Voy yo y aparecerá aquí."
          variant="pickup"
        />
      )}
    </div>
  );
}
