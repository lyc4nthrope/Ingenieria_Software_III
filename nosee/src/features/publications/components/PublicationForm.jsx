/**
 * PublicationForm.jsx
 *
 * Flujo:
 *   Producto → autocomplete con búsqueda en tiempo real.
 *              Si el nombre no existe → opción inline "Crear [nombre]".
 *   Tienda   → autocomplete con búsqueda en tiempo real.
 *              Si el nombre no existe → opción "Crear tienda [nombre]"
 *              que abre StoreCreateModal encima del formulario.
 *
 * Props:
 *   - mode: 'create' | 'edit' (default: 'create')
 *   - publicationId: string (required if mode='edit')
 *   - onSuccess: function
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { usePublicationCreation } from "@/features/publications/hooks";
import { Spinner } from "@/components/ui";
import PhotoUploader from "./PhotoUploader";
import StoreCreateModal from "@/features/stores/components/StoreCreateModal";
import ProductQuickCreateModal from "./ProductQuickCreateModal";
import * as publicationsApi from "@/services/api/publications.api";
import * as storesApi from "@/services/api/stores.api";
import { useLanguage } from "@/contexts/LanguageContext";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";


export function PublicationForm({ mode = "create", publicationId = null, onSuccess }) {
  const { t } = useLanguage();
  const tf = t.publicationForm;

  const {
    formData,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    isLoading,
    latitude,
    longitude,
    updateField,
    submit,
    showCelebration,
    setShowCelebration,
  } = usePublicationCreation({ mode, publicationId });

  // Estado para autocompletes y modales
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(mode === 'create');

  // ─── Product autocomplete ──────────────────────────────────────────────────
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const productTimerRef = useRef(null);
  const productRequestIdRef = useRef(0);
  const productWrapperRef = useRef(null);

  // ─── Store autocomplete ────────────────────────────────────────────────────
  const [storeQuery, setStoreQuery] = useState("");
  const [storeResults, setStoreResults] = useState([]);
  const [storeSearching, setStoreSearching] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const storeTimerRef = useRef(null);
  const storeRequestIdRef = useRef(0);
  const storeWrapperRef = useRef(null);

  // ─── Índice activo para navegación por teclado ─────────────────────────────
  const [activeProductIndex, setActiveProductIndex] = useState(-1);
  const [activeStoreIndex, setActiveStoreIndex] = useState(-1);

  // Cargar nombres iniciales cuando se cargan datos en modo edición
  useEffect(() => {
    if (!isLoading && !hasLoadedInitialData && formData.productId && formData.storeId) {
      setHasLoadedInitialData(true);
    }
  }, [isLoading, hasLoadedInitialData, formData.productId, formData.storeId]);

  // ─── Cerrar dropdowns al clickar fuera ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (
        productWrapperRef.current &&
        !productWrapperRef.current.contains(e.target)
      ) {
        setShowProductDropdown(false);
      }
      if (
        storeWrapperRef.current &&
        !storeWrapperRef.current.contains(e.target)
      ) {
        setShowStoreDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);


  useEffect(() => {
    return () => {
      clearTimeout(productTimerRef.current);
      clearTimeout(storeTimerRef.current);
    };
  }, []);

  const performProductSearch = useCallback(async (rawQuery) => {
    const query = String(rawQuery || "").trim();

    if (!query || query.length < 2) {
      setProductResults([]);
      setProductSearching(false);
      return;
    }

    const requestId = productRequestIdRef.current + 1;
    productRequestIdRef.current = requestId;
    setProductSearching(true);

    try {
      const result = await publicationsApi.searchProducts(query);
      if (requestId !== productRequestIdRef.current) return;
      setProductResults(result.success ? result.data : []);
    } catch {
      if (requestId !== productRequestIdRef.current) return;
      setProductResults([]);
    } finally {
      if (requestId === productRequestIdRef.current) {
        setProductSearching(false);
      }
    }
  }, []);

  const performStoreSearch = useCallback(async (rawQuery) => {
    const query = String(rawQuery || "").trim();

    if (!query || query.length < 2) {
      setStoreResults([]);
      setStoreSearching(false);
      return;
    }

    const requestId = storeRequestIdRef.current + 1;
    storeRequestIdRef.current = requestId;
    setStoreSearching(true);

    try {
      const result = await storesApi.searchNearbyStores(
        query,
        latitude,
        longitude,
        null,
      );
      if (requestId !== storeRequestIdRef.current) return;
      setStoreResults(result.success ? result.data : []);
    } catch {
      if (requestId !== storeRequestIdRef.current) return;
      setStoreResults([]);
    } finally {
      if (requestId === storeRequestIdRef.current) {
        setStoreSearching(false);
      }
    }
  }, [latitude, longitude]);

  useEffect(() => {
    const handleTabActive = () => {
      if (document.visibilityState !== "visible") return;
      if (productQuery.trim().length >= 2) performProductSearch(productQuery);
      if (storeQuery.trim().length >= 2) performStoreSearch(storeQuery);
    };

    window.addEventListener("focus", handleTabActive);
    document.addEventListener("visibilitychange", handleTabActive);

    return () => {
      window.removeEventListener("focus", handleTabActive);
      document.removeEventListener("visibilitychange", handleTabActive);
    };
  }, [productQuery, storeQuery, performProductSearch, performStoreSearch]);

  // ─── Producto: búsqueda debounced ─────────────────────────────────────────
  const handleProductQueryChange = (e) => {
    const val = e.target.value;
    setProductQuery(val);
    updateField("productId", "");
    clearTimeout(productTimerRef.current);

    if (!val.trim() || val.length < 2) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }

    setShowProductDropdown(true);
    productTimerRef.current = setTimeout(() => {
      performProductSearch(val);
    }, 300);
  };

  const handleProductSelect = (product) => {
    updateField("productId", String(product.id));
    setProductQuery(product.name);
    setShowProductDropdown(false);
  };

  const handleCreateProduct = async () => {
    if (!productQuery.trim()) return;
    setShowProductDropdown(false);
    setShowProductModal(true);
  };

  const handleProductCreated = (product) => {
    handleProductSelect(product);
    setShowProductModal(false);
  };

  const hasExactProductMatch = productResults.some(
    (p) => p.name.toLowerCase() === productQuery.trim().toLowerCase(),
  );

  // Opciones totales del dropdown de producto (resultados + opción crear si aplica)
  const productOptions = [
    ...productResults,
    ...(!productResults.length && productQuery.trim().length >= 2 ? [] :
      (!hasExactProductMatch && productQuery.trim().length >= 2 ? [{ __isCreate: true }] : [])),
  ];
  // Si hay resultados y no hay coincidencia exacta, se añade opción crear al final
  const productDropdownItems = [
    ...productResults,
    ...(!hasExactProductMatch && !productResults.find(p => p.__isCreate) && productQuery.trim().length >= 2
      ? [{ __isCreate: true }] : []),
  ];

  const handleProductKeyDown = (e) => {
    if (!showProductDropdown) return;
    const total = productDropdownItems.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveProductIndex((prev) => (prev + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveProductIndex((prev) => (prev - 1 + total) % total);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = productDropdownItems[activeProductIndex];
      if (item) {
        if (item.__isCreate) handleCreateProduct();
        else handleProductSelect(item);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowProductDropdown(false);
      setActiveProductIndex(-1);
    }
  };

  // ─── Tienda: búsqueda debounced ────────────────────────────────────────────
  const handleStoreQueryChange = (e) => {
    const val = e.target.value;
    setStoreQuery(val);
    updateField("storeId", "");
    clearTimeout(storeTimerRef.current);

    if (!val.trim() || val.length < 2) {
      setStoreResults([]);
      setShowStoreDropdown(false);
      return;
    }

    setShowStoreDropdown(true);
    storeTimerRef.current = setTimeout(() => {
      performStoreSearch(val);
    }, 300);
  };

  const handleStoreSelect = (store) => {
    updateField("storeId", store.id);
    setStoreQuery(store.name);
    setShowStoreDropdown(false);
  };

  const handleStoreCreated = (store) => {
    handleStoreSelect(store);
    setShowStoreModal(false);
  };

  const hasExactStoreMatch = storeResults.some(
    (s) => s.name.toLowerCase() === storeQuery.trim().toLowerCase(),
  );

  const storeDropdownItems = [
    ...storeResults,
    ...(!hasExactStoreMatch && productQuery.trim().length >= 2 ? [] :
      (!hasExactStoreMatch && storeQuery.trim().length >= 2 ? [{ __isCreate: true }] : [])),
  ];
  // Simplificado:
  const storeDropdownItemsFinal = [
    ...storeResults,
    ...(!hasExactStoreMatch && storeQuery.trim().length >= 2 ? [{ __isCreate: true }] : []),
  ];

  const handleStoreKeyDown = (e) => {
    if (!showStoreDropdown) return;
    const total = storeDropdownItemsFinal.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveStoreIndex((prev) => (prev + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveStoreIndex((prev) => (prev - 1 + total) % total);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = storeDropdownItemsFinal[activeStoreIndex];
      if (item) {
        if (item.__isCreate) { setShowStoreDropdown(false); setShowStoreModal(true); }
        else handleStoreSelect(item);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowStoreDropdown(false);
      setActiveStoreIndex(-1);
    }
  };

  // ─── Símbolo de moneda ─────────────────────────────────────────────────────
  const CURRENCY_SYMBOLS = { COP: '$', USD: 'US$', EUR: '€' };
  const currencySymbol = CURRENCY_SYMBOLS[formData.currency] ?? '$';

  // ─── Form helpers ──────────────────────────────────────────────────────────
  const handleInputChange = (field, value) => {
    updateField(field, value);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const result = await submit();

    if (result.success) {
      onSuccess?.(result.data);
      if (mode === "create") {
        setProductQuery("");
        setStoreQuery("");
      }
    }
  };

  // Mostrar spinner mientras carga datos en modo edición
  if (isLoading) {
    return (
      <div style={styles.container} className="flex items-center justify-center min-h-96">
        <Spinner />
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {submitSuccess && (
        <div role="status" aria-live="polite" style={styles.successAlert}>{tf.success}</div>
      )}
      {submitError && (
        <div role="alert" style={styles.errorAlert}>
          <span aria-hidden="true">⚠ </span>{submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* ── Producto ─────────────────────────────────────────────────────── */}
        <div style={styles.formGroup}>
          <label htmlFor="pub-product" style={styles.label}>
            {tf.productLabel} <span style={styles.required}>*</span>
          </label>
          <div ref={productWrapperRef} style={styles.autocompleteContainer}>
            <input
              id="pub-product"
              type="text"
              role="combobox"
              aria-expanded={showProductDropdown}
              aria-autocomplete="list"
              aria-controls="pub-product-listbox"
              aria-activedescendant={
                activeProductIndex >= 0
                  ? `pub-product-option-${activeProductIndex}`
                  : undefined
              }
              aria-invalid={!!errors.productId}
              aria-describedby={errors.productId ? "pub-product-error" : undefined}
              placeholder={tf.productPlaceholder}
              value={productQuery}
              onChange={handleProductQueryChange}
              onFocus={() =>
                productQuery.length >= 2 && setShowProductDropdown(true)
              }
              onKeyDown={handleProductKeyDown}
              style={{
                ...styles.input,
                ...(errors.productId ? styles.inputError : {}),
              }}
            />

            {showProductDropdown && (
              <div
                id="pub-product-listbox"
                role="listbox"
                aria-label={tf.productLabel}
                style={styles.dropdown}
              >
                {productSearching && (
                  <div style={styles.dropdownState}>{tf.searching}</div>
                )}

                {!productSearching &&
                  productResults.map((p, i) => {
                    const meta = [
                      p.brand?.name,
                      p.base_quantity != null && p.unit?.name
                        ? `${p.base_quantity} ${p.unit.name}`
                        : p.base_quantity != null
                        ? p.base_quantity
                        : p.unit?.name,
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <div
                        key={p.id}
                        id={`pub-product-option-${i}`}
                        role="option"
                        aria-selected={i === activeProductIndex}
                        style={{
                          ...styles.dropdownItem,
                          ...(i === activeProductIndex ? styles.dropdownItemActive : {}),
                        }}
                        onMouseDown={() => handleProductSelect(p)}
                      >
                        <span>{p.name}</span>
                        {meta && <span style={styles.dropdownSub}>{meta}</span>}
                      </div>
                    );
                  })}

                {!productSearching &&
                  productResults.length === 0 &&
                  productQuery.trim().length >= 2 && (
                    <div style={styles.dropdownState}>{tf.noResults}</div>
                  )}

                {/* Crear producto — solo si no hay coincidencia exacta */}
                {!productSearching &&
                  productQuery.trim().length >= 2 &&
                  !hasExactProductMatch && (
                    <div
                      id={`pub-product-option-${productResults.length}`}
                      role="option"
                      aria-selected={productResults.length === activeProductIndex}
                      style={{
                        ...styles.dropdownItem,
                        ...styles.dropdownCreate,
                        ...(productResults.length === activeProductIndex ? styles.dropdownItemActive : {}),
                      }}
                      onMouseDown={handleCreateProduct}
                    >
                     {tf.createProduct(productQuery.trim())}
                    </div>
                  )}
              </div>
            )}
          </div>

          {formData.productId && (
            <div style={styles.selectedBadge}>{tf.productSelected}</div>
          )}
          {errors.productId && (
            <div id="pub-product-error" role="alert" style={styles.errorText}>{errors.productId}</div>
          )}
        </div>

        {/* ── Tienda ───────────────────────────────────────────────────────── */}
        <div style={styles.formGroup}>
          <label htmlFor="pub-store" style={styles.label}>
            {tf.storeLabel} <span style={styles.required}>*</span>
          </label>
          <div ref={storeWrapperRef} style={styles.autocompleteContainer}>
            <input
              id="pub-store"
              type="text"
              role="combobox"
              aria-expanded={showStoreDropdown}
              aria-autocomplete="list"
              aria-controls="pub-store-listbox"
              aria-activedescendant={
                activeStoreIndex >= 0
                  ? `pub-store-option-${activeStoreIndex}`
                  : undefined
              }
              aria-invalid={!!errors.storeId}
              aria-describedby={errors.storeId ? "pub-store-error" : undefined}
              placeholder={tf.storePlaceholder}
              value={storeQuery}
              onChange={handleStoreQueryChange}
              onFocus={() =>
                storeQuery.length >= 2 && setShowStoreDropdown(true)
              }
              onKeyDown={handleStoreKeyDown}
              style={{
                ...styles.input,
                ...(errors.storeId ? styles.inputError : {}),
              }}
            />

            {showStoreDropdown && (
              <div
                id="pub-store-listbox"
                role="listbox"
                aria-label={tf.storeLabel}
                style={styles.dropdown}
              >
                {storeSearching && (
                  <div style={styles.dropdownState}>{tf.searching}</div>
                )}

                {!storeSearching &&
                  storeResults.map((s, i) => (
                    <div
                      key={s.id}
                      id={`pub-store-option-${i}`}
                      role="option"
                      aria-selected={i === activeStoreIndex}
                      style={{
                        ...styles.dropdownItem,
                        ...(i === activeStoreIndex ? styles.dropdownItemActive : {}),
                      }}
                      onMouseDown={() => handleStoreSelect(s)}
                    >
                      <span>{s.name}</span>
                      {s.address && (
                        <span style={styles.dropdownSub}>{s.address}</span>
                      )}
                      {s.distanceMeters != null && (
                        <span style={styles.dropdownDistance}>
                          {s.distanceMeters < 1000
                            ? `${Math.round(s.distanceMeters)} m`
                            : `${(s.distanceMeters / 1000).toFixed(1)} km`}
                        </span>
                      )}
                    </div>
                  ))}

                {!storeSearching &&
                  storeResults.length === 0 &&
                  storeQuery.trim().length >= 2 && (
                    <div style={styles.dropdownState}>{tf.noResults}</div>
                  )}

                {/* Crear tienda — abre modal */}
                {!storeSearching &&
                  storeQuery.trim().length >= 2 &&
                  !hasExactStoreMatch && (
                    <div
                      id={`pub-store-option-${storeResults.length}`}
                      role="option"
                      aria-selected={storeResults.length === activeStoreIndex}
                      style={{
                        ...styles.dropdownItem,
                        ...styles.dropdownCreate,
                        ...(storeResults.length === activeStoreIndex ? styles.dropdownItemActive : {}),
                      }}
                      onMouseDown={() => {
                        setShowStoreDropdown(false);
                        setShowStoreModal(true);
                      }}
                    >
                      {tf.createStore(storeQuery.trim())}
                    </div>
                  )}
              </div>
            )}
          </div>

          {formData.storeId && (
            <div style={styles.selectedBadge}>{tf.storeSelected}</div>
          )}
          {errors.storeId && (
            <div id="pub-store-error" role="alert" style={styles.errorText}>{errors.storeId}</div>
          )}
        </div>

        {/* ── Precio + Moneda ───────────────────────────────────────────────── */}
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label htmlFor="pub-price" style={styles.label}>
              {tf.priceLabel} <span style={styles.required}>*</span>
            </label>
            <div style={styles.inputGroup}>
              <span style={styles.currencyPrefix}>{currencySymbol}</span>
              <input
                id="pub-price"
                type="number"
                placeholder="0"
                value={formData.price}
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? "pub-price-error" : undefined}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) handleInputChange("price", val);
                }}
                style={styles.inputWithPrefix}
                min="0"
              />
            </div>
            {errors.price && <div id="pub-price-error" role="alert" style={styles.errorText}>{errors.price}</div>}
          </div>

          <div style={styles.formGroup}>
            <label htmlFor="pub-currency" style={styles.label}>{tf.currencyLabel}</label>
            <select
              id="pub-currency"
              value={formData.currency}
              onChange={(e) => handleInputChange("currency", e.target.value)}
              style={styles.select}
            >
              <option value="COP">COP (Pesos)</option>
              <option value="USD">USD (Dólares)</option>
              <option value="EUR">EUR (Euros)</option>
            </select>
          </div>
        </div>

        {/* ── Descripción ───────────────────────────────────────────────────── */}
        <div style={styles.formGroup}>
          <label htmlFor="pub-description" style={styles.label}>{tf.descriptionLabel}</label>
          <textarea
            id="pub-description"
            placeholder={tf.descriptionPlaceholder}
            value={formData.description}
            aria-invalid={!!errors.description}
            aria-describedby={errors.description ? "pub-description-error" : undefined}
            onChange={(e) => handleInputChange("description", e.target.value)}
            maxLength={500}
            style={styles.textarea}
          />
          <div style={styles.charCount}>{formData.description.length}/500</div>
          {errors.description && (
            <div id="pub-description-error" role="alert" style={styles.errorText}>{errors.description}</div>
          )}
        </div>

        {/* ── Foto ──────────────────────────────────────────────────────────── */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            {tf.photoLabel} <span style={styles.required}>*</span>
          </label>
          <PhotoUploader
            onUpload={(url) => handleInputChange("photoUrl", url)}
            disabled={isSubmitting}
          />
          {errors.photoUrl && (
            <div id="pub-photo-error" role="alert" style={styles.errorText}>{errors.photoUrl}</div>
          )}
        </div>

        {/* ── Geolocalización ───────────────────────────────────────────────── */}
        {latitude && longitude && (
          <div style={styles.geoInfo}>
            {tf.geoDetected} {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────────────────────── */}
        <button
          type="submit"
          style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? tf.submitting : tf.submitBtn}
        </button>
      </form>

      {/* ── Modal de tienda ─────────────────────────────────────────────────── */}
      {showStoreModal && (
        <StoreCreateModal
          initialName={storeQuery.trim()}
          onSuccess={handleStoreCreated}
          onClose={() => setShowStoreModal(false)}
        />
      )}
      {showProductModal && (
        <ProductQuickCreateModal
          initialName={productQuery.trim()}
          onSuccess={handleProductCreated}
          onClose={() => setShowProductModal(false)}
        />
      )}
      <CelebrationOverlay
        visible={showCelebration}
        message={t.celebration?.publication}
        onDone={() => setShowCelebration(false)}
      />
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: "600px",
    margin: "0 auto",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "24px",
  },
  title: {
    fontSize: "20px",
    fontWeight: 700,
    margin: "0 0 20px 0",
    color: "var(--text-primary)",
  },
  successAlert: {
    background: "var(--success-soft)",
    border: "1px solid rgba(74,222,128,0.3)",
    color: "var(--success)",
    padding: "12px 16px",
    borderRadius: "var(--radius-sm)",
    marginBottom: "16px",
    fontSize: "13px",
    fontWeight: 500,
  },
  errorAlert: {
    background: "var(--error-soft)",
    border: "1px solid rgba(248,113,113,0.3)",
    color: "var(--error)",
    padding: "12px 16px",
    borderRadius: "var(--radius-sm)",
    marginBottom: "16px",
    fontSize: "13px",
    fontWeight: 500,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--text-secondary)",
    marginBottom: "6px",
  },
  required: {
    color: "var(--error)",
  },
  input: {
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
  },
  inputError: {
    borderColor: "var(--error)",
  },
  inputGroup: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  currencyPrefix: {
    position: "absolute",
    left: "12px",
    fontSize: "13px",
    color: "var(--text-muted)",
    pointerEvents: "none",
  },
  inputWithPrefix: {
    padding: "10px 12px 10px 28px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontFamily: "inherit",
    width: "100%",
    outline: "none",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
  },
  select: {
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontFamily: "inherit",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    WebkitTextFillColor: "var(--text-primary)",
    opacity: 1,
  },
  textarea: {
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "13px",
    fontFamily: "inherit",
    minHeight: "80px",
    resize: "vertical",
    outline: "none",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
  },
  charCount: {
    fontSize: "12px",
    color: "var(--text-muted)",
    marginTop: "4px",
    textAlign: "right",
  },
  errorText: {
    color: "var(--error)",
    fontSize: "12px",
    marginTop: "4px",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px",
  },
  autocompleteContainer: {
    position: "relative",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderTop: "none",
    borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
    maxHeight: "220px",
    overflowY: "auto",
    zIndex: 50,
    boxShadow: "var(--shadow-md)",
  },
  dropdownItem: {
    padding: "10px 12px",
    cursor: "pointer",
    fontSize: "13px",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    color: "var(--text-primary)",
    background: "var(--bg-elevated)",
  },
  dropdownCreate: {
    color: "var(--accent)",
    fontWeight: 600,
    borderTop: "1px solid var(--border-soft)",
  },
  dropdownItemActive: {
    background: "#fff0eb",
    outline: "2px solid #ff6b35",
    outlineOffset: "-2px",
  },
  dropdownState: {
    padding: "10px 12px",
    fontSize: "13px",
    color: "var(--text-secondary)",
    fontWeight: "500",
    background: "var(--bg-surface)",
  },
  dropdownSub: {
    fontSize: "11px",
    color: "var(--text-secondary)",
  },
  dropdownDistance: {
    fontSize: "11px",
    color: "var(--accent)",
    fontWeight: 600,
  },
  selectedBadge: {
    fontSize: "12px",
    color: "var(--success)",
    marginTop: "4px",
  },
  geoInfo: {
    background: "var(--accent-soft)",
    border: "1px solid var(--accent-glow)",
    color: "var(--accent)",
    padding: "10px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "12px",
  },
  submitBtn: {
    padding: "13px 24px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--accent)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    background: "var(--accent)",
    color: "#080C14",
    marginTop: "4px",
  },
};

export default PublicationForm;
