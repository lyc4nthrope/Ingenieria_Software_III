/**
 * Error Handling Service
 * 
 * Centraliza manejo de errores de Supabase y errores de aplicación
 * Transforma errores técnicos en mensajes amigables
 */

import { DomainErrors } from '@/types';

/**
 * Clase base para errores de dominio
 */
export class AppError extends Error {
  constructor(code, message, statusCode = 500, originalError = null) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.originalError = originalError;
    this.name = 'AppError';
  }
}

/**
 * Error de autenticación
 */
export class AuthError extends AppError {
  constructor(message, originalError = null) {
    super(
      DomainErrors.UNAUTHORIZED,
      message,
      401,
      originalError
    );
    this.name = 'AuthError';
  }
}

/**
 * Error de validación
 */
export class ValidationError extends AppError {
  constructor(message, fields = {}, originalError = null) {
    super(
      DomainErrors.VALIDATION_ERROR,
      message,
      400,
      originalError
    );
    this.name = 'ValidationError';
    this.fields = fields; // { email: 'Email inválido', ... }
  }
}

/**
 * Parser de errores de Supabase
 * 
 * @param {Error} error - Error de Supabase
 * @returns {AppError} Error de aplicación
 */
export const parseSupabaseError = (error) => {
  if (!error) {
    return new AppError(
      DomainErrors.INTERNAL_ERROR,
      'Error desconocido'
    );
  }

  const message = error.message || '';
  const errorCode = error.code || '';

  // Errores comunes de Auth
  if (errorCode === 'invalid_credentials' || message.includes('Invalid login')) {
    return new AuthError('Email o contraseña incorrectos', error);
  }

  if (message.includes('already registered')) {
    return new ValidationError('Este email ya está registrado', { email: true }, error);
  }

  if (error.status === 401 || errorCode === 'invalid_jwt') {
    return new AuthError('Sesión expirada. Por favor inicia sesión nuevamente', error);
  }

  if (error.status === 403) {
    return new AppError(
      DomainErrors.FORBIDDEN,
      'No tiene permiso para realizar esta acción',
      403,
      error
    );
  }

  if (error.status === 404) {
    return new AppError(
      DomainErrors.USER_NOT_FOUND,
      'Recurso no encontrado',
      404,
      error
    );
  }

  // Error genérico
  return new AppError(
    DomainErrors.INTERNAL_ERROR,
    message || 'Ocurrió un error en el servidor',
    error.status || 500,
    error
  );
};

/**
 * Verificar si es un error RLS (Row Level Security)
 * 
 * @param {Error} error - Error a verificar
 * @returns {boolean} True si es error de RLS
 */
export const isRLSError = (error) => {
  return error?.message?.includes('violates row level security') ||
         error?.message?.includes('new row violates row-level security');
};

/**
 * Formatear error para mostrar al usuario
 * 
 * @param {AppError|Error} error - Error a formatear
 * @returns {Object} { message, code, fields }
 */
export const formatErrorForUI = (error) => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      fields: error.fields || {},
    };
  }

  return {
    message: error.message || 'Ocurrió un error',
    code: 'UNKNOWN',
    fields: {},
  };
};

export default {
  AppError,
  AuthError,
  ValidationError,
  parseSupabaseError,
  isRLSError,
  formatErrorForUI,
};
