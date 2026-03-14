/**
 * shoppingListStore.js
 *
 * Store Zustand para la lista de compras del Proceso 3.
 * Persiste en localStorage bajo la clave 'nosee-shopping-list'.
 *
 * La lista es agnóstica de tienda y precio — solo almacena
 * nombre de producto y cantidad. El precio se consulta en
 * tiempo de creación del pedido (Proceso 2 → publicaciones).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useShoppingListStore = create(
  persist(
    (set, get) => ({
      /** @type {Array<{id: number, productName: string, quantity: number, unit: string, addedAt: string}>} */
      items: [],

      /**
       * Agrega un ítem desde una PublicationCard.
       * Si el producto ya existe en la lista, actualiza storeName y price
       * con los nuevos datos (puede que haya encontrado uno más barato).
       */
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

      /** Elimina un ítem por id */
      removeItem: (id) =>
        set({ items: get().items.filter((i) => i.id !== id) }),

      /** Actualiza campos de un ítem */
      updateItem: (id, changes) =>
        set({
          items: get().items.map((i) =>
            i.id === id ? { ...i, ...changes } : i
          ),
        }),

      /** Vacía la lista completa */
      clearList: () => set({ items: [] }),
    }),
    { name: 'nosee-shopping-list' }
  )
);
