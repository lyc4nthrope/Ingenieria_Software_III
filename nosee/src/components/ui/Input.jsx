/**
 * Input - Componente de campo de texto
 *
 * Incluye: label, error, helper text, icono izquierdo/derecho
 */
import { useState } from 'react';

export default function Input({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  helper,
  iconLeft,
  iconRight,
  disabled = false,
  required = false,
  autoComplete,
  style = {},
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const inputId = id || name;

  const wrapperStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: '500',
    color: error ? 'var(--error)' : 'var(--text-secondary)',
    letterSpacing: '0.02em',
  };

  const fieldWrapperStyle = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const inputStyle = {
    width: '100%',
    height: '44px',
    padding: iconLeft ? '0 44px 0 44px' : iconRight ? '0 44px 0 16px' : '0 16px',
    fontSize: '14px',
    color: 'var(--text-primary)',
    background: 'var(--bg-surface)',
    border: `1px solid ${error ? 'var(--error)' : focused ? 'var(--accent)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
    boxShadow: focused && !error ? '0 0 0 3px var(--accent-glow)' : 'none',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'text',
    ...style,
  };

  const iconStyle = {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    color: focused ? 'var(--accent)' : 'var(--text-muted)',
    pointerEvents: 'none',
    transition: 'color 0.18s ease',
    display: 'flex',
    alignItems: 'center',
  };

  const helperStyle = {
    fontSize: '12px',
    color: error ? 'var(--error)' : 'var(--text-muted)',
    marginTop: '2px',
  };

  return (
    <div style={wrapperStyle}>
      {label && (
        <label htmlFor={inputId} style={labelStyle}>
          {label}
          {required && <span style={{ color: 'var(--error)', marginLeft: '3px' }}>*</span>}
        </label>
      )}

      <div style={fieldWrapperStyle}>
        {iconLeft && (
          <span style={{ ...iconStyle, left: '14px' }}>
            {iconLeft}
          </span>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          style={inputStyle}
          {...props}
        />

        {iconRight && (
          <span style={{ ...iconStyle, right: '14px' }}>
            {iconRight}
          </span>
        )}
      </div>

      {(error || helper) && (
        <span style={helperStyle}>{error || helper}</span>
      )}
    </div>
  );
}