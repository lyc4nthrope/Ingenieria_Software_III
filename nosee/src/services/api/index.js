/**
 * API Services Index
 *
 * Exporta todas las funciones de API en un solo punto de acceso
 * Facilita importaciones desde otras partes de la aplicación
 */

export * as authApi from './auth.api';
export * as usersApi from './users.api';
export * as publicationsApi from './publications.api';

// Agregar aquí más APIs a medida que se implementen:
// export * as ordersApi from './orders.api';
// export * as deliveryApi from './delivery.api';
export * as storesApi from './stores.api';