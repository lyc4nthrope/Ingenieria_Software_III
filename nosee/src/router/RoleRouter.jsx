/**
 * RoleRouter.jsx
 *
 * Redirige al usuario al dashboard correcto según su rol.
 * Se usa como destino del ProtectedRoute en la ruta raíz "/".
 *
 * UBICACIÓN: src/router/RoleRouter.jsx
 */
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getRolePath } from '@/utils/roleUtils';

/**
 * Componente de redirección.
 * Úsalo como element de la ruta "/" protegida en App.jsx.
 */
export default function RoleRouter() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null; // ProtectedRoute ya habrá redirigido si no hay sesión

  return <Navigate to={getRolePath(user.role)} replace />;
}