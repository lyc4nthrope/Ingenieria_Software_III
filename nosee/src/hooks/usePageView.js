/**
 * usePageView — Actualiza el título del documento y registra vistas en GA4
 *
 * Cada cambio de ruta:
 *  1. Actualiza document.title con el título de la ruta (mejora SEO + UX de pestañas)
 *  2. Registra un page_view en GA4
 *
 * Usar una sola vez en App.jsx (AppShell).
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackPageView } from '@/services/analytics';

const APP_NAME = 'NØSEE';

const PAGE_TITLES = {
  '/':                      'Inicio',
  '/login':                 'Iniciar sesión',
  '/registro':              'Crear cuenta',
  '/recuperar-contrasena':  'Recuperar contraseña',
  '/nueva-contrasena':      'Nueva contraseña',
  '/auth/callback':         'Verificando...',
  '/publicaciones':         'Publicaciones',
  '/publicaciones/nueva':   'Crear publicación',
  '/tiendas':               'Tiendas',
  '/tiendas/nueva':         'Registrar tienda',
  '/tiendas/cercanas':      'Tiendas cercanas',
  '/ranking':               'Ranking',
  '/perfil':                'Mi perfil',
  '/lista':                 'Mi lista de compras',
  '/pedido/nuevo':          'Nuevo pedido',
  '/terminos':              'Términos de uso',
  '/privacidad':            'Política de privacidad',
  '/dashboard':             'Panel',
  '/dashboard/admin':       'Panel de administración',
  '/dashboard/moderator':   'Panel de moderación',
  '/dashboard/dealer':      'Panel de repartidor',
};

export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    // Busca título exacto; si no existe (p.ej. /publicaciones/editar/:id) usa
    // el segmento raíz o un fallback genérico.
    const exactTitle = PAGE_TITLES[location.pathname];
    const rootSegment = '/' + location.pathname.split('/')[1];
    const rootTitle = exactTitle ?? PAGE_TITLES[rootSegment];
    const pageTitle = rootTitle ?? 'NØSEE';

    // 1. Actualizar el título visible en la pestaña del navegador
    document.title = pageTitle === 'Inicio'
      ? `${APP_NAME} — Compará precios en tu barrio`
      : `${pageTitle} — ${APP_NAME}`;

    // 2. Registrar page_view en GA4
    trackPageView(location.pathname, pageTitle);
  }, [location.pathname]);
}
