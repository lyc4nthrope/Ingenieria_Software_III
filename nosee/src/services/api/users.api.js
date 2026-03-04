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
 *
 * NOTA ESQUEMA: la tabla public.users NO tiene columna email.
 * El email siempre se obtiene de auth.users vía supabase.auth.getUser().
 */

import { supabase } from "@/services/supabase.client";

// ─── Mapper BD → UI ───────────────────────────────────────────────────────────

/**
 * Convierte el objeto raw de la BD al shape que usa el store/UI.
 *
 * IMPORTANTE: `data.email` debe inyectarse antes de llamar esta función,
 * ya que la columna email no existe en public.users.
 *
 * @param {Object} data - Fila de la tabla users (con join de roles) + email inyectado
 * @returns {import('@/types').UserProfile}
 */
export function mapDBUserToUI(data) {
  if (!data) return null;
  return {
    id: data.id,
    fullName: data.full_name ?? "",
    email: data.email ?? "", // Inyectado desde auth.users
    roleId: data.role_id,
    role: data.roles?.name ?? "Usuario",
    reputationPoints: data.reputation_points ?? 0,
    publicationsCount: data.publicationsCount ?? 0,
    validationsCount: data.validationsCount ?? 0,
    isVerified: data.is_verified ?? false,
    isActive: data.is_active ?? true,
    avatarUrl: data.avatar_url ?? "",
    createdAt: data.created_at,
  };
}

// ─── Helper interno: obtener email de auth ────────────────────────────────────

async function getAuthEmail() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? "";
}

// ─── Obtener perfil ───────────────────────────────────────────────────────────

/**
 * Obtiene el perfil completo del usuario autenticado (incluye su rol).
 * Combina public.users con auth.users para exponer el email.
 *
 * @param {string} userId - UUID del usuario
 */
export async function getUserProfile(userId) {
  const { data: profile, error } = await supabase
    .from("users")
    .select("*, roles(name)")
    .eq("id", userId)
    .single();

  if (error) return { success: false, error: error.message };

  const email = await getAuthEmail();

  // Contar publicaciones del usuario
  const { data: userPubs } = await supabase
    .from("price_publications")
    .select("id")
    .eq("user_id", userId);

  const publicationsCount = userPubs?.length ?? 0;

  // Contar validaciones recibidas (upvotes sobre las publicaciones del usuario)
  let validationsCount = 0;
  if (publicationsCount > 0) {
    const pubIds = userPubs.map((p) => p.id);
    const { count } = await supabase
      .from("publication_votes")
      .select("*", { count: "exact", head: true })
      .in("publication_id", pubIds)
      .eq("vote_type", 1);
    validationsCount = count ?? 0;
  }

  return {
    success: true,
    data: mapDBUserToUI({ ...profile, email, publicationsCount, validationsCount }),
  };
}

// ─── Crear perfil ─────────────────────────────────────────────────────────────

/**
 * Crea el perfil del usuario en la tabla `users` (fallback al trigger).
 * Usa upsert para no colisionar con el trigger handle_new_user.
 *
 * @param {string} userId
 * @param {string} fullName
 */
export async function createUserProfile(userId, fullName) {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      { id: userId, role_id: 1, full_name: fullName, is_verified: false },
      { onConflict: "id" },
    )
    .select("*, roles(name)")
    .single();

  if (error) return { success: false, error: error.message };

  const email = await getAuthEmail();

  return { success: true, data: mapDBUserToUI({ ...data, email }) };
}

// ─── Actualizar perfil ────────────────────────────────────────────────────────

/**
 * Actualiza campos del perfil del usuario autenticado.
 * Re-inyecta el email desde auth.users para no perderlo en el store.
 *
 * @param {string} userId
 * @param {Object} updates - campos snake_case: full_name, etc.
 */
export async function updateUserProfile(userId, updates) {
  const { data, error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", userId)
    .select("*, roles(name)")
    .single();

  if (error) return { success: false, error: error.message };

  // FIX: volver a inyectar email para que el store no lo pierda
  const email = await getAuthEmail();

  return { success: true, data: mapDBUserToUI({ ...data, email }) };
}

// ─── Listar usuarios (solo Admin) ─────────────────────────────────────────────

/**
 * Retorna todos los perfiles de usuario con sus roles.
 * Requiere RLS permiso de Admin.
 * NOTA: No inyecta email individual (operación masiva de admin).
 */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from("users")
    .select("*, roles(name)")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data.map((row) => mapDBUserToUI(row)) };
}

/**
 * Cambia el rol de un usuario (solo Admin).
 * @param {string} userId
 * @param {number} roleId - 1=Usuario, 2=Moderador, 3=Admin, 4=Repartidor
 */
export async function changeUserRole(userId, roleId) {
  const { data, error } = await supabase
    .from("users")
    .update({ role_id: roleId })
    .eq("id", userId)
    .select("*, roles(name)");

  if (error) return { success: false, error: error.message };
  if (!data?.length) return { success: false, error: 'Usuario no encontrado' };

  const email = await getAuthEmail();

  return { success: true, data: mapDBUserToUI({ ...data[0], email }) };
}
