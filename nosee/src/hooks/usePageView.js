/**
 * usePageView — Hook para rastrear vistas de página con GA4
 *
 * Registra un page_view cada vez que cambia la ruta.
 * Usar una sola vez en App.jsx.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/analytics';

const PAGE_TITLES = {
  '/': 'Inicio',
  '/login': 'Iniciar Sesión',
  '/registro': 'Registro',
  '/recuperar-contrasena': 'Recuperar Contraseña',
  '/publicaciones': 'Publicaciones',
  '/publicaciones/crear': 'Crear Publicación',
  '/tiendas': 'Tiendas',
  '/ranking': 'Ranking',
  '/perfil': 'Perfil',
  '/admin': 'Dashboard Admin',
  '/moderador': 'Dashboard Moderador',
  '/repartidor': 'Dashboard Repartidor',
};

export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] ?? document.title;
    trackPageView(location.pathname, title);
  }, [location.pathname]);
}
