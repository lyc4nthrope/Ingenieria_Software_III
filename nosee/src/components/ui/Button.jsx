/**
 * Button - Componente base de botón
 *
 * Variantes: primary | secondary | ghost | danger
 * Tamaños: sm | md | lg
 */

const styles = {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'inherit',
    fontWeight: '600',
    borderRadius: 'var(--radius-md)',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.18s ease',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    textDecoration: 'none',
  },

  sizes: {
    sm: { padding: '6px 14px', fontSize: '13px', height: '34px' },
    md: { padding: '9px 20px', fontSize: '14px', height: '42px' },
    lg: { padding: '12px 28px', fontSize: '15px', height: '50px' },
  },

  variants: {
    primary: {
      background: 'var(--accent)',
      color: 'var(--bg-base)',
      borderColor: 'var(--accent)',
    },
    secondary: {
      background: 'var(--bg-elevated)',
      color: 'var(--text-primary)',
      borderColor: 'var(--border-soft)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      borderColor: 'transparent',
    },
    danger: {
      background: 'var(--error-soft)',
      color: 'var(--error)',
      borderColor: 'rgba(248,113,113,0.3)',
    },
  },

  disabled: {
    opacity: '0.45',
    cursor: 'not-allowed',
    pointerEvents: 'none',
  },

  fullWidth: {
    width: '100%',
  },
};

const EMPTY_STYLE = {};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
  onClick,
  style = EMPTY_STYLE,
  ...props
}) {
  const buttonStyle = {
    ...styles.base,
    ...styles.sizes[size],
    ...styles.variants[variant],
    ...(disabled || loading ? styles.disabled : {}),
    ...(fullWidth ? styles.fullWidth : {}),
    ...style,
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading || undefined}
      style={buttonStyle}
      {...props}
    >
      {loading && (
        <span
          aria-hidden="true"
          style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '2px solid currentColor',
            borderTopColor: 'transparent',
            animation: 'spin 0.7s linear infinite',
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </button>
  );
}   