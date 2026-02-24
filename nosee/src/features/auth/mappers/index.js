/**
 * Auth Mappers - Transformación de datos
 * 
 * Transforma respuestas de Supabase en modelos UI
 * Desacopla la UI de la estructura de base de datos
 */

/**
 * Mapear respuesta de Supabase Auth a modelo de usuario UI
 * 
 * @param {Object} supabaseUser - Objeto user de Supabase
 * @returns {Object} Usuario en formato UI
 */
export const mapSupabaseUserToUI = (supabaseUser) => {
  if (!supabaseUser) return null;

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    // Campos personalizados vendrían de la tabla 'users'
    // full_name: supabaseUser.user_metadata?.full_name || null,
    // role: supabaseUser.user_metadata?.role || 'user',
  };
};

/**
 * Mapear datos del formulario Sign Up a payload para Supabase
 * 
 * @param {Object} formData - Datos del formulario
 * @returns {Object} Payload para signUp()
 */
export const mapSignUpFormToAPI = (formData) => {
  const { email, password, full_name } = formData;

  return {
    email,
    password,
    options: {
      data: {
        full_name,
        // Agregar más metadata si es necesario
      },
    },
  };
};

/**
 * Mapear respuesta de getUserProfile() a modelo UI
 * 
 * @param {Object} dbUser - Objeto de tabla 'users' en Supabase
 * @returns {Object} Usuario completo para mostrar en UI
 */
export const mapDBUserToUI = (dbUser) => {
  if (!dbUser) return null;

  return {
    id: dbUser.id,
    email: dbUser.email,
    fullName: dbUser.full_name || '',
    role: dbUser.role || 'user',
    avatarUrl: dbUser.avatar_url || null,
    createdAt: new Date(dbUser.created_at),
    updatedAt: new Date(dbUser.updated_at),
  };
};

/**
 * Mapear datos de perfil UI a payload para actualizar
 * 
 * @param {Object} profileData - Datos del perfil desde UI
 * @returns {Object} Payload para updateUserProfile()
 */
export const mapProfileFormToAPI = (profileData) => {
  const { fullName, avatarUrl } = profileData;

  // Solo incluir campos que han cambiado
  const updates = {};

  if (fullName !== undefined) {
    updates.full_name = fullName;
  }

  if (avatarUrl !== undefined) {
    updates.avatar_url = avatarUrl;
  }

  return updates;
};

/**
 * Parser de errores de Supabase Auth a mensajes amigables
 * 
 * @param {Object} error - Error de Supabase
 * @returns {string} Mensaje de error legible
 */
export const mapAuthErrorToUI = (error) => {
  if (!error) return 'Error desconocido';

  const errorCode = error.code || error.message || '';

  const errorMap = {
    'invalid_credentials': 'Email o contraseña incorrectos',
    'user_already_exists': 'Este email ya está registrado',
    'invalid_email': 'Email inválido',
    'weak_password': 'La contraseña es muy débil',
    'email_not_confirmed': 'Por favor confirma tu email',
    'over_email_send_rate_limit': 'Demasiados intentos. Intenta más tarde',
  };

  return errorMap[errorCode] || error.message || 'Ocurrió un error';
};

export default {
  mapSupabaseUserToUI,
  mapSignUpFormToAPI,
  mapDBUserToUI,
  mapProfileFormToAPI,
  mapAuthErrorToUI,
};
