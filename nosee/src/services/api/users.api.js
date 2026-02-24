/**
 * Users API
 *
 * Funciones para operaciones CRUD de usuarios en la base de datos
 * Contrato entre el frontend y la tabla 'users' en Supabase
 *
 * NOTA: La tabla 'users' usa role_id (FK → roles.id), por eso
 * getUserProfile hace join con la tabla roles para obtener el nombre del rol.
 */

import { supabase } from '../supabase.client';

/**
 * Crear perfil de usuario
 * Se llama justo después de signUp() con el UUID que genera Supabase Auth.
 *
 * @param {string} userId  - ID del usuario (de Auth)
 * @param {Object} userData - { email, full_name }
 * @returns {Promise<{ success: boolean, data: Object|null, error: string|null }>}
 */
export const createUserProfile = async (userId, userData) => {
  try {
    // Obtener el ID del rol por defecto ('Usuario')
    // Ajusta el nombre del rol según tu configuración (puede ser 'user' o 'Usuario')
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'Usuario')
      .single();

    if (roleError) {
      // Si no existe el rol 'Usuario', intentar con 'user' como fallback
      const { data: fallbackRole } = await supabase
        .from('roles')
        .select('id')
        .eq('name', 'user')
        .single();

      if (!fallbackRole) {
        console.warn('No se encontró el rol por defecto. El perfil se creará sin role_id.');
      }
    }

    const roleId = roleData?.id || null;

    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          email: userData.email,
          full_name: userData.full_name || '',
          role_id: roleId,
          is_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select('*, roles(name)');

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Obtener perfil de usuario por ID
 * Hace join con 'roles' para traer el nombre del rol.
 *
 * @param {string} userId - ID del usuario
 * @returns {Promise<{ success: boolean, data: Object|null, error: string|null }>}
 */
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*, roles(name)')   // join a tabla roles
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
 * @param {string} userId  - ID del usuario
 * @param {Object} updates - Campos a actualizar (en snake_case, como en la BD)
 * @returns {Promise<{ success: boolean, data: Object|null, error: string|null }>}
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select('*, roles(name)');  // también devuelve el rol actualizado

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
 * @returns {Promise<{ success: boolean, error: string|null }>}
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