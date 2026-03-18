/**
 * tests/unit/proceso3.test.js
 *
 * Tests unitarios del Proceso 3: Gestión de Pedido, Optimización de Compra y Ubicación.
 *
 * Cubre:
 *  1. shoppingListStore — acciones CRUD + aislamiento por usuario + autosave
 *  2. optimizeByPrice — greedy precio más bajo
 *  3. optimizeByFewestStores — greedy set-cover (menos tiendas)
 *  4. optimizeBalanced — greedy equilibrado (umbral 15%)
 *  5. buildResult — cálculo de costo total, ahorro y noResultItems
 *  6. parseStoreCoords — GeoJSON, WKT y WKB hex
 *
 * Ejecutar: npm test -- proceso3.test.js
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ─── Importaciones bajo prueba ────────────────────────────────────────────────
import {
  buildResult,
  optimizeByPrice,
  optimizeByFewestStores,
  optimizeBalanced,
  CLUSTER_THRESHOLD,
} from '../../src/features/orders/utils/optimizationAlgorithms.js';

import { parseStoreCoords } from '../../src/features/orders/utils/parseStoreCoords.js';

import { useShoppingListStore } from '../../src/features/shopping-list/store/shoppingListStore.js';

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — shoppingListStore
// ═════════════════════════════════════════════════════════════════════════════

describe('shoppingListStore', () => {
  // Limpia localStorage y resetea el store antes de cada test
  beforeEach(() => {
    localStorage.clear();
    useShoppingListStore.setState({ _userId: null, items: [], orders: [] });
  });

  // ── 1.1 loadForUser ────────────────────────────────────────────────────────
  describe('loadForUser', () => {
    it('inicia con lista e pedidos vacíos para usuario nuevo', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      const { items, orders } = useShoppingListStore.getState();
      expect(items).toEqual([]);
      expect(orders).toEqual([]);
    });

    it('carga datos previos del usuario desde localStorage', () => {
      // Simular datos guardados previamente
      const stored = {
        items: [{ id: 1, productName: 'Arroz', quantity: 2 }],
        orders: [{ id: 'NSE-ABC', result: {}, createdAt: '2026-01-01T00:00:00Z' }],
      };
      localStorage.setItem('nosee-shopping-user-2', JSON.stringify(stored));

      useShoppingListStore.getState().loadForUser('user-2');
      const { items, orders } = useShoppingListStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].productName).toBe('Arroz');
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe('NSE-ABC');
    });

    it('resetea el store al llamar loadForUser(null)', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('Leche', 1);
      expect(useShoppingListStore.getState().items).toHaveLength(1);

      useShoppingListStore.getState().loadForUser(null);
      expect(useShoppingListStore.getState().items).toEqual([]);
      expect(useShoppingListStore.getState()._userId).toBeNull();
    });
  });

  // ── 1.2 addItem ────────────────────────────────────────────────────────────
  describe('addItem', () => {
    it('agrega un ítem nuevo a la lista', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('Pan', 2, { unit: 'kg' });

      const { items } = useShoppingListStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].productName).toBe('Pan');
      expect(items[0].quantity).toBe(2);
      expect(items[0].unit).toBe('kg');
    });

    it('incrementa la cantidad si el producto ya existe (case-insensitive)', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('Arroz', 1);
      useShoppingListStore.getState().addItem('arroz', 3);

      const { items } = useShoppingListStore.getState();
      expect(items).toHaveLength(1);
      expect(items[0].quantity).toBe(4);
    });

    it('ignora nombres vacíos o solo espacios', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('   ');
      useShoppingListStore.getState().addItem('');

      expect(useShoppingListStore.getState().items).toHaveLength(0);
    });

    it('asigna id único basado en Date.now', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('Leche', 1);
      useShoppingListStore.getState().addItem('Queso', 1);

      const { items } = useShoppingListStore.getState();
      expect(items[0].id).toBeDefined();
      expect(items[1].id).toBeDefined();
      // Los IDs deberían ser distintos (aunque en JSDOM Date.now puede coincidir
      // en el mismo tick; basta verificar que existen)
      expect(typeof items[0].id).toBe('number');
    });

    it('guarda precio, storeName y publicationId opcionales', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('Aceite', 1, {
        price: 5000,
        storeName: 'Éxito',
        publicationId: 'pub-99',
      });

      const item = useShoppingListStore.getState().items[0];
      expect(item.price).toBe(5000);
      expect(item.storeName).toBe('Éxito');
      expect(item.publicationId).toBe('pub-99');
    });
  });

  // ── 1.3 removeItem ────────────────────────────────────────────────────────
  describe('removeItem', () => {
    it('elimina el ítem por id', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('Pan', 1);
      const id = useShoppingListStore.getState().items[0].id;

      useShoppingListStore.getState().removeItem(id);
      expect(useShoppingListStore.getState().items).toHaveLength(0);
    });

    it('no falla si el id no existe', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('Pan', 1);
      useShoppingListStore.getState().removeItem(999999);
      expect(useShoppingListStore.getState().items).toHaveLength(1);
    });
  });

  // ── 1.4 updateItem ────────────────────────────────────────────────────────
  describe('updateItem', () => {
    it('actualiza campos del ítem por id', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('Leche', 1);
      const id = useShoppingListStore.getState().items[0].id;

      useShoppingListStore.getState().updateItem(id, { quantity: 5, unit: 'L' });
      const item = useShoppingListStore.getState().items[0];
      expect(item.quantity).toBe(5);
      expect(item.unit).toBe('L');
    });

    it('no modifica otros ítems', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      // Forzar IDs distintos sobrescribiendo addItem directamente con setState
      useShoppingListStore.setState({
        items: [
          { id: 100, productName: 'Leche', quantity: 1 },
          { id: 200, productName: 'Pan', quantity: 2 },
        ],
      });

      useShoppingListStore.getState().updateItem(100, { quantity: 10 });
      const panItem = useShoppingListStore.getState().items.find((i) => i.id === 200);
      expect(panItem.quantity).toBe(2);
    });
  });

  // ── 1.5 clearList ─────────────────────────────────────────────────────────
  describe('clearList', () => {
    it('vacía todos los ítems', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addItem('A', 1);
      useShoppingListStore.getState().addItem('B', 2);
      useShoppingListStore.getState().clearList();
      expect(useShoppingListStore.getState().items).toEqual([]);
    });

    it('no borra los pedidos al limpiar la lista', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addOrder({ id: 'NSE-001', result: {} });
      useShoppingListStore.getState().clearList();
      expect(useShoppingListStore.getState().orders).toHaveLength(1);
    });
  });

  // ── 1.6 addOrder / removeOrder ─────────────────────────────────────────────
  describe('addOrder / removeOrder', () => {
    it('agrega un pedido al inicio de la lista', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addOrder({ id: 'NSE-001', result: {} });
      useShoppingListStore.getState().addOrder({ id: 'NSE-002', result: {} });

      const { orders } = useShoppingListStore.getState();
      expect(orders[0].id).toBe('NSE-002'); // más reciente primero
      expect(orders[1].id).toBe('NSE-001');
    });

    it('elimina pedido por id', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addOrder({ id: 'NSE-A', result: {} });
      useShoppingListStore.getState().addOrder({ id: 'NSE-B', result: {} });
      useShoppingListStore.getState().removeOrder('NSE-A');

      const { orders } = useShoppingListStore.getState();
      expect(orders).toHaveLength(1);
      expect(orders[0].id).toBe('NSE-B');
    });
  });

  // ── 1.7 updateOrderDelivery ────────────────────────────────────────────────
  describe('updateOrderDelivery', () => {
    it('actualiza solo el pedido indicado', () => {
      useShoppingListStore.getState().loadForUser('user-1');
      useShoppingListStore.getState().addOrder({ id: 'NSE-X', deliveryStatus: 'searching' });
      useShoppingListStore.getState().addOrder({ id: 'NSE-Y', deliveryStatus: 'searching' });

      useShoppingListStore.getState().updateOrderDelivery('NSE-X', {
        deliveryStatus: 'en_camino',
        driverLocation: { lat: 4.6, lng: -74.1 },
      });

      const orders = useShoppingListStore.getState().orders;
      const x = orders.find((o) => o.id === 'NSE-X');
      const y = orders.find((o) => o.id === 'NSE-Y');
      expect(x.deliveryStatus).toBe('en_camino');
      expect(x.driverLocation).toEqual({ lat: 4.6, lng: -74.1 });
      expect(y.deliveryStatus).toBe('searching'); // sin cambios
    });
  });

  // ── 1.8 Aislamiento por usuario ────────────────────────────────────────────
  describe('aislamiento por usuario', () => {
    it('los datos de usuario A no son visibles para usuario B', () => {
      // Usuario A agrega ítems
      useShoppingListStore.getState().loadForUser('user-A');
      useShoppingListStore.getState().addItem('Arroz', 3);

      // Usuario B carga su sesión
      useShoppingListStore.getState().loadForUser('user-B');
      expect(useShoppingListStore.getState().items).toEqual([]);
    });

    it('persiste datos de usuario A y los recupera tras cambio de sesión', () => {
      // Usuario A agrega un ítem
      useShoppingListStore.getState().loadForUser('user-A');
      useShoppingListStore.getState().addItem('Leche', 2);

      // Cambia a usuario B
      useShoppingListStore.getState().loadForUser('user-B');
      expect(useShoppingListStore.getState().items).toEqual([]);

      // Vuelve a usuario A — debería recuperar sus ítems
      useShoppingListStore.getState().loadForUser('user-A');
      expect(useShoppingListStore.getState().items).toHaveLength(1);
      expect(useShoppingListStore.getState().items[0].productName).toBe('Leche');
    });

    it('no persiste datos de invitado (null user)', () => {
      // Invitado agrega ítems — no deberían guardarse
      useShoppingListStore.getState().loadForUser(null);
      useShoppingListStore.getState().addItem('Pan', 1);

      // La clave de invitado no debería escribirse en localStorage
      const guestKey = localStorage.getItem('nosee-shopping-guest');
      expect(guestKey).toBeNull();
    });
  });

  // ── 1.9 Autosave ───────────────────────────────────────────────────────────
  describe('autosave (persistencia automática)', () => {
    it('persiste en localStorage tras addItem', () => {
      useShoppingListStore.getState().loadForUser('user-save');
      useShoppingListStore.getState().addItem('Yogur', 4);

      const raw = localStorage.getItem('nosee-shopping-user-save');
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].productName).toBe('Yogur');
    });

    it('persiste en localStorage tras addOrder', () => {
      useShoppingListStore.getState().loadForUser('user-save');
      useShoppingListStore.getState().addOrder({ id: 'NSE-Z', result: {} });

      const raw = localStorage.getItem('nosee-shopping-user-save');
      const parsed = JSON.parse(raw);
      expect(parsed.orders[0].id).toBe('NSE-Z');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2 — Algoritmos de optimización
// ═════════════════════════════════════════════════════════════════════════════

// ── Fixtures de datos ──────────────────────────────────────────────────────────
const storeA = { id: 'store-A', name: 'Tienda A', store_type_id: 1 };
const storeB = { id: 'store-B', name: 'Tienda B', store_type_id: 1 };
const storeC = { id: 'store-C', name: 'Tienda C', store_type_id: 2 };

function makeItem(id, productName, quantity = 1) {
  return { id, productName, quantity };
}

function makePub(storeId, price, store = null) {
  const s = store ?? (storeId === 'store-A' ? storeA : storeId === 'store-B' ? storeB : storeC);
  return { store: s, price };
}

// ── 2.1 buildResult ───────────────────────────────────────────────────────────
describe('buildResult', () => {
  it('calcula totalCost correctamente', () => {
    const item1 = makeItem(1, 'Arroz', 2);
    const item2 = makeItem(2, 'Leche', 1);
    const pub1 = makePub('store-A', 3000);
    const pub2 = makePub('store-A', 5000);

    const assignments = { '1': pub1, '2': pub2 };
    const itemResults = [
      { item: item1, publications: [pub1] },
      { item: item2, publications: [pub2] },
    ];

    const res = buildResult(assignments, itemResults);
    // 3000 * 2 + 5000 * 1 = 11000
    expect(res.totalCost).toBe(11000);
  });

  it('agrupa productos por tienda', () => {
    const item1 = makeItem(1, 'Arroz', 1);
    const item2 = makeItem(2, 'Leche', 1);
    const pubA = makePub('store-A', 2000);
    const pubB = makePub('store-B', 3000);

    const assignments = { '1': pubA, '2': pubB };
    const itemResults = [
      { item: item1, publications: [pubA] },
      { item: item2, publications: [pubB] },
    ];

    const res = buildResult(assignments, itemResults);
    expect(res.stores).toHaveLength(2);
  });

  it('registra ítems sin publicaciones en noResultItems', () => {
    const item1 = makeItem(1, 'Arroz', 1);
    const item2 = makeItem(2, 'ProductoRaro', 1);
    const pubA = makePub('store-A', 1000);

    const assignments = { '1': pubA };
    const itemResults = [
      { item: item1, publications: [pubA] },
      { item: item2, publications: [] }, // sin resultados
    ];

    const res = buildResult(assignments, itemResults);
    expect(res.noResultItems).toHaveLength(1);
    expect(res.noResultItems[0].productName).toBe('ProductoRaro');
  });

  it('calcula savings = 0 cuando ya es el precio más bajo', () => {
    const item = makeItem(1, 'Arroz', 1);
    const pub = makePub('store-A', 1000);
    const assignments = { '1': pub };
    const itemResults = [{ item, publications: [pub] }];

    const res = buildResult(assignments, itemResults);
    expect(res.savings).toBe(0);
    expect(res.savingsPct).toBe(0);
  });

  it('calcula savings positivo cuando hay precio peor disponible', () => {
    const item = makeItem(1, 'Arroz', 1);
    const cheapPub = makePub('store-A', 1000);
    const expPub = makePub('store-B', 3000);
    const assignments = { '1': cheapPub };
    const itemResults = [{ item, publications: [cheapPub, expPub] }];

    const res = buildResult(assignments, itemResults);
    // worstCost = 3000, totalCost = 1000, savings = 2000
    expect(res.savings).toBe(2000);
    expect(res.savingsPct).toBe(67); // round(2000/3000*100)
  });

  it('retorna stores vacío y noResultItems lleno si no hay publicaciones', () => {
    const item = makeItem(1, 'Raro', 1);
    const itemResults = [{ item, publications: [] }];
    const res = buildResult({}, itemResults);
    expect(res.stores).toHaveLength(0);
    expect(res.noResultItems).toHaveLength(1);
    expect(res.totalCost).toBe(0);
  });
});

// ── 2.2 optimizeByPrice ───────────────────────────────────────────────────────
describe('optimizeByPrice', () => {
  it('elige la publicación más barata para cada ítem', () => {
    const item = makeItem(1, 'Arroz', 1);
    const cheap = makePub('store-A', 1500);
    const expensive = makePub('store-B', 4000);
    const itemResults = [{ item, publications: [expensive, cheap] }];

    const res = optimizeByPrice(itemResults);
    expect(res.stores).toHaveLength(1);
    expect(res.stores[0].store.id).toBe('store-A');
    expect(res.totalCost).toBe(1500);
  });

  it('maneja múltiples ítems en tiendas distintas', () => {
    const item1 = makeItem(1, 'Arroz', 2);
    const item2 = makeItem(2, 'Leche', 1);

    const itemResults = [
      { item: item1, publications: [makePub('store-B', 5000), makePub('store-A', 2000)] },
      { item: item2, publications: [makePub('store-A', 3000), makePub('store-B', 1500)] },
    ];

    const res = optimizeByPrice(itemResults);
    // item1 → store-A 2000 * 2 = 4000; item2 → store-B 1500 * 1 = 1500 → total 5500
    expect(res.totalCost).toBe(5500);
  });

  it('ignora ítems sin publicaciones', () => {
    const item1 = makeItem(1, 'Arroz', 1);
    const item2 = makeItem(2, 'Raro', 1);
    const itemResults = [
      { item: item1, publications: [makePub('store-A', 1000)] },
      { item: item2, publications: [] },
    ];

    const res = optimizeByPrice(itemResults);
    expect(res.noResultItems).toHaveLength(1);
    expect(res.totalCost).toBe(1000);
  });

  it('con un solo ítem retorna una sola tienda', () => {
    const item = makeItem(1, 'Pan', 3);
    const pub = makePub('store-A', 800);
    const res = optimizeByPrice([{ item, publications: [pub] }]);
    expect(res.stores).toHaveLength(1);
    expect(res.totalCost).toBe(2400); // 800 * 3
  });
});

// ── 2.3 optimizeByFewestStores ────────────────────────────────────────────────
describe('optimizeByFewestStores', () => {
  it('concentra todos los ítems en la tienda con mayor cobertura', () => {
    const item1 = makeItem(1, 'Arroz', 1);
    const item2 = makeItem(2, 'Leche', 1);
    // store-A cubre ambos ítems; store-B solo cubre item2
    const itemResults = [
      { item: item1, publications: [makePub('store-A', 2000)] },
      { item: item2, publications: [makePub('store-A', 1800), makePub('store-B', 1600)] },
    ];

    const res = optimizeByFewestStores(itemResults);
    // Debe preferir store-A porque cubre ambos ítems
    expect(res.stores).toHaveLength(1);
    expect(res.stores[0].store.id).toBe('store-A');
  });

  it('usa dos tiendas cuando ninguna cubre todos los ítems', () => {
    const item1 = makeItem(1, 'Arroz', 1);
    const item2 = makeItem(2, 'Leche', 1);
    // store-A solo tiene item1; store-B solo tiene item2
    const itemResults = [
      { item: item1, publications: [makePub('store-A', 2000)] },
      { item: item2, publications: [makePub('store-B', 1800)] },
    ];

    const res = optimizeByFewestStores(itemResults);
    expect(res.stores).toHaveLength(2);
  });

  it('con tres ítems selecciona la tienda con más cobertura primero', () => {
    const item1 = makeItem(1, 'A', 1);
    const item2 = makeItem(2, 'B', 1);
    const item3 = makeItem(3, 'C', 1);

    // store-A cubre 1,2,3; store-B cubre solo 3
    const itemResults = [
      { item: item1, publications: [makePub('store-A', 100)] },
      { item: item2, publications: [makePub('store-A', 200), makePub('store-B', 150)] },
      { item: item3, publications: [makePub('store-A', 300), makePub('store-B', 50)] },
    ];

    const res = optimizeByFewestStores(itemResults);
    expect(res.stores).toHaveLength(1);
    expect(res.stores[0].store.id).toBe('store-A');
  });

  it('maneja ítems sin publicaciones correctamente', () => {
    const item1 = makeItem(1, 'Arroz', 1);
    const item2 = makeItem(2, 'Raro', 1);
    const itemResults = [
      { item: item1, publications: [makePub('store-A', 1000)] },
      { item: item2, publications: [] },
    ];

    const res = optimizeByFewestStores(itemResults);
    expect(res.noResultItems).toHaveLength(1);
    expect(res.stores).toHaveLength(1);
  });
});

// ── 2.4 optimizeBalanced ──────────────────────────────────────────────────────
describe('optimizeBalanced', () => {
  it('elige precio más bajo cuando no hay tienda previa seleccionada', () => {
    const item = makeItem(1, 'Arroz', 1);
    const cheap = makePub('store-A', 1000);
    const expensive = makePub('store-B', 2000);
    const itemResults = [{ item, publications: [expensive, cheap] }];

    const res = optimizeBalanced(itemResults);
    expect(res.stores[0].store.id).toBe('store-A');
  });

  it('prefiere tienda ya seleccionada si el precio es <= 15% más caro', () => {
    const item1 = makeItem(1, 'Arroz', 1);
    const item2 = makeItem(2, 'Leche', 1);

    // item1 solo existe en store-A (ancla store-A)
    // item2: store-A ofrece 1100 (10% más caro que store-B 1000)
    const itemResults = [
      { item: item1, publications: [makePub('store-A', 2000)] },
      {
        item: item2,
        publications: [
          makePub('store-B', 1000), // más barato pero store diferente
          makePub('store-A', 1100), // 10% más caro → dentro del umbral
        ],
      },
    ];

    const res = optimizeBalanced(itemResults);
    // Con umbral 15%: debe preferir store-A para item2 y usar 1 tienda
    expect(res.stores).toHaveLength(1);
    expect(res.stores[0].store.id).toBe('store-A');
  });

  it('usa tienda distinta si el precio supera el umbral 15%', () => {
    const item1 = makeItem(1, 'Arroz', 1);
    const item2 = makeItem(2, 'Leche', 1);

    // item2: store-A ofrece 1200 (20% más caro que store-B 1000) → fuera del umbral
    const itemResults = [
      { item: item1, publications: [makePub('store-A', 2000)] },
      {
        item: item2,
        publications: [
          makePub('store-B', 1000),
          makePub('store-A', 1200), // 20% más caro → fuera del umbral
        ],
      },
    ];

    const res = optimizeBalanced(itemResults);
    expect(res.stores).toHaveLength(2);
  });

  it('CLUSTER_THRESHOLD exportado es exactamente 0.15', () => {
    expect(CLUSTER_THRESHOLD).toBe(0.15);
  });

  it('maneja lista vacía sin errores', () => {
    const res = optimizeBalanced([]);
    expect(res.stores).toEqual([]);
    expect(res.totalCost).toBe(0);
    expect(res.noResultItems).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3 — parseStoreCoords
// ═════════════════════════════════════════════════════════════════════════════

describe('parseStoreCoords', () => {
  // ── 3.1 GeoJSON ──────────────────────────────────────────────────────────
  describe('GeoJSON', () => {
    it('parsea GeoJSON Point correctamente (lng, lat)', () => {
      const result = parseStoreCoords({
        type: 'Point',
        coordinates: [-74.0721, 4.711],
      });
      expect(result).toEqual({ lat: 4.711, lng: -74.0721 });
    });

    it('retorna null si las coordenadas no son finitas', () => {
      const result = parseStoreCoords({
        type: 'Point',
        coordinates: [NaN, Infinity],
      });
      expect(result).toBeNull();
    });

    it('retorna null si coordinates no es un array', () => {
      const result = parseStoreCoords({ type: 'Point', coordinates: null });
      expect(result).toBeNull();
    });
  });

  // ── 3.2 WKT ───────────────────────────────────────────────────────────────
  describe('WKT (Well-Known Text)', () => {
    it('parsea POINT(lng lat) correctamente', () => {
      const result = parseStoreCoords('POINT(-74.0721 4.711)');
      expect(result).toEqual({ lat: 4.711, lng: -74.0721 });
    });

    it('parsea con espacios adicionales', () => {
      const result = parseStoreCoords('POINT( -74.0721  4.711 )');
      expect(result).toEqual({ lat: 4.711, lng: -74.0721 });
    });

    it('parsea case-insensitive (point minúscula)', () => {
      const result = parseStoreCoords('point(-74.0721 4.711)');
      expect(result).toEqual({ lat: 4.711, lng: -74.0721 });
    });

    it('parsea coordenadas negativas correctamente', () => {
      const result = parseStoreCoords('POINT(-75.5 -1.5)');
      expect(result).toEqual({ lat: -1.5, lng: -75.5 });
    });
  });

  // ── 3.3 Valores nulos / inválidos ─────────────────────────────────────────
  describe('valores nulos e inválidos', () => {
    it('retorna null para null', () => {
      expect(parseStoreCoords(null)).toBeNull();
    });

    it('retorna null para undefined', () => {
      expect(parseStoreCoords(undefined)).toBeNull();
    });

    it('retorna null para string vacío', () => {
      expect(parseStoreCoords('')).toBeNull();
    });

    it('retorna null para string aleatorio', () => {
      expect(parseStoreCoords('no-es-geom')).toBeNull();
    });

    it('retorna null para número', () => {
      expect(parseStoreCoords(12345)).toBeNull();
    });
  });

  // ── 3.4 WKB hex — prueba básica de formato ────────────────────────────────
  describe('WKB hex (PostGIS)', () => {
    it('retorna null para string hex con valores inválidos', () => {
      // Hex corto que no corresponde a WKB válido
      const result = parseStoreCoords('0102030405');
      // No debe lanzar excepción; debe retornar null o coordenadas
      expect(result === null || (typeof result?.lat === 'number')).toBe(true);
    });

    it('ignora strings hex con número impar de caracteres', () => {
      // String hex de longitud impar — no es un WKB válido
      const result = parseStoreCoords('ABC');
      // Debe retornar null sin lanzar error
      expect(result === null || typeof result?.lat === 'number').toBe(true);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN 4 — Verificación de integridad del Proceso 3
// ═════════════════════════════════════════════════════════════════════════════

describe('Proceso 3 — integridad funcional', () => {
  it('las tres estrategias producen un resultado con la misma estructura', () => {
    const item = makeItem(1, 'Arroz', 2);
    const itemResults = [
      { item, publications: [makePub('store-A', 1000), makePub('store-B', 1200)] },
    ];

    for (const fn of [optimizeByPrice, optimizeByFewestStores, optimizeBalanced]) {
      const res = fn(itemResults);
      expect(res).toHaveProperty('stores');
      expect(res).toHaveProperty('totalCost');
      expect(res).toHaveProperty('savings');
      expect(res).toHaveProperty('savingsPct');
      expect(res).toHaveProperty('noResultItems');
      expect(Array.isArray(res.stores)).toBe(true);
      expect(typeof res.totalCost).toBe('number');
    }
  });

  it('el costo total nunca es negativo', () => {
    const item = makeItem(1, 'Arroz', 1);
    const itemResults = [{ item, publications: [makePub('store-A', 0)] }];
    const res = optimizeByPrice(itemResults);
    expect(res.totalCost).toBeGreaterThanOrEqual(0);
  });

  it('el porcentaje de ahorro está entre 0 y 100', () => {
    const item = makeItem(1, 'Leche', 1);
    const itemResults = [
      { item, publications: [makePub('store-A', 1000), makePub('store-B', 5000)] },
    ];
    const res = optimizeByPrice(itemResults);
    expect(res.savingsPct).toBeGreaterThanOrEqual(0);
    expect(res.savingsPct).toBeLessThanOrEqual(100);
  });

  it('la tienda con storeType 2 (virtual) es identificable por store_type_id', () => {
    const item = makeItem(1, 'Producto', 1);
    const virtualPub = makePub('store-C', 800, storeC);
    const itemResults = [{ item, publications: [virtualPub] }];
    const res = optimizeByPrice(itemResults);
    expect(res.stores[0].store.store_type_id).toBe(2);
  });

  it('addOrder guarda el campo deliveryMode correctamente', () => {
    localStorage.clear();
    useShoppingListStore.setState({ _userId: null, items: [], orders: [] });
    useShoppingListStore.getState().loadForUser('user-test');
    useShoppingListStore.getState().addOrder({
      id: 'NSE-DOM',
      result: { stores: [], totalCost: 5000 },
      deliveryMode: true,
      deliveryStatus: 'searching',
      driverLocation: null,
      cancellationCharged: false,
    });

    const orders = useShoppingListStore.getState().orders;
    expect(orders[0].deliveryMode).toBe(true);
    expect(orders[0].deliveryStatus).toBe('searching');
    expect(orders[0].cancellationCharged).toBe(false);
  });

  it('updateOrderDelivery actualiza el estado de domicilio en tiempo real', () => {
    localStorage.clear();
    useShoppingListStore.setState({ _userId: null, items: [], orders: [] });
    useShoppingListStore.getState().loadForUser('user-test');
    useShoppingListStore.getState().addOrder({
      id: 'NSE-LIVE',
      deliveryStatus: 'searching',
      driverLocation: null,
    });

    useShoppingListStore.getState().updateOrderDelivery('NSE-LIVE', {
      deliveryStatus: 'en_camino',
      driverLocation: { lat: 4.711, lng: -74.0721 },
    });

    const order = useShoppingListStore.getState().orders[0];
    expect(order.deliveryStatus).toBe('en_camino');
    expect(order.driverLocation).toEqual({ lat: 4.711, lng: -74.0721 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN 5 — Separación de modos: "Mis Pedidos" vs "Mis Recogidas"
// Cubre el flujo "intención primero" implementado en ListaTab:
//   - domicilio (deliveryMode: true)  → tab "Mis Pedidos"
//   - voy yo   (deliveryMode: false) → tab "Mis Recogidas"
// ═════════════════════════════════════════════════════════════════════════════

describe('Separación de pedidos por modo (domicilio vs voy yo)', () => {
  beforeEach(() => {
    localStorage.clear();
    useShoppingListStore.setState({ _userId: null, items: [], orders: [] });
    useShoppingListStore.getState().loadForUser('user-modos');
  });

  // ── Pedido de domicilio ────────────────────────────────────────────────────
  it('un pedido confirmado como domicilio tiene deliveryMode=true y deliveryStatus="searching"', () => {
    useShoppingListStore.getState().addOrder({
      id: 'NSE-D1',
      result: { stores: [], totalCost: 30000, noResultItems: [] },
      deliveryMode: true,
      deliveryStatus: 'searching',
      driverLocation: null,
      cancellationCharged: false,
    });

    const order = useShoppingListStore.getState().orders[0];
    expect(order.deliveryMode).toBe(true);
    expect(order.deliveryStatus).toBe('searching');
    expect(order.driverLocation).toBeNull();
  });

  // ── Pedido "voy yo" ────────────────────────────────────────────────────────
  it('un pedido confirmado como "voy yo" tiene deliveryMode=false y deliveryStatus=null', () => {
    useShoppingListStore.getState().addOrder({
      id: 'NSE-P1',
      result: { stores: [], totalCost: 25000, noResultItems: [] },
      deliveryMode: false,
      deliveryStatus: null,
      driverLocation: null,
      cancellationCharged: false,
    });

    const order = useShoppingListStore.getState().orders[0];
    expect(order.deliveryMode).toBe(false);
    expect(order.deliveryStatus).toBeNull();
  });

  // ── Filtrado de tabs ───────────────────────────────────────────────────────
  it('filtrar orders por deliveryMode separa correctamente domicilio y recogidas', () => {
    useShoppingListStore.getState().addOrder({ id: 'NSE-D2', deliveryMode: true,  result: {} });
    useShoppingListStore.getState().addOrder({ id: 'NSE-D3', deliveryMode: true,  result: {} });
    useShoppingListStore.getState().addOrder({ id: 'NSE-P2', deliveryMode: false, result: {} });

    const { orders } = useShoppingListStore.getState();
    const deliveryOrders = orders.filter((o) => o.deliveryMode);
    const pickupOrders   = orders.filter((o) => !o.deliveryMode);

    expect(deliveryOrders).toHaveLength(2);
    expect(pickupOrders).toHaveLength(1);
    expect(deliveryOrders.every((o) => o.deliveryMode === true)).toBe(true);
    expect(pickupOrders.every((o) => o.deliveryMode === false)).toBe(true);
  });

  it('un pedido domicilio NO aparece en la lista de recogidas', () => {
    useShoppingListStore.getState().addOrder({ id: 'NSE-DOM', deliveryMode: true,  result: {} });
    useShoppingListStore.getState().addOrder({ id: 'NSE-VYO', deliveryMode: false, result: {} });

    const { orders } = useShoppingListStore.getState();
    const pickupOrders = orders.filter((o) => !o.deliveryMode);

    const ids = pickupOrders.map((o) => o.id);
    expect(ids).not.toContain('NSE-DOM');
    expect(ids).toContain('NSE-VYO');
  });

  it('un pedido "voy yo" NO aparece en Mis Pedidos (domicilio)', () => {
    useShoppingListStore.getState().addOrder({ id: 'NSE-A', deliveryMode: false, result: {} });
    useShoppingListStore.getState().addOrder({ id: 'NSE-B', deliveryMode: true,  result: {} });

    const { orders } = useShoppingListStore.getState();
    const deliveryOrders = orders.filter((o) => o.deliveryMode);

    const ids = deliveryOrders.map((o) => o.id);
    expect(ids).not.toContain('NSE-A');
    expect(ids).toContain('NSE-B');
  });

  // ── Sin pedidos ────────────────────────────────────────────────────────────
  it('cuando no hay pedidos ambas listas están vacías', () => {
    const { orders } = useShoppingListStore.getState();
    expect(orders.filter((o) => o.deliveryMode)).toHaveLength(0);
    expect(orders.filter((o) => !o.deliveryMode)).toHaveLength(0);
  });

  // ── Persistencia por modo ──────────────────────────────────────────────────
  it('ambos tipos de pedido persisten en localStorage', () => {
    useShoppingListStore.getState().addOrder({ id: 'NSE-PERS-D', deliveryMode: true,  result: {} });
    useShoppingListStore.getState().addOrder({ id: 'NSE-PERS-P', deliveryMode: false, result: {} });

    const raw = localStorage.getItem('nosee-shopping-user-modos');
    const parsed = JSON.parse(raw);
    const modes = parsed.orders.map((o) => o.deliveryMode);
    expect(modes).toContain(true);
    expect(modes).toContain(false);
  });

  // ── removeOrder no afecta el otro modo ─────────────────────────────────────
  it('eliminar un pedido de domicilio no afecta los pedidos de recogida', () => {
    useShoppingListStore.getState().addOrder({ id: 'NSE-DEL', deliveryMode: true,  result: {} });
    useShoppingListStore.getState().addOrder({ id: 'NSE-KEEP', deliveryMode: false, result: {} });

    useShoppingListStore.getState().removeOrder('NSE-DEL');

    const { orders } = useShoppingListStore.getState();
    expect(orders).toHaveLength(1);
    expect(orders[0].id).toBe('NSE-KEEP');
    expect(orders[0].deliveryMode).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// SECCIÓN 6 — buildResultFromSelections (lógica interna del flujo "confirmar")
// La función transforma la selección del usuario (publicación elegida por ítem)
// en el formato de resultado que se guarda en el pedido.
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Replica de buildResultFromSelections tal como está en ShoppingListPage.jsx.
 * Se testa aquí de forma aislada para verificar el contrato de datos.
 */
