/**
 * ProtectedRoute - Ruta protegida por autenticación y opcionalmente por rol
 *
 * Props:
 *   allowedRoles?: string[]  — Si se indica, solo esos roles pueden acceder.
 *                              Los demás son redirigidos a su propio dashboard.
 *
 * Uso en App.jsx:
 *   <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
 *   <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectIsInitialized, selectIsAuthenticated } from '@/features/auth/store/authStore';
import { PageLoader } from '@/components/ui/Spinner';
import { getRolePath } from '@/utils/roleUtils';
import { useLanguage } from '@/contexts/LanguageContext';

export default function ProtectedRoute({ children, redirectTo = '/login', allowedRoles }) {
  const { t } = useLanguage();
  const isInitialized = useAuthStore(selectIsInitialized);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!isInitialized) {
    return <PageLoader message={t.protectedRoute.verifying} />;
  }

  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Si se definieron roles permitidos y el usuario no los tiene → redirigir a su dashboard
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getRolePath(user?.role)} replace />;
  }

  return children;
}