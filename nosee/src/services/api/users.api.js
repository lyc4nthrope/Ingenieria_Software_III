/**
 * Users API
 * 
 * Funciones para operaciones CRUD de usuarios en la base de datos
 * Contrato entre el frontend y la tabla 'users' en Supabase
 */

import { supabase } from '../supabase.client';

/**
 * Crear perfil de usuario
 * 
 * @param {string} userId - ID del usuario (de Auth)
 * @param {Object} userData - Datos del usuario (nombre, apellido, etc.)
 * @returns {Promise<Object>} Perfil creado
 */
export const createUserProfile = async (userId, userData) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          ...userData,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener perfil de usuario por ID
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Datos del usuario
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Actualizar perfil de usuario
 * 
 * @param {string} userId - ID del usuario
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Perfil actualizado
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Eliminar perfil de usuario
 * 
 * @param {string} userId - ID del usuario
 * @returns {Promise<Object>} Resultado de la operación
 */
export const deleteUserProfile = async (userId) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export default {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
};
