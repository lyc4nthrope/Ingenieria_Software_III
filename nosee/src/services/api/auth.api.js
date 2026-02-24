/**
 * Authentication API
 * 
 * Funciones para comunicarse con Supabase Auth
 * Contrato entre el frontend y el servidor de autenticación
 */

import { supabase } from '../supabase.client';

/**
 * Registrar un nuevo usuario
 * 
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @param {Object} metadata - Datos adicionales (fullName, etc.)
 * @returns {Promise<Object>} Datos del usuario registrado
 */
export const signUp = async (email, password, metadata = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata, // full_name, etc.
      },
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Iniciar sesión
 * 
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {Promise<Object>} Token y datos del usuario
 */
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Cerrar sesión
 * 
 * @returns {Promise<Object>} Resultado de la operación
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener usuario actual
 * 
 * @returns {Promise<Object>} Datos del usuario autenticado
 */
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) throw error;
    return { success: true, data: user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener sesión actual
 * 
 * @returns {Promise<Object>} Sesión actual con tokens
 */
export const getSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) throw error;
    return { success: true, data: session };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Resetear contraseña
 * 
 * @param {string} email - Email del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  getSession,
  resetPassword,
};