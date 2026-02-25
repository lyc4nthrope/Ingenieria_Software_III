/**
 * types/index.js
 * Definiciones de tipos y enums de la aplicación NØSEE.
 *
 * IMPORTANTE: Los valores de UserRoleEnum deben coincidir EXACTAMENTE
 * con el campo `name` de la tabla `roles` en la base de datos.
 *
 * Roles en BD:
 *   id=1  name='Usuario'
 *   id=2  name='Moderador'
 *   id=3  name='Admin'
 *   id=4  name='Repartidor'
 */

// ─── Errores de dominio ───────────────────────────────────────────────────────
// Usados por shared/errors/index.js para clasificar errores de aplicación.
// Cada código corresponde a un tipo de fallo semántico distinto.

/**
 * @readonly
 * @enum {string}
 */
export const DomainErrors = {
  // Auth
  UNAUTHORIZED:     'UNAUTHORIZED',      // Sin sesión o token inválido
  FORBIDDEN:        'FORBIDDEN',         // Sesión válida pero sin permiso

  // Recursos
  USER_NOT_FOUND:   'USER_NOT_FOUND',    // Usuario no existe en la BD
  NOT_FOUND:        'NOT_FOUND',         // Recurso genérico no encontrado

  // Validación
  VALIDATION_ERROR: 'VALIDATION_ERROR',  // Input inválido (formulario, etc.)

  // Infraestructura
  INTERNAL_ERROR:   'INTERNAL_ERROR',    // Error de servidor / BD inesperado
  NETWORK_ERROR:    'NETWORK_ERROR',     // Sin conexión o timeout
};

// ─── Roles de usuario ─────────────────────────────────────────────────────────

/**
 * @readonly
 * @enum {string}
 */
export const UserRoleEnum = {
  USUARIO:     'Usuario',     // id=1 — Usuario estándar de la plataforma
  MODERADOR:   'Moderador',   // id=2 — Usuario con privilegios de moderación
  ADMIN:       'Admin',       // id=3 — Administrador del sistema
  REPARTIDOR:  'Repartidor',  // id=4 — Usuario que realiza domicilios
};

/** Array de todos los roles disponibles */
export const ALL_ROLES = Object.values(UserRoleEnum);

// ─── Estados asincrónicos ─────────────────────────────────────────────────────

/**
 * Estado de operaciones asincrónicas.
 * Usado por Zustand stores para reflejar el ciclo de vida de una petición.
 *
 * @readonly
 * @enum {string}
 */
export const AsyncStateEnum = {
  IDLE:    'idle',     // Sin actividad — estado inicial
  LOADING: 'loading',  // Petición en vuelo
  SUCCESS: 'success',  // Petición completada con éxito
  ERROR:   'error',    // Petición fallida
};

// ─── Helpers de rol ───────────────────────────────────────────────────────────

/**
 * Verifica si un rol tiene permisos de moderación o superiores.
 * @param {string} role - valor de UserRoleEnum
 */
export function canModerate(role) {
  return [UserRoleEnum.MODERADOR, UserRoleEnum.ADMIN].includes(role);
}

/**
 * Verifica si el rol es Administrador.
 * @param {string} role - valor de UserRoleEnum
 */
export function isAdmin(role) {
  return role === UserRoleEnum.ADMIN;
}

/**
 * Verifica si el rol es Repartidor.
 * @param {string} role - valor de UserRoleEnum
 */
export function isRepartidor(role) {
  return role === UserRoleEnum.REPARTIDOR;
}

// ─── Perfil de usuario (shape del store) ─────────────────────────────────────

/**
 * @typedef {Object} UserProfile
 * @property {string}  id               - UUID del usuario (coincide con auth.users.id)
 * @property {string}  email            - Correo electrónico
 * @property {string}  fullName         - Nombre completo
 * @property {string}  role             - Uno de UserRoleEnum
 * @property {boolean} isVerified       - true si el email fue confirmado
 * @property {number}  reputationPoints - Puntos de reputación acumulados
 * @property {string|null} avatarUrl    - URL del avatar (Cloudinary)
 * @property {string}  createdAt        - ISO string de fecha de creación
 */

// ─── Estados de publicación ───────────────────────────────────────────────────

export const PublicationStatus = {
  ACTIVE:   'active',
  PENDING:  'pending',
  REJECTED: 'rejected',
  EXPIRED:  'expired',
};

// ─── Estados de pedido ────────────────────────────────────────────────────────

export const OrderStatus = {
  PENDING:           'pending',            // Creado, esperando repartidor
  ACCEPTED:          'accepted',           // Repartidor lo tomó
  BUYING:            'buying',             // Repartidor comprando en tiendas
  IN_TRANSIT:        'in_transit',         // En camino a la dirección de entrega
  ARRIVED:           'arrived',            // Llegó a la puerta
  PAYMENT_CONFIRMED: 'payment_confirmed',  // Pago procesado
  DELIVERED:         'delivered',          // Entregado y completado
  CANCELLED:         'cancelled',          // Cancelado
};