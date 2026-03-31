import { cn } from '@/lib/cn';
import { DEFAULT_PREFS } from '../utils/shoppingListUtils';

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
    <div className="flex flex-col gap-3.5 bg-surface border border-accent rounded-md p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-primary uppercase tracking-[0.05em]">
          Configuración de optimización
        </span>
        <button
          type="button"
          onClick={() => savePrefs({ ...DEFAULT_PREFS })}
          className="text-[11px] text-muted underline cursor-pointer bg-transparent border-none p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          title="Restablecer por defecto"
        >
          Restablecer
        </button>
      </div>

      {/* ── Modo de ordenamiento ──────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold text-secondary uppercase tracking-[0.04em] m-0">
          Prioridad de búsqueda
        </p>
        <div className="flex gap-1">
          {SORT_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => savePrefs({ sortMode: m.key })}
              title={m.desc}
              className={cn(
                'flex-1 py-[7px] px-1 rounded-sm border text-xs font-semibold cursor-pointer transition-all text-center whitespace-nowrap overflow-hidden text-ellipsis min-h-[44px] md:min-h-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                prefs.sortMode === m.key
                  ? 'bg-accent-soft text-accent border-accent font-bold'
                  : 'bg-elevated text-secondary border-line',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted m-0">
          {SORT_MODES.find((m) => m.key === prefs.sortMode)?.desc}
        </p>
      </div>

      {/* ── Distancia máxima ──────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-secondary uppercase tracking-[0.04em] m-0">
            Distancia máxima
          </p>
          <span className="text-[13px] font-extrabold text-accent">
            {prefs.maxDistance} km
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted font-semibold shrink-0">1 km</span>
          <input
            type="range"
            min={1}
            max={15}
            step={1}
            value={prefs.maxDistance}
            onChange={(e) => savePrefs({ maxDistance: Number(e.target.value) })}
            className="flex-1 h-1 cursor-pointer accent-[var(--accent)]"
            aria-label="Distancia máxima de búsqueda"
          />
          <span className="text-[10px] text-muted font-semibold shrink-0">15 km</span>
        </div>
        <p className="text-[11px] text-muted m-0">
          {needsCoords
            ? 'Se usa para filtrar tiendas cercanas'
            : 'Solo aplica en modo "Más cerca" o "Equilibrado"'}
        </p>
        {needsCoords && !coordsAvailable && (
          <button
            type="button"
            onClick={onRequestCoords}
            className="self-start py-[7px] px-3 rounded-sm border border-accent bg-accent-soft text-accent text-xs font-bold cursor-pointer min-h-[44px] md:min-h-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            📍 Permitir acceso a mi ubicación
          </button>
        )}
        {needsCoords && coordsAvailable && (
          <p className="text-[11px] text-success font-semibold m-0">
            ✓ Ubicación disponible
          </p>
        )}
      </div>

      {/* ── Tipo de tienda ────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold text-secondary uppercase tracking-[0.04em] m-0">
          Tipo de tienda
        </p>
        <div className="flex gap-1">
          {STORE_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => savePrefs({ storeType: t.key })}
              className={cn(
                'flex-1 py-[7px] px-1 rounded-sm border text-xs font-semibold cursor-pointer transition-all text-center whitespace-nowrap overflow-hidden text-ellipsis min-h-[44px] md:min-h-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                prefs.storeType === t.key
                  ? 'bg-accent-soft text-accent border-accent font-bold'
                  : 'bg-elevated text-secondary border-line',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Solo validadas ────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-[11px] font-bold text-secondary uppercase tracking-[0.04em] m-0">
            Solo publicaciones validadas
          </span>
          <div
            role="switch"
            aria-checked={prefs.validatedOnly}
            tabIndex={0}
            onClick={() => savePrefs({ validatedOnly: !prefs.validatedOnly })}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') savePrefs({ validatedOnly: !prefs.validatedOnly }); }}
            className={cn(
              'relative w-[38px] h-[22px] rounded-full cursor-pointer transition-colors duration-200 shrink-0 border-none outline-none',
              'focus-visible:ring-2 focus-visible:ring-accent',
              prefs.validatedOnly ? 'bg-accent' : 'bg-line',
            )}
          >
            <div
              className={cn(
                'absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200',
                prefs.validatedOnly ? 'translate-x-[18px]' : 'translate-x-[2px]',
              )}
            />
          </div>
        </label>
        <p className="text-[11px] text-muted m-0">
          Muestra solo las publicaciones verificadas por la comunidad
        </p>
      </div>
    </div>
  );
}
