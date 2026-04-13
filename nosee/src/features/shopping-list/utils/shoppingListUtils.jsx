import { parseStoreCoords } from '@/features/orders/utils/parseStoreCoords';

// ─── Iconos ───────────────────────────────────────────────────────────────────
export const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
export const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
export const ChevronDownIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
    <polyline points="6,9 12,15 18,9" />
  </svg>
);
export const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ─── Tarifas de domicilio ─────────────────────────────────────────────────────
const STORE_FEE_PER = 3_000; // COP por tienda
const KM_FEE = 3_000;        // COP por km de ruta total

function haversineKm({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calcula el costo total de domicilio:
 *  - $3.000 COP por tienda
 *  - $3.000 COP × km de ruta total (greedy nearest-neighbor):
 *    entrega → tienda más cercana → siguiente más cercana → ...
 * Si no hay coordenadas de usuario, solo se cobra por cantidad de tiendas.
 */
export function calculateDeliveryFee(stores, userCoords) {
  if (!stores?.length) return 0;
  const storeFee = stores.length * STORE_FEE_PER;
  if (!userCoords?.lat || !userCoords?.lng) return storeFee;

  const nodes = stores.map((s) => parseStoreCoords(s.store?.location)).filter(Boolean);
  if (nodes.length === 0) return storeFee;

  // Greedy nearest-neighbor: entrega → tienda más cercana → siguiente más cercana → ...
  let totalKm = 0;
  let current = userCoords;
  const unvisited = [...nodes];

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = haversineKm(current, unvisited[0]);
    for (let i = 1; i < unvisited.length; i++) {
      const d = haversineKm(current, unvisited[i]);
      if (d < nearestDist) { nearestDist = d; nearestIdx = i; }
    }
    totalKm += nearestDist;
    current = unvisited[nearestIdx];
    unvisited.splice(nearestIdx, 1);
  }

  return Math.round(storeFee + totalKm * KM_FEE);
}

// ─── Preferencias de optimización ────────────────────────────────────────────
export const OPTIM_PREFS_KEY = 'nosee-optim-prefs';
export const DEFAULT_PREFS = {
  sortMode: 'cheapest',     // 'cheapest' | 'nearest' | 'balanced'
  maxDistance: 5,           // km — solo aplica en nearest/balanced
  storeType: 'all',         // 'all' | 'physical' | 'online'
  validatedOnly: false,     // filtrar solo publicaciones validadas
};

// ─── Utilidades ───────────────────────────────────────────────────────────────
export const getStoreEmoji = (storeTypeId) => Number(storeTypeId) === 2 ? '🌐' : '🏪';

// ─── Construir resultado desde selecciones ────────────────────────────────────
export function buildResultFromSelections(items, selectedPubs) {
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
