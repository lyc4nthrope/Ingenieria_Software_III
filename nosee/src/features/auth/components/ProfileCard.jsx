/**
 * RegisterForm - Formulario de registro de nuevo usuario
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

const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// Reglas de contraseña
const passwordRules = [
  { label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
  { label: 'Una letra mayúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Un número', test: (v) => /\d/.test(v) },
];

export default function RegisterForm({ onSubmit, loading = false, error = null }) {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const errors = {};
    if (!form.fullName.trim()) errors.fullName = 'El nombre es requerido';
    if (!form.email) errors.email = 'El email es requerido';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email inválido';
    if (!form.password) errors.password = 'La contraseña es requerida';
    else if (!passwordRules.every(r => r.test(form.password))) errors.password = 'La contraseña no cumple los requisitos';
    if (!form.confirmPassword) errors.confirmPassword = 'Confirma tu contraseña';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden';
    return errors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    onSubmit(form.email, form.password, { fullName: form.fullName });
  };

  const pwdStrength = passwordRules.filter(r => r.test(form.password)).length;

  return (
    <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Error global */}
      {error && (
        <div role="alert" style={{
          padding: '12px 16px', borderRadius: 'var(--radius-md)',
          background: 'var(--error-soft)', border: '1px solid rgba(248,113,113,0.25)',
          color: 'var(--error)', fontSize: '13px',
        }}>
          {error}
        </div>
      )}

      <Input
        label="Nombre completo"
        id="reg-fullname"
        name="fullName"
        type="text"
        value={form.fullName}
        onChange={handleChange}
        placeholder="Tu nombre y apellido"
        error={fieldErrors.fullName}
        iconLeft={<UserIcon />}
        autoComplete="name"
        required
        disabled={loading}
      />

      <Input
        label="Correo electrónico"
        id="reg-email"
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          <Input
            label="Contraseña"
            id="reg-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={handleChange}
            placeholder="Mínimo 8 caracteres"
            error={fieldErrors.password}
            iconLeft={<LockIcon />}
            autoComplete="new-password"
            required
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{ padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            disabled={loading}
          >
            {showPassword ? '●●●' : '○○○'}
          </button>
        </div>

        {/* Indicador de fortaleza */}
        {form.password.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {passwordRules.map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: '3px', borderRadius: '2px',
                  background: i < pwdStrength ? (pwdStrength === 3 ? 'var(--success)' : 'var(--warning)') : 'var(--border)',
                  transition: 'background 0.2s ease',
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {passwordRules.map((rule, i) => {
                const met = rule.test(form.password);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: met ? 'var(--success)' : 'var(--text-muted)' }}>
                    <span style={{ opacity: met ? 1 : 0.4 }}><CheckIcon /></span>
                    {rule.label}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Input
        label="Confirmar contraseña"
        id="reg-confirm"
        name="confirmPassword"
        type="password"
        value={form.confirmPassword}
        onChange={handleChange}
        placeholder="Repite tu contraseña"
        error={fieldErrors.confirmPassword}
        iconLeft={<LockIcon />}
        autoComplete="new-password"
        required
        disabled={loading}
      />

      {/* Términos */}
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
        Al registrarte aceptas los{' '}
        <a href="#" style={{ color: 'var(--accent)' }}>Términos de uso</a>
        {' '}y la{' '}
        <a href="#" style={{ color: 'var(--accent)' }}>Política de privacidad</a>.
      </p>

      <Button type="submit" fullWidth loading={loading} disabled={loading} size="lg">
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </Button>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" style={{ color: 'var(--accent)', fontWeight: '500', textDecoration: 'none' }}>
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}