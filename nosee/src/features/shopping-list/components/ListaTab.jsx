import { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimPrefs } from '../hooks/useOptimPrefs';
import { useOptimizeSingleItem } from '../hooks/useOptimizeSingleItem';
import { useGeoLocation } from '@/features/publications/hooks/useGeoLocation';
import * as publicationsApi from '@/services/api/publications.api';
import { OptimSettingsPanel } from './OptimSettingsPanel';
import { InfiniteHorizontalCarousel } from './InfiniteHorizontalCarousel';
import { TrashIcon, PlusIcon, GearIcon, ChevronDownIcon, DELIVERY_FEE, buildResultFromSelections } from '../utils/shoppingListUtils';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';
import { createOrder } from '@/services/api/orders.api';

// ─── Pestaña Mi Lista ─────────────────────────────────────────────────────────
export function ListaTab({ items, addItem, removeItem, clearList, saveList, addOrder, onSaved, onConfirmedDelivery, onConfirmedPickup }) {
  const [inputValue, setInputValue] = useState('');
  const [saveInput, setSaveInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [showOptimSettings, setShowOptimSettings] = useState(false);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const toggleCheck = (id) => setCheckedItems((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

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
      <div className="flex flex-col gap-4 py-1">
        {/* Header with back button */}
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => setPhase('mode-selection')}
            className="shrink-0 mt-1 bg-transparent border-none text-accent text-[13px] font-bold cursor-pointer p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            ← Volver
          </button>
          <div className="flex flex-col gap-1 flex-1">
            <h2 className="text-[1.2rem] font-extrabold text-primary m-0">Información de entrega</h2>
            <span className="text-[11px] font-bold text-muted uppercase tracking-[0.05em]">Paso 2 de 3</span>
          </div>
        </div>

        {/* Form fields */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-secondary uppercase tracking-[0.04em]">Nombre completo *</label>
          <input
            type="text"
            value={deliveryName}
            onChange={(e) => setDeliveryName(e.target.value)}
            placeholder="Ej: María García"
            className="w-full px-[14px] py-[11px] rounded-md border border-line bg-base text-primary text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-secondary uppercase tracking-[0.04em]">Teléfono</label>
          <input
            type="tel"
            value={deliveryPhone}
            onChange={(e) => setDeliveryPhone(e.target.value)}
            placeholder="Ej: 300 123 4567"
            className="w-full px-[14px] py-[11px] rounded-md border border-line bg-base text-primary text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-secondary uppercase tracking-[0.04em]">Dirección de entrega *</label>
          <input
            type="text"
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Ej: Calle 10 # 5-30, Quibdó"
            className={cn(
              'w-full px-[14px] py-[11px] rounded-md border border-line bg-base text-primary text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-accent',
              saveError && !deliveryAddress.trim() && 'border-error shadow-[0_0_0_2px_var(--bg-error-soft)]',
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-secondary uppercase tracking-[0.04em]">Apartamento / Torre / Edificio</label>
          <input
            type="text"
            value={deliveryApartment}
            onChange={(e) => setDeliveryApartment(e.target.value)}
            placeholder="Ej: Torre B, Piso 4, Apto 401"
            className="w-full px-[14px] py-[11px] rounded-md border border-line bg-base text-primary text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-secondary uppercase tracking-[0.04em]">Instrucciones para el repartidor</label>
          <textarea
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            placeholder="Ej: Dejar en la portería, timbre no funciona..."
            rows={3}
            className="w-full px-[14px] py-[11px] rounded-md border border-line bg-base text-primary text-[14px] outline-none resize-y font-[inherit] focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>

        {/* Payment method */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-bold text-secondary uppercase tracking-[0.04em]">Método de pago</label>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setDeliveryPaymentMethod('cash')}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-[14px] rounded-md border-2 border-line bg-surface text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                deliveryPaymentMethod === 'cash' && 'border-accent bg-accent-soft',
              )}
            >
              <span className="text-[20px] shrink-0">💵</span>
              <span className="flex-1 text-[13px] font-bold text-primary">Efectivo al repartidor</span>
              {deliveryPaymentMethod === 'cash' && (
                <span className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-accent text-white text-[12px] font-extrabold shrink-0">✓</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setDeliveryPaymentMethod('transfer')}
              className={cn(
                'flex items-center gap-3 w-full px-4 py-[14px] rounded-md border-2 border-line bg-surface text-left transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                deliveryPaymentMethod === 'transfer' && 'border-accent bg-accent-soft',
              )}
            >
              <span className="text-[20px] shrink-0">📱</span>
              <span className="flex-1 text-[13px] font-bold text-primary">Transferencia bancaria</span>
              {deliveryPaymentMethod === 'transfer' && (
                <span className="flex items-center justify-center w-[22px] h-[22px] rounded-full bg-accent text-white text-[12px] font-extrabold shrink-0">✓</span>
              )}
            </button>
          </div>
        </div>

        {/* Order summary */}
        <div className="flex flex-col gap-2.5 bg-surface border border-line rounded-md px-4 py-[14px]">
          <div className="flex justify-between items-center text-[13px] text-secondary">
            <span className="text-muted">Subtotal productos</span>
            <span className="font-semibold text-primary">${total.toLocaleString('es-CO')} COP</span>
          </div>
          <div className="flex justify-between items-center text-[13px] text-secondary">
            <span className="text-muted">Tarifa de domicilio</span>
            <span className="font-semibold text-primary">+${DELIVERY_FEE.toLocaleString('es-CO')} COP</span>
          </div>
          <div className="flex justify-between items-center border-t border-line pt-2.5 text-[15px] font-extrabold text-primary">
            <span>Total</span>
            <span className="text-[18px] font-extrabold text-accent">${deliveryTotal.toLocaleString('es-CO')} COP</span>
          </div>
        </div>

        {/* Error */}
        {saveError && (
          <p className="text-[13px] text-error bg-error-soft px-[14px] py-2.5 rounded-sm m-0">{saveError}</p>
        )}
        {!deliveryAddress.trim() && saveError && (
          <p className="text-[13px] text-error bg-error-soft px-[14px] py-2.5 rounded-sm m-0">La dirección de entrega es obligatoria</p>
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
          className={cn(
            'w-full py-[15px] rounded-md border-none bg-accent text-white font-extrabold text-[15px] cursor-pointer transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            !canSubmit && 'opacity-60 cursor-not-allowed',
          )}
        >
          {saving ? 'Guardando pedido...' : `Confirmar pedido · $${deliveryTotal.toLocaleString('es-CO')} COP`}
        </button>
      </div>
    );
  }

  // ── Fase "mode-selection" — pantalla de selección de modo ────────────────
  if (phase === 'mode-selection') {
    return (
      <div className="flex flex-col gap-5 py-2">
        {/* header */}
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[1.3rem] font-extrabold text-primary m-0 leading-tight">¿Cómo querés recibir tu pedido?</h2>
          <p className="text-[13px] text-muted m-0">Visitá una tienda o pedí envío a domicilio</p>
        </div>

        {/* option cards */}
        <div className="flex flex-col gap-3">
          {/* Delivery card */}
          <button
            type="button"
            onClick={() => setSelectedMode('delivery')}
            className={cn(
              'w-full flex items-center justify-between px-4 py-[18px] bg-surface border-2 border-line rounded-lg cursor-pointer transition-all duration-150 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              selectedMode === 'delivery' && 'border-accent bg-accent-soft shadow-[0_0_0_3px_var(--bg-accent-soft)]',
            )}
          >
            <div className="flex items-start gap-[14px] flex-1">
              <span className="text-[28px] leading-none shrink-0 mt-0.5">🛵</span>
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-extrabold text-primary">Domicilio</span>
                <span className="text-[12px] text-secondary leading-[1.4]">Recibí tus productos en la puerta de tu casa</span>
                <span className="inline-block self-start text-[11px] font-semibold text-accent bg-accent-soft border border-accent rounded-full px-2 py-0.5">
                  Estimado 1-2 horas · +${DELIVERY_FEE.toLocaleString('es-CO')}
                </span>
              </div>
            </div>
            {selectedMode === 'delivery' && (
              <span className="flex items-center justify-center shrink-0 w-[26px] h-[26px] rounded-full bg-accent text-white text-[14px] font-extrabold ml-2">✓</span>
            )}
          </button>

          {/* Voy yo card */}
          <button
            type="button"
            onClick={() => setSelectedMode('pickup')}
            className={cn(
              'w-full flex items-center justify-between px-4 py-[18px] bg-surface border-2 border-line rounded-lg cursor-pointer transition-all duration-150 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              selectedMode === 'pickup' && 'border-accent bg-accent-soft shadow-[0_0_0_3px_var(--bg-accent-soft)]',
            )}
          >
            <div className="flex items-start gap-[14px] flex-1">
              <span className="text-[28px] leading-none shrink-0 mt-0.5">🚶</span>
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-extrabold text-primary">Voy yo</span>
                <span className="text-[12px] text-secondary leading-[1.4]">Planeá tu ruta con el mapa de tiendas y ahorros optimizados</span>
                <span className="inline-block self-start text-[11px] font-semibold text-accent bg-accent-soft border border-accent rounded-full px-2 py-0.5">
                  Sin costo extra · mapa incluido
                </span>
              </div>
            </div>
            {selectedMode === 'pickup' && (
              <span className="flex items-center justify-center shrink-0 w-[26px] h-[26px] rounded-full bg-accent text-white text-[14px] font-extrabold ml-2">✓</span>
            )}
          </button>
        </div>

        {/* total summary */}
        {hasSelections && (
          <div className="flex justify-between items-center px-[18px] py-[14px] bg-surface border border-line rounded-md">
            <span className="text-[13px] text-secondary font-semibold">Total estimado</span>
            <span className="text-[20px] font-extrabold text-accent">
              ${(total + (selectedMode === 'delivery' ? DELIVERY_FEE : 0)).toLocaleString('es-CO')}
              <span className="text-[12px] font-medium text-muted"> COP</span>
            </span>
          </div>
        )}

        {/* actions */}
        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => { setSelectedMode(null); setPhase('list'); }}
            className="flex-1 py-[13px] rounded-md border border-line bg-surface text-secondary font-bold text-[13px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            className={cn(
              '[flex:2] py-[13px] rounded-md border-none bg-accent text-white font-extrabold text-[14px] cursor-pointer transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              !selectedMode && 'opacity-45 cursor-not-allowed',
            )}
          >
            {selectedMode === 'delivery' ? 'Continuar con domicilio' : selectedMode === 'pickup' ? 'Ver ruta de compra' : 'Continuar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 min-w-0 overflow-hidden">
      {/* ── Badge de modo activo (post-optimización) ─────────────── */}
      {isCalculated && deliveryMode && (
        <div className="flex items-center justify-between px-3 py-[7px] bg-accent-soft border border-accent rounded-sm">
          <span className="text-[12px] font-bold text-accent">
            {deliveryMode === 'delivery' ? '🛵 Domicilio' : '🚶 Voy yo'}
          </span>
          <button
            type="button"
            onClick={handleChangeMode}
            className="bg-transparent border-none text-[11px] text-accent font-semibold cursor-pointer p-0 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Cambiar modo
          </button>
        </div>
      )}

      {/* ── Input para agregar ─────────────────────────────────── */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un producto (ej: leche, arroz, jabón...)"
          className="flex-1 px-[14px] py-2.5 rounded-md border border-line bg-base text-primary text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          aria-label="Agregar producto"
          className={cn(
            'flex items-center justify-center w-[42px] h-[42px] shrink-0 rounded-md border-none bg-accent text-white transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            !inputValue.trim() && 'opacity-45 cursor-not-allowed',
          )}
        >
          <PlusIcon />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col gap-1.5 items-center px-6 py-8 bg-surface border border-dashed border-line rounded-md text-center">
          <p className="text-[14px] font-semibold text-primary m-0">Tu lista está vacía</p>
          <p className="text-[12px] text-muted m-0">Escribe un producto arriba para comenzar</p>
        </div>
      ) : (
        <>
          {/* ── Barra de herramientas ───────────────────────────── */}
          <div className="flex justify-between items-center px-0.5">
            <span className="text-[12px] text-secondary font-semibold">
              {items.length} {items.length === 1 ? 'producto' : 'productos'}
            </span>
            <div className="flex gap-1.5 items-center">
              <button
                type="button"
                onClick={() => setShowSaveInput((v) => !v)}
                className="bg-transparent border border-line rounded-sm text-[11px] font-semibold text-secondary cursor-pointer px-2 py-[3px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Guardar lista con un nombre"
              >
                💾 Guardar
              </button>
              <button
                type="button"
                onClick={clearList}
                className="bg-transparent border-none text-[12px] text-error cursor-pointer px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                Limpiar
              </button>
            </div>
          </div>

          {/* ── Notificación de guardado ────────────────────────── */}
          {saveStatus && (
            <div className={cn(
              'px-3 py-2 rounded-sm text-[12px] font-semibold',
              saveStatus === 'success'
                ? 'bg-success-soft text-success border border-success'
                : 'bg-error-soft text-error border border-error',
            )}>
              {saveStatus === 'success' ? '✓ Lista guardada correctamente' : '✗ No se pudo guardar la lista'}
            </div>
          )}

          {/* ── Input para guardar lista ─────────────────────────── */}
          {showSaveInput && (
            <div className="flex gap-1.5">
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
                className="flex-1 px-3 py-2 rounded-md border border-accent bg-base text-primary text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
                className={cn(
                  'px-[14px] py-2 rounded-md border-none bg-accent text-white text-[12px] font-bold shrink-0 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  !saveInput.trim() && 'opacity-45 cursor-not-allowed',
                )}
              >
                Guardar
              </button>
            </div>
          )}

          {/* ── Summary bar (solo post-optimización) ───────────── */}
          {isCalculated && hasSelections && (
            <div className="flex items-center justify-between px-4 py-3 bg-surface border-2 border-accent rounded-md">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] font-bold text-muted uppercase tracking-[0.05em]">Resumen</span>
                <span className="text-[14px] font-bold text-primary">
                  {Object.keys(selectedPubs).length} {Object.keys(selectedPubs).length === 1 ? 'producto' : 'productos'}
                </span>
              </div>
              <div>
                <span className="text-[22px] font-extrabold text-accent">
                  ${total.toLocaleString('es-CO')}
                </span>
                <span className="text-[13px] font-medium text-muted"> COP</span>
              </div>
            </div>
          )}

          {/* ── Info banner (solo post-optimización) ────────────── */}
          {isCalculated && (
            <div className="px-[14px] py-2.5 bg-accent-soft border border-accent rounded-md text-[12px] text-accent leading-[1.5]">
              Seleccionamos las mejores opciones. Tocá un producto para ver alternativas y elegir la que más te convenga.
            </div>
          )}

          {/* ── Lista de ítems ──────────────────────────────────── */}
          <ul className="list-none m-0 p-0 flex flex-col gap-1 overflow-x-hidden">
            {items.map((item) => {
              const isExpanded          = expandedId === item.id;
              const isOptimizingThis    = !!optimizingItems[item.id];
              const pubs                = calcResults?.[item.id];
              const hasPubs             = pubs && pubs.length > 0;
              const chosenPub           = selectedPubs[item.id];
              const chosenPrice         = chosenPub?.price ?? null;

              if (isCalculated) {
                return (
                  <li key={item.id} className="flex flex-col min-w-0">
                    {/* Fila principal — card de producto optimizado (toda la fila es clickeable) */}
                    <div
                      role={hasPubs ? 'button' : undefined}
                      tabIndex={hasPubs ? 0 : undefined}
                      aria-expanded={hasPubs ? isExpanded : undefined}
                      aria-label={hasPubs ? `${isExpanded ? 'Ocultar' : 'Ver'} opciones de ${item.productName}` : undefined}
                      onClick={hasPubs ? () => toggleExpand(item.id) : undefined}
                      onKeyDown={hasPubs ? (e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpand(item.id); } : undefined}
                      className={cn(
                        'flex items-center gap-3 bg-surface border border-line rounded-md px-[14px] py-3 transition-colors duration-150',
                        hasPubs ? 'cursor-pointer' : 'cursor-default',
                        isExpanded && 'border-accent rounded-b-none',
                      )}
                    >
                      {/* Avatar circular — imagen de la publicación o inicial */}
                      <div className="w-[42px] h-[42px] shrink-0 rounded-full bg-accent-soft flex items-center justify-center text-[16px] font-extrabold text-accent uppercase border border-accent overflow-hidden">
                        {chosenPub?.photo_url ? (
                          <img
                            src={chosenPub.photo_url}
                            alt={item.productName}
                            className="w-full h-full object-cover rounded-full"
                            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <span className={cn('items-center justify-center w-full h-full', chosenPub?.photo_url ? 'hidden' : 'flex')}>
                          {item.productName.charAt(0)}
                        </span>
                      </div>

                      {/* Cuerpo */}
                      <div className="flex-1 flex flex-col gap-[3px] min-w-0">
                        <span className="text-[14px] font-bold text-primary leading-tight">{item.productName}</span>
                        <div className="text-[11px] text-muted flex items-center gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })}
                              className="flex items-center justify-center w-6 h-6 rounded-sm border border-line bg-elevated text-primary text-[14px] font-extrabold cursor-pointer shrink-0 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Reducir cantidad"
                            >
                              −
                            </button>
                            <span className="text-[13px] font-bold text-primary min-w-5 text-center">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}
                              className="flex items-center justify-center w-6 h-6 rounded-sm border border-line bg-elevated text-primary text-[14px] font-extrabold cursor-pointer shrink-0 leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              aria-label="Aumentar cantidad"
                            >
                              +
                            </button>
                          </div>
                          {isOptimizingThis && (
                            <span className="text-accent italic">⏳ Optimizando...</span>
                          )}
                          {!isOptimizingThis && hasPubs && chosenPub?.store?.name && (
                            <span>{chosenPub.store.name}</span>
                          )}
                          {!isOptimizingThis && !hasPubs && pubs !== undefined && (
                            <span className="italic">Sin coincidencias</span>
                          )}
                        </div>
                      </div>

                      {/* Precio + acciones */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isOptimizingThis && hasPubs && chosenPrice !== null && (
                          <div className="text-right">
                            <div className="text-[15px] font-extrabold text-accent leading-tight">
                              ${(chosenPrice * item.quantity).toLocaleString('es-CO')}
                            </div>
                            <div className="text-[10px] text-muted text-right">{item.quantity > 1 ? `${item.quantity} × $${chosenPrice.toLocaleString('es-CO')}` : 'COP'}</div>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {/* Chevron — solo indicador visual, el click lo maneja la fila entera */}
                          {hasPubs && !isOptimizingThis && (
                            <div
                              aria-hidden="true"
                              className={cn(
                                'flex items-center border border-line text-secondary cursor-pointer px-[7px] py-[5px] rounded-sm transition-all duration-150 pointer-events-none',
                                isExpanded && 'bg-accent-soft border-accent text-accent',
                              )}
                            >
                              <ChevronDownIcon open={isExpanded} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                          className="flex items-center justify-center shrink-0 min-h-[44px] min-w-[44px] ml-2 p-3 rounded-sm bg-transparent border-none text-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          aria-label={`Eliminar ${item.productName}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>

                    {/* Carrusel de publicaciones */}
                    {isExpanded && hasPubs && (
                      <div className="-mt-px border-r border-b border-l border-t-0 border-accent rounded-b-md bg-elevated p-2.5 overflow-hidden max-w-full">
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

              // Estado pre-optimización: fila simple con checkbox
              const isChecked = checkedItems.has(item.id);
              return (
                <li key={item.id} className="flex flex-col min-w-0">
                  <div
                    className={cn(
                      'flex items-center gap-2 bg-surface border border-line rounded-md px-3 py-2.5 cursor-pointer transition-colors duration-150',
                      isChecked && 'border-accent bg-accent-soft',
                    )}
                    onClick={() => toggleCheck(item.id)}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 w-[15px] h-[15px] cursor-pointer accent-[var(--text-accent)]"
                      aria-label={`Marcar ${item.productName}`}
                    />
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <span className={cn(
                        'text-[13px] font-semibold text-primary',
                        isChecked && 'line-through opacity-55',
                      )}>
                        {item.productName}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemove(item.id); }}
                      className="flex items-center shrink-0 p-[5px] rounded-sm bg-transparent border-none text-muted cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-semibold text-secondary">
                Dirección de entrega
              </label>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="Ej: Calle 10 # 5-30, Quibdó"
                className="w-full px-3 py-2.5 rounded-sm border border-line bg-base text-primary text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
            </div>
          )}

          {/* ── Error al guardar ─────────────────────────────────── */}
          {saveError && (
            <p className="text-[13px] text-error bg-error-soft px-[14px] py-2.5 rounded-sm m-0">
              {saveError}
            </p>
          )}

          {/* ── CTA: elegir modo (si aún no hay modo) ───────────── */}
          {isCalculated && hasSelections && deliveryMode === null && (
            <button
              type="button"
              onClick={() => setPhase('mode-selection')}
              className="w-full py-[14px] rounded-md border-none bg-accent text-white font-extrabold text-[14px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
              className={cn(
                'w-full py-[14px] rounded-md border-none bg-accent text-white font-extrabold text-[14px] cursor-pointer transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                saving && 'opacity-70',
              )}
            >
              {saving
                ? 'Guardando pedido...'
                : deliveryMode === 'delivery'
                  ? `🛵 Confirmar pedido — $${total.toLocaleString('es-CO')} COP`
                  : `🚶 Ver ruta de compra — $${total.toLocaleString('es-CO')} COP`}
            </button>
          )}

          {/* ── Error de cálculo ────────────────────────────────── */}
          {calcError && <p className="text-[13px] text-error bg-error-soft px-[14px] py-2.5 rounded-sm m-0">{calcError}</p>}
          {coordsError && <p className="text-[13px] text-error bg-error-soft px-[14px] py-2.5 rounded-sm m-0">{coordsError}</p>}

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
          <div className="flex gap-2 mt-1 items-stretch">
            <button
              type="button"
              onClick={handleCalculate}
              disabled={calculating || items.length === 0}
              className={cn(
                'flex-1 px-4 py-3 rounded-md border border-accent bg-accent-soft text-accent font-extrabold text-[14px] transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                (calculating || items.length === 0) && 'opacity-45 cursor-not-allowed',
              )}
            >
              {calculating ? '⏳ Optimizando...' : '✦ Optimizar lista'}
            </button>
            <button
              type="button"
              onClick={() => setShowOptimSettings((v) => !v)}
              className={cn(
                'flex items-center justify-center w-11 shrink-0 rounded-md border border-line bg-elevated text-secondary cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                showOptimSettings && 'bg-accent-soft text-accent border-accent',
              )}
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
