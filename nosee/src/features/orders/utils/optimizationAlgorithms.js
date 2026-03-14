/**
 * optimizationAlgorithms.js
 *
 * Algoritmos greedy de optimización de cesta de compras — Proceso 3.
 * Exportados para ser usados en CreateOrderPage y en tests unitarios.
 */

// ─── Helper compartido ────────────────────────────────────────────────────────

/** Construye storeMap y calcula métricas comunes a todas las estrategias */
export function buildResult(assignments, itemResults) {
  const storeMap = {};
  const noResultItems = [];

  for (const { item, publications } of itemResults) {
    if (!publications || publications.length === 0) {
      noResultItems.push(item);
      continue;
    }
    const chosen = assignments[String(item.id)];
    if (!chosen) {
      noResultItems.push(item);
      continue;
    }
    const storeId = chosen.store?.id ?? 'unknown';
    if (!storeMap[storeId]) storeMap[storeId] = { store: chosen.store, products: [] };
    const sorted = [...publications].sort((a, b) => (a.price || 0) - (b.price || 0));
    storeMap[storeId].products.push({
      item,
      publication: chosen,
      price: chosen.price,
      allOptions: sorted.slice(0, 3),
    });
  }

  const stores = Object.values(storeMap);
  const totalCost = stores.reduce(
    (sum, s) => sum + s.products.reduce((ps, p) => ps + (p.price || 0) * p.item.quantity, 0),
    0
  );
  const worstCost = itemResults.reduce((sum, { publications }) => {
    if (!publications || publications.length === 0) return sum;
    const sorted = [...publications].sort((a, b) => (b.price || 0) - (a.price || 0));
    return sum + (sorted[0]?.price || 0);
  }, 0);
  const savings = Math.max(0, worstCost - totalCost);
  const savingsPct = worstCost > 0 ? Math.round((savings / worstCost) * 100) : 0;

  return { stores, totalCost, savings, savingsPct, noResultItems };
}

// ─── Estrategia 1: Precio más bajo ────────────────────────────────────────────
// Para cada ítem elige la publicación más barata sin importar tienda.
export function optimizeByPrice(itemResults) {
  const assignments = {};
  for (const { item, publications } of itemResults) {
    if (!publications?.length) continue;
    const sorted = [...publications].sort((a, b) => (a.price || 0) - (b.price || 0));
    assignments[String(item.id)] = sorted[0];
  }
  return buildResult(assignments, itemResults);
}

// ─── Estrategia 2: Menos tiendas ──────────────────────────────────────────────
// Concentra las compras en el mínimo de tiendas posible.
export function optimizeByFewestStores(itemResults) {
  const assignments = {};
  const pending = new Set(itemResults.map(({ item }) => String(item.id)));

  const storeIndex = {};
  for (const { item, publications } of itemResults) {
    if (!publications?.length) continue;
    const sortedByPrice = [...publications].sort((a, b) => (a.price || 0) - (b.price || 0));
    for (const pub of sortedByPrice) {
      const sid = String(pub.store?.id ?? 'unknown');
      if (!storeIndex[sid]) storeIndex[sid] = { store: pub.store, coverage: {} };
      const key = String(item.id);
      if (!storeIndex[sid].coverage[key]) {
        storeIndex[sid].coverage[key] = pub;
      }
    }
  }

  while (pending.size > 0) {
    let bestStore = null;
    let bestCount = 0;
    for (const [sid, data] of Object.entries(storeIndex)) {
      const count = Object.keys(data.coverage).filter((id) => pending.has(id)).length;
      if (count > bestCount) { bestCount = count; bestStore = sid; }
    }
    if (!bestStore || bestCount === 0) break;

    for (const itemId of Object.keys(storeIndex[bestStore].coverage)) {
      if (pending.has(itemId)) {
        assignments[itemId] = storeIndex[bestStore].coverage[itemId];
        pending.delete(itemId);
      }
    }
  }

  return buildResult(assignments, itemResults);
}

// ─── Estrategia 3: Equilibrado ────────────────────────────────────────────────
export const CLUSTER_THRESHOLD = 0.15;

export function optimizeBalanced(itemResults) {
  const assignments = {};
  const selectedStoreIds = new Set();

  const sorted = [...itemResults].sort(
    (a, b) => (a.publications?.length || 0) - (b.publications?.length || 0)
  );

  for (const { item, publications } of sorted) {
    if (!publications?.length) continue;
    const byPrice = [...publications].sort((a, b) => (a.price || 0) - (b.price || 0));
    const cheapest = byPrice[0];
    const cheapestPrice = cheapest.price || 0;

    const optionInExistingStore = byPrice.find((pub) => {
      const sid = pub.store?.id ?? 'unknown';
      if (!selectedStoreIds.has(sid)) return false;
      const pricePenalty = cheapestPrice > 0
        ? (pub.price - cheapestPrice) / cheapestPrice
        : 0;
      return pricePenalty <= CLUSTER_THRESHOLD;
    });

    const chosen = optionInExistingStore ?? cheapest;
    assignments[String(item.id)] = chosen;
    selectedStoreIds.add(chosen.store?.id ?? 'unknown');
  }

  return buildResult(assignments, itemResults);
}
