import { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimPrefs } from '../hooks/useOptimPrefs';
import { useGeoLocation } from '@/features/publications/hooks/useGeoLocation';
import * as publicationsApi from '@/services/api/publications.api';
import { OptimSettingsPanel } from './OptimSettingsPanel';
import { InfiniteHorizontalCarousel } from './InfiniteHorizontalCarousel';
import { VoyYoMapView } from './VoyYoMapView';
import { TrashIcon, PlusIcon, GearIcon, ChevronDownIcon, buildResultFromSelections } from '../utils/shoppingListUtils';
import { lista } from '../styles/shoppingListStyles';

// ─── Pestaña Mi Lista ─────────────────────────────────────────────────────────
export function ListaTab({ items, addItem, removeItem, clearList, saveList, addOrder, onSaved, onStartDeliveryCheckout, onConfirmedPickup }) {
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

  const calcRequestRef = useRef(0);

  const handleCalculate = useCallback(async () => {
    if (items.length === 0) return;

    const requestId = ++calcRequestRef.current;

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

      // Descartar resultados de requests obsoletas
      if (requestId !== calcRequestRef.current) return;

      const resultsMap = Object.fromEntries(results);
      setCalcResults(resultsMap);
      // Pre-seleccionar la mejor opción (índice 0) para cada ítem
      const defaults = {};
      for (const [id, pubs] of results) {
        if (pubs.length > 0) defaults[id] = pubs[0];
      }
      setSelectedPubs(defaults);
    } catch {
      if (requestId !== calcRequestRef.current) return;
      setCalcError('Error al calcular la canasta. Intentá nuevamente.');
    } finally {
      if (requestId === calcRequestRef.current) setCalculating(false);
    }
  }, [items, prefs, hasLocation, latitude, longitude]);

  const toggleExpand = (id) => {
    if (!calcResults) return;
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSelectPub = (itemId, pub) => {
    setSelectedPubs((prev) => ({ ...prev, [itemId]: pub }));
  };

  const isCalculated = calcResults !== null;
  const hasSelections = Object.keys(selectedPubs).length > 0;

  const total = isCalculated
    ? Object.values(selectedPubs).reduce((sum, pub) => sum + (pub?.price ?? 0), 0)
    : 0;

  const handleConfirmOrder = () => {
    const isDelivery = deliveryMode === 'delivery';
    const result = buildResultFromSelections(items, selectedPubs);
    const userCoords = hasLocation ? { lat: latitude, lng: longitude } : null;

    if (isDelivery) {
      // Pasar al flujo de checkout en Mis Pedidos (dirección + pago + mapa)
      onStartDeliveryCheckout?.({ result, items, userCoords });
      setCalcResults(null);
      setSelectedPubs({});
      setDeliveryMode(null);
      setOrderResult(null);
      return;
    }

    // Voy Yo: guardar localmente y mostrar vista de mapa
    const localId = `NSE-${Date.now().toString(36).toUpperCase()}`;
    addOrder({
      id:                  localId,
      supabaseId:          null,
      result,
      userCoords,
      createdAt:           new Date().toISOString(),
      deliveryMode:        false,
      deliveryStatus:      null,
      driverLocation:      null,
      cancellationCharged: false,
    });
    setOrderResult(result);
    setPhase('pickup');
  };

  const handleChangeMode = () => {
    setDeliveryMode(null);
    setCalcResults(null);
    setSelectedPubs({});
    setExpandedId(null);
  };

  // ── Fase "Voy yo" — vista lista + mapa ───────────────────────────────────
  if (phase === 'pickup' && orderResult) {
    const pickupCoords = hasLocation ? { lat: latitude, lng: longitude } : null;
    const resetAll = () => {
      setPhase('list');
      setCalcResults(null);
      setSelectedPubs({});
      setDeliveryMode(null);
      setOrderResult(null);
      onConfirmedPickup?.();
    };
    return <VoyYoMapView result={orderResult} userCoords={pickupCoords} onDone={resetAll} />;
  }

  return (
    <div style={lista.root}>
      {/* ── Selector de modo — encima del buscador ─────────────── */}
      {!isCalculated && (
        <div style={lista.modeBlock}>
          <p style={lista.modeLabel}>¿Cómo vas a recibir tus productos?</p>
          <div style={lista.modeRow}>
            <button
              type="button"
              onClick={() => setDeliveryMode('delivery')}
              style={{ ...lista.modeCard, ...(deliveryMode === 'delivery' ? lista.modeCardActive : {}) }}
            >
              <span style={lista.modeCardIcon}>🛵</span>
              <span style={lista.modeCardName}>Domicilio</span>
              <span style={lista.modeCardDesc}>Te lo llevamos a tu puerta</span>
              <span style={lista.modeCardFee}>+${DELIVERY_FEE.toLocaleString('es-CO')} aprox.</span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMode('pickup')}
              style={{ ...lista.modeCard, ...(deliveryMode === 'pickup' ? lista.modeCardActive : {}) }}
            >
              <span style={lista.modeCardIcon}>🚶</span>
              <span style={lista.modeCardName}>Voy yo</span>
              <span style={lista.modeCardDesc}>Tú recoges en tienda</span>
              <span style={lista.modeCardFee}>Sin costo extra · mapa incluido</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Badge de modo activo (post-optimización) ─────────────── */}
      {isCalculated && deliveryMode && (
        <div style={lista.modeBadgeBar}>
          <span style={lista.modeBadgeText}>
            {deliveryMode === 'delivery' ? '🛵 Domicilio' : '🚶 Voy yo'}
          </span>
          <button type="button" onClick={handleChangeMode} style={lista.modeBadgeChange}>
            Cambiar modo
          </button>
        </div>
      )}

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
              const isInteractive = isCalculated && hasPubs;

              return (
                <li key={item.id} style={lista.itemWrap}>
                  {/* Fila principal del ítem */}
                  <div
                    role={isInteractive ? 'button' : undefined}
                    tabIndex={isInteractive ? 0 : undefined}
                    aria-expanded={isInteractive ? isExpanded : undefined}
                    aria-label={isInteractive ? `${isExpanded ? 'Ocultar' : 'Ver'} opciones de ${item.productName}` : undefined}
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
                    {/* Texto del ítem */}
                    <div style={lista.itemText}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={lista.itemName}>
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

          {/* ── Tarjeta de total ─────────────────────────────────── */}
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

          {/* ── Botón de confirmación único ──────────────────────── */}
          {isCalculated && hasSelections && deliveryMode && (
            <button
              type="button"
              onClick={handleConfirmOrder}
              style={lista.confirmBtn}
            >
              {deliveryMode === 'delivery'
                ? `🛵 Confirmar pedido — $${total.toLocaleString('es-CO')} COP`
                : `🚶 Ver ruta de compra — $${total.toLocaleString('es-CO')} COP`}
            </button>
          )}

          {/* ── Error de cálculo ────────────────────────────────── */}
          {calcError && <p style={lista.errorMsg}>{calcError}</p>}
          {coordsError && <p style={lista.errorMsg}>{coordsError}</p>}

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
              disabled={calculating || !deliveryMode}
              style={{
                ...lista.calcBtn,
                opacity: (calculating || !deliveryMode) ? 0.45 : 1,
                cursor: (calculating || !deliveryMode) ? 'not-allowed' : 'pointer',
              }}
            >
              {calculating
                ? '⏳ Optimizando...'
                : !deliveryMode
                  ? '✦ Elige cómo recibirás primero'
                  : deliveryMode === 'delivery'
                    ? '✦ Optimizar para domicilio'
                    : '✦ Optimizar mi ruta de compra'}
            </button>
            <button
              type="button"
              onClick={() => setShowOptimSettings((v) => !v)}
              style={{ ...lista.gearBtn, ...(showOptimSettings ? lista.gearBtnActive : {}) }}
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
