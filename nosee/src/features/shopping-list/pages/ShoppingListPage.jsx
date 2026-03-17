/**
 * ShoppingListPage.jsx — Proceso 3 (rediseño con pestañas)
 *
 * Pestaña "Mi Lista":
 *   - Input de texto para agregar productos manualmente
 *   - Lista de ítems con eliminación individual
 *   - Botón "Calcular canasta óptima" — busca coincidencias por producto
 *   - Tras calcular: cada ítem es expandible y muestra carrusel de coincidencias
 *   - Botón "Configurar pedido" para el flujo completo (CreateOrderPage)
 *
 * Pestaña "Mis Pedidos":
 *   - Carrusel de pedidos guardados
 *   - Detalle del pedido seleccionado + tarjeta de domicilio + mapa
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';
import { useLanguage } from '@/contexts/LanguageContext';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import * as publicationsApi from '@/services/api/publications.api';
import PublicationDetailModal from '@/features/publications/components/PublicationDetailModal';

// ─── Iconos ───────────────────────────────────────────────────────────────────
const TrashIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="3,6 5,6 21,6" /><path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const ChevronDownIcon = ({ open }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"
    style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <polyline points="6,9 12,15 18,9" />
  </svg>
);

// Tarifa estimada de domicilio — placeholder hasta implementar Proceso 4
const DELIVERY_FEE = 8_000; // COP

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

// ─── Carrusel de publicaciones por ítem ───────────────────────────────────────
const PAGE_SIZE = 8;

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 640);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return mobile;
}

function CarouselCard({ pub, globalIdx, isSelected, onSelect, onOpenDetail }) {
  const isBest = globalIdx === 0;
  const storeEmoji = Number(pub.store?.store_type_id) === 2 ? '🌐' : '🏪';
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(pub)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(pub); }}
      style={{ ...carousel.card, ...(isSelected ? carousel.cardSelected : {}), cursor: 'pointer' }}
    >
      {isBest && <span style={carousel.bestBadge}>★ Mejor Opción</span>}
      {isSelected && <span style={carousel.selectedBadge}>✓ Seleccionado</span>}
      <span style={carousel.storeName}>{storeEmoji} {pub.store?.name ?? 'Tienda'}</span>
      <span style={carousel.price}>
        ${(pub.price ?? 0).toLocaleString('es-CO')}
        <span style={carousel.currency}> COP</span>
      </span>
      <span style={carousel.prodName}>{pub.productName ?? pub.product_name ?? '—'}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpenDetail(pub); }}
        style={carousel.detailBtn}
      >
        Ver detalle →
      </button>
    </div>
  );
}

function PublicationsCarousel({ publications, selectedId, onSelect, onOpenDetail }) {
  const [page, setPage] = useState(0);
  const isMobile = useIsMobile();

  if (!publications || publications.length === 0) {
    return <div style={carousel.empty}>Sin coincidencias encontradas para este producto.</div>;
  }

  // ── Mobile: scroll horizontal libre ──────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={carousel.mobileTrack}>
        {publications.map((pub, idx) => (
          <CarouselCard
            key={pub.id ?? idx}
            pub={pub}
            globalIdx={idx}
            isSelected={(pub.id ?? idx) === selectedId}
            onSelect={onSelect}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>
    );
  }

  // ── Desktop: paginación de 8 ─────────────────────────────────────────────────
  const totalPages = Math.ceil(publications.length / PAGE_SIZE);
  const start = page * PAGE_SIZE;
  const visible = publications.slice(start, start + PAGE_SIZE);
  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={carousel.track}>
        {visible.map((pub, idx) => (
          <CarouselCard
            key={pub.id ?? (start + idx)}
            pub={pub}
            globalIdx={start + idx}
            isSelected={(pub.id ?? (start + idx)) === selectedId}
            onSelect={onSelect}
            onOpenDetail={onOpenDetail}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <div style={carousel.navBar}>
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => setPage(p => p - 1)}
            style={{ ...carousel.arrowBtn, opacity: canPrev ? 1 : 0.3 }}
            aria-label="Opciones anteriores"
          >
            ‹
          </button>
          <span style={carousel.pageInfo}>
            {start + 1}–{Math.min(start + PAGE_SIZE, publications.length)} de {publications.length}
          </span>
          <button
            type="button"
            disabled={!canNext}
            onClick={() => setPage(p => p + 1)}
            style={{ ...carousel.arrowBtn, opacity: canNext ? 1 : 0.3 }}
            aria-label="Más opciones"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Construir resultado desde selecciones manuales ───────────────────────────
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

// ─── Vista Resultado de Optimización ──────────────────────────────────────────
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
          const emoji = Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪';
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
function ListaTab({ items, addItem, removeItem, clearList, saveList, addOrder }) {
  const [inputValue, setInputValue] = useState('');
  const [saveInput, setSaveInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  // Resultados del cálculo: { [itemId]: publications[] }
  const [calcResults, setCalcResults] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState(null);

  // Publicación seleccionada por ítem: { [itemId]: publication }
  const [selectedPubs, setSelectedPubs] = useState({});

  // Modo de entrega elegido antes de confirmar
  const [deliveryMode, setDeliveryMode] = useState(null); // null | 'delivery' | 'pickup'

  // Fase: 'list' = lista normal, 'result' = resultado de optimización
  const [phase, setPhase] = useState('list');
  const [orderResult, setOrderResult] = useState(null);

  // Ítem expandido (muestra carrusel)
  const [expandedId, setExpandedId] = useState(null);

  // Modal de detalle de publicación
  const [detailPub, setDetailPub] = useState(null);

  const inputRef = useRef(null);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    addItem(trimmed, 1);
    setInputValue('');
    setCalcResults(null); // reset cálculo al agregar nuevo ítem
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  const handleRemove = (id) => {
    removeItem(id);
    setCalcResults((prev) => { if (!prev) return prev; const n = { ...prev }; delete n[id]; return n; });
    setSelectedPubs((prev) => { const n = { ...prev }; delete n[id]; return n; });
    if (expandedId === id) setExpandedId(null);
  };

  const handleCalculate = useCallback(async () => {
    if (items.length === 0) return;
    setCalculating(true);
    setCalcError(null);
    setCalcResults(null);
    setExpandedId(null);

    try {
      const results = await Promise.all(
        items.map(async (item) => {
          const res = await publicationsApi.getPublications({
            productName: item.productName,
            sortBy: 'cheapest',
            limit: 10,
          });
          const pubs = res.success ? (res.data ?? []) : [];
          // Ordenar de más barato a más caro
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
  }, [items]);

  const toggleExpand = (id) => {
    if (!calcResults) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSelectPub = (itemId, pub) => {
    setSelectedPubs((prev) => ({ ...prev, [itemId]: pub }));
  };

  const isCalculated = calcResults !== null;
  const hasSelections = Object.keys(selectedPubs).length > 0;

  // Total basado en las opciones seleccionadas
  const total = isCalculated
    ? Object.values(selectedPubs).reduce((sum, pub) => sum + (pub?.price ?? 0), 0)
    : 0;

  const handleGoToResult = () => {
    const result = buildResultFromSelections(items, selectedPubs);
    setOrderResult(result);
    setPhase('result');
  };

  const handleConfirmOrder = () => {
    if (!orderResult) return;
    addOrder({
      id: `NSE-${Date.now().toString(36).toUpperCase()}`,
      result: orderResult,
      userCoords: null,
      createdAt: new Date().toISOString(),
      deliveryMode: deliveryMode === 'delivery',
      deliveryStatus: deliveryMode === 'delivery' ? 'searching' : null,
      driverLocation: null,
      cancellationCharged: false,
    });
    // Resetear estado
    setPhase('list');
    setCalcResults(null);
    setSelectedPubs({});
    setDeliveryMode(null);
    setOrderResult(null);
  };

  // ── Fase resultado ───────────────────────────────────────────────────────
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
          style={{
            ...lista.addBtn,
            opacity: inputValue.trim() ? 1 : 0.45,
            cursor: inputValue.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          <PlusIcon /> Agregar
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

          {/* ── Input para guardar lista ────────────────────────── */}
          {showSaveInput && (
            <div style={lista.saveRow}>
              <input
                type="text"
                value={saveInput}
                onChange={(e) => setSaveInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && saveInput.trim()) {
                    saveList(saveInput);
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
                  saveList(saveInput);
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

              return (
                <li key={item.id} style={lista.itemWrap}>
                  {/* Fila principal del ítem */}
                  <div
                    style={{
                      ...lista.item,
                      ...(isExpanded ? lista.itemExpanded : {}),
                    }}
                  >
                    <div style={lista.itemText}>
                      <span style={lista.itemName}>{item.productName}</span>
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

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      {isCalculated && hasPubs && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          style={lista.expandBtn}
                          title={isExpanded ? 'Ocultar opciones' : 'Ver opciones'}
                        >
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>
                            {pubs.length} {pubs.length === 1 ? 'opción' : 'opciones'}
                          </span>
                          <ChevronDownIcon open={isExpanded} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        style={lista.removeBtn}
                        aria-label={`Eliminar ${item.productName}`}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>

                  {/* Carrusel de coincidencias */}
                  {isExpanded && (
                    <div style={lista.carouselWrap}>
                      <PublicationsCarousel
                        publications={pubs}
                        selectedId={chosenPub?.id ?? (pubs[0]?.id ?? 0)}
                        onSelect={(pub) => handleSelectPub(item.id, pub)}
                        onOpenDetail={setDetailPub}
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

          {/* ── Botones de modo de entrega + Confirmar ──────────── */}
          {isCalculated && hasSelections && (
            <div style={lista.deliveryBlock}>
              <p style={lista.deliveryLabel}>¿Cómo vas a recibir tus productos?</p>
              <div style={lista.deliveryRow}>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('delivery')}
                  style={{
                    ...lista.deliveryBtn,
                    ...(deliveryMode === 'delivery' ? lista.deliveryBtnActive : {}),
                  }}
                >
                  🛵 Domicilio
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryMode('pickup')}
                  style={{
                    ...lista.deliveryBtn,
                    ...(deliveryMode === 'pickup' ? lista.deliveryBtnActive : {}),
                  }}
                >
                  🚶 Voy yo
                </button>
                <button
                  type="button"
                  onClick={handleGoToResult}
                  disabled={!deliveryMode}
                  style={{
                    ...lista.confirmBtn,
                    opacity: deliveryMode ? 1 : 0.4,
                    cursor: deliveryMode ? 'pointer' : 'not-allowed',
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}

          {/* ── Error de cálculo ────────────────────────────────── */}
          {calcError && (
            <p style={lista.errorMsg}>{calcError}</p>
          )}

          {/* ── Botón calcular canasta ──────────────────────────── */}
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

        </>
      )}

      {/* ── Modal de detalle de publicación ──────────────────────── */}
      {detailPub && (
        <PublicationDetailModal
          publication={detailPub}
          onClose={() => setDetailPub(null)}
        />
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
          const emoji = Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪';
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
function SavedListsSidebar({ savedLists, onLoad, onDelete }) {
  return (
    <aside style={sidebar.root}>
      <div style={sidebar.header}>
        <span style={sidebar.title}>Listas guardadas</span>
        {savedLists.length > 0 && (
          <span style={sidebar.count}>{savedLists.length}</span>
        )}
      </div>

      {savedLists.length === 0 ? (
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

  const TABS = [
    { key: 'lista', label: 'Mi Lista' },
    { key: 'pedidos', label: 'Mis Pedidos', badge: orders.length },
  ];

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
        {TABS.map((tab) => (
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
          />
          {/* Lista principal */}
          <ListaTab
            items={items}
            addItem={addItem}
            removeItem={removeItem}
            clearList={clearList}
            saveList={saveList}
            addOrder={addOrder}
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
    display: 'flex', alignItems: 'center', gap: '5px',
    padding: '10px 16px',
    borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontSize: '13px', fontWeight: 700, flexShrink: 0,
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
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '10px 12px',
    transition: 'border-color 0.15s',
  },
  itemExpanded: {
    borderColor: 'var(--accent)',
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    borderBottom: 'none',
  },
  itemText: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  itemName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' },
  itemBestPrice: { fontSize: '11px', color: 'var(--accent)', fontWeight: 700 },
  itemNoPubs: { fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' },

  expandBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '4px 8px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px',
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
  deliveryRow: { display: 'flex', gap: '6px' },
  deliveryBtn: {
    flex: 1, padding: '10px 8px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s',
  },
  deliveryBtnActive: {
    background: 'var(--accent-soft)', color: 'var(--accent)',
    borderColor: 'var(--accent)', fontWeight: 700,
  },
  confirmBtn: {
    flex: 1, padding: '10px 8px',
    borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontSize: '13px', fontWeight: 800,
  },

  calcBtn: {
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    fontWeight: 800, fontSize: '14px', width: '100%', marginTop: '4px',
  },

  separator: {
    borderTop: '1px dashed var(--border)', margin: '4px 0',
  },

  orderBtn: {
    padding: '12px',
    borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontWeight: 800, fontSize: '14px', textAlign: 'center', width: '100%',
  },
};

// ── Carousel styles ────────────────────────────────────────────────────────────
const carousel = {
  // Desktop: fila estática sin overflow, centrada
  track: {
    display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center',
  },
  // Mobile: scroll horizontal libre
  mobileTrack: {
    display: 'flex', gap: '8px',
    overflowX: 'auto', paddingBottom: '6px',
    scrollbarWidth: 'thin',
  },
  // Barra de navegación (solo desktop, cuando hay >6 opciones)
  navBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    paddingTop: '2px',
  },
  arrowBtn: {
    width: '28px', height: '28px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '18px', lineHeight: 1, fontWeight: 700,
    color: 'var(--text-primary)',
    padding: 0,
  },
  pageInfo: {
    fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500,
  },
  empty: {
    fontSize: '12px', color: 'var(--text-muted)',
    fontStyle: 'italic', padding: '4px 0',
  },
  card: {
    flexShrink: 0, minWidth: '150px', maxWidth: '180px',
    display: 'flex', flexDirection: 'column', gap: '4px',
    padding: '10px 12px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
    textAlign: 'left', transition: 'border-color 0.15s',
  },
  cardBest: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-soft, rgba(var(--accent-rgb,99,102,241),0.06))',
  },
  bestBadge: {
    fontSize: '10px', fontWeight: 800, color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  storeName: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 },
  price: { fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' },
  currency: { fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' },
  prodName: { fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3 },
  cardSelected: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 2px var(--accent)',
    background: 'var(--accent-soft, rgba(99,102,241,0.08))',
  },
  selectedBadge: {
    fontSize: '10px', fontWeight: 800, color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  detailBtn: {
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'none',
    color: 'var(--accent)',
    fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0,
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
  title: { fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' },
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
