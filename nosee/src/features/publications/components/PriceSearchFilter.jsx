/**
 * PriceSearchFilter.jsx
 *
 * Barra de filtros para publicaciones de precios
 * Incluye: búsqueda, rango de precio, distancia, ordenamiento
 *
 * UBICACIÓN: src/features/publications/components/PriceSearchFilter.jsx
 * FECHA: 26-02-2026
 * STATUS: Paso 3c de Proceso 2
 *
 * PROPS:
 * - filters: {Object} Filtros actuales
 * - onFiltersChange: {Function} Callback cuando cambian filtros
 * - onClearFilters: {Function} Callback para limpiar filtros
 *
 * FEATURES:
 * - Búsqueda por producto
 * - Búsqueda por tienda
 * - Rango de precio
 * - Filtro de distancia
 * - Ordenamiento (reciente, validadas, precio)
 * - Botón limpiar
 */

import { useState } from 'react';

/**
 * Componente: PriceSearchFilter
 * Barra de filtros para búsqueda y filtrado de publicaciones
 *
 * @param {Object} filters - Filtros actuales { productName, storeName, minPrice, maxPrice, maxDistance, sortBy }
 * @param {Function} onFiltersChange - Callback: (newFilters) => void
 * @param {Function} onClearFilters - Callback: () => void
 *
 * @example
 * <PriceSearchFilter
 *   filters={filters}
 *   onFiltersChange={(f) => setFilters(f)}
 *   onClearFilters={() => clearFilters()}
 * />
 */
export function PriceSearchFilter({
  filters = {},
  onFiltersChange,
  onClearFilters,
}) {
  // ─── Estados ───────────────────────────────────────────────────────────────

  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  // Contar filtros activos
  const activeFiltersCount = Object.values(localFilters).filter(
    (v) => v !== null && v !== '' && v !== 'recent'
  ).length;

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleInputChange = (field, value) => {
    const updated = {
      ...localFilters,
      [field]: value,
    };
    setLocalFilters(updated);
    onFiltersChange?.(updated);
  };

  const handleRangeChange = (minOrMax, value) => {
    const numValue = value ? Number(value) : null;
    const updated = {
      ...localFilters,
      [minOrMax]: numValue,
    };
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header: Título y botón expandir */}
      <div style={styles.header}>
        <div style={styles.title}>
          🔍 Filtros
          {activeFiltersCount > 0 && (
            <span style={styles.badge}>{activeFiltersCount}</span>
          )}
        </div>

        <button
          style={styles.toggleButton}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {/* Filtros expandidos */}
      {isExpanded && (
        <div style={styles.content}>
          {/* Fila 1: Búsquedas */}
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>🛒 Producto</label>
              <input
                type="text"
                placeholder="Buscar producto..."
                value={localFilters.productName || ''}
                onChange={(e) => handleInputChange('productName', e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>🏪 Tienda</label>
              <input
                type="text"
                placeholder="Buscar tienda..."
                value={localFilters.storeName || ''}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                style={styles.input}
              />
            </div>
          </div>

          {/* Fila 2: Rango de precio */}
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>💰 Precio mínimo</label>
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
              <label style={styles.label}>💰 Precio máximo</label>
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

          {/* Fila 3: Distancia y Ordenamiento */}
          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>📍 Distancia máxima (km)</label>
              <input
                type="number"
                placeholder="Sin límite"
                value={localFilters.maxDistance || ''}
                onChange={(e) =>
                  handleRangeChange('maxDistance', e.target.value)
                }
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>📊 Ordenar por</label>
              <select
                value={localFilters.sortBy || 'recent'}
                onChange={(e) => handleInputChange('sortBy', e.target.value)}
                style={styles.select}
              >
                <option value="recent">Más reciente</option>
                <option value="validated">Más validadas</option>
                <option value="cheapest">Más barato</option>
              </select>
            </div>
          </div>

          {/* Botones de acción */}
          <div style={styles.actions}>
            <button
              style={{ ...styles.button, ...styles.buttonSecondary }}
              onClick={handleClear}
            >
              🗑 Limpiar filtros
            </button>

            <div style={styles.spacer}></div>

            {activeFiltersCount > 0 && (
              <div style={styles.filterSummary}>
                {activeFiltersCount === 1 ? '1 filtro activo' : `${activeFiltersCount} filtros activos`}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtros minimizados: mostrar activos */}
      {!isExpanded && activeFiltersCount > 0 && (
        <div style={styles.minimized}>
          {localFilters.productName && (
            <span style={styles.tag}>
              🛒 {localFilters.productName}
              <button
                style={styles.tagClose}
                onClick={() => handleInputChange('productName', '')}
              >
                ✕
              </button>
            </span>
          )}

          {localFilters.storeName && (
            <span style={styles.tag}>
              🏪 {localFilters.storeName}
              <button
                style={styles.tagClose}
                onClick={() => handleInputChange('storeName', '')}
              >
                ✕
              </button>
            </span>
          )}

          {localFilters.minPrice && (
            <span style={styles.tag}>
              💰 ${localFilters.minPrice}+
              <button
                style={styles.tagClose}
                onClick={() => handleRangeChange('minPrice', '')}
              >
                ✕
              </button>
            </span>
          )}

          {localFilters.maxPrice && (
            <span style={styles.tag}>
              💰 Máx ${localFilters.maxPrice}
              <button
                style={styles.tagClose}
                onClick={() => handleRangeChange('maxPrice', '')}
              >
                ✕
              </button>
            </span>
          )}

          {localFilters.maxDistance && (
            <span style={styles.tag}>
              📍 {localFilters.maxDistance}km
              <button
                style={styles.tagClose}
                onClick={() => handleRangeChange('maxDistance', '')}
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '20px',
    overflow: 'hidden',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#fafafa',
    cursor: 'pointer',
    borderBottom: '1px solid #e0e0e0',
  },

  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  badge: {
    background: '#ff6b35',
    color: '#fff',
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 600,
  },

  toggleButton: {
    background: 'none',
    border: 'none',
    fontSize: '12px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px 8px',
  },

  content: {
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
    color: '#333',
    marginBottom: '6px',
  },

  input: {
    padding: '8px 12px',
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
    padding: '8px 12px 8px 28px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    width: '100%',
  },

  select: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
    background: '#fff',
  },

  actions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },

  button: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  buttonSecondary: {
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #ddd',
  },

  spacer: {
    flex: 1,
  },

  filterSummary: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 500,
  },

  // Filtros minimizados
  minimized: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    padding: '12px 16px',
    background: '#f0f0f0',
  },

  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#ff6b35',
    color: '#fff',
    padding: '4px 10px',
    borderRadius: '16px',
    fontSize: '12px',
    fontWeight: 500,
  },

  tagClose: {
    background: 'none',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '0',
    marginLeft: '2px',
  },
};

export default PriceSearchFilter;