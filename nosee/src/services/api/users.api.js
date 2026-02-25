/**
 * users.api.js
 * Capa de acceso a datos: operaciones sobre la tabla `users` (perfiles).
 *
 * La tabla `users` está relacionada con `roles`:
 *   users.role_id → roles.id
 *
 * El SELECT usa JOIN implícito con Supabase:
 *   .select('*, roles(name)')
 * lo que retorna: { ..., roles: { name: 'Admin' } }
 */

import { supabase } from '@/services/supabase.client';
import { UserRoleEnum } from '@/types';

// ─── Mapper BD → UI ───────────────────────────────────────────────────────────

/**
 * Convierte el objeto raw de la BD al shape que usa el store/UI.
 *
 * CORRECCIÓN: Los valores de roles.name en BD son 'Usuario', 'Moderador',
 * 'Admin', 'Repartidor'. Coinciden exactamente con UserRoleEnum, así que
 * se asignan directamente. Si el valor no está en el enum, se cae a
 * UserRoleEnum.USUARIO como valor seguro por defecto.
 *
 * @param {Object} dbUser - Fila raw de la tabla users con join de roles
 * @returns {import('@/types').UserProfile}
 */
export function mapDBUserToUI(dbUser) {
  if (!dbUser) return null;

  const roleFromDB = dbUser.roles?.name;

  // Verificar que el rol del DB es un valor válido del enum
  const role = Object.values(UserRoleEnum).includes(roleFromDB)
    ? roleFromDB
    : UserRoleEnum.USUARIO;  // fallback seguro

  return {
    id:         dbUser.id,
    email:      dbUser.email       ?? '',
    fullName:   dbUser.full_name   ?? '',
    role,
    isVerified: dbUser.is_verified ?? false,
    points:     dbUser.points      ?? 0,
    avatarUrl:  dbUser.avatar_url  ?? null,
    createdAt:  dbUser.created_at  ?? null,
  };
}

// ─── Obtener perfil ───────────────────────────────────────────────────────────

/**
 * Obtiene el perfil completo del usuario autenticado (incluye su rol).
 * @param {string} userId - UUID del usuario
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .eq('id', userId)
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: mapDBUserToUI(data) };
}

// ─── Crear perfil ─────────────────────────────────────────────────────────────

/**
 * Crea el perfil del usuario en la tabla `users`.
 * Normalmente lo ejecuta el trigger `handle_new_user` automáticamente.
 * Esta función es un fallback por si el trigger falla.
 *
 * @param {string} userId
 * @param {string} fullName
 * @param {string} email
 */
export async function createUserProfile(userId, fullName, email) {
  const { data, error } = await supabase
    .from('users')
    .insert({
      id:          userId,
      role_id:     1,        // rol por defecto: Usuario
      full_name:   fullName,
      email,
      is_verified: false,
      points:      0,
    })
    .select('*, roles(name)')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: mapDBUserToUI(data) };
}

// ─── Actualizar perfil ────────────────────────────────────────────────────────

/**
 * Actualiza campos del perfil del usuario autenticado.
 * @param {string} userId
 * @param {Object} updates - campos a actualizar (full_name, avatar_url, etc.)
 */
export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select('*, roles(name)')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: mapDBUserToUI(data) };
}

// ─── Listar usuarios (solo Admin) ─────────────────────────────────────────────

/**
 * Retorna todos los perfiles de usuario con sus roles.
 * Requiere RLS permiso de Admin.
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*, roles(name)')
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data.map(mapDBUserToUI) };
}

/**
 * Cambia el rol de un usuario (solo Admin).
 * @param {string} userId
 * @param {number} roleId - ID del nuevo rol (1=Usuario, 2=Moderador, 3=Admin, 4=Repartidor)
 */
export async function changeUserRole(userId, roleId) {
  const { data, error } = await supabase
    .from('users')
    .update({ role_id: roleId })
    .eq('id', userId)
    .select('*, roles(name)')
    .single();

  if (error) return { success: false, error: error.message };
  return { success: true, data: mapDBUserToUI(data) };
}