/**
 * Auth Mappers - Transformación de datos
 *
 * NOTA: El mapper principal de usuarios (mapDBUserToUI) vive en
 * services/api/users.api.js para evitar duplicación.
 * Este archivo conserva los mappers exclusivos del flujo de auth.
 */

// ─── Auth ─────────────────────────────────────────────────────────────────────

/**
 * Mapear objeto user de Supabase Auth → modelo UI mínimo
 * (solo id y email, sin datos de perfil extendido)
 *
 * @param {Object} supabaseUser
 * @returns {Object|null}
 */
export const mapSupabaseUserToUI = (supabaseUser) => {
  if (!supabaseUser) return null;
  return {
    id:    supabaseUser.id,
    email: supabaseUser.email,
  };
};

/**
 * Mapear errores de Supabase Auth → mensajes amigables en español
 *
 * @param {Object} error - Error de Supabase
 * @returns {string}
 */
export const mapAuthErrorToUI = (error) => {
  if (!error) return 'Error desconocido';

  const errorCode = error.code || error.message || '';

  const errorMap = {
    'invalid_credentials':            'Email o contraseña incorrectos',
    'user_already_exists':            'Este email ya está registrado',
    'invalid_email':                  'Email inválido',
    'weak_password':                  'La contraseña es muy débil',
    'email_not_confirmed':            'Por favor confirma tu email antes de iniciar sesión',
    'over_email_send_rate_limit':     'Demasiados intentos. Intenta más tarde',
    'Invalid login credentials':      'Email o contraseña incorrectos',
    'Email not confirmed':            'Por favor confirma tu email antes de iniciar sesión',
    'User already registered':        'Este email ya está registrado',
  };

  if (errorMap[errorCode]) return errorMap[errorCode];

  for (const [key, msg] of Object.entries(errorMap)) {
    if (errorCode.includes(key)) return msg;
  }

  return error.message || 'Ocurrió un error';
};

export default {
  mapSupabaseUserToUI,
  mapAuthErrorToUI,
};