/**
 * Auth Mappers - Transformación de datos
 *
 * Transforma respuestas de Supabase en modelos UI.
 *
 * NOTA: La tabla 'users' usa role_id (FK → roles.id).
 * Cuando se hace .select('*, roles(name)') en Supabase, el objeto
 * devuelto tiene { ..., roles: { name: 'Usuario' } }.
 * mapDBUserToUI lee ese join para exponer `role` como string simple.
 */

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
    id: supabaseUser.id,
    email: supabaseUser.email,
  };
};

/**
 * Mapear datos del formulario Sign Up → payload para signUp()
 *
 * @param {Object} formData - { email, password, full_name }
 * @returns {Object} payload para supabase.auth.signUp()
 */
export const mapSignUpFormToAPI = (formData) => {
  const { email, password, full_name } = formData;

  return {
    email,
    password,
    options: {
      data: { full_name },
    },
  };
};

/**
 * Mapear fila de la tabla 'users' (con join a 'roles') → modelo UI
 *
 * El objeto llega así desde Supabase cuando usas .select('*, roles(name)'):
 * {
 *   id, email, full_name, role_id, avatar_url, is_verified,
 *   created_at, updated_at,
 *   roles: { name: 'Usuario' }   ← join
 * }
 *
 * @param {Object} dbUser
 * @returns {Object|null}
 */
export const mapDBUserToUI = (dbUser) => {
  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.full_name || '',
    // El join trae { roles: { name: 'Usuario' } }
    // Fallback a 'Usuario' si no viene el join
    role: dbUser.roles?.name || 'Usuario',
    avatarUrl: dbUser.avatar_url || null,
    isVerified: dbUser.is_verified || false,
    createdAt: new Date(dbUser.created_at),
    updatedAt: dbUser.updated_at ? new Date(dbUser.updated_at) : null,
  };
};

/**
 * Mapear datos de perfil UI → payload para updateUserProfile()
 *
 * Solo incluye los campos que se pasan (undefined = no cambió).
 *
 * @param {Object} profileData - { fullName?, avatarUrl? }
 * @returns {Object} en snake_case para la BD
 */
export const mapProfileFormToAPI = (profileData) => {
  const updates = {};

  if (profileData.fullName !== undefined) {
    updates.full_name = profileData.fullName;
  }

  if (profileData.avatarUrl !== undefined) {
    updates.avatar_url = profileData.avatarUrl;
  }

  return updates;
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

  // Buscar coincidencia exacta por código
  if (errorMap[errorCode]) return errorMap[errorCode];

  // Buscar coincidencia parcial en el mensaje
  for (const [key, msg] of Object.entries(errorMap)) {
    if (errorCode.includes(key)) return msg;
  }

  return error.message || 'Ocurrió un error';
};

export default {
  mapSupabaseUserToUI,
  mapSignUpFormToAPI,
  mapDBUserToUI,
  mapProfileFormToAPI,
  mapAuthErrorToUI,
};