/**
 * LoginForm - Formulario de inicio de sesión
 *
 * Componente "tonto": solo maneja el estado del form y llama a onSubmit.
 * La lógica de auth vive en el store (authStore.js).
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// Íconos
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 7l10 7 10-7"/>
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

export default function LoginForm({ onSubmit, loading = false, error = null }) {
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Limpiar error del campo cuando el usuario escribe
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.email) errors.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email inválido';
    if (!form.password) errors.password = 'La contraseña es requerida';
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    onSubmit(form.email, form.password);
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
    >
      {/* Error global del servidor */}
      {error && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--error-soft)',
            border: '1px solid rgba(248,113,113,0.25)',
            color: 'var(--error)',
            fontSize: '13px',
            lineHeight: '1.5',
          }}
        >
          {error}
        </div>
      )}

      <Input
        label="Correo electrónico"
        id="login-email"
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        placeholder="tucorreo@ejemplo.com"
        error={fieldErrors.email}
        iconLeft={<MailIcon />}
        autoComplete="email"
        required
        disabled={loading}
      />

      <Input
        label="Contraseña"
        id="login-password"
        name="password"
        type={showPassword ? 'text' : 'password'}
        value={form.password}
        onChange={handleChange}
        placeholder="••••••••"
        error={fieldErrors.password}
        iconLeft={<LockIcon />}
        iconRight={
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
            tabIndex={-1}
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <EyeIcon open={showPassword} />
          </button>
        }
        autoComplete="current-password"
        required
        disabled={loading}
      />

      {/* Olvidé contraseña */}
      <div style={{ textAlign: 'right', marginTop: '-10px' }}>
        <Link
          to="/recuperar-contrasena"
          style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      <Button
        type="submit"
        fullWidth
        loading={loading}
        disabled={loading}
        size="lg"
        style={{ marginTop: '4px' }}
      >
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </Button>

      {/* Registro */}
      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        ¿No tienes cuenta?{' '}
        <Link
          to="/registro"
          style={{ color: 'var(--accent)', fontWeight: '500', textDecoration: 'none' }}
        >
          Regístrate gratis
        </Link>
      </p>
    </form>
  );
}