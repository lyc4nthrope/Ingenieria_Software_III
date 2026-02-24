/**
 * App.jsx - Punto de entrada de la aplicación
 *
 * Responsabilidades:
 * 1. Inicializar el store de auth (verificar sesión guardada)
 * 2. Configurar React Router con todas las rutas
 * 3. Proteger rutas que requieren autenticación
 *
 * RUTAS CONFIGURADAS:
 * ┌─────────────────────────┬───────────────────┬───────────┐
 * │ Ruta                    │ Componente        │ Protegida │
 * ├─────────────────────────┼───────────────────┼───────────┤
 * │ /                       │ HomePage          │ ✅ Sí     │
 * │ /perfil                 │ ProfilePage       │ ✅ Sí     │
 * │ /publicaciones          │ HomePage (stub)   │ ✅ Sí     │
 * │ /login                  │ LoginPage         │ ❌ No     │
 * │ /registro               │ RegisterPage      │ ❌ No     │
 * │ /auth/callback          │ CallbackPage      │ ❌ No     │  ← NUEVO
 * │ /recuperar-contrasena   │ ForgotPasswordPage│ ❌ No     │  ← STUB
 * │ /nueva-contrasena       │ NewPasswordPage   │ ❌ No     │  ← STUB
 * │ *                       │ NotFoundPage      │ ❌ No     │
 * └─────────────────────────┴───────────────────┴───────────┘
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Store
import { useAuthStore, selectIsInitialized } from '@/features/auth/store/authStore';

// Layout
import Navbar from '@/components/layout/Navbar';
import ProtectedRoute from '@/components/layout/ProtectedRoute';

// Loaders
import { PageLoader } from '@/components/ui/Spinner';

// Páginas públicas
import LoginPage from '@/features/auth/pages/LoginPage';
import RegisterPage from '@/features/auth/pages/RegisterPage';
import CallbackPage from '@/features/auth/pages/CallbackPage';

// Páginas protegidas
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/features/auth/pages/ProfilePage';

// ── Página 404 inline ──────────────────────────────────────────────────────
function NotFoundPage() {
  return (
    <main style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center', gap: '16px',
    }}>
      <div style={{ fontSize: '72px', lineHeight: 1 }}>🔍</div>
      <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>404</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>Página no encontrada</p>
      <a href="/" style={{
        padding: '8px 20px', background: 'var(--accent-soft)',
        color: 'var(--accent)', borderRadius: 'var(--radius-md)',
        fontSize: '14px', fontWeight: '500', textDecoration: 'none',
      }}>
        Volver al inicio
      </a>
    </main>
  );
}

// ── Stub para páginas aún no implementadas ────────────────────────────────
// Se reemplazarán en el Paso 3 (recuperar contraseña) y Paso 4 (nueva contraseña)
function ComingSoonPage({ title }) {
  return (
    <main style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', textAlign: 'center', gap: '12px',
    }}>
      <div style={{ fontSize: '48px' }}>🔧</div>
      <h2 style={{ color: 'var(--text-primary)', fontSize: '20px', fontWeight: '700' }}>{title}</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
        Esta página será implementada en el siguiente paso
      </p>
      <a href="/login" style={{
        color: 'var(--accent)', fontSize: '14px', textDecoration: 'none',
      }}>
        ← Volver al login
      </a>
    </main>
  );
}

// ── Componente interno con las rutas ──────────────────────────────────────
// Separado de App para poder usar hooks dentro de BrowserRouter
function AppContent() {
  const { initialize } = useAuthStore();
  const isInitialized  = useAuthStore(selectIsInitialized);

  // Inicializar auth UNA SOLA VEZ al arrancar la app
  // Verifica sesión guardada en localStorage y configura onAuthStateChange
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras verificamos la sesión, mostramos un loader
  // Esto evita el parpadeo a la pantalla de login
  if (!isInitialized) {
    return <PageLoader message="Iniciando aplicación..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar siempre visible */}
      <Navbar />

      <Routes>
        {/* ── Rutas públicas ──────────────────────────────────────────── */}
        <Route path="/login"    element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />

        {/*
          /auth/callback — Receptor del link de email de Supabase.
          NO debe ser protegida: el usuario llega aquí sin sesión aún.
          El token viene en el hash de la URL (#access_token=...&type=signup)
          y el cliente de Supabase lo procesa automáticamente.
        */}
        <Route path="/auth/callback" element={<CallbackPage />} />

        {/*
          Recuperar contraseña — Stub hasta el Paso 3.
          El usuario escribe su email y Supabase envía el link.
        */}
        <Route
          path="/recuperar-contrasena"
          element={<ComingSoonPage title="Recuperar contraseña" />}
        />

        {/*
          Nueva contraseña — Stub hasta el Paso 4.
          El usuario llega aquí desde /auth/callback con type=recovery.
          Aquí ingresa y confirma su nueva contraseña.
        */}
        <Route
          path="/nueva-contrasena"
          element={<ComingSoonPage title="Nueva contraseña" />}
        />

        {/* ── Rutas protegidas ─────────────────────────────────────────── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Publicaciones — placeholder hasta Sprint 2 */}
        <Route
          path="/publicaciones"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

// ── App principal — envuelve todo en BrowserRouter ────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}