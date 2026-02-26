/**
 * PublicationForm.jsx
 *
 * Formulario completo para crear nuevas publicaciones de precios
 * Integra: hooks de publicaciones, photo upload, geolocalización
 *
 * UBICACIÓN: src/features/publications/components/PublicationForm.jsx
 * FECHA: 26-02-2026
 * STATUS: Paso 3d de Proceso 2
 *
 * PROPS:
 * - onSuccess: {Function} Callback después de crear publicación
 * - products: {Array} Lista de productos (para autocomplete)
 * - stores: {Array} Lista de tiendas (para autocomplete)
 *
 * FEATURES:
 * - Formulario completo con validaciones
 * - Autocomplete para productos y tiendas
 * - Upload de foto integrado
 * - Geolocalización automática
 * - Envío de formulario con loading
 * - Error handling
 */

import { useState, useEffect } from 'react';
import { usePublications, usePhotoUpload, useGeoLocation } from '@/features/publications/hooks';
import PhotoUploader from './PhotoUploader';
import * as publicationsApi from '@/services/api/publications.api';

/**
 * Componente: PublicationForm
 * Formulario para crear nueva publicación de precio
 *
 * @param {Function} onSuccess - Callback: (publication) => void
 * @param {Array} products - Lista de productos para autocomplete
 * @param {Array} stores - Lista de tiendas para autocomplete
 *
 * @example
 * <PublicationForm
 *   onSuccess={(pub) => addToList(pub)}
 *   products={productsData}
 *   stores={storesData}
 * />
 */
