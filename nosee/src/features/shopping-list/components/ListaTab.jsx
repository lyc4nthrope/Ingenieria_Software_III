import { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimPrefs } from '../hooks/useOptimPrefs';
import { useOptimizeSingleItem } from '../hooks/useOptimizeSingleItem';
import { useGeoLocation } from '@/features/publications/hooks/useGeoLocation';
import * as publicationsApi from '@/services/api/publications.api';
import { OptimSettingsPanel } from './OptimSettingsPanel';
import { InfiniteHorizontalCarousel } from './InfiniteHorizontalCarousel';
import { TrashIcon, PlusIcon, GearIcon, ChevronDownIcon, DELIVERY_FEE, buildResultFromSelections } from '../utils/shoppingListUtils';
import { lista, modeSelection, delivForm } from '../styles/shoppingListStyles';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';
import { createOrder } from '@/services/api/orders.api';

// ─── Pestaña Mi Lista ─────────────────────────────────────────────────────────
export function ListaTab({ items, addItem, removeItem, clearList, saveList, addOrder, onSaved, onConfirmedDelivery, onConfirmedPickup }) {
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

  // Ítems siendo optimizados individualmente (post-cálculo inicial): { [itemId]: true }
  const [optimizingItems, setOptimizingItems] = useState({});

  // Refs para leer valores actuales dentro de efectos sin agregarlos a deps
  const calcResultsRef    = useRef(calcResults);
  const optimizingItemsRef = useRef(optimizingItems);
  useEffect(() => { calcResultsRef.current    = calcResults;    }, [calcResults]);
  useEffect(() => { optimizingItemsRef.current = optimizingItems; }, [optimizingItems]);

  // Publicación seleccionada por ítem: { [itemId]: publication }
  const [selectedPubs, setSelectedPubs] = useState({});

  // Modo de entrega elegido
  const [deliveryMode, setDeliveryMode] = useState(null); // null | 'delivery' | 'pickup'

  // Fase: 'list' | 'result' | 'mode-selection' | 'delivery-form'
  const [phase, setPhase] = useState('list');

  // Modo seleccionado en la pantalla de mode-selection (antes de confirmar)
  const [selectedMode, setSelectedMode] = useState(null);

  // Dirección de domicilio (solo para deliveryMode === 'delivery')
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryName, setDeliveryName] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryApartment, setDeliveryApartment] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [deliveryPaymentMethod, setDeliveryPaymentMethod] = useState('cash'); // 'cash' | 'transfer'
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const updateItem = useShoppingListStore((s) => s.updateItem);

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
    // Si ya está calculado, NO reseteamos — el efecto detecta el ítem nuevo y lo optimiza solo
    if (!isCalculatedRef.current) setCalcResults(null);
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

  // ── Optimización individual (para ítems añadidos post-cálculo) ───────────────
  const { optimizeSingleItem: _optimizeSingleItem } = useOptimizeSingleItem({ prefs, hasLocation, latitude, longitude });

  const optimizeSingleItem = useCallback(async (item) => {
    setOptimizingItems((prev) => ({ ...prev, [item.id]: true }));
    try {
      const { pubs: sorted, bestPub } = await _optimizeSingleItem(item);
      setCalcResults((prev) => prev ? { ...prev, [item.id]: sorted } : { [item.id]: sorted });
      if (bestPub) setSelectedPubs((prev) => ({ ...prev, [item.id]: bestPub }));
    } catch {
      setCalcResults((prev) => prev ? { ...prev, [item.id]: [] } : { [item.id]: [] });
    } finally {
      setOptimizingItems((prev) => { const n = { ...prev }; delete n[item.id]; return n; });
    }
  }, [_optimizeSingleItem]);

  // Cuando la lista ya está calculada y se agrega un ítem nuevo, optimizarlo solo
  const isCalculatedRef = useRef(false);
  useEffect(() => { isCalculatedRef.current = calcResults !== null; }, [calcResults]);

  useEffect(() => {
    if (!isCalculatedRef.current) return;
    const missing = items.filter(
      (item) => !(item.id in calcResultsRef.current) && !optimizingItemsRef.current[item.id]
    );
    missing.forEach((item) => optimizeSingleItem(item));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

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

  const handleConfirmOrder = async (modeOverride) => {
    const isDelivery = (modeOverride ?? deliveryMode) === 'delivery';
    const result = buildResultFromSelections(items, selectedPubs);
    const localId = `NSE-${Date.now().toString(36).toUpperCase()}`;
    const userCoords = hasLocation ? { lat: latitude, lng: longitude } : null;

    setSaving(true);
    setSaveError(null);

    // Guardar en Supabase si es domicilio (el repartidor necesita verlo)
    let supabaseId = null;
    if (isDelivery) {
      const { data: saved, error } = await createOrder({
        userId:          currentUserId,
        localId,
        deliveryMode:    true,
        deliveryAddress: deliveryAddress.trim() || '',
        deliveryCoords:  userCoords,
        stores:          result.stores,
        items:           items,
        totalCost:       result.totalCost,
        savings:         result.savings     ?? 0,
        savingsPct:      result.savingsPct  ?? 0,
        deliveryFee:     DELIVERY_FEE,
        strategy:        'balanced',
      });

      if (error) {
        console.error('[ListaTab] createOrder error:', error.message, error);
        setSaveError(`No se pudo guardar el pedido: ${error.message}. Revisá tu conexión e intentá de nuevo.`);
        setSaving(false);
        return;
      }
      supabaseId = saved?.id ?? null;
    }

    addOrder({
      id:                   localId,
      supabaseId,
      result,
      userCoords,
      createdAt:            new Date().toISOString(),
      deliveryMode:         isDelivery,
      deliveryStatus:       isDelivery ? 'searching' : null,
      driverLocation:       null,
      cancellationCharged:  false,
    });

    setSaving(false);

    if (isDelivery) {
      setPhase('list');
      setCalcResults(null);
      setSelectedPubs({});
      setDeliveryMode(null);
      setDeliveryAddress('');
      setDeliveryName('');
      setDeliveryPhone('');
      setDeliveryApartment('');
      setDeliveryInstructions('');
      setDeliveryPaymentMethod('cash');
      onConfirmedDelivery?.();
    } else {
      setCalcResults(null);
      setSelectedPubs({});
      setDeliveryMode(null);
      onConfirmedPickup?.();
    }
  };

  const handleChangeMode = () => {
    setDeliveryMode(null);
    setCalcResults(null);
    setSelectedPubs({});
    setExpandedId(null);
  };

  // ── Fase "delivery-form" — formulario completo de domicilio ──────────────
  if (phase === 'delivery-form') {
    const deliveryTotal = total + DELIVERY_FEE;
    const canSubmit = deliveryAddress.trim().length > 0 && !saving;

    return (
      <div style={delivForm.root}>
        {/* Header with back button */}
        <div style={delivForm.header}>
          <button type="button" onClick={() => setPhase('mode-selection')} style={delivForm.backBtn}>
            ← Volver
          </button>
          <div style={delivForm.headerRight}>
            <h2 style={delivForm.title}>Información de entrega</h2>
            <span style={delivForm.step}>Paso 2 de 3</span>
          </div>
        </div>

        {/* Form fields */}
        <div style={delivForm.section}>
          <label style={delivForm.label}>Nombre completo *</label>
          <input
            type="text"
            value={deliveryName}
            onChange={(e) => setDeliveryName(e.target.value)}
            placeholder="Ej: María García"
            style={delivForm.input}
          />
        </div>

        <div style={delivForm.section}>
          <label style={delivForm.label}>Teléfono</label>
          <input
            type="tel"
            value={deliveryPhone}
            onChange={(e) => setDeliveryPhone(e.target.value)}
            placeholder="Ej: 300 123 4567"
            style={delivForm.input}
          />
        </div>

        <div style={delivForm.section}>
          <label style={delivForm.label}>Dirección de entrega *</label>
          <input
            type="text"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Ej: Calle 10 # 5-30, Quibdó"
            style={{
              ...delivForm.input,
              ...(saveError && !deliveryAddress.trim() ? delivForm.inputError : {}),
            }}
          />
        </div>

        <div style={delivForm.section}>
          <label style={delivForm.label}>Apartamento / Torre / Edificio</label>
          <input
            type="text"
            value={deliveryApartment}
            onChange={(e) => setDeliveryApartment(e.target.value)}
            placeholder="Ej: Torre B, Piso 4, Apto 401"
            style={delivForm.input}
          />
        </div>

        <div style={delivForm.section}>
          <label style={delivForm.label}>Instrucciones para el repartidor</label>
          <textarea
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            placeholder="Ej: Dejar en la portería, timbre no funciona..."
            rows={3}
            style={delivForm.textarea}
          />
        </div>

        {/* Payment method */}
        <div style={delivForm.section}>
          <label style={delivForm.label}>Método de pago</label>
          <div style={delivForm.paymentOptions}>
            <button
              type="button"
              onClick={() => setDeliveryPaymentMethod('cash')}
              style={{
                ...delivForm.paymentOption,
                ...(deliveryPaymentMethod === 'cash' ? delivForm.paymentOptionActive : {}),
              }}
            >
              <span style={delivForm.paymentIcon}>💵</span>
              <span style={delivForm.paymentLabel}>Efectivo al repartidor</span>
              {deliveryPaymentMethod === 'cash' && <span style={delivForm.paymentCheck}>✓</span>}
            </button>
            <button
              type="button"
              onClick={() => setDeliveryPaymentMethod('transfer')}
              style={{
                ...delivForm.paymentOption,
                ...(deliveryPaymentMethod === 'transfer' ? delivForm.paymentOptionActive : {}),
              }}
            >
              <span style={delivForm.paymentIcon}>📱</span>
              <span style={delivForm.paymentLabel}>Transferencia bancaria</span>
              {deliveryPaymentMethod === 'transfer' && <span style={delivForm.paymentCheck}>✓</span>}
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div style={delivForm.summary}>
          <div style={delivForm.summaryRow}>
            <span style={delivForm.summaryLabel}>Subtotal productos</span>
            <span style={delivForm.summaryValue}>${total.toLocaleString('es-CO')} COP</span>
          </div>
          <div style={delivForm.summaryRow}>
            <span style={delivForm.summaryLabel}>Tarifa de domicilio</span>
            <span style={delivForm.summaryValue}>+${DELIVERY_FEE.toLocaleString('es-CO')} COP</span>
          </div>
          <div style={{ ...delivForm.summaryRow, ...delivForm.summaryTotal }}>
            <span>Total</span>
            <span style={delivForm.summaryTotalValue}>${deliveryTotal.toLocaleString('es-CO')} COP</span>
          </div>
        </div>

        {/* Error */}
        {saveError && (
          <p style={delivForm.error}>{saveError}</p>
        )}
        {!deliveryAddress.trim() && saveError && (
          <p style={delivForm.error}>La dirección de entrega es obligatoria</p>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={() => {
            if (!deliveryAddress.trim()) {
              setSaveError('La dirección de entrega es obligatoria');
              return;
            }
            handleConfirmOrder('delivery');
          }}
          disabled={!canSubmit}
          style={{
            ...delivForm.submitBtn,
            opacity: canSubmit ? 1 : 0.6,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          {saving ? 'Guardando pedido...' : `Confirmar pedido · $${deliveryTotal.toLocaleString('es-CO')} COP`}
        </button>
      </div>
    );
  }

  // ── Fase "mode-selection" — pantalla de selección de modo ────────────────
  if (phase === 'mode-selection') {
    return (
      <div style={modeSelection.root}>
        {/* header */}
        <div style={modeSelection.header}>
          <h2 style={modeSelection.title}>¿Cómo querés recibir tu pedido?</h2>
          <p style={modeSelection.subtitle}>Visitá una tienda o pedí envío a domicilio</p>
        </div>

        {/* option cards */}
        <div style={modeSelection.optionsWrap}>
          {/* Delivery card */}
          <button
            type="button"
            onClick={() => setSelectedMode('delivery')}
            style={{
              ...modeSelection.optionCard,
              ...(selectedMode === 'delivery' ? modeSelection.optionCardActive : {}),
            }}
          >
            <div style={modeSelection.optionLeft}>
              <span style={modeSelection.optionIcon}>🛵</span>
              <div style={modeSelection.optionBody}>
                <span style={modeSelection.optionTitle}>Domicilio</span>
                <span style={modeSelection.optionDesc}>Recibí tus productos en la puerta de tu casa</span>
                <span style={modeSelection.optionBadge}>Estimado 1-2 horas · +${DELIVERY_FEE.toLocaleString('es-CO')}</span>
              </div>
            </div>
            {selectedMode === 'delivery' && <span style={modeSelection.checkmark}>✓</span>}
          </button>

          {/* Voy yo card */}
          <button
            type="button"
            onClick={() => setSelectedMode('pickup')}
            style={{
              ...modeSelection.optionCard,
              ...(selectedMode === 'pickup' ? modeSelection.optionCardActive : {}),
            }}
          >
            <div style={modeSelection.optionLeft}>
              <span style={modeSelection.optionIcon}>🚶</span>
              <div style={modeSelection.optionBody}>
                <span style={modeSelection.optionTitle}>Voy yo</span>
                <span style={modeSelection.optionDesc}>Planeá tu ruta con el mapa de tiendas y ahorros optimizados</span>
                <span style={modeSelection.optionBadge}>Sin costo extra · mapa incluido</span>
              </div>
            </div>
            {selectedMode === 'pickup' && <span style={modeSelection.checkmark}>✓</span>}
          </button>
        </div>

        {/* total summary */}
        {hasSelections && (
          <div style={modeSelection.totalRow}>
            <span style={modeSelection.totalLabel}>Total estimado</span>
            <span style={modeSelection.totalValue}>
              ${(total + (selectedMode === 'delivery' ? DELIVERY_FEE : 0)).toLocaleString('es-CO')}
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}> COP</span>
            </span>
          </div>
        )}

        {/* actions */}
        <div style={modeSelection.actions}>
          <button
            type="button"
            onClick={() => { setSelectedMode(null); setPhase('list'); }}
            style={modeSelection.cancelBtn}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedMode}
            onClick={() => {
              if (selectedMode === 'delivery') {
                setDeliveryMode('delivery');
                setPhase('delivery-form');
              } else {
                setDeliveryMode('pickup');
                handleConfirmOrder('pickup');
              }
            }}
            style={{
              ...modeSelection.continueBtn,
              opacity: selectedMode ? 1 : 0.45,
              cursor: selectedMode ? 'pointer' : 'not-allowed',
            }}
          >
            {selectedMode === 'delivery' ? 'Continuar con domicilio' : selectedMode === 'pickup' ? 'Ver ruta de compra' : 'Continuar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={lista.root}>
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

          {/* ── Summary bar (solo post-optimización) ───────────── */}
          {isCalculated && hasSelections && (
            <div style={lista.summaryBar}>
              <div style={lista.summaryLeft}>
                <span style={lista.summaryTitle}>Resumen</span>
                <span style={lista.summaryCount}>
                  {Object.keys(selectedPubs).length} {Object.keys(selectedPubs).length === 1 ? 'producto' : 'productos'}
                </span>
              </div>
              <div>
                <span style={lista.summaryTotal}>
                  ${total.toLocaleString('es-CO')}
                </span>
                <span style={lista.summaryTotalCurrency}> COP</span>
              </div>
            </div>
          )}

          {/* ── Info banner (solo post-optimización) ────────────── */}
          {isCalculated && (
            <div style={lista.infoBanner}>
              Seleccionamos las mejores opciones. Tocá un producto para ver alternativas y elegir la que más te convenga.
            </div>
          )}

          {/* ── Lista de ítems ──────────────────────────────────── */}
          <ul style={lista.list}>
            {items.map((item) => {
              const isExpanded          = expandedId === item.id;
              const isOptimizingThis    = !!optimizingItems[item.id];
              const pubs                = calcResults?.[item.id];
              const hasPubs             = pubs && pubs.length > 0;
              const chosenPub           = selectedPubs[item.id];
              const chosenPrice         = chosenPub?.price ?? null;

              if (isCalculated) {
                return (
                  <li key={item.id} style={lista.optimItemWrap}>
                    {/* Fila principal — card de producto optimizado (toda la fila es clickeable) */}
                    <div
                      role={hasPubs ? 'button' : undefined}
                      tabIndex={hasPubs ? 0 : undefined}
                      aria-expanded={hasPubs ? isExpanded : undefined}
                      aria-label={hasPubs ? `${isExpanded ? 'Ocultar' : 'Ver'} opciones de ${item.productName}` : undefined}
                      onClick={hasPubs ? () => toggleExpand(item.id) : undefined}
                      onKeyDown={hasPubs ? (e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(item.id); } : undefined}
                      style={{
                        ...lista.optimItemRow,
                        ...(isExpanded ? lista.optimItemRowExpanded : {}),
                        cursor: hasPubs ? 'pointer' : 'default',
                      }}
                    >
                      {/* Avatar circular — imagen de la publicación o inicial */}
                      <div style={lista.optimItemAvatar}>
                        {chosenPub?.photo_url ? (
                          <img
                            src={chosenPub.photo_url}
                            alt={item.productName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <span style={{ display: chosenPub?.photo_url ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                          {item.productName.charAt(0)}
                        </span>
                      </div>

                      {/* Cuerpo */}
                      <div style={lista.optimItemBody}>
                        <span style={lista.optimItemName}>{item.productName}</span>
                        <div style={lista.optimItemMeta}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                              style={lista.qtyBtn}
                              aria-label="Reducir cantidad"
                            >
                              −
                            </button>
                            <span style={lista.qtyValue}>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                              style={lista.qtyBtn}
                              aria-label="Aumentar cantidad"
                            >
                              +
                            </button>
                          </div>
                          {isOptimizingThis && (
                            <span style={{ color: 'var(--accent)', fontStyle: 'italic' }}>⏳ Optimizando...</span>
                          )}
                          {!isOptimizingThis && hasPubs && chosenPub?.store?.name && (
                            <span>{chosenPub.store.name}</span>
                          )}
                          {!isOptimizingThis && !hasPubs && pubs !== undefined && (
                            <span style={{ fontStyle: 'italic' }}>Sin coincidencias</span>
                          )}
                        </div>
                      </div>

                      {/* Precio + acciones */}
                      <div style={lista.optimItemRight}>
                        {!isOptimizingThis && hasPubs && chosenPrice !== null && (
                          <div style={{ textAlign: 'right' }}>
                            <div style={lista.optimItemPrice}>
                              ${(chosenPrice * item.quantity).toLocaleString('es-CO')}
                            </div>
                            <div style={lista.optimItemPriceSub}>{item.quantity > 1 ? `${item.quantity} × $${chosenPrice.toLocaleString('es-CO')}` : 'COP'}</div>
                          </div>
                        )}
                        <div style={lista.optimItemActions}>
                          {/* Chevron — solo indicador visual, el click lo maneja la fila entera */}
                          {hasPubs && !isOptimizingThis && (
                            <div
                              aria-hidden="true"
                              style={{
                                ...lista.optimChevronBtn,
                                ...(isExpanded ? lista.optimChevronBtnActive : {}),
                                pointerEvents: 'none',
                              }}
                            >
                              <ChevronDownIcon open={isExpanded} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                          style={lista.removeBtnLarge}
                          aria-label={`Eliminar ${item.productName}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
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
              }

              // Estado pre-optimización: fila simple
              return (
                <li key={item.id} style={lista.itemWrap}>
                  <div style={lista.item}>
                    <div style={lista.itemText}>
                      <span style={lista.itemName}>{item.productName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      style={lista.removeBtn}
                      aria-label={`Eliminar ${item.productName}`}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* ── Dirección de entrega (solo domicilio) ────────────── */}
          {isCalculated && hasSelections && deliveryMode === 'delivery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                Dirección de entrega
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Ej: Calle 10 # 5-30, Quibdó"
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: 14,
                  background: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}

          {/* ── Error al guardar ─────────────────────────────────── */}
          {saveError && (
            <p style={{ ...lista.errorMsg, background: 'var(--error-soft)', color: 'var(--error)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', margin: 0, fontSize: 13 }}>
              {saveError}
            </p>
          )}

          {/* ── CTA: elegir modo (si aún no hay modo) ───────────── */}
          {isCalculated && hasSelections && deliveryMode === null && (
            <button
              type="button"
              onClick={() => setPhase('mode-selection')}
              style={lista.proceedBtn}
            >
              ✦ Elegir cómo recibir mi pedido
            </button>
          )}

          {/* ── Botón de confirmación (cuando ya hay modo elegido) ── */}
          {isCalculated && hasSelections && deliveryMode && (
            <button
              type="button"
              onClick={handleConfirmOrder}
              disabled={saving}
              style={{ ...lista.confirmBtn, opacity: saving ? 0.7 : 1 }}
            >
              {saving
                ? 'Guardando pedido...'
                : deliveryMode === 'delivery'
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
              disabled={calculating || items.length === 0}
              style={{
                ...lista.calcBtn,
                opacity: (calculating || items.length === 0) ? 0.45 : 1,
                cursor: (calculating || items.length === 0) ? 'not-allowed' : 'pointer',
              }}
            >
              {calculating ? '⏳ Optimizando...' : '✦ Optimizar lista'}
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
