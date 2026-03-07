import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { listStores } from '@/services/api/stores.api';

const EMPTY_FILTERS = {};
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

function ensureLeafletLoaded() {
  if (window.L) return Promise.resolve(window.L);
  if (window.__leafletLoaderPromise) return window.__leafletLoaderPromise;

  window.__leafletLoaderPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-leaflet-css="${LEAFLET_CSS_URL}"]`)) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS_URL;
      css.dataset.leafletCss = LEAFLET_CSS_URL;
      document.head.appendChild(css);
    }

    const existing = document.querySelector(`script[data-leaflet-js="${LEAFLET_JS_URL}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L));
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Leaflet')));
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.dataset.leafletJs = LEAFLET_JS_URL;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error('No se pudo cargar Leaflet'));
    document.body.appendChild(script);
  }).catch((err) => {
    window.__leafletLoaderPromise = null;
    throw err;
  });

  return window.__leafletLoaderPromise;
}

function StoreMapModal({ store, onClose }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const L = await ensureLeafletLoaded();
        if (!mounted || !containerRef.current) return;
        if (mapRef.current) return;

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });

        const map = L.map(containerRef.current).setView([store.latitude, store.longitude], 16);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
        }).addTo(map);

        L.marker([store.latitude, store.longitude])
          .addTo(map)
          .bindPopup(store.name)
          .openPopup();
      } catch (err) {
        if (mounted) setMapError(err.message);
      }
    }

    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ubicación de ${store.name}`}
      style={mapModalStyles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div style={mapModalStyles.modal}>
        <div style={mapModalStyles.header}>
          <div>
            <span style={mapModalStyles.title}>📍 {store.name}</span>
            {store.address && (
              <p style={mapModalStyles.address}>{store.address}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Cerrar mapa"
            onClick={onClose}
            style={mapModalStyles.closeBtn}
          >
            ✕
          </button>
        </div>
        {mapError ? (
          <div style={mapModalStyles.error}>No se pudo cargar el mapa</div>
        ) : (
          <div ref={containerRef} style={mapModalStyles.mapContainer} />
        )}
      </div>
    </div>
  );
}

const mapModalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    width: '90%',
    maxWidth: '480px',
    overflow: 'hidden',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
    gap: '12px',
  },
  title: {
    fontWeight: 700,
    fontSize: '15px',
    color: 'var(--text-primary)',
    display: 'block',
  },
  address: {
    margin: '4px 0 0',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: 'var(--text-muted)',
    padding: '2px 6px',
    flexShrink: 0,
    lineHeight: 1,
  },
  mapContainer: {
    width: '100%',
    height: '300px',
  },
  error: {
    padding: '40px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '14px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};

function StoreCombobox({ value, onStoreChange, placeholder, inputStyle }) {
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [mapOpen, setMapOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (value !== query) {
      setQuery(value || '');
      if (!value) setSelectedStore(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const searchStores = (text) => {
    clearTimeout(debounceRef.current);
    if (!text || text.trim().length < 1) {
      setOptions([]);
      setIsOpen(false);
      return;
    }
    setLoadingOptions(true);
    debounceRef.current = setTimeout(async () => {
      const result = await listStores(text.trim(), 20);
      if (result.success) {
        setOptions(result.data);
        setIsOpen(result.data.length > 0);
      }
      setLoadingOptions(false);
    }, 300);
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedStore(null);
    onStoreChange(val, null);
    searchStores(val);
  };

  const handleSelect = (store) => {
    setQuery(store.name);
    setSelectedStore(store);
    setIsOpen(false);
    onStoreChange(store.name, store);
  };

  const handleClear = () => {
    setQuery('');
    setSelectedStore(null);
    setIsOpen(false);
    setOptions([]);
    onStoreChange('', null);
  };

  const hasLocation = selectedStore &&
    Number.isFinite(selectedStore.latitude) &&
    Number.isFinite(selectedStore.longitude) &&
    selectedStore.type === 'physical';

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          value={query}
          onChange={handleInput}
          placeholder={placeholder}
          aria-label={placeholder || 'Buscar tienda'}
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls="store-search-listbox"
          onFocus={() => { if (options.length > 0) setIsOpen(true); }}
          autoComplete="off"
          style={{
            ...inputStyle,
            paddingRight: (hasLocation || query) ? '60px' : '12px',
          }}
        />
        <div style={comboStyles.inputActions}>
          {loadingOptions && (
            <span style={comboStyles.loadingDot}>⋯</span>
          )}
          {hasLocation && (
            <button
              type="button"
              title="Ver ubicación en mapa"
              aria-label="Ver ubicación de la tienda en el mapa"
              onClick={() => setMapOpen(true)}
              style={comboStyles.mapBtn}
            >
              📍
            </button>
          )}
          {query && (
            <button
              type="button"
              aria-label="Limpiar tienda"
              onClick={handleClear}
              style={comboStyles.clearBtn}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {isOpen && options.length > 0 && (
        <div id="store-search-listbox" style={comboStyles.dropdown} role="listbox">
          {options.map((store) => (
            <button
              key={store.id}
              type="button"
              role="option"
              style={comboStyles.option}
              onClick={() => handleSelect(store)}
            >
              <span aria-hidden="true">
                {store.type === 'physical' ? '🏬' : '🌐'}
              </span>
              <span style={comboStyles.optionName}>{store.name}</span>
              {store.type === 'physical' && Number.isFinite(store.latitude) && (
                <span style={comboStyles.optionBadge}>📍 Con mapa</span>
              )}
            </button>
          ))}
        </div>
      )}

      {mapOpen && hasLocation && (
        <StoreMapModal store={selectedStore} onClose={() => setMapOpen(false)} />
      )}
    </div>
  );
}

const comboStyles = {
  inputActions: {
    position: 'absolute',
    right: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  loadingDot: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    letterSpacing: '1px',
  },
  dropdown: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    left: 0,
    right: 0,
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    zIndex: 50,
    maxHeight: '220px',
    overflowY: 'auto',
    boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
  },
  option: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '9px 12px',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    textAlign: 'left',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  optionName: {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  optionBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    borderRadius: '99px',
    flexShrink: 0,
    fontWeight: 600,
  },
  mapBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '15px',
    padding: '2px 3px',
    lineHeight: 1,
  },
  clearBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '11px',
    color: 'var(--text-muted)',
    padding: '2px 3px',
    lineHeight: 1,
  },
};

/**
 * @param {Object}   filters          - Filtros actuales
 * @param {Function} onFiltersChange  - (newFilters) => void
 * @param {Function} onClearFilters   - () => void
 * @param {boolean}  open             - Controla si el panel de filtros está visible
 * @param {boolean}  distanceLoading  - true mientras se obtiene la geolocalización
 */
export function PriceSearchFilter({
  filters = EMPTY_FILTERS,
  onFiltersChange,
  onClearFilters,
  open = false,
  distanceLoading = false,
}) {
  const { t } = useLanguage();
  const tf = t.priceFilter;

  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters((prev) => {
      const keys = ['productName', 'storeName', 'minPrice', 'maxPrice', 'maxDistance', 'sortBy'];
      return keys.some((k) => prev[k] !== filters[k]) ? { ...filters } : prev;
    });
  }, [filters]);

  const activeFiltersCount = Object.entries(localFilters).filter(([k, v]) => {
    if (k === 'sortBy') return v && v !== 'recent';
    return v !== null && v !== '';
  }).length;

  const handleInputChange = (field, value) => {
    const updated = { ...localFilters, [field]: value };
    setLocalFilters(updated);
    onFiltersChange?.(updated);
  };

  const handleStoreChange = (name, storeObj) => {
    const updated = { ...localFilters, storeName: name };
    setLocalFilters(updated);
    onFiltersChange?.(updated, storeObj);
  };

  const handleRangeChange = (minOrMax, value) => {
    if (value === '') {
      const updated = { ...localFilters, [minOrMax]: null };
      setLocalFilters(updated);
      onFiltersChange?.(updated);
      return;
    }

    const parsedValue = Number(value);
    if (!Number.isFinite(parsedValue)) return;

    const numValue = Math.max(0, parsedValue);
    const updated = { ...localFilters, [minOrMax]: numValue };
    setLocalFilters(updated);
    onFiltersChange?.(updated);
  };

  const blockNegativeKeys = (e) => {
    if (e.key === '-' || e.key === 'Minus') {
      e.preventDefault();
    }
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

  const applyFiltersNow = () => {
    onFiltersChange?.(localFilters);
  };

  return (
    <div>
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
              🏬 {localFilters.storeName}
              <button style={styles.tagClose} onClick={() => handleStoreChange('', null)}>✕</button>
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
          {localFilters.sortBy && localFilters.sortBy !== 'recent' && (
            <span style={styles.tag}>
              {localFilters.sortBy === 'cheapest' ? tf.cheapest : localFilters.sortBy === 'validated' ? tf.validated : 'Mejor opción'}
              <button style={styles.tagClose} onClick={() => handleInputChange('sortBy', 'recent')}>✕</button>
            </span>
          )}
        </div>
      )}

      {open && (
        <div style={styles.panel}>
          <div style={{ ...styles.row, gridTemplateColumns: '1fr' }}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.store}</label>
              <StoreCombobox
                value={localFilters.storeName || ''}
                onStoreChange={handleStoreChange}
                placeholder={tf.storePlaceholder}
                inputStyle={styles.input}
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
                  value={localFilters.minPrice ?? ''}
                  onChange={(e) => handleRangeChange('minPrice', e.target.value)}
                  onKeyDown={(e) => {
                    blockNegativeKeys(e);
                    if (e.key === 'Enter') { e.preventDefault(); applyFiltersNow(); }
                  }}
                  min="0"
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
                  value={localFilters.maxPrice ?? ''}
                  onChange={(e) => handleRangeChange('maxPrice', e.target.value)}
                  onKeyDown={(e) => {
                    blockNegativeKeys(e);
                    if (e.key === 'Enter') { e.preventDefault(); applyFiltersNow(); }
                  }}
                  min="0"
                  style={styles.inputWithPrefix}
                />
              </div>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.distance}</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  placeholder={tf.distancePlaceholder}
                  value={localFilters.maxDistance || ''}
                  onChange={(e) => handleRangeChange('maxDistance', e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyFiltersNow(); } }}
                  style={{
                    ...styles.input,
                    paddingRight: distanceLoading ? '80px' : '12px',
                  }}
                />
                {distanceLoading && (
                  <span style={styles.distanceLoadingBadge}>
                    📡 Buscando...
                  </span>
                )}
              </div>
              {distanceLoading && (
                <p style={styles.distanceHint}>Obteniendo tu ubicación...</p>
              )}
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>{tf.sortBy}</label>
              <select
                value={localFilters.sortBy || 'recent'}
                onChange={(e) => handleInputChange('sortBy', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyFiltersNow(); } }}
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
    width: '100%',
    boxSizing: 'border-box',
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
    zIndex: 1,
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
    boxSizing: 'border-box',
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
  distanceLoadingBadge: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '11px',
    color: 'var(--accent)',
    fontWeight: 600,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  distanceHint: {
    margin: '4px 0 0',
    fontSize: '11px',
    color: 'var(--accent)',
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
