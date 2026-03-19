import { DEFAULT_PREFS } from '../utils/shoppingListUtils';
import { optim } from '../styles/shoppingListStyles';

// ─── Panel de configuración de optimización ───────────────────────────────────
export function OptimSettingsPanel({ prefs, savePrefs, coordsAvailable, onRequestCoords }) {
  const SORT_MODES = [
    { key: 'cheapest', label: '💰 Más barato', desc: 'Prioriza el precio más bajo' },
    { key: 'nearest',  label: '📍 Más cerca',  desc: 'Prioriza tiendas cercanas' },
    { key: 'balanced', label: '⚖️ Equilibrado', desc: 'Precio y distancia combinados' },
  ];
  const STORE_TYPES = [
    { key: 'all',      label: 'Todas' },
    { key: 'physical', label: '🏪 Física' },
    { key: 'online',   label: '🌐 En línea' },
  ];

  const needsCoords = prefs.sortMode === 'nearest' || prefs.sortMode === 'balanced';

  return (
    <div style={optim.panel}>
      <div style={optim.panelHeader}>
        <span style={optim.panelTitle}>Configuración de optimización</span>
        <button
          type="button"
          onClick={() => savePrefs({ ...DEFAULT_PREFS })}
          style={optim.resetBtn}
          title="Restablecer por defecto"
        >
          Restablecer
        </button>
      </div>

      {/* ── Modo de ordenamiento ──────────────────────────────── */}
      <div style={optim.section}>
        <p style={optim.sectionLabel}>Prioridad de búsqueda</p>
        <div style={optim.segmentRow}>
          {SORT_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => savePrefs({ sortMode: m.key })}
              style={{
                ...optim.segmentBtn,
                ...(prefs.sortMode === m.key ? optim.segmentBtnActive : {}),
              }}
              title={m.desc}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p style={optim.sectionHint}>
          {SORT_MODES.find((m) => m.key === prefs.sortMode)?.desc}
        </p>
      </div>

      {/* ── Distancia máxima ──────────────────────────────────── */}
      <div style={optim.section}>
        <div style={optim.sliderHeader}>
          <p style={optim.sectionLabel}>Distancia máxima</p>
          <span style={optim.sliderValue}>{prefs.maxDistance} km</span>
        </div>
        <div style={optim.sliderWrap}>
          <span style={optim.sliderEdge}>1 km</span>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={prefs.maxDistance}
            onChange={(e) => savePrefs({ maxDistance: Number(e.target.value) })}
            style={optim.slider}
            aria-label="Distancia máxima de búsqueda"
          />
          <span style={optim.sliderEdge}>15 km</span>
        </div>
        <p style={optim.sectionHint}>
          {needsCoords
            ? 'Se usa para filtrar tiendas cercanas'
            : 'Solo aplica en modo "Más cerca" o "Equilibrado"'}
        </p>
        {needsCoords && !coordsAvailable && (
          <button type="button" onClick={onRequestCoords} style={optim.locationBtn}>
            📍 Permitir acceso a mi ubicación
          </button>
        )}
        {needsCoords && coordsAvailable && (
          <p style={{ ...optim.sectionHint, color: 'var(--success, #16a34a)', fontWeight: 600, margin: 0 }}>
            ✓ Ubicación disponible
          </p>
        )}
      </div>

      {/* ── Tipo de tienda ────────────────────────────────────── */}
      <div style={optim.section}>
        <p style={optim.sectionLabel}>Tipo de tienda</p>
        <div style={optim.segmentRow}>
          {STORE_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => savePrefs({ storeType: t.key })}
              style={{
                ...optim.segmentBtn,
                ...(prefs.storeType === t.key ? optim.segmentBtnActive : {}),
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Solo validadas ────────────────────────────────────── */}
      <div style={optim.section}>
        <label style={optim.toggleRow}>
          <span style={optim.sectionLabel}>Solo publicaciones validadas</span>
          <div
            role="switch"
            aria-checked={prefs.validatedOnly}
            tabIndex={0}
            onClick={() => savePrefs({ validatedOnly: !prefs.validatedOnly })}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') savePrefs({ validatedOnly: !prefs.validatedOnly }); }}
            style={{
              ...optim.toggle,
              background: prefs.validatedOnly ? 'var(--accent)' : 'var(--border)',
            }}
          >
            <div style={{
              ...optim.toggleThumb,
              transform: prefs.validatedOnly ? 'translateX(18px)' : 'translateX(2px)',
            }} />
          </div>
        </label>
        <p style={optim.sectionHint}>Muestra solo las publicaciones verificadas por la comunidad</p>
      </div>
    </div>
  );
}
