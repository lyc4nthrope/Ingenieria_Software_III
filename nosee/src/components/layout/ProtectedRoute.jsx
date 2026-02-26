/**
 * ProtectedRoute - Ruta protegida por autenticación
 *
 * Si el usuario no está logueado, redirige a /login.
 * Si el store aún no se inicializó (verificando sesión guardada),
 * muestra un loader para evitar el "parpadeo" a la pantalla de login.
 *
 * Uso en App.jsx:
 *   <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsInitialized, selectIsAuthenticated } from '@/features/auth/store/authStore';
import { PageLoader } from '@/components/ui/Spinner';

export default function ProtectedRoute({ children, redirectTo = '/login' }) {
  const isInitialized = useAuthStore(selectIsInitialized);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const location = useLocation();

  // La app aún está verificando si hay sesión guardada en localStorage
  // No redirigimos todavía para evitar el parpadeo a login
  if (!isInitialized) {
    return <PageLoader message="Verificando sesión..." />;
  }

  // No está logueado → redirigir a login
  // Guardamos la ruta original en `state` para redirigir de vuelta después del login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Está logueado → renderizar la ruta protegida
  return children;
}