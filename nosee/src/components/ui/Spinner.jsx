/**
 * Spinner / PageLoader - Indicadores de carga
 */

/**
 * Spinner inline
 */
export function Spinner({ size = 20, color = 'var(--accent)' }) {
  return (
    <span
      role="status"
      aria-label="Cargando..."
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${color}30`,
        borderTopColor: color,
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

/**
 * Loader de página completa — bloquea la vista mientras se inicializa la app
 */
export function PageLoader({ message = 'Cargando...' }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
        background: 'var(--bg-base)',
      }}
    >
      {/* Logo mark */}
      <div
        style={{
          fontSize: '28px',
          fontWeight: '800',
          letterSpacing: '-0.04em',
          color: 'var(--accent)',
          marginBottom: '4px',
        }}
      >
        NØ<span style={{ color: 'var(--text-secondary)' }}>SEE</span>
      </div>

      <Spinner size={32} />

      <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}

export default Spinner;