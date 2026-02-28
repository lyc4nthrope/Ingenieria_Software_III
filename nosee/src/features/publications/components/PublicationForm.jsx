/**
 * PublicationForm.jsx
 *
 * Flujo:
 *   Producto → autocomplete con búsqueda en tiempo real.
 *              Si el nombre no existe → opción inline "Crear [nombre]".
 *   Tienda   → autocomplete con búsqueda en tiempo real.
 *              Si el nombre no existe → opción "Crear tienda [nombre]"
 *              que abre StoreCreateModal encima del formulario.
 */

import { useState, useEffect, useRef } from 'react';
import { usePublications, useGeoLocation } from '@/features/publications/hooks';
import PhotoUploader from './PhotoUploader';
import StoreCreateModal from '@/features/stores/components/StoreCreateModal';
import * as publicationsApi from '@/services/api/publications.api';
import * as storesApi from '@/services/api/stores.api';

export function PublicationForm({ onSuccess }) {
  const { addPublication } = usePublications();
  const { latitude, longitude } = useGeoLocation({ autoFetch: true });

  // ─── Form data ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    productId:   '',
    storeId:     '',
    price:       '',
    currency:    'COP',
    description: '',
    photoUrl:    '',
  });
  const [errors,        setErrors]        = useState({});
  const [isSubmitting,  setIsSubmitting]  = useState(false);
  const [submitError,   setSubmitError]   = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // ─── Product autocomplete ──────────────────────────────────────────────────
  const [productQuery,        setProductQuery]        = useState('');
  const [productResults,      setProductResults]      = useState([]);
  const [productSearching,    setProductSearching]    = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [creatingProduct,     setCreatingProduct]     = useState(false);
  const productTimerRef   = useRef(null);
  const productWrapperRef = useRef(null);

  // ─── Store autocomplete ────────────────────────────────────────────────────
  const [storeQuery,        setStoreQuery]        = useState('');
  const [storeResults,      setStoreResults]      = useState([]);
  const [storeSearching,    setStoreSearching]    = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);
  const [showStoreModal,    setShowStoreModal]    = useState(false);
  const storeTimerRef   = useRef(null);
  const storeWrapperRef = useRef(null);

  // ─── Cerrar dropdowns al clickar fuera ────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (productWrapperRef.current && !productWrapperRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
      if (storeWrapperRef.current && !storeWrapperRef.current.contains(e.target)) {
        setShowStoreDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ─── Producto: búsqueda debounced ─────────────────────────────────────────
  const handleProductQueryChange = (e) => {
    const val = e.target.value;
    setProductQuery(val);
    setFormData(prev => ({ ...prev, productId: '' }));
    clearTimeout(productTimerRef.current);

    if (!val.trim() || val.length < 2) {
      setProductResults([]);
      setShowProductDropdown(false);
      return;
    }

    setProductSearching(true);
    setShowProductDropdown(true);
    productTimerRef.current = setTimeout(async () => {
      const result = await publicationsApi.searchProducts(val.trim());
      setProductResults(result.success ? result.data : []);
      setProductSearching(false);
    }, 300);
  };

  const handleProductSelect = (product) => {
    setFormData(prev => ({ ...prev, productId: product.id }));
    setProductQuery(product.name);
    setShowProductDropdown(false);
    setErrors(prev => { const n = { ...prev }; delete n.productId; return n; });
  };

  const handleCreateProduct = async () => {
    if (!productQuery.trim() || creatingProduct) return;
    setCreatingProduct(true);
    const result = await publicationsApi.createProduct(productQuery.trim());
    setCreatingProduct(false);
    if (result.success) {
      handleProductSelect(result.data);
    } else {
      setErrors(prev => ({ ...prev, productId: result.error }));
    }
  };

  const hasExactProductMatch = productResults.some(
    p => p.name.toLowerCase() === productQuery.trim().toLowerCase()
  );

  // ─── Tienda: búsqueda debounced ────────────────────────────────────────────
  const handleStoreQueryChange = (e) => {
    const val = e.target.value;
    setStoreQuery(val);
    setFormData(prev => ({ ...prev, storeId: '' }));
    clearTimeout(storeTimerRef.current);

    if (!val.trim() || val.length < 2) {
      setStoreResults([]);
      setShowStoreDropdown(false);
      return;
    }

    setStoreSearching(true);
    setShowStoreDropdown(true);
    storeTimerRef.current = setTimeout(async () => {
      const result = await storesApi.searchNearbyStores(val.trim(), latitude, longitude);
      setStoreResults(result.success ? result.data : []);
      setStoreSearching(false);
    }, 300);
  };

  const handleStoreSelect = (store) => {
    setFormData(prev => ({ ...prev, storeId: store.id }));
    setStoreQuery(store.name);
    setShowStoreDropdown(false);
    setErrors(prev => { const n = { ...prev }; delete n.storeId; return n; });
  };

  const handleStoreCreated = (store) => {
    handleStoreSelect(store);
    setShowStoreModal(false);
  };

  const hasExactStoreMatch = storeResults.some(
    s => s.name.toLowerCase() === storeQuery.trim().toLowerCase()
  );

  // ─── Form helpers ──────────────────────────────────────────────────────────
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    }
  };

  const validateForm = () => {
    const e = {};
    if (!formData.productId) e.productId = 'Selecciona o crea un producto';
    if (!formData.storeId)   e.storeId   = 'Selecciona o crea una tienda';
    if (!formData.price || Number(formData.price) <= 0) e.price = 'El precio debe ser mayor a 0';
    if (!formData.photoUrl)  e.photoUrl  = 'La foto es obligatoria';
    if (formData.description?.length > 500) e.description = 'Máximo 500 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const result = await publicationsApi.createPublication({
        productId:   Number(formData.productId),
        storeId:     Number(formData.storeId),
        price:       Number(formData.price),
        currency:    formData.currency,
        photoUrl:    formData.photoUrl,
        description: formData.description,
        latitude,
        longitude,
      });

      if (result.success) {
        setSubmitSuccess(true);
        addPublication(result.data);
        onSuccess?.(result.data);
        setFormData({ productId: '', storeId: '', price: '', currency: 'COP', description: '', photoUrl: '' });
        setProductQuery('');
        setStoreQuery('');
        setTimeout(() => setSubmitSuccess(false), 3000);
      } else {
        setSubmitError(result.error || 'Error al crear publicación');
      }
    } catch (err) {
      setSubmitError(err.message || 'Error desconocido');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Publicar Precio</h2>

      {submitSuccess && <div style={styles.successAlert}>✓ Publicación creada exitosamente</div>}
      {submitError   && <div style={styles.errorAlert}>⚠ {submitError}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>

        {/* ── Producto ─────────────────────────────────────────────────────── */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Producto <span style={styles.required}>*</span>
          </label>
          <div ref={productWrapperRef} style={styles.autocompleteContainer}>
            <input
              type="text"
              placeholder="Escribe el nombre del producto..."
              value={productQuery}
              onChange={handleProductQueryChange}
              onFocus={() => productQuery.length >= 2 && setShowProductDropdown(true)}
              style={{ ...styles.input, ...(errors.productId ? styles.inputError : {}) }}
            />

            {showProductDropdown && (
              <div style={styles.dropdown}>
                {productSearching && (
                  <div style={styles.dropdownState}>Buscando...</div>
                )}

                {!productSearching && productResults.map(p => (
                  <div
                    key={p.id}
                    style={styles.dropdownItem}
                    onMouseDown={() => handleProductSelect(p)}
                  >
                    {p.name}
                  </div>
                ))}

                {!productSearching && productResults.length === 0 && productQuery.trim().length >= 2 && (
                  <div style={styles.dropdownState}>Sin resultados</div>
                )}

                {/* Crear producto — solo si no hay coincidencia exacta */}
                {!productSearching && productQuery.trim().length >= 2 && !hasExactProductMatch && (
                  <div
                    style={{ ...styles.dropdownItem, ...styles.dropdownCreate }}
                    onMouseDown={handleCreateProduct}
                  >
                    {creatingProduct ? 'Creando...' : `+ Crear "${productQuery.trim()}"`}
                  </div>
                )}
              </div>
            )}
          </div>

          {formData.productId && <div style={styles.selectedBadge}>✓ Producto seleccionado</div>}
          {errors.productId && <div style={styles.errorText}>{errors.productId}</div>}
        </div>

        {/* ── Tienda ───────────────────────────────────────────────────────── */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Tienda <span style={styles.required}>*</span>
          </label>
          <div ref={storeWrapperRef} style={styles.autocompleteContainer}>
            <input
              type="text"
              placeholder="Escribe el nombre de la tienda..."
              value={storeQuery}
              onChange={handleStoreQueryChange}
              onFocus={() => storeQuery.length >= 2 && setShowStoreDropdown(true)}
              style={{ ...styles.input, ...(errors.storeId ? styles.inputError : {}) }}
            />

            {showStoreDropdown && (
              <div style={styles.dropdown}>
                {storeSearching && (
                  <div style={styles.dropdownState}>Buscando...</div>
                )}

                {!storeSearching && storeResults.map(s => (
                  <div
                    key={s.id}
                    style={styles.dropdownItem}
                    onMouseDown={() => handleStoreSelect(s)}
                  >
                    <span>{s.name}</span>
                    {s.address && <span style={styles.dropdownSub}>{s.address}</span>}
                    {s.distanceMeters != null && (
                      <span style={styles.dropdownDistance}>
                        {s.distanceMeters < 1000
                          ? `${Math.round(s.distanceMeters)} m`
                          : `${(s.distanceMeters / 1000).toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                ))}

                {!storeSearching && storeResults.length === 0 && storeQuery.trim().length >= 2 && (
                  <div style={styles.dropdownState}>Sin resultados</div>
                )}

                {/* Crear tienda — abre modal */}
                {!storeSearching && storeQuery.trim().length >= 2 && !hasExactStoreMatch && (
                  <div
                    style={{ ...styles.dropdownItem, ...styles.dropdownCreate }}
                    onMouseDown={() => { setShowStoreDropdown(false); setShowStoreModal(true); }}
                  >
                    + Crear tienda "{storeQuery.trim()}"
                  </div>
                )}
              </div>
            )}
          </div>

          {formData.storeId && <div style={styles.selectedBadge}>✓ Tienda seleccionada</div>}
          {errors.storeId && <div style={styles.errorText}>{errors.storeId}</div>}
        </div>

        {/* ── Precio + Moneda ───────────────────────────────────────────────── */}
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Precio <span style={styles.required}>*</span>
            </label>
            <div style={styles.inputGroup}>
              <span style={styles.currencyPrefix}>$</span>
              <input
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                style={styles.inputWithPrefix}
                min="1"
              />
            </div>
            {errors.price && <div style={styles.errorText}>{errors.price}</div>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Moneda</label>
            <select
              value={formData.currency}
              onChange={(e) => handleInputChange('currency', e.target.value)}
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
          <label style={styles.label}>Descripción (opcional)</label>
          <textarea
            placeholder="Ej: Buen estado, precio justo"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            maxLength={500}
            style={styles.textarea}
          />
          <div style={styles.charCount}>{formData.description.length}/500</div>
          {errors.description && <div style={styles.errorText}>{errors.description}</div>}
        </div>

        {/* ── Foto ──────────────────────────────────────────────────────────── */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            Foto del producto <span style={styles.required}>*</span>
          </label>
          <PhotoUploader
            onUpload={(url) => handleInputChange('photoUrl', url)}
            disabled={isSubmitting}
          />
          {errors.photoUrl && <div style={styles.errorText}>{errors.photoUrl}</div>}
        </div>

        {/* ── Geolocalización ───────────────────────────────────────────────── */}
        {latitude && longitude && (
          <div style={styles.geoInfo}>
            Ubicación detectada: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────────────────────── */}
        <button
          type="submit"
          style={{ ...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1 }}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Publicando...' : 'Publicar Precio'}
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
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    margin: '0 0 20px 0',
    color: '#333',
  },
  successAlert: {
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    color: '#166534',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
    fontWeight: 500,
  },
  errorAlert: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '12px 16px',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '13px',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '6px',
  },
  required: {
    color: '#d32f2f',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  currencyPrefix: {
    position: 'absolute',
    left: '12px',
    fontSize: '13px',
    color: '#999',
    pointerEvents: 'none',
  },
  inputWithPrefix: {
    padding: '10px 12px 10px 28px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
    outline: 'none',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    background: '#fff',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    minHeight: '80px',
    resize: 'vertical',
    outline: 'none',
  },
  charCount: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
    textAlign: 'right',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: '12px',
    marginTop: '4px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  autocompleteContainer: {
    position: 'relative',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#fff',
    border: '1px solid #ddd',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    maxHeight: '220px',
    overflowY: 'auto',
    zIndex: 50,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  dropdownItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dropdownCreate: {
    color: '#ff6b35',
    fontWeight: 600,
    borderTop: '1px solid #eee',
  },
  dropdownState: {
    padding: '10px 12px',
    fontSize: '12px',
    color: '#999',
  },
  dropdownSub: {
    fontSize: '11px',
    color: '#888',
  },
  dropdownDistance: {
    fontSize: '11px',
    color: '#ff6b35',
    fontWeight: 600,
  },
  selectedBadge: {
    fontSize: '12px',
    color: '#166534',
    marginTop: '4px',
  },
  geoInfo: {
    background: '#e3f2fd',
    border: '1px solid #90caf9',
    color: '#01579b',
    padding: '10px 12px',
    borderRadius: '6px',
    fontSize: '12px',
  },
  submitBtn: {
    padding: '13px 24px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    background: '#ff6b35',
    color: '#fff',
    marginTop: '4px',
  },
};

export default PublicationForm;
