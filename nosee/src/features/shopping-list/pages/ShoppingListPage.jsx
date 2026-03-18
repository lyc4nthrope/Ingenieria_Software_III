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

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';
import { useLanguage } from '@/contexts/LanguageContext';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import * as publicationsApi from '@/services/api/publications.api';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useGeoLocation } from '@/features/publications/hooks/useGeoLocation';

// ─── Iconos ───────────────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const ChevronDownIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
    <polyline points="6,9 12,15 18,9" />
  </svg>
);
const GearIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// Tarifa estimada de domicilio — placeholder hasta implementar Proceso 4
const DELIVERY_FEE = 8_000; // COP

// ─── Preferencias de optimización ────────────────────────────────────────────
const OPTIM_PREFS_KEY = 'nosee-optim-prefs';
const DEFAULT_PREFS = {
  sortMode: 'cheapest',     // 'cheapest' | 'nearest' | 'balanced'
  maxDistance: 5,           // km — solo aplica en nearest/balanced
  storeType: 'all',         // 'all' | 'physical' | 'online'
  validatedOnly: false,     // filtrar solo publicaciones validadas
};

function useOptimPrefs() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(OPTIM_PREFS_KEY);
      return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : { ...DEFAULT_PREFS };
    } catch { return { ...DEFAULT_PREFS }; }
  });

  const savePrefs = (updated) => {
    const next = { ...prefs, ...updated };
    setPrefs(next);
    try { localStorage.setItem(OPTIM_PREFS_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  return [prefs, savePrefs];
}

// ─── Tarjeta de estado de domicilio ───────────────────────────────────────────
function DeliveryCard({ order, onCancel }) {
  const { deliveryStatus, cancellationCharged } = order;
  if (!deliveryStatus || deliveryStatus === null) return null;

  const configs = {
    searching: {
      icon: '🛵', bg: 'var(--warning-soft, #fef9c3)', border: 'var(--warning, #ca8a04)',
      color: '#92400e',
      title: 'Buscando repartidor...',
      desc: 'Tu pedido está en cola de asignación',
      showCancel: true, cancelFree: true,
    },
    found: {
      icon: '✓', bg: 'var(--bg-elevated)', border: 'var(--accent)',
      color: 'var(--accent)',
      title: 'Repartidor asignado',
      desc: 'Sigue su ubicación en tiempo real en el mapa →',
      showCancel: true, cancelFree: false,
    },
    en_camino: {
      icon: '🛵', bg: 'var(--success-soft, #dcfce7)', border: 'var(--success, #16a34a)',
      color: 'var(--success, #16a34a)',
      title: 'En camino a tu ubicación',
      desc: 'Sigue su posición en tiempo real en el mapa →',
      showCancel: false, cancelFree: false, showFee: true,
    },
    cancelled: {
      icon: '✗', bg: 'var(--error-soft, #fee2e2)', border: 'var(--error, #dc2626)',
      color: 'var(--error, #dc2626)',
      title: 'Envío cancelado',
      desc: cancellationCharged
        ? 'Se cobrará el costo del domicilio — el pedido no fue comprado'
        : 'Cancelado sin costo adicional',
      showCancel: false, cancelFree: false,
    },
  };

  const cfg = configs[deliveryStatus];
  if (!cfg) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '10px 14px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: cfg.color }}>{cfg.icon}</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>{cfg.title}</span>
        </div>
        {cfg.showCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              flexShrink: 0, padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${cfg.border}`,
              background: 'transparent', color: cfg.color,
              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {cfg.cancelFree ? 'Cancelar envío' : 'Cancelar (se cobra domicilio)'}
          </button>
        )}
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '23px' }}>
        {cfg.desc}
      </span>
      {cfg.showFee && (
        <span style={{ fontSize: '11px', fontWeight: 700, paddingLeft: '23px', color: 'var(--success, #16a34a)' }}>
          Costo domicilio estimado: ${DELIVERY_FEE.toLocaleString('es-CO')} COP
          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · tarifa Proceso 4</span>
        </span>
      )}
    </div>
  );
}

// ─── Utilidades ───────────────────────────────────────────────────────────────
const getStoreEmoji = (storeTypeId) => Number(storeTypeId) === 2 ? '🌐' : '🏪';

// ─── Tarjeta de publicación en carrusel ───────────────────────────────────────
function CarouselCard({ pub, globalIdx, isSelected, onSelect }) {
  const isBest = globalIdx === 0;
  const storeEmoji = getStoreEmoji(pub.store?.store_type_id);
  const quantity = pub.quantity ?? pub.unit_quantity ?? null;
  const unit = pub.unit ?? pub.measurement_unit ?? null;
  const hasUnitInfo = quantity !== null || unit !== null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(pub)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(pub); }}
      style={{ ...carousel.card, ...(isSelected ? carousel.cardSelected : {}), cursor: 'pointer' }}
    >
      {isBest && <span style={carousel.bestBadge}>★ Mejor Opción</span>}
      {isSelected && !isBest && <span style={carousel.selectedBadge}>✓ Seleccionado</span>}
      <span style={carousel.storeName}>{storeEmoji} {pub.store?.name ?? 'Tienda'}</span>
      <span style={carousel.price}>
        ${(pub.price ?? 0).toLocaleString('es-CO')}
        <span style={carousel.currency}> COP</span>
      </span>
      <span style={carousel.prodName}>{pub.productName ?? pub.product_name ?? '—'}</span>
      {hasUnitInfo && (
        <span style={carousel.unitQty}>
          {[quantity, unit].filter(Boolean).join(' ')}
        </span>
      )}
    </div>
  );
}

// ─── Carrusel horizontal con carga infinita ───────────────────────────────────
function InfiniteHorizontalCarousel({ publications, selectedId, onSelect }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const scrollRef = useRef(null);

  const total = publications?.length ?? 0;
  const hasMore = visibleCount < total;
  const visible = (publications ?? []).slice(0, visibleCount);

  // Resetear al cambiar publicaciones
  useEffect(() => { setVisibleCount(10); }, [publications]);

  // Scroll infinito: detectar cuando el usuario llega cerca del borde derecho
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMore) return;
    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      if (scrollWidth - scrollLeft - clientWidth < 120) {
        setVisibleCount((v) => Math.min(v + 10, total));
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, total]);

  if (total === 0) {
    return <div style={carousel.empty}>Sin coincidencias encontradas para este producto.</div>;
  }

  return (
    <div ref={scrollRef} style={carousel.infiniteTrack}>
      {visible.map((pub, idx) => (
        <CarouselCard
          key={pub.id ?? idx}
          pub={pub}
          globalIdx={idx}
          isSelected={(pub.id ?? idx) === selectedId}
          onSelect={onSelect}
        />
      ))}
      {hasMore && (
        <div style={carousel.loadMoreSentinel}>
          <span style={{ fontSize: '20px', color: 'var(--text-muted)', letterSpacing: '4px', lineHeight: 1 }}>···</span>
        </div>
      )}
    </div>
  );
}

// ─── Panel de configuración de optimización ───────────────────────────────────
function OptimSettingsPanel({ prefs, savePrefs, coordsAvailable, onRequestCoords }) {
  const SORT_MODES = [
    { key: 'cheapest', label: '💰 Más barato', desc: 'Prioriza el precio más bajo' },
    { key: 'nearest',  label: '📍 Más cerca',  desc: 'Prioriza tiendas cercanas' },
    { key: 'balanced', label: '⚖️ Equilibrado', desc: 'Precio y distancia combinados' },
  ];
  const STORE_TYPES = [
    { key: 'all',      label: 'Todas' },
    { key: 'physical', label: '🏪 Física' },
    { key: 'online',   label: '🌐 En línea' },
  ];

  const needsCoords = prefs.sortMode === 'nearest' || prefs.sortMode === 'balanced';

  return (
    <div style={optim.panel}>
      <div style={optim.panelHeader}>
        <span style={optim.panelTitle}>Configuración de optimización</span>
        <button
          type="button"
          onClick={() => savePrefs({ ...DEFAULT_PREFS })}
          style={optim.resetBtn}
          title="Restablecer por defecto"
        >
          Restablecer
        </button>
      </div>

      {/* ── Modo de ordenamiento ──────────────────────────────── */}
      <div style={optim.section}>
        <p style={optim.sectionLabel}>Prioridad de búsqueda</p>
        <div style={optim.segmentRow}>
          {SORT_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => savePrefs({ sortMode: m.key })}
              style={{
                ...optim.segmentBtn,
                ...(prefs.sortMode === m.key ? optim.segmentBtnActive : {}),
              }}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p style={optim.sectionHint}>
          {SORT_MODES.find((m) => m.key === prefs.sortMode)?.desc}
        </p>
      </div>

      {/* ── Distancia máxima ──────────────────────────────────── */}
      <div style={optim.section}>
        <div style={optim.sliderHeader}>
          <p style={optim.sectionLabel}>Distancia máxima</p>
          <span style={optim.sliderValue}>{prefs.maxDistance} km</span>
        </div>
        <div style={optim.sliderWrap}>
          <span style={optim.sliderEdge}>1 km</span>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={prefs.maxDistance}
            onChange={(e) => savePrefs({ maxDistance: Number(e.target.value) })}
            style={optim.slider}
            aria-label="Distancia máxima de búsqueda"
          />
          <span style={optim.sliderEdge}>15 km</span>
        </div>
        <p style={optim.sectionHint}>
          {needsCoords
            ? 'Se usa para filtrar tiendas cercanas'
            : 'Solo aplica en modo "Más cerca" o "Equilibrado"'}
        </p>
        {needsCoords && !coordsAvailable && (
          <button type="button" onClick={onRequestCoords} style={optim.locationBtn}>
            📍 Permitir acceso a mi ubicación
          </button>
        )}
        {needsCoords && coordsAvailable && (
          <p style={{ ...optim.sectionHint, color: 'var(--success, #16a34a)', fontWeight: 600, margin: 0 }}>
            ✓ Ubicación disponible
          </p>
        )}
      </div>

      {/* ── Tipo de tienda ────────────────────────────────────── */}
      <div style={optim.section}>
        <p style={optim.sectionLabel}>Tipo de tienda</p>
        <div style={optim.segmentRow}>
          {STORE_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => savePrefs({ storeType: t.key })}
              style={{
                ...optim.segmentBtn,
                ...(prefs.storeType === t.key ? optim.segmentBtnActive : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Solo validadas ────────────────────────────────────── */}
      <div style={optim.section}>
        <label style={optim.toggleRow}>
          <span style={optim.sectionLabel}>Solo publicaciones validadas</span>
          <div
            role="switch"
            aria-checked={prefs.validatedOnly}
            tabIndex={0}
            onClick={() => savePrefs({ validatedOnly: !prefs.validatedOnly })}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') savePrefs({ validatedOnly: !prefs.validatedOnly }); }}
            style={{
              ...optim.toggle,
              background: prefs.validatedOnly ? 'var(--accent)' : 'var(--border)',
            }}
          >
            <div style={{
              ...optim.toggleThumb,
              transform: prefs.validatedOnly ? 'translateX(18px)' : 'translateX(2px)',
            }} />
          </div>
        </label>
        <p style={optim.sectionHint}>Muestra solo las publicaciones verificadas por la comunidad</p>
      </div>
    </div>
  );
}

// ─── Construir resultado desde selecciones ────────────────────────────────────
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

// ─── Vista Resultado de Optimización ─────────────────────────────────────────
function ResultView({ result, deliveryMode, onBack, onConfirm }) {
  const { stores, totalCost, noResultItems } = result;
  const isDelivery = deliveryMode === 'delivery';
  const modeLabel = isDelivery ? 'Pedido con domicilio' : 'Lista para recoger yo';
  const confirmLabel = isDelivery ? 'Confirmar pedido' : 'Confirmar lista';

  return (
    <div style={resv.root}>
      {/* Header */}
      <div style={resv.header}>
        <button type="button" onClick={onBack} style={resv.backBtn}>← Volver</button>
        <h2 style={resv.title}>Resultado de Optimización</h2>
        <span style={resv.modeBadge}>
          {isDelivery ? '🛵' : '🚶'} {modeLabel}
        </span>
      </div>

      {/* Total */}
      <div style={resv.totalRow}>
        <span style={resv.totalLabel}>Total</span>
        <span style={resv.totalValue}>${totalCost.toLocaleString('es-CO')} COP</span>
      </div>

      {/* Sin resultados */}
      {noResultItems.length > 0 && (
        <div style={resv.warning}>
          <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>Sin publicación elegida:</p>
          {noResultItems.map((item) => (
            <p key={item.id} style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              • {item.productName}
            </p>
          ))}
        </div>
      )}

      {/* Desglose por tienda */}
      <div style={resv.storeList}>
        {stores.map((s, si) => {
          const emoji = getStoreEmoji(s.store?.store_type_id);
          const subtotal = s.products.reduce((a, p) => a + p.price * (p.item.quantity || 1), 0);
          return (
            <div key={si} style={resv.storeCard}>
              <div style={resv.storeHeader}>
                <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
                <span style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 700 }}>
                  ${subtotal.toLocaleString('es-CO')}
                </span>
              </div>
              <ul style={resv.prodList}>
                {s.products.map((p, pi) => (
                  <li key={pi} style={resv.prodItem}>
                    <div>
                      <div style={resv.prodName}>{p.item.productName}</div>
                      <div style={resv.prodMeta}>
                        ×{p.item.quantity || 1} · ${p.price.toLocaleString('es-CO')} c/u
                      </div>
                    </div>
                    <span style={resv.prodTotal}>
                      ${(p.price * (p.item.quantity || 1)).toLocaleString('es-CO')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Botón confirmar */}
      <button type="button" onClick={onConfirm} style={resv.confirmBtn}>
        {confirmLabel}
      </button>
    </div>
  );
}

// ─── Pestaña Mi Lista ─────────────────────────────────────────────────────────
function ListaTab({ items, addItem, removeItem, clearList, saveList, addOrder, onSaved }) {
  const [inputValue, setInputValue] = useState('');
  const [saveInput, setSaveInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [showOptimSettings, setShowOptimSettings] = useState(false);

  // Notificación al guardar
  const [saveStatus, setSaveStatus] = useState(null); // null | 'success' | 'error'
  const saveTimerRef = useRef(null);

  // Preferencias de optimización persistidas
  const [prefs, savePrefs] = useOptimPrefs();

  // Geolocalización — reutiliza el hook compartido con error handling y persistencia
  const {
    latitude, longitude, hasLocation,
    error: coordsError, refetch: requestCoords,
  } = useGeoLocation({ timeout: 8000 });

  // Resultados del cálculo: { [itemId]: publications[] }
  const [calcResults, setCalcResults] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);

  // Publicación seleccionada por ítem: { [itemId]: publication }
  const [selectedPubs, setSelectedPubs] = useState({});

  // Modo de entrega elegido
  const [deliveryMode, setDeliveryMode] = useState(null); // null | 'delivery' | 'pickup'

  // Fase: 'list' | 'result'
  const [phase, setPhase] = useState('list');
  const [orderResult, setOrderResult] = useState(null);

  // Ítem expandido (muestra carrusel)
  const [expandedId, setExpandedId] = useState(null);

  // Checkboxes: set de IDs marcados
  const [checkedItems, setCheckedItems] = useState(new Set());

  const inputRef = useRef(null);

  // Limpieza del timer al desmontar
  useEffect(() => () => clearTimeout(saveTimerRef.current), []);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    addItem(trimmed, 1);
    setInputValue('');
    setCalcResults(null);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleRemove = (id) => {
    removeItem(id);
    setCalcResults((prev) => { if (!prev) return prev; const n = { ...prev }; delete n[id]; return n; });
    setSelectedPubs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setCheckedItems((prev) => { const n = new Set(prev); n.delete(id); return n; });
    if (expandedId === id) setExpandedId(null);
  };

  const handleSaveList = (name) => {
    clearTimeout(saveTimerRef.current);
    try {
      saveList(name);
      setSaveStatus('success');
      onSaved?.();
    } catch {
      setSaveStatus('error');
    }
    saveTimerRef.current = setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleCalculate = useCallback(async () => {
    if (items.length === 0) return;
    setCalculating(true);
    setCalcError(null);
    setCalcResults(null);
    setExpandedId(null);

    // Mapear sortMode a parámetros del API
    const needsCoords = prefs.sortMode === 'nearest' || prefs.sortMode === 'balanced';
    const apiSortBy = prefs.validatedOnly ? 'validated' : 'cheapest';
    const distanceParams = needsCoords && hasLocation
      ? { maxDistance: prefs.maxDistance, latitude, longitude }
      : {};

    try {
      const results = await Promise.all(
        items.map(async (item) => {
          const res = await publicationsApi.getPublications({
            productName: item.productName,
            sortBy: apiSortBy,
            limit: 30,
            ...distanceParams,
          });
          let pubs = res.success ? (res.data ?? []) : [];

          // Filtrar por tipo de tienda en cliente
          if (prefs.storeType === 'physical') {
            pubs = pubs.filter((p) => Number(p.store?.store_type_id) !== 2);
          } else if (prefs.storeType === 'online') {
            pubs = pubs.filter((p) => Number(p.store?.store_type_id) === 2);
          }

          // Ordenar: balanced/cheapest → precio; nearest con coords → por distancia (el backend ya filtra)
          const sorted = [...pubs].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
          return [item.id, sorted];
        })
      );
      const resultsMap = Object.fromEntries(results);
      setCalcResults(resultsMap);
      // Pre-seleccionar la mejor opción (índice 0) para cada ítem
      const defaults = {};
      for (const [id, pubs] of results) {
        if (pubs.length > 0) defaults[id] = pubs[0];
      }
      setSelectedPubs(defaults);
    } catch {
      setCalcError('Error al calcular la canasta. Intentá nuevamente.');
    } finally {
      setCalculating(false);
    }
  }, [items, prefs, hasLocation, latitude, longitude]);

  const toggleExpand = (id) => {
    if (!calcResults) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSelectPub = (itemId, pub) => {
    setSelectedPubs((prev) => ({ ...prev, [itemId]: pub }));
  };

  const toggleCheck = (id, e) => {
    e.stopPropagation();
    setCheckedItems((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const isCalculated = calcResults !== null;
  const hasSelections = Object.keys(selectedPubs).length > 0;

  const total = isCalculated
    ? Object.values(selectedPubs).reduce((sum, pub) => sum + (pub?.price ?? 0), 0)
    : 0;

  const handleGoToResult = () => {
    const result = buildResultFromSelections(items, selectedPubs);
    setOrderResult(result);
    setPhase('result');
  };

  // Primer clic = seleccionar, segundo clic en mismo = confirmar
  const handleDeliveryPress = (mode) => {
    if (deliveryMode === mode) {
      handleGoToResult();
    } else {
      setDeliveryMode(mode);
    }
  };

  const handleConfirmOrder = () => {
    if (!orderResult) return;
    addOrder({
      id: `NSE-${Date.now().toString(36).toUpperCase()}`,
      result: orderResult,
      userCoords: hasLocation ? { lat: latitude, lng: longitude } : null,
      createdAt: new Date().toISOString(),
      deliveryMode: deliveryMode === 'delivery',
      deliveryStatus: deliveryMode === 'delivery' ? 'searching' : null,
      driverLocation: null,
      cancellationCharged: false,
    });
    setPhase('list');
    setCalcResults(null);
    setSelectedPubs({});
    setDeliveryMode(null);
    setOrderResult(null);
  };

  // ── Fase resultado ────────────────────────────────────────────────────────
  if (phase === 'result' && orderResult) {
    return (
      <ResultView
        result={orderResult}
        deliveryMode={deliveryMode}
        onBack={() => setPhase('list')}
        onConfirm={handleConfirmOrder}
      />
    );
  }

  return (
    <div style={lista.root}>
      {/* ── Input para agregar ─────────────────────────────────── */}
      <div style={lista.inputRow}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un producto (ej: leche, arroz, jabón...)"
          style={lista.input}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          aria-label="Agregar producto"
          style={{
            ...lista.addBtn,
            opacity: inputValue.trim() ? 1 : 0.45,
            cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          <PlusIcon />
        </button>
      </div>

      {items.length === 0 ? (
        <div style={lista.empty}>
          <p style={lista.emptyText}>Tu lista está vacía</p>
          <p style={lista.emptyHint}>Escribe un producto arriba para comenzar</p>
        </div>
      ) : (
        <>
          {/* ── Barra de herramientas ───────────────────────────── */}
          <div style={lista.toolbar}>
            <span style={lista.itemCount}>
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowSaveInput((v) => !v)}
                style={lista.saveBtn}
                title="Guardar lista con un nombre"
              >
                💾 Guardar
              </button>
              <button type="button" onClick={clearList} style={lista.clearBtn}>Limpiar</button>
            </div>
          </div>

          {/* ── Notificación de guardado ────────────────────────── */}
          {saveStatus && (
            <div style={{
              ...lista.saveNotice,
              ...(saveStatus === 'success' ? lista.saveNoticeSuccess : lista.saveNoticeError),
            }}>
              {saveStatus === 'success' ? '✓ Lista guardada correctamente' : '✗ No se pudo guardar la lista'}
            </div>
          )}

          {/* ── Input para guardar lista ─────────────────────────── */}
          {showSaveInput && (
            <div style={lista.saveRow}>
              <input
                type="text"
                value={saveInput}
                onChange={(e) => setSaveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveInput.trim()) {
                    handleSaveList(saveInput.trim());
                    setSaveInput('');
                    setShowSaveInput(false);
                  }
                  if (e.key === 'Escape') setShowSaveInput(false);
                }}
                placeholder="Nombre de la lista (ej: Mercado semanal)"
                style={lista.saveInput}
                autoFocus
              />
              <button
                type="button"
                disabled={!saveInput.trim()}
                onClick={() => {
                  if (!saveInput.trim()) return;
                  handleSaveList(saveInput.trim());
                  setSaveInput('');
                  setShowSaveInput(false);
                }}
                style={{
                  ...lista.saveConfirmBtn,
                  opacity: saveInput.trim() ? 1 : 0.45,
                  cursor: saveInput.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Guardar
              </button>
            </div>
          )}

          {/* ── Lista de ítems ──────────────────────────────────── */}
          <ul style={lista.list}>
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              const pubs = calcResults?.[item.id];
              const hasPubs = pubs && pubs.length > 0;
              const chosenPub = selectedPubs[item.id];
              const chosenPrice = chosenPub?.price ?? null;
              const isChecked = checkedItems.has(item.id);
              const isInteractive = isCalculated && hasPubs;

              return (
                <li key={item.id} style={lista.itemWrap}>
                  {/* Fila principal del ítem */}
                  <div
                    role={isInteractive ? 'button' : undefined}
                    tabIndex={isInteractive ? 0 : undefined}
                    onClick={isInteractive ? () => toggleExpand(item.id) : undefined}
                    onKeyDown={isInteractive ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') toggleExpand(item.id);
                    } : undefined}
                    style={{
                      ...lista.item,
                      ...(isExpanded ? lista.itemExpanded : {}),
                      ...(isInteractive ? { cursor: 'pointer' } : {}),
                    }}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => toggleCheck(item.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      style={lista.checkbox}
                    />

                    {/* Texto del ítem */}
                    <div style={lista.itemText}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                          ...lista.itemName,
                          ...(isChecked ? lista.itemChecked : {}),
                        }}>
                          {item.productName}
                        </span>
                        {isCalculated && hasPubs && (
                          <span style={lista.optionsBadge}>
                            {pubs.length} {pubs.length === 1 ? 'opción' : 'opciones'}
                            <ChevronDownIcon open={isExpanded} />
                          </span>
                        )}
                      </div>
                      {isCalculated && chosenPrice !== null && (
                        <span style={lista.itemBestPrice}>
                          ${chosenPrice.toLocaleString('es-CO')} COP
                          {chosenPub?.store?.name ? ` · ${chosenPub.store.name}` : ''}
                        </span>
                      )}
                      {isCalculated && !hasPubs && (
                        <span style={lista.itemNoPubs}>Sin coincidencias</span>
                      )}
                    </div>

                    {/* Botón eliminar */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                      style={lista.removeBtn}
                      aria-label={`Eliminar ${item.productName}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>

                  {/* Carrusel de publicaciones */}
                  {isExpanded && hasPubs && (
                    <div style={lista.carouselWrap}>
                      <InfiniteHorizontalCarousel
                        publications={pubs}
                        selectedId={chosenPub?.id ?? (pubs[0]?.id ?? 0)}
                        onSelect={(pub) => handleSelectPub(item.id, pub)}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* ── Tarjeta de total ────────────────────────────────── */}
          {isCalculated && Object.keys(selectedPubs).length > 0 && (
            <div style={lista.totalCard}>
              <div style={lista.totalCardInner}>
                <span style={lista.totalLabel}>Total estimado</span>
                <span style={lista.totalValue}>
                  ${total.toLocaleString('es-CO')}
                  <span style={lista.totalCurrency}> COP</span>
                </span>
                <span style={lista.totalSub}>
                  {Object.keys(selectedPubs).length} {Object.keys(selectedPubs).length === 1 ? 'producto elegido' : 'productos elegidos'}
                </span>
              </div>
            </div>
          )}

          {/* ── Botones de modo de entrega ───────────────────────── */}
          {isCalculated && hasSelections && (
            <div style={lista.deliveryBlock}>
              <p style={lista.deliveryLabel}>¿Cómo vas a recibir tus productos?</p>
              <div style={lista.deliveryRow}>
                <button
                  type="button"
                  onClick={() => handleDeliveryPress('delivery')}
                  style={{
                    ...lista.deliveryBtn,
                    ...(deliveryMode === 'delivery' ? lista.deliveryBtnActive : {}),
                  }}
                >
                  🛵 Domicilio
                </button>
                <button
                  type="button"
                  onClick={() => handleDeliveryPress('pickup')}
                  style={{
                    ...lista.deliveryBtn,
                    ...(deliveryMode === 'pickup' ? lista.deliveryBtnActive : {}),
                  }}
                >
                  🚶 Voy yo
                </button>
              </div>
              {deliveryMode && (
                <p style={lista.deliveryHint}>Presiona de nuevo para confirmar</p>
              )}
            </div>
          )}

          {/* ── Error de cálculo ────────────────────────────────── */}
          {calcError && (
            <p style={lista.errorMsg}>{calcError}</p>
          )}
          {coordsError && (
            <p style={lista.errorMsg}>{coordsError}</p>
          )}

          {/* ── Panel de configuración ───────────────────────────── */}
          {showOptimSettings && (
            <OptimSettingsPanel
              prefs={prefs}
              savePrefs={savePrefs}
              coordsAvailable={hasLocation}
              onRequestCoords={requestCoords}
            />
          )}

          {/* ── Fila: Botón optimizar + tuerca ──────────────────── */}
          <div style={lista.calcRow}>
            <button
              type="button"
              onClick={handleCalculate}
              disabled={calculating}
              style={{
                ...lista.calcBtn,
                opacity: calculating ? 0.65 : 1,
                cursor: calculating ? 'not-allowed' : 'pointer',
              }}
            >
              {calculating ? '⏳ Optimizando...' : '✦ Optimizar Lista'}
            </button>
            <button
              type="button"
              onClick={() => setShowOptimSettings((v) => !v)}
              style={{
                ...lista.gearBtn,
                ...(showOptimSettings ? lista.gearBtnActive : {}),
              }}
              title="Configuración de optimización"
              aria-label="Configuración de optimización"
            >
              <GearIcon />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Pestaña Mis Pedidos ───────────────────────────────────────────────────────
function PedidosTab({ orders, removeOrder, updateOrderDelivery }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTotalSum, setShowTotalSum] = useState(false);
  const timerRef = useRef(null);

  const selectedOrder = orders[selectedIdx] ?? null;

  // ── Simulación de estado de domicilio en tiempo real ──────────────────
  useEffect(() => {
    clearTimeout(timerRef.current);
    clearInterval(timerRef.current);

    if (!selectedOrder?.deliveryMode) return;
    const { deliveryStatus, id, userCoords } = selectedOrder;
    if (deliveryStatus === 'cancelled' || deliveryStatus === null) return;

    if (deliveryStatus === 'searching') {
      timerRef.current = setTimeout(() => {
        const center = userCoords ?? { lat: 4.711, lng: -74.0721 };
        updateOrderDelivery(id, {
          deliveryStatus: 'found',
          driverLocation: {
            lat: center.lat + (Math.random() - 0.5) * 0.04,
            lng: center.lng + (Math.random() - 0.5) * 0.04,
          },
        });
      }, 5000);
    } else if (deliveryStatus === 'found') {
      timerRef.current = setTimeout(() => {
        updateOrderDelivery(id, { deliveryStatus: 'en_camino' });
      }, 3000);
    } else if (deliveryStatus === 'en_camino') {
      timerRef.current = setInterval(() => {
        const current = useShoppingListStore.getState().orders.find((o) => o.id === id);
        if (!current?.driverLocation || !current?.userCoords) return;
        const { driverLocation: dl, userCoords: uc } = current;
        updateOrderDelivery(id, {
          driverLocation: {
            lat: dl.lat + (uc.lat - dl.lat) * 0.12 + (Math.random() - 0.5) * 0.0008,
            lng: dl.lng + (uc.lng - dl.lng) * 0.12 + (Math.random() - 0.5) * 0.0008,
          },
        });
      }, 3000);
    }

    return () => {
      clearTimeout(timerRef.current);
      clearInterval(timerRef.current);
    };
  }, [selectedOrder?.id, selectedOrder?.deliveryStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRemove = (id) => {
    removeOrder(id);
    setSelectedIdx((prev) => Math.max(0, prev - 1));
  };

  const handleCancelDelivery = () => {
    if (!selectedOrder) return;
    const charged = selectedOrder.deliveryStatus !== 'searching';
    updateOrderDelivery(selectedOrder.id, {
      deliveryStatus: 'cancelled',
      cancellationCharged: charged,
    });
  };

  if (orders.length === 0) {
    return (
      <div style={pedidos.empty}>
        <p style={pedidos.emptyText}>No tienes pedidos guardados</p>
        <p style={pedidos.emptyHint}>
          Ve a la pestaña <strong>Mi Lista</strong>, configura un pedido y aparecerá aquí.
        </p>
      </div>
    );
  }

  const { result, userCoords } = selectedOrder;
  const date = new Date(selectedOrder.createdAt).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const allProducts = result.stores.flatMap((s) =>
    s.products.map((p) => ({ ...p, storeName: s.store?.name ?? 'Tienda' }))
  );

  return (
    <div style={pedidos.root}>
      {/* ── Carrusel de pedidos ─────────────────────────────────── */}
      <div style={pedidos.carousel}>
        {orders.map((o, i) => {
          const active = i === selectedIdx;
          const d = new Date(o.createdAt);
          const label = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => { setSelectedIdx(i); setShowTotalSum(false); }}
              style={{ ...pedidos.pill, ...(active ? pedidos.pillActive : {}) }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={pedidos.pillId}>#{o.id.slice(-6)}</span>
                {o.deliveryMode && <span title="Domicilio">🛵</span>}
              </span>
              <span style={{ ...pedidos.pillDate, ...(active ? { opacity: 0.85 } : {}) }}>
                {label}
              </span>
              {active && (
                <span style={pedidos.pillTotal}>
                  ${o.result.totalCost.toLocaleString('es-CO')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Header del pedido activo ────────────────────────────── */}
      <div style={pedidos.orderHeader}>
        <div style={pedidos.orderHeaderLeft}>
          <span style={pedidos.orderRef}>#{selectedOrder.id.slice(-8)}</span>
          <span style={pedidos.orderDate}>{date}</span>
        </div>
        <button
          type="button"
          onClick={() => handleRemove(selectedOrder.id)}
          style={pedidos.deleteBtn}
          title="Eliminar pedido"
        >
          <TrashIcon />
        </button>
      </div>

      {/* ── Tarjeta de domicilio ─────────────────────────────────── */}
      {selectedOrder.deliveryMode && (
        <DeliveryCard order={selectedOrder} onCancel={handleCancelDelivery} />
      )}

      {/* ── Totales rápidos ──────────────────────────────────────── */}
      <div style={pedidos.stats}>
        {selectedOrder.deliveryMode && selectedOrder.deliveryStatus === 'en_camino' ? (
          <button
            type="button"
            onClick={() => setShowTotalSum((v) => !v)}
            style={{ ...pedidos.stat, cursor: 'pointer', border: '1px solid var(--accent)', position: 'relative' }}
            title={showTotalSum ? 'Ver desglose' : 'Ver total combinado'}
          >
            {showTotalSum ? (
              <>
                <span style={pedidos.statVal}>${(result.totalCost + DELIVERY_FEE).toLocaleString('es-CO')}</span>
                <span style={pedidos.statLabel}>Total c/ dom.</span>
                <span style={{ fontSize: '9px', color: 'var(--accent)', marginTop: '1px' }}>← desglosar</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2 }}>
                  ${result.totalCost.toLocaleString('es-CO')}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}> + </span>
                  ${DELIVERY_FEE.toLocaleString('es-CO')}
                </span>
                <span style={pedidos.statLabel}>Lista + Domicilio</span>
                <span style={{ fontSize: '9px', color: 'var(--accent)', marginTop: '1px' }}>→ ver total</span>
              </>
            )}
          </button>
        ) : (
          <div style={pedidos.stat}>
            <span style={pedidos.statVal}>${result.totalCost.toLocaleString('es-CO')}</span>
            <span style={pedidos.statLabel}>Total COP</span>
          </div>
        )}
        {result.savings > 0 && (
          <div style={pedidos.stat}>
            <span style={{ ...pedidos.statVal, color: 'var(--success, #16a34a)' }}>{result.savingsPct}%</span>
            <span style={pedidos.statLabel}>Ahorro</span>
          </div>
        )}
        <div style={pedidos.stat}>
          <span style={pedidos.statVal}>{result.stores.length}</span>
          <span style={pedidos.statLabel}>{result.stores.length === 1 ? 'Tienda' : 'Tiendas'}</span>
        </div>
        <div style={pedidos.stat}>
          <span style={pedidos.statVal}>{allProducts.length}</span>
          <span style={pedidos.statLabel}>{allProducts.length === 1 ? 'Producto' : 'Productos'}</span>
        </div>
      </div>

      {/* ── Productos agrupados por tienda ───────────────────────── */}
      <div style={pedidos.productsWrap}>
        {result.stores.map((s, si) => {
          const emoji = getStoreEmoji(s.store?.store_type_id);
          const subtotal = s.products.reduce((a, p) => a + (p.price || 0) * p.item.quantity, 0);
          return (
            <div key={si} style={pedidos.storeBlock}>
              <div style={pedidos.storeBlockHeader}>
                <span>{emoji} {s.store?.name ?? 'Tienda'}</span>
                <span style={{ color: 'var(--accent)', fontSize: '12px' }}>
                  ${subtotal.toLocaleString('es-CO')}
                </span>
              </div>
              <ul style={pedidos.prodList}>
                {s.products.map((p, pi) => (
                  <li key={pi} style={pedidos.prodItem}>
                    <div>
                      <div style={pedidos.prodName}>{p.item.productName}</div>
                      <div style={pedidos.prodMeta}>×{p.item.quantity} · ${p.price.toLocaleString('es-CO')} c/u</div>
                    </div>
                    <span style={pedidos.prodTotal}>
                      ${(p.price * p.item.quantity).toLocaleString('es-CO')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* ── Mapa ─────────────────────────────────────────────────── */}
      <div style={pedidos.mapWrap}>
        <OrderRouteMap
          key={selectedOrder.id}
          stores={result.stores}
          userCoords={userCoords}
          driverLocation={selectedOrder.driverLocation ?? null}
        />
      </div>
    </div>
  );
}

// ─── Sidebar de listas guardadas ──────────────────────────────────────────────
function SavedListsSidebar({ savedLists, onLoad, onDelete, flash }) {
  const isMobile = useIsMobile(680);
  const [isOpen, setIsOpen] = useState(true);

  // Colapsado por defecto en móvil, expandido en desktop
  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  return (
    <aside style={sidebar.root}>
      {/* Header — clickeable en móvil para toggle */}
      <div
        style={{
          ...sidebar.header,
          ...(isMobile ? { cursor: 'pointer', userSelect: 'none' } : {}),
        }}
        onClick={isMobile ? () => setIsOpen((v) => !v) : undefined}
        role={isMobile ? 'button' : undefined}
        tabIndex={isMobile ? 0 : undefined}
        onKeyDown={isMobile ? (e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen((v) => !v); } : undefined}
        aria-expanded={isMobile ? isOpen : undefined}
      >
        <span style={{
          ...sidebar.title,
          ...(flash ? { animation: 'savedFlash 0.8s ease' } : {}),
        }}>
          Listas guardadas
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {savedLists.length > 0 && (
            <span style={sidebar.count}>{savedLists.length}</span>
          )}
          {isMobile && <ChevronDownIcon open={isOpen} />}
        </div>
      </div>

      {/* Contenido colapsable */}
      {isOpen && (
        savedLists.length === 0 ? (
          <div style={sidebar.empty}>
            <span style={sidebar.emptyIcon}>📋</span>
            <p style={sidebar.emptyText}>Sin listas guardadas</p>
            <p style={sidebar.emptyHint}>Guarda tu lista actual con un nombre para encontrarla aquí.</p>
          </div>
        ) : (
          <ul style={sidebar.list}>
            {savedLists.map((sl) => {
              const date = new Date(sl.savedAt).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short',
              });
              return (
                <li key={sl.id} style={sidebar.item}>
                  <button
                    type="button"
                    onClick={() => onLoad(sl.id)}
                    style={sidebar.itemBtn}
                    title={`Cargar "${sl.name}"`}
                  >
                    <span style={sidebar.itemName}>{sl.name}</span>
                    <span style={sidebar.itemMeta}>
                      {sl.items.length} {sl.items.length === 1 ? 'producto' : 'productos'} · {date}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(sl.id)}
                    style={sidebar.deleteBtn}
                    aria-label={`Eliminar lista "${sl.name}"`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )
      )}
    </aside>
  );
}

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

  const tabs = useMemo(() => [
    { key: 'lista', label: 'Mi Lista' },
    { key: 'pedidos', label: 'Mis Pedidos', badge: orders.length },
  ], [orders.length]);

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
        @keyframes savedFlash {
          0%, 100% { color: var(--text-secondary); }
          50% { color: var(--accent); text-shadow: 0 0 10px var(--accent); }
        }
      `}</style>

      {/* ── Cabecera ─────────────────────────────────────────────── */}
      <div style={page.header}>
        <h1 style={page.title}>🛒 {activeTab === 'lista' ? 'Mi Lista de Compras' : 'Mis Pedidos'}</h1>
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
      {activeTab === 'lista' ? (
        <div className="lista-layout">
          {/* Sidebar izquierda */}
          <SavedListsSidebar
            savedLists={savedLists}
            onLoad={loadSavedList}
            onDelete={deleteSavedList}
            flash={savedFlash}
          />
          {/* Lista principal */}
          <ListaTab
            items={items}
            addItem={addItem}
            removeItem={removeItem}
            clearList={clearList}
            saveList={saveList}
            addOrder={addOrder}
            onSaved={handleSaved}
          />
        </div>
      ) : (
        <div style={page.content}>
          <PedidosTab
            orders={orders}
            removeOrder={removeOrder}
            updateOrderDelivery={updateOrderDelivery}
          />
        </div>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const page = {
  header: {
    textAlign: 'center', marginBottom: '16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
  },
  title: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  badge: {
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '999px', fontSize: '12px', fontWeight: 600,
    padding: '3px 12px',
  },
  tabBar: {
    display: 'flex', gap: '4px',
    borderBottom: '2px solid var(--border)',
    marginBottom: '20px',
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px',
    background: 'none', border: 'none',
    borderBottom: '2px solid transparent', marginBottom: '-2px',
    fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)',
    cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
  },
  tabBtnActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
  },
  tabBadge: {
    padding: '1px 7px', borderRadius: '999px',
    background: 'var(--bg-elevated)', color: 'var(--text-muted)',
    fontSize: '11px', fontWeight: 700,
    border: '1px solid var(--border)',
  },
  tabBadgeActive: {
    background: 'var(--accent-soft)', color: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
  content: { maxWidth: '600px', margin: '0 auto', width: '100%' },
};

// ── Lista tab styles ───────────────────────────────────────────────────────────
const lista = {
  root: { display: 'flex', flexDirection: 'column', gap: '10px' },

  inputRow: { display: 'flex', gap: '8px' },
  input: {
    flex: 1, padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-base)', color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '42px', height: '42px', flexShrink: 0,
    borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
  },

  empty: {
    padding: '32px 24px', textAlign: 'center',
    background: 'var(--bg-surface)', border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-md)',
    display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
  },
  emptyText: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  emptyHint: { fontSize: '12px', color: 'var(--text-muted)', margin: 0 },

  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 2px',
  },
  itemCount: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 },
  saveBtn: {
    background: 'none', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px 8px',
  },
  clearBtn: { background: 'none', border: 'none', fontSize: '12px', color: 'var(--error)', cursor: 'pointer', padding: '2px 4px' },

  // Notificación de guardado
  saveNotice: {
    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    fontSize: '12px', fontWeight: 600,
  },
  saveNoticeSuccess: {
    background: 'var(--success-soft, #dcfce7)',
    color: 'var(--success, #16a34a)',
    border: '1px solid var(--success, #16a34a)',
  },
  saveNoticeError: {
    background: 'var(--error-soft, #fee2e2)',
    color: 'var(--error, #dc2626)',
    border: '1px solid var(--error, #dc2626)',
  },

  saveRow: { display: 'flex', gap: '6px' },
  saveInput: {
    flex: 1, padding: '8px 12px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)',
    background: 'var(--bg-base)', color: 'var(--text-primary)',
    fontSize: '13px', outline: 'none',
  },
  saveConfirmBtn: {
    padding: '8px 14px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontSize: '12px', fontWeight: 700, flexShrink: 0,
  },

  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  itemWrap: { display: 'flex', flexDirection: 'column' },
  item: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '10px 12px',
    transition: 'border-color 0.15s',
  },
  itemExpanded: {
    borderColor: 'var(--accent)',
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    borderBottom: 'none',
  },

  // Checkbox
  checkbox: {
    width: '15px', height: '15px', flexShrink: 0,
    accentColor: 'var(--accent)', cursor: 'pointer',
  },

  itemText: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 },
  itemName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' },
  itemChecked: {
    textDecoration: 'line-through',
    color: 'var(--text-muted)',
    fontWeight: 400,
  },
  itemBestPrice: { fontSize: '11px', color: 'var(--accent)', fontWeight: 700 },
  itemNoPubs: { fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' },

  // Badge de opciones inline
  optionsBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '3px',
    padding: '2px 7px',
    borderRadius: '999px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '11px', fontWeight: 600, flexShrink: 0,
  },

  removeBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '5px', borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center', flexShrink: 0,
  },

  carouselWrap: {
    border: '1px solid var(--accent)',
    borderTop: 'none',
    borderBottomLeftRadius: 'var(--radius-md)',
    borderBottomRightRadius: 'var(--radius-md)',
    background: 'var(--bg-elevated)',
    padding: '10px',
    overflow: 'hidden',
  },

  totalCard: {
    background: 'var(--bg-surface)', border: '2px solid var(--accent)',
    borderRadius: 'var(--radius-md)', padding: '12px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  totalCardInner: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
  },
  totalLabel: {
    fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  totalValue: {
    fontSize: '22px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2,
  },
  totalCurrency: { fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' },
  totalSub: { fontSize: '11px', color: 'var(--text-muted)' },

  errorMsg: {
    fontSize: '13px', color: 'var(--error)',
    background: 'var(--error-soft, #fee2e2)',
    padding: '10px 14px', borderRadius: 'var(--radius-sm)', margin: 0,
  },

  deliveryBlock: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    padding: '12px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  deliveryLabel: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 },
  deliveryRow: { display: 'flex', gap: '8px' },
  deliveryBtn: {
    flex: 1, padding: '11px 8px',
    borderRadius: 'var(--radius-md)', border: '2px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s',
  },
  deliveryBtnActive: {
    background: 'var(--accent-soft)', color: 'var(--accent)',
    borderColor: 'var(--accent)', fontWeight: 700,
  },
  deliveryHint: {
    fontSize: '11px', color: 'var(--accent)', margin: 0,
    textAlign: 'center', fontWeight: 600,
  },

  calcRow: {
    display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'stretch',
  },
  calcBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    fontWeight: 800, fontSize: '14px',
  },
  gearBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '44px', flexShrink: 0,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  gearBtnActive: {
    background: 'var(--accent-soft)', color: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
};

// ── Optim settings panel styles ───────────────────────────────────────────────
const optim = {
  panel: {
    background: 'var(--bg-surface)', border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-md)', padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: '14px',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  panelTitle: {
    fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  resetBtn: {
    background: 'none', border: 'none',
    fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer',
    textDecoration: 'underline', padding: 0,
  },
  section: { display: 'flex', flexDirection: 'column', gap: '6px' },
  sectionLabel: {
    fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0,
  },
  sectionHint: {
    fontSize: '11px', color: 'var(--text-muted)', margin: 0,
  },
  segmentRow: {
    display: 'flex', gap: '4px',
  },
  segmentBtn: {
    flex: 1, padding: '7px 4px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s', textAlign: 'center',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  segmentBtnActive: {
    background: 'var(--accent-soft)', color: 'var(--accent)',
    borderColor: 'var(--accent)', fontWeight: 700,
  },
  sliderHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  sliderValue: {
    fontSize: '13px', fontWeight: 800, color: 'var(--accent)',
  },
  sliderWrap: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  slider: {
    flex: 1, accentColor: 'var(--accent)',
    height: '4px', cursor: 'pointer',
  },
  sliderEdge: {
    fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0,
  },
  locationBtn: {
    padding: '7px 12px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    fontSize: '12px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start',
  },
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer',
  },
  toggle: {
    width: '38px', height: '22px',
    borderRadius: '999px',
    position: 'relative', cursor: 'pointer',
    transition: 'background 0.2s', flexShrink: 0,
    border: 'none', outline: 'none',
  },
  toggleThumb: {
    position: 'absolute', top: '3px',
    width: '16px', height: '16px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
};

// ── Carousel styles ────────────────────────────────────────────────────────────
const carousel = {
  // Track unificado: scroll horizontal con carga infinita
  infiniteTrack: {
    display: 'flex', gap: '8px',
    overflowX: 'auto', overflowY: 'hidden',
    paddingBottom: '6px', paddingRight: '4px',
    scrollbarWidth: 'thin',
    scrollSnapType: 'x mandatory',
  },
  loadMoreSentinel: {
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '48px', height: '100%',
    color: 'var(--text-muted)',
    alignSelf: 'center',
  },
  empty: {
    fontSize: '12px', color: 'var(--text-muted)',
    fontStyle: 'italic', padding: '4px 0',
  },
  card: {
    flexShrink: 0,
    width: '150px',
    display: 'flex', flexDirection: 'column', gap: '4px',
    padding: '10px 12px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
    textAlign: 'left', transition: 'border-color 0.15s',
    scrollSnapAlign: 'start',
    boxSizing: 'border-box',
  },
  cardSelected: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 2px var(--accent)',
    background: 'var(--accent-soft, rgba(99,102,241,0.08))',
  },
  bestBadge: {
    fontSize: '10px', fontWeight: 800, color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  selectedBadge: {
    fontSize: '10px', fontWeight: 800, color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  storeName: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  price: { fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' },
  currency: { fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' },
  prodName: { fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  unitQty: {
    fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
};

// ── Pedidos tab styles ─────────────────────────────────────────────────────────
const pedidos = {
  root: { display: 'flex', flexDirection: 'column', gap: '10px' },

  empty: {
    padding: '40px 24px', textAlign: 'center',
    background: 'var(--bg-surface)', border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-md)',
    display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center',
  },
  emptyText: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  emptyHint: { fontSize: '12px', color: 'var(--text-muted)', margin: 0 },

  carousel: {
    display: 'flex', gap: '8px', overflowX: 'auto',
    paddingBottom: '4px', scrollbarWidth: 'none',
  },
  pill: {
    flexShrink: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
    padding: '10px 18px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'var(--bg-surface)',
    cursor: 'pointer', transition: 'all 0.15s', minWidth: '90px',
  },
  pillActive: {
    background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  pillId: { fontSize: '14px', fontWeight: 800, fontFamily: 'monospace' },
  pillDate: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 },
  pillTotal: { fontSize: '11px', fontWeight: 700, marginTop: '2px' },

  orderHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  orderHeaderLeft: { display: 'flex', flexDirection: 'column', gap: '1px' },
  orderRef: { fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' },
  orderDate: { fontSize: '11px', color: 'var(--text-muted)' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
  },

  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px',
  },
  stat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
    padding: '10px 8px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  statVal: { fontSize: '15px', fontWeight: 800, color: 'var(--accent)' },
  statLabel: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },

  productsWrap: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    maxHeight: '320px', overflowY: 'auto',
  },
  storeBlock: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
  },
  storeBlockHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 14px', background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
  },
  prodList: { listStyle: 'none', margin: 0, padding: 0 },
  prodItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px', borderBottom: '1px solid var(--border)',
    fontSize: '13px',
  },
  prodName: { fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' },
  prodMeta: { fontSize: '11px', color: 'var(--text-muted)' },
  prodTotal: { fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '8px' },

  mapWrap: {
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
    border: '1px solid var(--border)',
  },
};

// ── Sidebar styles ─────────────────────────────────────────────────────────────
const sidebar = {
  root: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '12px',
    position: 'sticky', top: '80px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: '8px', borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  count: {
    padding: '1px 7px', borderRadius: '999px',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    fontSize: '11px', fontWeight: 700, border: '1px solid var(--accent)',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    padding: '16px 8px', textAlign: 'center',
  },
  emptyIcon: { fontSize: '24px' },
  emptyText: { fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  emptyHint: { fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  item: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  itemBtn: {
    flex: 1, padding: '8px 10px', background: 'none', border: 'none',
    cursor: 'pointer', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: '2px',
  },
  itemName: { fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 },
  itemMeta: { fontSize: '10px', color: 'var(--text-muted)' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', flexShrink: 0,
  },
};

// ── ResultView styles ──────────────────────────────────────────────────────────
const resv = {
  root: { display: 'flex', flexDirection: 'column', gap: '12px' },
  header: { display: 'flex', flexDirection: 'column', gap: '4px' },
  backBtn: {
    background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
    color: 'var(--accent)', cursor: 'pointer', padding: 0, alignSelf: 'flex-start',
  },
  title: { fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  modeBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '4px 10px', borderRadius: '999px',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    border: '1px solid var(--accent)', fontSize: '12px', fontWeight: 700,
    alignSelf: 'flex-start',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  totalLabel: { fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 },
  totalValue: { fontSize: '18px', fontWeight: 800, color: 'var(--accent)' },
  warning: {
    background: 'var(--warning-soft, #fef9c3)', border: '1px solid var(--warning, #ca8a04)',
    borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)',
  },
  storeList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  storeCard: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
  },
  storeHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 14px', background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
  },
  prodList: { listStyle: 'none', margin: 0, padding: 0 },
  prodItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: '13px',
  },
  prodName: { fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' },
  prodMeta: { fontSize: '11px', color: 'var(--text-muted)' },
  prodTotal: { fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '8px' },
  confirmBtn: {
    padding: '14px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontWeight: 800, fontSize: '15px', cursor: 'pointer', width: '100%',
  },
};
