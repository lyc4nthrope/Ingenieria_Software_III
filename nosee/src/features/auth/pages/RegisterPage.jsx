/**
 * RegisterPage - Página de registro de nuevo usuario
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import RegisterForm from '@/features/auth/components/RegisterForm';

// Vista de verificación de email
function VerificationView({ email }) {
  return (
    <div style={{ textAlign: 'center', padding: '16px 0', animation: 'fadeIn 0.3s ease' }}>
      {/* Icono de correo */}
      <div style={{
        width: '72px', height: '72px',
        background: 'var(--accent-soft)',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
        fontSize: '28px',
      }}>
        ✉️
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-primary)' }}>
        Verifica tu email
      </h2>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '8px' }}>
        Enviamos un enlace de confirmación a:
      </p>
      <p style={{ fontWeight: '600', color: 'var(--accent)', marginBottom: '20px', fontSize: '15px' }}>
        {email}
      </p>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6' }}>
        Revisa tu bandeja de entrada y haz clic en el enlace para activar tu cuenta.
        Después podrás iniciar sesión.
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated, status, error, clearError } = useAuthStore();
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  useEffect(() => {
    if (isAuthenticated()) navigate('/', { replace: true });
  }, []); // eslint-disable-line

  const handleRegister = async (email, password, metadata) => {
    clearError();
    const result = await register(email, password, metadata);
    if (result.success) {
      if (result.needsVerification) {
        setRegisteredEmail(email);
        setNeedsVerification(true);
      } else {
        // Supabase con autoconfirm=true → sesión inmediata
        navigate('/', { replace: true });
      }
    }
  };

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
        maxWidth: '480px',
        animation: 'fadeIn 0.35s ease',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '800',
            letterSpacing: '-0.04em',
            color: 'var(--accent)',
            marginBottom: '8px',
          }}>
            NØ<span style={{ color: 'var(--text-secondary)' }}>SEE</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
            Crea tu cuenta
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Únete y empieza a comparar precios
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
        }}>
          {needsVerification ? (
            <VerificationView email={registeredEmail} />
          ) : (
            <RegisterForm
              onSubmit={handleRegister}
              loading={status === 'loading'}
              error={error}
            />
          )}
        </div>
      </div>
    </main>
  );
}