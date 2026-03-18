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
import { insertUserActivityLog } from '@/services/api/audit.api';

const STORAGE_PREFIX = 'nosee-shopping-';

function storageKey(userId) {
  return `${STORAGE_PREFIX}${userId ?? 'guest'}`;
}

function loadFromStorage(userId) {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return { items: [], orders: [], savedLists: [] };
    const parsed = JSON.parse(raw);
    return {
      items:      Array.isArray(parsed.items)      ? parsed.items      : [],
      orders:     Array.isArray(parsed.orders)     ? parsed.orders     : [],
      savedLists: Array.isArray(parsed.savedLists) ? parsed.savedLists : [],
    };
  } catch {
    return { items: [], orders: [], savedLists: [] };
  }
}

function saveToStorage(userId, items, orders, savedLists) {
  if (!userId) return; // no guardar datos de invitado
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ items, orders, savedLists }));
  } catch { /* quota exceeded, ignorar */ }
}

// ── Middleware de auto-guardado ───────────────────────────────────────────────
function withAutosave(storeCreator) {
  return (set, get, api) => {
    const wrappedSet = (partial, replace) => {
      set(partial, replace);
      const { _userId, items, orders, savedLists } = get();
      saveToStorage(_userId, items, orders, savedLists);
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

    /** @type {Array<{id: string, name: string, items: Array, savedAt: string}>} */
    savedLists: [],

    // ── Gestión de sesión ───────────────────────────────────────────────────
    loadForUser: (userId) => {
      const { items, orders, savedLists } = loadFromStorage(userId);
      set({ _userId: userId, items, orders, savedLists });
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
      const uid = get()._userId;
      if (uid) insertUserActivityLog(uid, 'agregar_item_lista', { productName: trimmed, quantity: Number(quantity) });
    },

    removeItem: (id) => {
      const item = get().items.find((i) => i.id === id);
      set({ items: get().items.filter((i) => i.id !== id) });
      const uid = get()._userId;
      if (uid && item) insertUserActivityLog(uid, 'eliminar_item_lista', { productName: item.productName });
    },

    updateItem: (id, changes) =>
      set({ items: get().items.map((i) => (i.id === id ? { ...i, ...changes } : i)) }),

    clearList: () => set({ items: [] }),

    // ── Listas guardadas ─────────────────────────────────────────────────────
    saveList: (name) => {
      const { items, savedLists } = get();
      if (!name.trim() || items.length === 0) return;
      const newList = {
        id: `sl-${Date.now()}`,
        name: name.trim(),
        items: [...items],
        savedAt: new Date().toISOString(),
      };
      set({ savedLists: [newList, ...savedLists] });
    },

    loadSavedList: (id) => {
      const found = get().savedLists.find((l) => l.id === id);
      if (!found) return;
      set({ items: found.items.map((i) => ({ ...i, id: Date.now() + Math.random() })) });
    },

    deleteSavedList: (id) =>
      set({ savedLists: get().savedLists.filter((l) => l.id !== id) }),

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
