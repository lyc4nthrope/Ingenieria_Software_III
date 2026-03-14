/**
 * CreateOrderPage.jsx — Proceso 3, Pasos 3-6
 *
 * Recibe los ítems seleccionados desde ShoppingListPage (via navigate state).
 *
 * Fase A — Configuración: ubicación GPS o manual, radio, tipo de tienda.
 * Fase B — Optimización: consulta publicaciones del Proceso 2 por producto,
 *           aplica greedy (precio más bajo por ítem), muestra desglose por tienda.
 * Fase C — Confirmación: genera ID de pedido y navega a /pedido/:id.
 */

import { useState, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import * as publicationsApi from '@/services/api/publications.api';
import PublicationDetailModal from '@/features/publications/components/PublicationDetailModal';

// ─── Radios disponibles ───────────────────────────────────────────────────────
const RADIUS_OPTIONS = [1, 3, 5, 10, 20];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Construye storeMap y calcula métricas comunes a todas las estrategias */
function buildResult(assignments, itemResults) {
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
function optimizeByPrice(itemResults) {
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
// Algoritmo: elige la tienda que cubre más ítems pendientes → asigna todos sus
// ítems. Repite hasta cubrir todos.
function optimizeByFewestStores(itemResults) {
  const assignments = {};
  // Usamos String() para que el Set y Object.keys() sean del mismo tipo
  const pending = new Set(itemResults.map(({ item }) => String(item.id)));

  // Índice: storeId → { store, coverage: { itemId(string) → publicación más barata } }
  const storeIndex = {};
  for (const { item, publications } of itemResults) {
    if (!publications?.length) continue;
    const sortedByPrice = [...publications].sort((a, b) => (a.price || 0) - (b.price || 0));
    for (const pub of sortedByPrice) {
      const sid = String(pub.store?.id ?? 'unknown');
      if (!storeIndex[sid]) storeIndex[sid] = { store: pub.store, coverage: {} };
      const key = String(item.id);
      // Solo registra la primera aparición (la más barata, ya que está ordenado)
      if (!storeIndex[sid].coverage[key]) {
        storeIndex[sid].coverage[key] = pub;
      }
    }
  }

  while (pending.size > 0) {
    // Tienda con mayor cobertura de ítems pendientes
    let bestStore = null;
    let bestCount = 0;
    for (const [sid, data] of Object.entries(storeIndex)) {
      const count = Object.keys(data.coverage).filter((id) => pending.has(id)).length;
      if (count > bestCount) { bestCount = count; bestStore = sid; }
    }
    if (!bestStore || bestCount === 0) break;

    // Asignar todos los ítems pendientes que esta tienda cubre
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
// Empieza igual que "precio más bajo", pero si hay una tienda ya seleccionada
// que ofrece el ítem a no más del 15% más caro, prefiere esa tienda para
// evitar un viaje extra.
const CLUSTER_THRESHOLD = 0.15; // 15% de tolerancia de precio por no añadir tienda

function optimizeBalanced(itemResults) {
  const assignments = {};
  const selectedStoreIds = new Set();

  // Primero ordenamos por cantidad de opciones de menor a mayor, para que los
  // ítems con pocas opciones "anclen" la tienda más importante primero.
  const sorted = [...itemResults].sort(
    (a, b) => (a.publications?.length || 0) - (b.publications?.length || 0)
  );

  for (const { item, publications } of sorted) {
    if (!publications?.length) continue;
    const byPrice = [...publications].sort((a, b) => (a.price || 0) - (b.price || 0));
    const cheapest = byPrice[0];
    const cheapestPrice = cheapest.price || 0;

    // ¿Hay alguna tienda ya seleccionada que tenga este ítem a precio aceptable?
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

// ─── Componente ───────────────────────────────────────────────────────────────
export default function CreateOrderPage() {
  const { t } = useLanguage();
  const to = t.orders;
  const navigate = useNavigate();
  const location = useLocation();

  // Ítems recibidos desde ShoppingListPage
  const selectedItems = location.state?.items ?? [];

  // ── Fase ──────────────────────────────────────────────────────────────────
  // 'config' | 'result' | 'confirmed'
  const [phase, setPhase] = useState('config');

  // ── Config ────────────────────────────────────────────────────────────────
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [locating, setLocating] = useState(false);
  const [locationLabel, setLocationLabel] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [radius, setRadius] = useState(5);
  const [storeType, setStoreType] = useState('all'); // 'all' | 'physical' | 'virtual'
  const [strategy, setStrategy] = useState('balanced'); // 'price' | 'fewest_stores' | 'balanced'

  // ── Resultado ─────────────────────────────────────────────────────────────
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);
  const [selectedPublication, setSelectedPublication] = useState(null);

  // ── Confirmación ──────────────────────────────────────────────────────────
  const [orderId] = useState(() => `NSE-${Date.now().toString(36).toUpperCase()}`);

  // ── GPS ───────────────────────────────────────────────────────────────────
  const handleGPS = () => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setLocating(false);
      },
      () => {
        setLocationLabel(to.locationError);
        setLocating(false);
      }
    );
  };

  // ── Calcular ──────────────────────────────────────────────────────────────
  const handleCalculate = useCallback(async () => {
    setCalculating(true);
    setCalcError(null);

    try {
      // Para cada ítem, consultar publicaciones de precio del Proceso 2
      const queryPromises = selectedItems.map(async (item) => {
        const filters = {
          productName: item.productName,
          sortBy: 'cheapest',
          limit: 20,
        };
        if (coords) {
          filters.latitude = coords.lat;
          filters.longitude = coords.lng;
          filters.maxDistance = radius;
        }
        if (storeType === 'physical') filters.storeType = 1;
        if (storeType === 'virtual') filters.storeType = 2;

        const res = await publicationsApi.getPublications(filters);
        return { item, publications: res.success ? (res.data ?? []) : [] };
      });

      const itemResults = await Promise.all(queryPromises);
      const optimizeFn =
        strategy === 'price' ? optimizeByPrice :
        strategy === 'fewest_stores' ? optimizeByFewestStores :
        optimizeBalanced;
      const optimized = optimizeFn(itemResults);
      setResult(optimized);
      setPhase('result');
    } catch (err) {
      setCalcError('Error al calcular la cesta. Intentá nuevamente.');
    } finally {
      setCalculating(false);
    }
  }, [selectedItems, coords, radius, storeType, strategy]);

  // ── Confirmar ─────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    setPhase('confirmed');
    setTimeout(() => {
      navigate(`/pedido/${orderId}`, {
        state: { result, orderId, items: selectedItems, userCoords: coords },
      });
    }, 1500);
  };

  // ── Si no hay ítems, volver ────────────────────────────────────────────────
  if (selectedItems.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <p style={{ color: 'var(--text-muted)' }}>No hay productos seleccionados.</p>
          <Link to="/lista" style={styles.backLink}>{to.goToList}</Link>
        </div>
      </div>
    );
  }

  // ── FASE A: Configuración ──────────────────────────────────────────────────
  if (phase === 'config') {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <Link to="/lista" style={styles.backLink}>{to.goToList}</Link>

          <h1 style={styles.title}>{to.configTitle}</h1>
          <p style={styles.subtitle}>{to.configSubtitle}</p>

          {/* Resumen de ítems seleccionados */}
          <div style={styles.card}>
            <p style={styles.cardLabel}>{to.itemCount(selectedItems.length)} a optimizar:</p>
            <div style={styles.itemChips}>
              {selectedItems.map((item) => (
                <span key={item.id} style={styles.chip}>
                  {item.productName} ×{item.quantity}{item.unit ? ` ${item.unit}` : ''}
                </span>
              ))}
            </div>
          </div>

          {/* Ubicación */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>{to.locationLabel}</label>
            <div style={styles.locationRow}>
              <button
                type="button"
                onClick={handleGPS}
                disabled={locating}
                style={styles.gpsBtn}
              >
                📍 {locating ? to.locating : to.useMyLocation}
              </button>
              {locationLabel && (
                <span style={styles.locationResult}>
                  {coords ? '✅' : '⚠️'} {locationLabel}
                </span>
              )}
            </div>
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder={to.manualAddress}
              style={styles.input}
            />
          </div>

          {/* Radio */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>
              {to.radiusLabel}: <strong>{radius} km</strong>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              style={styles.slider}
            />
            <div style={styles.radioPips}>
              {RADIUS_OPTIONS.map((r) => (
                <span
                  key={r}
                  onClick={() => setRadius(r)}
                  style={{ ...styles.pip, fontWeight: radius === r ? 700 : 400 }}
                >
                  {r}km
                </span>
              ))}
            </div>
          </div>

          {/* Tipo de tienda */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>{to.storeTypeLabel}</label>
            <div style={styles.storeTypeRow}>
              {[
                { value: 'all', label: to.storeTypeAll },
                { value: 'physical', label: to.storeTypePhysical },
                { value: 'virtual', label: to.storeTypeVirtual },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStoreType(value)}
                  style={{
                    ...styles.storeTypeBtn,
                    ...(storeType === value ? styles.storeTypeBtnActive : {}),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Estrategia de optimización */}
          <div style={styles.section}>
            <label style={styles.sectionLabel}>{to.strategyLabel}</label>
            <div style={styles.strategyGrid}>
              {[
                {
                  value: 'price',
                  icon: '💰',
                  label: to.strategyPrice,
                  desc: to.strategyPriceDesc,
                },
                {
                  value: 'fewest_stores',
                  icon: '📍',
                  label: to.strategyFewest,
                  desc: to.strategyFewestDesc,
                },
                {
                  value: 'balanced',
                  icon: '⚖️',
                  label: to.strategyBalanced,
                  desc: to.strategyBalancedDesc,
                },
              ].map(({ value, icon, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStrategy(value)}
                  style={{
                    ...styles.strategyCard,
                    ...(strategy === value ? styles.strategyCardActive : {}),
                  }}
                >
                  <span style={styles.strategyIcon}>{icon}</span>
                  <span style={styles.strategyName}>{label}</span>
                  <span style={styles.strategyDesc}>{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {calcError && <p style={styles.errorMsg}>{calcError}</p>}

          <button
            type="button"
            onClick={handleCalculate}
            disabled={calculating}
            style={styles.primaryBtn}
          >
            {calculating ? to.calculating : to.calculateButton}
          </button>
        </div>
      </div>
    );
  }

  // ── FASE B: Resultado ──────────────────────────────────────────────────────
  if (phase === 'result' && result) {
    const { stores, totalCost, savings, savingsPct, noResultItems } = result;

    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <button type="button" onClick={() => setPhase('config')} style={styles.backLink}>
            ← Volver a configuración
          </button>

          <h1 style={styles.title}>{to.resultTitle}</h1>

          {/* Card de ahorro */}
          <div style={styles.savingsCard}>
            {savings > 0 ? (
              <>
                <span style={styles.savingsEmoji}>💰</span>
                <span style={styles.savingsText}>{to.savingsCard(savings, savingsPct)}</span>
              </>
            ) : (
              <>
                <span style={styles.savingsEmoji}>✅</span>
                <span style={styles.savingsText}>{to.noSavings}</span>
              </>
            )}
          </div>

          {/* Total */}
          <div style={styles.totalRow}>
            <span style={styles.totalLabel}>{to.totalCost}</span>
            <span style={styles.totalValue}>
              ${totalCost.toLocaleString('es-CO')} COP
            </span>
          </div>

          {/* Ítems sin resultados */}
          {noResultItems.length > 0 && (
            <div style={styles.warningCard}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>Sin datos de precio:</p>
              {noResultItems.map((item) => (
                <p key={item.id} style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  • {to.noResults(item.productName)}
                </p>
              ))}
            </div>
          )}

          {/* Desglose por tienda */}
          {/* Estrategia usada */}
          <div style={styles.strategyUsedBadge}>
            <span>
              {strategy === 'price' ? '💰' : strategy === 'fewest_stores' ? '📍' : '⚖️'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {strategy === 'price' ? to.strategyPrice :
               strategy === 'fewest_stores' ? to.strategyFewest :
               to.strategyBalanced}
            </span>
          </div>

          <h2 style={styles.sectionTitle}>{to.byStore}</h2>
          {stores.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              No se encontraron publicaciones para los productos seleccionados.
            </p>
          ) : (
            stores.map((s, i) => {
              const storeName = s.store?.name ?? 'Tienda desconocida';
              const storeType = Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪';
              const subtotal = s.products.reduce(
                (sum, p) => sum + (p.price || 0) * p.item.quantity,
                0
              );
              return (
                <div key={i} style={styles.storeCard}>
                  <div style={styles.storeHeader}>
                    <span style={styles.storeName}>{storeType} {storeName}</span>
                    <span style={styles.storeSubtotal}>
                      ${subtotal.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <ul style={styles.productList}>
                    {s.products.map((p, pi) => (
                      <li
                        key={pi}
                        style={{ ...styles.productItem, cursor: 'pointer' }}
                        onClick={() => setSelectedPublication(p.publication)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedPublication(p.publication); }}
                        title="Ver publicación"
                      >
                        <div style={styles.productItemLeft}>
                          <span style={styles.productItemName}>
                            {p.item.productName} ×{p.item.quantity}
                          </span>
                          <span style={styles.productItemMeta}>
                            {to.bestPrice}: ${p.price.toLocaleString('es-CO')} c/u · <span style={{ color: 'var(--accent)' }}>Ver publicación →</span>
                          </span>
                        </div>
                        <span style={styles.productItemTotal}>
                          ${(p.price * p.item.quantity).toLocaleString('es-CO')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}

          <button
            type="button"
            onClick={handleConfirm}
            style={styles.primaryBtn}
          >
            {to.confirmOrder}
          </button>
        </div>

        {selectedPublication && (
          <PublicationDetailModal
            publication={selectedPublication}
            onClose={() => setSelectedPublication(null)}
          />
        )}
      </div>
    );
  }

  // ── FASE C: Confirmado ─────────────────────────────────────────────────────
  return (
    <div style={{ ...styles.page, alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ fontSize: '64px' }}>🎉</div>
        <h1 style={styles.title}>{to.confirmed}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          {to.orderId}: <strong>{orderId}</strong>
        </p>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{to.orderStatus}</p>
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
    display: 'flex',
    flexDirection: 'column',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  backLink: {
    fontSize: '13px',
    color: 'var(--accent)',
    textDecoration: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    alignSelf: 'flex-start',
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
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
  },
  cardLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: '0 0 8px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  itemChips: { display: 'flex', flexWrap: 'wrap', gap: '6px' },
  chip: {
    padding: '4px 10px',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  locationRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap',
  },
  gpsBtn: {
    padding: '8px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  locationResult: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  input: {
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
  slider: { width: '100%', accentColor: 'var(--accent)' },
  radioPips: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  pip: { cursor: 'pointer', color: 'var(--text-secondary)' },
  storeTypeRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  storeTypeBtn: {
    padding: '7px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  storeTypeBtnActive: {
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    borderColor: 'var(--accent)',
    fontWeight: 700,
  },
  primaryBtn: {
    padding: '14px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 800,
    fontSize: '15px',
    cursor: 'pointer',
    width: '100%',
  },
  errorMsg: {
    fontSize: '13px',
    color: 'var(--error)',
    background: 'var(--error-soft)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    margin: 0,
  },
  savingsCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'var(--success-soft)',
    border: '1px solid var(--success)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
  },
  savingsEmoji: { fontSize: '28px' },
  savingsText: { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  totalLabel: { fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 },
  totalValue: { fontSize: '18px', fontWeight: 800, color: 'var(--accent)' },
  warningCard: {
    background: 'var(--warning-soft, #fef9c3)',
    border: '1px solid var(--warning, #ca8a04)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    color: 'var(--text-primary)',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  strategyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  strategyCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-surface)',
    cursor: 'pointer',
    textAlign: 'center',
  },
  strategyCardActive: {
    background: 'var(--accent-soft)',
    borderColor: 'var(--accent)',
  },
  strategyIcon: { fontSize: '22px' },
  strategyName: { fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' },
  strategyDesc: { fontSize: '10px', color: 'var(--text-muted)', lineHeight: 1.3 },
  strategyUsedBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '999px',
    alignSelf: 'flex-start',
  },
  storeCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  storeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
  },
  storeName: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' },
  storeSubtotal: { fontSize: '14px', fontWeight: 700, color: 'var(--accent)' },
  productList: {
    listStyle: 'none',
    margin: 0,
    padding: '8px 0',
  },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid var(--border)',
  },
  productItemLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  productItemName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' },
  productItemMeta: { fontSize: '11px', color: 'var(--text-muted)' },
  productItemTotal: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' },
};
