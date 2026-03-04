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
import { useLanguage } from '@/contexts/LanguageContext';

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

export default function LoginForm({ onSubmit, onGoogleLogin, loading = false, error = null, onResendConfirmation = null, emailForResend = '' }) {
  const { t } = useLanguage();
  const tf = t.loginForm;

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const errors = {};
    if (!form.email) errors.email = tf.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = tf.emailInvalid;
    if (!form.password) errors.password = tf.passwordRequired;
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

      <Button
        type="button"
        fullWidth
        size="lg"
        variant="secondary"
        onClick={onGoogleLogin}
        disabled={loading}
      >
        {tf.googleLogin}
      </Button>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tf.orEmail}</span>
        <span style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {error && (error.toLowerCase().includes('confirma tu email') || error.toLowerCase().includes('email not confirmed')) && onResendConfirmation && emailForResend && (
        <button
          type="button"
          onClick={() => onResendConfirmation(emailForResend)}
          style={{
            marginTop: '-8px',
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 'none',
            color: 'var(--accent)',
            fontSize: '13px',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          {tf.resendConfirmation}
        </button>
      )}

      <Input
        label={tf.emailLabel}
        id="login-email"
        name="email"
        type="email"
        value={form.email}
        onChange={handleChange}
        placeholder={tf.emailPlaceholder}
        error={fieldErrors.email}
        iconLeft={<MailIcon />}
        autoComplete="email"
        required
        disabled={loading}
      />

      <Input
        label={tf.passwordLabel}
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
            aria-label={showPassword ? tf.hidePassword : tf.showPassword}
          >
            <EyeIcon open={showPassword} />
          </button>
        }
        autoComplete="current-password"
        required
        disabled={loading}
      />

      <div style={{ textAlign: 'right', marginTop: '-10px' }}>
        <Link
          to="/recuperar-contrasena"
          style={{ fontSize: '13px', color: 'var(--accent)', textDecoration: 'none' }}
        >
          {tf.forgotPassword}
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
        {loading ? tf.loggingIn : tf.loginButton}
      </Button>

      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
        {tf.noAccount}{' '}
        <Link
          to="/registro"
          style={{ color: 'var(--accent)', fontWeight: '500', textDecoration: 'none' }}
        >
          {tf.registerFree}
        </Link>
      </p>
    </form>
  );
}
