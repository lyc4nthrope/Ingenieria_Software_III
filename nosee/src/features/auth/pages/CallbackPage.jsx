/**
 * CallbackPage — Receptor del link de Supabase
 *
 * ¿Cuándo se usa?
 * Supabase redirige aquí en dos casos:
 *   1. Confirmación de email (registro) → type=signup en el hash
 *   2. Reset de contraseña            → type=recovery en el hash
 *
 * ¿Cómo funciona?
 * El cliente @supabase/supabase-js detecta el token en el URL hash
 * automáticamente cuando carga la página y dispara onAuthStateChange.
 * El authStore ya escucha ese evento en initialize() y actualiza el estado.
 * Esta página solo necesita esperar y redirigir según el resultado.
 *
 * URL de ejemplo que llega:
 *   https://tuapp.com/auth/callback#access_token=xxx&type=signup
 *   https://tuapp.com/auth/callback#access_token=xxx&type=recovery
 *
 * UBICACIÓN EN EL PROYECTO:
 *   nosee/src/features/auth/pages/CallbackPage.jsx
 *
 * CONFIGURACIÓN REQUERIDA EN SUPABASE:
 *   Dashboard → Authentication → URL Configuration
 *   Site URL: http://localhost:5173 (dev) / https://tudominio.com (prod)
 *   Redirect URLs: http://localhost:5173/auth/callback
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, selectIsInitialized } from '@/features/auth/store/authStore';
//import { supabase } from '@/services/supabase.client';

// ── Spinner inline para no depender de importaciones que podrían no estar ──
function Spinner() {
  return (
    <div style={{
      width: '40px', height: '40px',
      border: '3px solid rgba(56,189,248,0.15)',
      borderTop: '3px solid var(--accent, #38BDF8)',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

// ── Tipos de callback que puede recibir ──
const CALLBACK_TYPE = {
  SIGNUP:   'signup',    // Confirmación de email tras registro
  RECOVERY: 'recovery',  // Reset de contraseña
  UNKNOWN:  'unknown',
};

export default function CallbackPage() {
  const navigate     = useNavigate();
  const isInitialized = useAuthStore(selectIsInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  // ── Paso 1: Parsear la URL hash (sin efectos secundarios) ──
  const hash = window.location.hash;
  const params = new URLSearchParams(hash.substring(1)); // quitar el '#'
  const urlType = params.get('type');
  const urlError = params.get('error_description');
  const accessToken = params.get('access_token');

  // Verificar si hay tipo almacenado en localStorage (para cuando Supabase limpia el hash)
  const storedCallbackType = localStorage.getItem('auth_callback_type');

  // DEBUG: Log para verificar qué llega en el hash
  console.log('🔍 CallbackPage Debug:', { hash, urlType, urlError, accessToken, storedCallbackType, allParams: Object.fromEntries(params) });

  // Derive state from URL parameters
  // Prioridad: urlType (del hash) > storedCallbackType (localStorage) > UNKNOWN
  const callbackType = urlError ? CALLBACK_TYPE.UNKNOWN : (
    urlType === CALLBACK_TYPE.RECOVERY || storedCallbackType === CALLBACK_TYPE.RECOVERY ? CALLBACK_TYPE.RECOVERY :
    urlType === CALLBACK_TYPE.SIGNUP ? CALLBACK_TYPE.SIGNUP :
    CALLBACK_TYPE.UNKNOWN
  );
  const errorMessage = urlError ? decodeURIComponent(urlError.replace(/\+/g, ' ')) : '';
  
  // Derive status from URL state (no useState needed)
  const status = urlError ? 'error' : 'loading'; // 'loading' | 'error' (success set in second effect)
  
  console.log('📍 callbackType:', callbackType);

  // ── Paso 1b: Efecto para manejar redirecciones iniciales ──
  useEffect(() => {
    if (!hash) {
      // No hay token en el hash → alguien llegó a esta URL directamente
      navigate('/login', { replace: true });
      return;
    }
  }, [hash, navigate]);

  // ── Paso 2: Redirigir INMEDIATAMENTE basándose SOLO en el hash ──
  // NO verificamos isAuthenticated para evitar competencia por NavigatorLock
  // El hash es la verdad, Supabase procesará el token en background
  useEffect(() => {
    if (!hash) return; // Paso 1b ya maneja esto

    console.log('🎯 Detectado tipo:', callbackType);

    // Para RECOVERY: navegar SIN verificar autenticación
    // Guardar en localStorage que es un flujo de recovery
    if (callbackType === CALLBACK_TYPE.RECOVERY) {
      console.log('✅ Guardando tipo recovery en localStorage y navegando');
      localStorage.setItem('auth_callback_type', 'recovery');
      navigate('/nueva-contrasena', { replace: true });
      return;
    }

    // Para SIGNUP: esperar autenticación (es más seguro)
    if (callbackType === CALLBACK_TYPE.SIGNUP) {
      if (isInitialized && isAuthenticated) {
        console.log('✅ Email confirmado. Redirigiendo a /perfil');
        navigate('/perfil', { replace: true });
      }
      return;
    }

    // Para estados desconocidos: solo redirigir si autenticado
    if (callbackType === CALLBACK_TYPE.UNKNOWN) {
      if (isInitialized && isAuthenticated) {
        navigate('/perfil', { replace: true });
      }
    }
  }, [hash, callbackType, isInitialized, isAuthenticated, navigate]);

  // ───────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────
  return (
    <>
      {/* Keyframe para el spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        minHeight: '60vh',
        gap: '20px',
        textAlign: 'center',
      }}>
        {/* ── Estado: Cargando ── */}
        {status === 'loading' && (
          <>
            <Spinner />
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600' }}>
                {callbackType === CALLBACK_TYPE.RECOVERY
                  ? 'Verificando tu solicitud...'
                  : 'Confirmando tu cuenta...'
                }
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '6px' }}>
                Esto toma un momento
              </p>
            </div>
          </>
        )}

        {/* ── Estado: Éxito ── */}
        {isInitialized && isAuthenticated && !urlError && (
          <>
            <div style={{ fontSize: '56px', lineHeight: 1 }}>✅</div>
            <div>
              <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: '700' }}>
                {callbackType === CALLBACK_TYPE.RECOVERY
                  ? '¡Identidad verificada!'
                  : '¡Email confirmado!'
                }
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
                {callbackType === CALLBACK_TYPE.RECOVERY
                  ? 'Redirigiendo para que ingreses tu nueva contraseña...'
                  : 'Tu cuenta está activa. Redirigiendo a tu perfil...'
                }
              </p>
            </div>
          </>
        )}

        {/* ── Estado: Error ── */}
        {status === 'error' && (
          <>
            <div style={{ fontSize: '56px', lineHeight: 1 }}>⚠️</div>
            <div style={{ maxWidth: '360px' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: '17px', fontWeight: '700' }}>
                Link inválido o expirado
              </p>
              {errorMessage && (
                <p style={{
                  color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px',
                  padding: '10px 14px', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                }}>
                  {errorMessage}
                </p>
              )}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
                <a
                  href="/registro"
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent)',
                    color: '#000',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                  }}
                >
                  Registrarse de nuevo
                </a>
                <a
                  href="/login"
                  style={{
                    padding: '10px 20px',
                    background: 'var(--bg-elevated)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '14px',
                    fontWeight: '500',
                    textDecoration: 'none',
                  }}
                >
                  Iniciar sesión
                </a>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}