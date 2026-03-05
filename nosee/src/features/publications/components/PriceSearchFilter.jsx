/**
 * PriceSearchFilter.jsx
 *
 * Panel de filtros para publicaciones de precios (controlado externamente).
 * El toggle de visibilidad lo maneja el padre; este componente solo
 * muestra el formulario cuando `open === true` y siempre muestra los tags activos.
 *
 * UBICACIÓN: src/features/publications/components/PriceSearchFilter.jsx
 */

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * @param {Object}   filters          - Filtros actuales
 * @param {Function} onFiltersChange  - (newFilters) => void
 * @param {Function} onClearFilters   - () => void
 * @param {boolean}  open             - Controla si el panel de filtros está visible
 */
export function PriceSearchFilter({
  filters = {},
  onFiltersChange,
  onClearFilters,
  open = false,
}) {
  const { t } = useLanguage();
  const tf = t.priceFilter;

  const [localFilters, setLocalFilters] = useState(filters);

  // Sincronizar cuando el padre actualiza filters externamente
  // (ej: barra de búsqueda superior cambia productName)
  useEffect(() => {
    setLocalFilters((prev) => {
      const keys = ['productName', 'storeName', 'minPrice', 'maxPrice', 'maxDistance', 'sortBy'];
      return keys.some((k) => prev[k] !== filters[k]) ? { ...filters } : prev;
    });
  }, [filters]);

  const activeFiltersCount = Object.values(localFilters).filter(
    (v) => v !== null && v !== '' && v !== 'recent'
  ).length;

  const handleInputChange = (field, value) => {
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onFiltersChange?.(updated);
  };

  const handleRangeChange = (minOrMax, value) => {
    const numValue = value ? Number(value) : null;
    const updated = { ...localFilters, [minOrMax]: numValue };
    setLocalFilters(updated);
    onFiltersChange?.(updated);
  };

  const handleClear = () => {
    const cleared = {
      productName: '',
      storeName: '',
      minPrice: null,
      maxPrice: null,
      maxDistance: null,
      sortBy: 'recent',
    };
    setLocalFilters(cleared);
    onClearFilters?.();
  };

  return (
    <div>
      {/* Tags de filtros activos — siempre visibles si hay filtros */}
      {activeFiltersCount > 0 && (
        <div style={styles.tags}>
          {localFilters.productName && (
            <span style={styles.tag}>
              {localFilters.productName}
              <button style={styles.tagClose} onClick={() => handleInputChange('productName', '')}>✕</button>
            </span>
          )}
          {localFilters.storeName && (
            <span style={styles.tag}>
              {localFilters.storeName}
              <button style={styles.tagClose} onClick={() => handleInputChange('storeName', '')}>✕</button>
            </span>
          )}
          {localFilters.minPrice && (
            <span style={styles.tag}>
              ${localFilters.minPrice}+
              <button style={styles.tagClose} onClick={() => handleRangeChange('minPrice', '')}>✕</button>
            </span>
          )}
          {localFilters.maxPrice && (
            <span style={styles.tag}>
              {tf.maxLabel(localFilters.maxPrice)}
              <button style={styles.tagClose} onClick={() => handleRangeChange('maxPrice', '')}>✕</button>
            </span>
          )}
          {localFilters.maxDistance && (
            <span style={styles.tag}>
              {localFilters.maxDistance}km
              <button style={styles.tagClose} onClick={() => handleRangeChange('maxDistance', '')}>✕</button>
            </span>
          )}
        </div>
      )}

      {/* Panel de filtros — solo cuando open === true */}
      {open && (
        <div style={styles.panel}>
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.product}</label>
              <input
                type="text"
                placeholder={tf.productPlaceholder}
                value={localFilters.productName || ''}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.store}</label>
              <input
                type="text"
                placeholder={tf.storePlaceholder}
                value={localFilters.storeName || ''}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.minPrice}</label>
              <div style={styles.inputGroup}>
                <span style={styles.currency}>$</span>
                <input
                  type="number"
                  placeholder="0"
                  value={localFilters.minPrice || ''}
                  onChange={(e) => handleRangeChange('minPrice', e.target.value)}
                  style={styles.inputWithPrefix}
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.maxPrice}</label>
              <div style={styles.inputGroup}>
                <span style={styles.currency}>$</span>
                <input
                  type="number"
                  placeholder="999999"
                  value={localFilters.maxPrice || ''}
                  onChange={(e) => handleRangeChange('maxPrice', e.target.value)}
                  style={styles.inputWithPrefix}
                />
              </div>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.distance}</label>
              <input
                type="number"
                placeholder={tf.distancePlaceholder}
                value={localFilters.maxDistance || ''}
                onChange={(e) => handleRangeChange('maxDistance', e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.sortBy}</label>
              <select
                value={localFilters.sortBy || 'recent'}
                onChange={(e) => handleInputChange('sortBy', e.target.value)}
                style={styles.select}
              >
                <option value="recent">{tf.recent}</option>
                <option value="validated">{tf.validated}</option>
                <option value="cheapest">{tf.cheapest}</option>
                <option value="best_match">Mejor opción</option>
              </select>
            </div>
          </div>

          <div style={styles.actions}>
            <button style={styles.clearBtn} onClick={handleClear}>
              {tf.clearFilters}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginTop: '10px',
  },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    background: 'var(--accent-soft)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },
  tagClose: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '11px',
    padding: '0',
    lineHeight: 1,
  },
  panel: {
    marginTop: '12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '16px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  input: {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontFamily: 'inherit',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
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
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  inputWithPrefix: {
    padding: '8px 12px 8px 28px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
  },
  select: {
    padding: '8px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontFamily: 'inherit',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  clearBtn: {
    padding: '7px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};

export default PriceSearchFilter;
