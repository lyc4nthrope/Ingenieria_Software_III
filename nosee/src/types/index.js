/**
 * Global Types and Interfaces
 * 
 * Tipos compartidos entre features
 * Cuando uses TypeScript completo, aquí iría todo
 */

/**
 * Usuario autenticado (compartido entre features)
 * 
 * @typedef {Object} AuthUser
 * @property {string} id - UUID del usuario
 * @property {string} email - Email del usuario
 * @property {string|null} full_name - Nombre completo
 * @property {'user'|'admin'} role - Rol en el sistema
 * @property {string} created_at - Fecha de creación
 * @property {string} updated_at - Fecha de última actualización
 */
export const AuthUserType = {
  id: 'string (UUID)',
  email: 'string',
  full_name: 'string | null',
  role: "'user' | 'admin'",
  created_at: 'string (ISO 8601)',
  updated_at: 'string (ISO 8601)',
};

/**
 * Estados genéricos para operaciones asincrónicas
 */
export const AsyncStateEnum = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

/**
 * Rol del usuario en el sistema
 */
export const UserRoleEnum = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
};

/**
 * Respuesta genérica de API
 * 
 * @typedef {Object} APIResponse
 * @property {boolean} success - Indica si fue exitoso
 * @property {*} data - Datos devueltos
 * @property {string|null} error - Mensaje de error si aplica
 */
export const APIResponseType = {
  success: 'boolean',
  data: 'T (generic)',
  error: 'string | null',
};

/**
 * Errores de dominio de negocio
 */
export const DomainErrors = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export default {
  AuthUserType,
  AsyncStateEnum,
  UserRoleEnum,
  APIResponseType,
  DomainErrors,
};
