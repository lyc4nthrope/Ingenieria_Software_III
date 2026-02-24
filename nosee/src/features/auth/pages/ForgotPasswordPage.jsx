/**
 * ForgotPasswordPage - Recuperar contraseña
 *
 * Flujo:
 * 1. El usuario escribe su email y pulsa "Enviar enlace"
 * 2. Se llama a authStore.requestPasswordReset(email)
 *    que internamente llama a authApi.resetPassword(email)
 *    → Supabase envía un email con el link de recuperación
 * 3. Se muestra la vista de confirmación
 * 4. El usuario hace clic en el link → llega a /auth/callback?type=recovery
 *    → CallbackPage lo redirige a /nueva-contrasena (Paso 4)
 *
 * RUTA: /recuperar-contrasena
 * UBICACIÓN: nosee/src/features/auth/pages/ForgotPasswordPage.jsx
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

// ── Ícono de correo ────────────────────────────────────────────────────────
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M2 7l10 7 10-7"/>
  </svg>
);

// ── Vista de éxito tras enviar el email ───────────────────────────────────
function SuccessView({ email }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0', animation: 'fadeIn 0.3s ease' }}>
      <div style={{
        width: '72px', height: '72px',
        background: 'var(--accent-soft)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: '30px',
      }}>
        ✉️
      </div>

      <h2 style={{
        fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)',
        marginBottom: '10px',
      }}>
        Revisa tu correo
      </h2>

      <p style={{
        fontSize: '14px', color: 'var(--text-secondary)',
        lineHeight: '1.6', marginBottom: '8px',
      }}>
        Enviamos un enlace de recuperación a:
      </p>

      <p style={{
        fontWeight: '600', color: 'var(--accent)',
        marginBottom: '20px', fontSize: '15px',
        wordBreak: 'break-word',
      }}>
        {email}
      </p>

      <p style={{
        fontSize: '13px', color: 'var(--text-muted)',
        lineHeight: '1.7',
      }}>
        Haz clic en el enlace del correo para crear tu nueva contraseña.
        Si no lo ves, revisa la carpeta de spam.
      </p>

      <div style={{ marginTop: '24px' }}>
        <Link
          to="/login"
          style={{
            fontSize: '13px',
            color: 'var(--accent)',
            textDecoration: 'none',
            fontWeight: '500',
          }}
        >
          ← Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────
export default function ForgotPasswordPage() {
  const { requestPasswordReset, status } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [emailError, setEmailError] = useState('');
  const [serverError, setServerError] = useState('');
  const [sent, setSent]         = useState(false);
  const [sentEmail, setSentEmail] = useState('');

  const isLoading = status === 'loading';

  // ── Validación del email ─────────────────────────────────────────────
  const validateEmail = (value) => {
    if (!value) return 'El email es requerido';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email inválido';
    return '';
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (emailError) setEmailError('');
    if (serverError) setServerError('');
  };

  // ── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validateEmail(email);
    if (error) { setEmailError(error); return; }

    setServerError('');
    const result = await requestPasswordReset(email.trim());

    if (result.success) {
      setSentEmail(email.trim());
      setSent(true);
    } else {
      // Supabase NO revela si el email existe o no (seguridad).
      // En la mayoría de casos, igual muestra éxito.
      // Si hay un error real de red/config, lo mostramos.
      setServerError(result.error || 'No se pudo enviar el correo. Intenta más tarde.');
    }
  };

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
            Recuperar contraseña
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Te enviaremos un enlace para restablecerla
          </p>
        </div>

        {/* ── Card ── */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
        }}>
          {sent ? (
            <SuccessView email={sentEmail} />
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
                </div>
              )}

              <Input
                label="Correo electrónico"
                id="forgot-email"
                name="email"
                type="email"
                value={email}
                onChange={handleChange}
                placeholder="tucorreo@ejemplo.com"
                error={emailError}
                iconLeft={<MailIcon />}
                autoComplete="email"
                required
                disabled={isLoading}
              />

              <Button
                type="submit"
                fullWidth
                loading={isLoading}
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? 'Enviando enlace...' : 'Enviar enlace de recuperación'}
              </Button>

              {/* Volver al login */}
              <p style={{
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--text-muted)',
              }}>
                ¿Recordaste tu contraseña?{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'var(--accent)',
                    fontWeight: '500',
                    textDecoration: 'none',
                  }}
                >
                  Inicia sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}