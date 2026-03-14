/**
 * shoppingListStore.js
 *
 * Store Zustand para la lista de compras del Proceso 3.
 * Los datos se persisten en localStorage con clave por usuario:
 *   nosee-shopping-{userId}
 *
 * Llamar a loadForUser(userId) al iniciar sesión y
 * loadForUser(null) al cerrar sesión para resetear.
 */

import { create } from 'zustand';

const STORAGE_PREFIX = 'nosee-shopping-';

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId ?? 'guest'}`;
}

function loadFromStorage(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { items: [], orders: [] };
    const parsed = JSON.parse(raw);
    return {
      items:  Array.isArray(parsed.items)  ? parsed.items  : [],
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    };
  } catch {
    return { items: [], orders: [] };
  }
}

function saveToStorage(userId, items, orders) {
  if (!userId) return; // no guardar datos de invitado
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ items, orders }));
  } catch { /* quota exceeded, ignorar */ }
}

// ── Middleware de auto-guardado ───────────────────────────────────────────────
// Envuelve cada set() y persiste el estado actual del usuario activo.
function withAutosave(storeCreator) {
  return (set, get, api) => {
    const wrappedSet = (partial, replace) => {
      set(partial, replace);
      const { _userId, items, orders } = get();
      saveToStorage(_userId, items, orders);
    };
    return storeCreator(wrappedSet, get, api);
  };
}

export const useShoppingListStore = create(
  withAutosave((set, get) => ({
    /** ID del usuario activo — null = sin sesión */
    _userId: null,

    /** @type {Array<{id: number, productName: string, quantity: number, ...}>} */
    items: [],

    /** @type {Array<{id: string, result: object, userCoords: object|null, createdAt: string, deliveryMode: boolean, ...}>} */
    orders: [],

    // ── Gestión de sesión ───────────────────────────────────────────────────
    /**
     * Carga los datos del usuario dado desde localStorage.
     * Llamar al iniciar sesión (userId = string) o al cerrar sesión (userId = null).
     */
    loadForUser: (userId) => {
      const { items, orders } = loadFromStorage(userId);
      set({ _userId: userId, items, orders });
    },

    // ── Ítems ───────────────────────────────────────────────────────────────
    addItem: (productName, quantity = 1, { unit = '', storeName = '', price = null, publicationId = null } = {}) => {
      const trimmed = productName.trim();
      if (!trimmed) return;

      const items = get().items;
      const existing = items.find(
        (i) => i.productName.toLowerCase() === trimmed.toLowerCase()
      );

      if (existing) {
        set({
          items: items.map((i) =>
            i.id === existing.id
              ? { ...i, quantity: i.quantity + Number(quantity), storeName, price, publicationId }
              : i
          ),
        });
      } else {
        set({
          items: [
            ...items,
            {
              id: Date.now(),
              productName: trimmed,
              quantity: Number(quantity),
              unit,
              storeName,
              price,
              publicationId,
              addedAt: new Date().toISOString(),
            },
          ],
        });
      }
    },

    removeItem: (id) =>
      set({ items: get().items.filter((i) => i.id !== id) }),

    updateItem: (id, changes) =>
      set({ items: get().items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }),

    clearList: () => set({ items: [] }),

    // ── Pedidos ─────────────────────────────────────────────────────────────
    addOrder: (order) =>
      set({ orders: [order, ...get().orders] }),

    removeOrder: (id) =>
      set({ orders: get().orders.filter((o) => o.id !== id) }),

    updateOrderDelivery: (id, deliveryUpdate) =>
      set({
        orders: get().orders.map((o) =>
          o.id === id ? { ...o, ...deliveryUpdate } : o
        ),
      }),
  }))
);
