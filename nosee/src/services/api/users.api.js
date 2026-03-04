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
  // No usamos .select() después del UPDATE porque la política RLS
  // bloquea que el admin lea filas de otros usuarios, devolviendo 0 filas
  // aunque el UPDATE haya tenido éxito.
  const { error } = await supabase
    .from("users")
    .update({ role_id: roleId })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Activa o desactiva un usuario (ban/unban). Solo Admin.
 * @param {string} userId
 * @param {boolean} isActive - true = activo, false = baneado
 */
export async function updateUserStatus(userId, isActive) {
  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Obtiene métricas principales para el resumen del dashboard Admin.
 *
 * Incluye:
 * - Cantidad total de usuarios
 * - Cantidad de publicaciones creadas hoy
 * - Cantidad de reportes pendientes
 * - Cantidad de validaciones (upvotes) hechas hoy
 */
export async function getAdminOverviewStats() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const startIso = startOfToday.toISOString();

  const [
    usersCountResult,
    publicationsTodayResult,
    reportsPendingResult,
    validationsTodayResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("price_publications")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startIso),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["PENDING", "pending"]),
    supabase
      .from("publication_votes")
      .select("id", { count: "exact", head: true })
      .eq("vote_type", 1)
      .gte("created_at", startIso),
  ]);

  const firstError = [
    usersCountResult.error,
    publicationsTodayResult.error,
    reportsPendingResult.error,
    validationsTodayResult.error,
  ].find(Boolean);

  if (firstError) {
    return { success: false, error: firstError.message };
  }

  return {
    success: true,
    data: {
      totalUsers: usersCountResult.count ?? 0,
      publicationsToday: publicationsTodayResult.count ?? 0,
      pendingReports: reportsPendingResult.count ?? 0,
      validationsToday: validationsTodayResult.count ?? 0,
    },
  };
}

/**
 * Obtiene todos los reportes para moderación/admin.
 * Incluye detalles completos de la publicación reportada (producto, marca, tienda, precio, unidad).
 */
export async function getAdminReports() {
  const { data, error } = await supabase
    .from("reports")
    .select(`
      id,
      publication_id,
      reported_user_id,
      reporter_user_id,
      reason,
      status,
      reviewed_by,
      created_at,
      resolved_at,
      description,
      evidence_url,
      mod_notes,
      action_taken,
      reporter:reporter_user_id(full_name),
      reported:reported_user_id(full_name),
      reviewer:reviewed_by(full_name),
      publication:publication_id(
        id,
        price,
        product:products(
          id,
          name,
          base_quantity,
          brand:brands(id, name),
          unit_type:unit_types(id, name, abbreviation)
        ),
        store:stores(id, name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

/**
 * Actualiza datos de revisión de un reporte.
 * @param {string} reportId
 * @param {Object} payload
 */
export async function updateReportReview(reportId, payload) {
  const { error } = await supabase
    .from("reports")
    .update(payload)
    .eq("id", reportId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}