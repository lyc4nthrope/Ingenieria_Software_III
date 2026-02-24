/**
 * App.jsx - Punto de entrada de la aplicación
 *
 * Responsabilidades:
 * 1. Inicializar el store de auth (verificar sesión guardada)
 * 2. Configurar React Router con todas las rutas
 * 3. Proteger rutas que requieren autenticación
 */
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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

// Páginas protegidas
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/features/auth/pages/ProfilePage';

// Página 404 inline
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
        fontSize: '14px', fontWeight: '500',
      }}>
        Volver al inicio
      </a>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────
// Componente interno que maneja la inicialización del auth store
// Separado para poder usar hooks dentro de BrowserRouter
// ────────────────────────────────────────────────────────────────
function AppContent() {
  const { initialize } = useAuthStore();
  const isInitialized = useAuthStore(selectIsInitialized);

  // Inicializar auth UNA SOLA VEZ al arrancar la app
  // Verifica si hay sesión guardada en localStorage y configura el listener
  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mientras verificamos la sesión guardada, mostramos un loader
  // Esto evita el parpadeo a la pantalla de login
  if (!isInitialized) {
    return <PageLoader message="Iniciando aplicación..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Navbar siempre visible */}
      <Navbar />

      {/* Rutas */}
      <Routes>
        {/* ── Rutas públicas ─────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />

        {/* Recuperar contraseña — por ahora redirige a login */}
        <Route path="/recuperar-contrasena" element={<LoginPage />} />

        {/* ── Rutas protegidas ───────────────────────── */}
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

// ────────────────────────────────────────────────────────────────
// App principal — envuelve todo en BrowserRouter
// ────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}