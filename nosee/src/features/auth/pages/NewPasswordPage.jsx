/**
 * NewPasswordPage - Nueva contraseña (Paso 4)
 *
 * Flujo:
 * 1. El usuario llegó aquí desde /auth/callback con type=recovery
 *    → Supabase ya estableció una sesión temporal con el token del link
 * 2. El usuario ingresa y confirma su nueva contraseña
 * 3. Se llama a supabase.auth.updateUser({ password }) para actualizarla
 * 4. Si tiene éxito → redirige a /perfil (ya está logueado)
 *
 * IMPORTANTE:
 * - Esta página SOLO funciona si el usuario llegó desde el link de email.
 * - Si no hay sesión activa (llegó directo a la URL), redirige a /recuperar-contrasena.
 *
 * RUTA: /nueva-contrasena
 * UBICACIÓN: nosee/src/features/auth/pages/NewPasswordPage.jsx
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/services/supabase.client';
import { useAuthStore, selectIsInitialized } from '@/features/auth/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// ── Ícono de candado ───────────────────────────────────────────────────────
const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);

const EyeIcon = ({ open }) => open ? (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

// ── Reglas de contraseña (igual que en RegisterForm) ──────────────────────
const passwordRules = [
  { label: 'Al menos 8 caracteres',  test: (v) => v.length >= 8 },
  { label: 'Una letra mayúscula',     test: (v) => /[A-Z]/.test(v) },
  { label: 'Un número',              test: (v) => /\d/.test(v) },
];

// ── Vista de éxito ────────────────────────────────────────────────────────
function SuccessView() {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0', animation: 'fadeIn 0.3s ease' }}>
      <div style={{ fontSize: '56px', lineHeight: 1, marginBottom: '16px' }}>🔐</div>
      <h2 style={{
        fontSize: '20px', fontWeight: '700',
        color: 'var(--text-primary)', marginBottom: '10px',
      }}>
        ¡Contraseña actualizada!
      </h2>
      <p style={{
        fontSize: '14px', color: 'var(--text-secondary)',
        lineHeight: '1.6', marginBottom: '24px',
      }}>
        Tu contraseña fue cambiada correctamente. Redirigiendo a tu perfil…
      </p>
      {/* Spinner de espera */}
      <div style={{
        width: '28px', height: '28px',
        border: '3px solid rgba(56,189,248,0.15)',
        borderTop: '3px solid var(--accent)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
        margin: '0 auto',
      }} />
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function NewPasswordPage() {
  const navigate       = useNavigate();
  const isInitialized  = useAuthStore(selectIsInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  const [form, setForm]             = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors]   = useState({});
  const [serverError, setServerError]   = useState('');
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);

  // ── Guardia: si no hay sesión, no tiene sentido estar aquí ───────────
  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      // No hay sesión → el link de recovery ya expiró o nunca llegó
      navigate('/recuperar-contrasena', { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate]);

  // ── Redirección tras éxito ───────────────────────────────────────────
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => navigate('/perfil', { replace: true }), 2000);
      return () => clearTimeout(timer);
    }
  }, [success, navigate]);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (serverError) setServerError('');
  };

  const validate = () => {
    const errors = {};
    if (!form.password) {
      errors.password = 'La contraseña es requerida';
    } else if (!passwordRules.every((r) => r.test(form.password))) {
      errors.password = 'La contraseña no cumple los requisitos';
    }
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Confirma tu contraseña';
    } else if (form.password !== form.confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }

    setLoading(true);
    setServerError('');

    try {
      // updateUser actualiza la contraseña del usuario con sesión activa
      const { error } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (error) throw error;

      setSuccess(true);
    } catch (err) {
      setServerError(err.message || 'No se pudo actualizar la contraseña. Intenta solicitar un nuevo enlace.');
    } finally {
      setLoading(false);
    }
  };

  // ── Indicador de fortaleza ───────────────────────────────────────────
  const pwdStrength = passwordRules.filter((r) => r.test(form.password)).length;

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <main style={{
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      minHeight: 'calc(100vh - 60px)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        animation: 'fadeIn 0.35s ease',
      }}>
        {/* ── Logotipo / Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontSize: '32px', fontWeight: '800',
            letterSpacing: '-0.04em', color: 'var(--accent)',
            marginBottom: '8px',
          }}>
            NØ<span style={{ color: 'var(--text-secondary)' }}>SEE</span>
          </div>
          <h1 style={{
            fontSize: '22px', fontWeight: '700',
            color: 'var(--text-primary)', marginBottom: '6px',
          }}>
            Nueva contraseña
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Elige una contraseña segura para tu cuenta
          </p>
        </div>

        {/* ── Card ── */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
        }}>
          {success ? (
            <SuccessView />
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
            >
              {/* Error del servidor */}
              {serverError && (
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
                  {serverError}
                  {' '}
                  <Link
                    to="/recuperar-contrasena"
                    style={{ color: 'var(--error)', fontWeight: '600', textDecoration: 'underline' }}
                  >
                    Solicitar nuevo enlace
                  </Link>
                </div>
              )}

              {/* Campo contraseña */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <Input
                  label="Nueva contraseña"
                  id="new-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  error={fieldErrors.password}
                  iconLeft={<LockIcon />}
                  iconRight={
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        padding: 0, display: 'flex', alignItems: 'center',
                        color: 'var(--text-muted)',
                      }}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <EyeIcon open={showPassword} />
                    </button>
                  }
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />

                {/* Indicador de fortaleza */}
                {form.password.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {passwordRules.map((_, i) => (
                        <div key={i} style={{
                          flex: 1, height: '3px', borderRadius: '2px',
                          background: i < pwdStrength
                            ? (pwdStrength === 3 ? 'var(--success)' : 'var(--warning)')
                            : 'var(--border)',
                          transition: 'background 0.2s ease',
                        }} />
                      ))}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {passwordRules.map((rule, i) => {
                        const met = rule.test(form.password);
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            fontSize: '12px',
                            color: met ? 'var(--success)' : 'var(--text-muted)',
                          }}>
                            <span style={{ opacity: met ? 1 : 0.4 }}><CheckIcon /></span>
                            {rule.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Campo confirmar contraseña */}
              <Input
                label="Confirmar contraseña"
                id="confirm-password"
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repite tu nueva contraseña"
                error={fieldErrors.confirmPassword}
                iconLeft={<LockIcon />}
                autoComplete="new-password"
                required
                disabled={loading}
              />

              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={loading}
                size="lg"
                style={{ marginTop: '4px' }}
              >
                {loading ? 'Guardando contraseña...' : 'Guardar nueva contraseña'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}