export function PublicationForm({ onSuccess, products = [], stores = [] }) {
  // ─── Hooks ────────────────────────────────────────────────────────────────

  const { addPublication } = usePublications();
  const { photoUrl: uploadedPhotoUrl } = usePhotoUpload();
  const { latitude, longitude } = useGeoLocation({ autoFetch: true });

  // ─── Estados ───────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState({
    productId: '',
    storeId: '',
    price: '',
    currency: 'COP',
    description: '',
    photoUrl: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const [productSearch, setProductSearch] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showStoreDropdown, setShowStoreDropdown] = useState(false);

  // Filtrar productos por búsqueda
  const filteredProducts = products.filter((p) =>
    p.name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Filtrar tiendas por búsqueda
  const filteredStores = stores.filter((s) =>
    s.name?.toLowerCase().includes(storeSearch.toLowerCase())
  );

  // ─── Efectos ───────────────────────────────────────────────────────────────

  // Actualizar photoUrl cuando se sube
  useEffect(() => {
    if (uploadedPhotoUrl) {
      setFormData((prev) => ({
        ...prev,
        photoUrl: uploadedPhotoUrl,
      }));
    }
  }, [uploadedPhotoUrl]);

  // ─── Validaciones ──────────────────────────────────────────────────────────

  const validateForm = () => {
    const newErrors = {};

    if (!formData.productId) newErrors.productId = 'Selecciona un producto';
    if (!formData.storeId) newErrors.storeId = 'Selecciona una tienda';
    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }
    if (!formData.photoUrl) newErrors.photoUrl = 'La foto es obligatoria';
    if (formData.description?.length > 500) {
      newErrors.description = 'Máximo 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleProductSelect = (product) => {
    setFormData((prev) => ({
      ...prev,
      productId: product.id,
    }));
    setProductSearch(product.name);
    setShowProductDropdown(false);
    if (errors.productId) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.productId;
        return newErrors;
      });
    }
  };

  const handleStoreSelect = (store) => {
    setFormData((prev) => ({
      ...prev,
      storeId: store.id,
    }));
    setStoreSearch(store.name);
    setShowStoreDropdown(false);
    if (errors.storeId) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.storeId;
        return newErrors;
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Limpiar error al escribir
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(false);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await publicationsApi.createPublication({
        productId: Number(formData.productId),
        storeId: Number(formData.storeId),
        price: Number(formData.price),
        currency: formData.currency,
        photoUrl: formData.photoUrl,
        description: formData.description,
        latitude: latitude,
        longitude: longitude,
      });

      if (result.success) {
        setSubmitSuccess(true);
        addPublication(result.data);
        onSuccess?.(result.data);

        // Reset form
        setFormData({
          productId: '',
          storeId: '',
          price: '',
          currency: 'COP',
          description: '',
          photoUrl: '',
        });
        setProductSearch('');
        setStoreSearch('');

        // Limpiar mensaje de éxito después de 3 segundos
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
      <h2 style={styles.title}>📸 Publicar Precio</h2>

      {submitSuccess && (
        <div style={styles.successAlert}>
          ✓ Publicación creada exitosamente
        </div>
      )}

      {submitError && (
        <div style={styles.errorAlert}>
          ⚠ {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Producto */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            🛒 Producto <span style={styles.required}>*</span>
          </label>
          <div style={styles.autocompleteContainer}>
            <input
              type="text"
              placeholder="Busca un producto..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              onFocus={() => setShowProductDropdown(true)}
              style={styles.input}
            />
            {showProductDropdown && filteredProducts.length > 0 && (
              <div style={styles.dropdown}>
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    style={styles.dropdownItem}
                    onClick={() => handleProductSelect(product)}
                  >
                    {product.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.productId && (
            <div style={styles.errorText}>{errors.productId}</div>
          )}
        </div>

        {/* Tienda */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            🏪 Tienda <span style={styles.required}>*</span>
          </label>
          <div style={styles.autocompleteContainer}>
            <input
              type="text"
              placeholder="Busca una tienda..."
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
              onFocus={() => setShowStoreDropdown(true)}
              style={styles.input}
            />
            {showStoreDropdown && filteredStores.length > 0 && (
              <div style={styles.dropdown}>
                {filteredStores.map((store) => (
                  <div
                    key={store.id}
                    style={styles.dropdownItem}
                    onClick={() => handleStoreSelect(store)}
                  >
                    {store.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.storeId && (
            <div style={styles.errorText}>{errors.storeId}</div>
          )}
        </div>

        {/* Precio */}
        <div style={styles.row}>
          <div style={styles.formGroup}>
            <label style={styles.label}>
              💰 Precio <span style={styles.required}>*</span>
            </label>
            <div style={styles.inputGroup}>
              <span style={styles.currency}>$</span>
              <input
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                style={styles.inputWithPrefix}
              />
            </div>
            {errors.price && (
              <div style={styles.errorText}>{errors.price}</div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>💱 Moneda</label>
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

        {/* Descripción */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            📝 Descripción (opcional)
          </label>
          <textarea
            placeholder="Ej: Buen estado, precio justo"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            maxLength={500}
            style={styles.textarea}
          />
          <div style={styles.charCount}>
            {formData.description.length}/500
          </div>
          {errors.description && (
            <div style={styles.errorText}>{errors.description}</div>
          )}
        </div>

        {/* Upload de foto */}
        <div style={styles.formGroup}>
          <label style={styles.label}>
            📷 Foto del producto <span style={styles.required}>*</span>
          </label>
          <PhotoUploader
            onUpload={(url) => handleInputChange('photoUrl', url)}
            disabled={isSubmitting}
          />
          {errors.photoUrl && (
            <div style={styles.errorText}>{errors.photoUrl}</div>
          )}
        </div>

        {/* Geolocalización */}
        {latitude && longitude && (
          <div style={styles.geoInfo}>
            📍 Ubicación detectada: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </div>
        )}

        {/* Botones */}
        <div style={styles.actions}>
          <button
            type="submit"
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              opacity: isSubmitting ? 0.7 : 1,
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Publicando...' : '✓ Publicar Precio'}
          </button>
        </div>
      </form>
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
    marginBottom: '20px',
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
  },

  inputGroup: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },

  currency: {
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
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 10,
  },

  dropdownItem: {
    padding: '10px 12px',
    cursor: 'pointer',
    fontSize: '13px',
    borderBottom: '1px solid #f0f0f0',
    transition: 'background 0.2s',
  },

  geoInfo: {
    background: '#e3f2fd',
    border: '1px solid #90caf9',
    color: '#01579b',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '12px',
  },

  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
  },

  button: {
    padding: '12px 24px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  buttonPrimary: {
    background: '#ff6b35',
    color: '#fff',
  },
};

export default PublicationForm;