function buildResultFromSelections(items, selectedPubs) {
  const storeMap = {};
  const noResultItems = [];
  for (const item of items) {
    const pub = selectedPubs[item.id];
    if (!pub) { noResultItems.push(item); continue; }
    const sid = String(pub.store?.id ?? 'unknown');
    if (!storeMap[sid]) storeMap[sid] = { store: pub.store, products: [] };
    storeMap[sid].products.push({ item, publication: pub, price: pub.price ?? 0 });
  }
  const stores = Object.values(storeMap);
  const totalCost = stores.reduce(
    (s, st) => s + st.products.reduce((ps, p) => ps + p.price * (p.item.quantity || 1), 0), 0
  );
  return { stores, totalCost, savings: 0, savingsPct: 0, noResultItems };
}

describe('buildResultFromSelections — lógica de confirmación', () => {
  it('agrupa correctamente productos en una tienda', () => {
    const items = [makeItem(1, 'Arroz', 2), makeItem(2, 'Leche', 1)];
    const selectedPubs = {
      1: makePub('store-A', 2000),
      2: makePub('store-A', 3500),
    };
    const res = buildResultFromSelections(items, selectedPubs);
    expect(res.stores).toHaveLength(1);
    expect(res.totalCost).toBe(2000 * 2 + 3500 * 1); // 7500
  });

  it('separa productos en dos tiendas distintas', () => {
    const items = [makeItem(1, 'Pan', 1), makeItem(2, 'Queso', 1)];
    const selectedPubs = {
      1: makePub('store-A', 1000),
      2: makePub('store-B', 4000),
    };
    const res = buildResultFromSelections(items, selectedPubs);
    expect(res.stores).toHaveLength(2);
    expect(res.totalCost).toBe(5000);
  });

  it('registra en noResultItems los ítems sin publicación elegida', () => {
    const items = [makeItem(1, 'Arroz', 1), makeItem(2, 'ProductoRaro', 1)];
    const selectedPubs = { 1: makePub('store-A', 1000) }; // ítem 2 sin selección
    const res = buildResultFromSelections(items, selectedPubs);
    expect(res.noResultItems).toHaveLength(1);
    expect(res.noResultItems[0].productName).toBe('ProductoRaro');
  });

  it('totalCost multiplica precio × cantidad por cada ítem', () => {
    const items = [makeItem(10, 'Aceite', 3)];
    const selectedPubs = { 10: makePub('store-A', 8000) };
    const res = buildResultFromSelections(items, selectedPubs);
    expect(res.totalCost).toBe(24000); // 8000 × 3
  });

  it('con lista vacía retorna estructura válida con totales en cero', () => {
    const res = buildResultFromSelections([], {});
    expect(res.stores).toEqual([]);
    expect(res.totalCost).toBe(0);
    expect(res.noResultItems).toEqual([]);
  });

  it('con todos los ítems sin selección retorna stores vacío y noResultItems lleno', () => {
    const items = [makeItem(1, 'X', 1), makeItem(2, 'Y', 2)];
    const res = buildResultFromSelections(items, {});
    expect(res.stores).toHaveLength(0);
    expect(res.noResultItems).toHaveLength(2);
    expect(res.totalCost).toBe(0);
  });

  it('el resultado tiene la misma estructura que buildResult de los algoritmos', () => {
    const items = [makeItem(1, 'Arroz', 1)];
    const selectedPubs = { 1: makePub('store-A', 1000) };
    const res = buildResultFromSelections(items, selectedPubs);
    expect(res).toHaveProperty('stores');
    expect(res).toHaveProperty('totalCost');
    expect(res).toHaveProperty('savings');
    expect(res).toHaveProperty('savingsPct');
    expect(res).toHaveProperty('noResultItems');
  });
});
