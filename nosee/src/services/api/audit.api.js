/**
 * audit.api.js
 *
 * Funciones para registrar y consultar logs de auditoría.
 * Tablas: admin_content_audit_log, login_audit_logs
 */
import { supabase } from '@/services/supabase.client';

/**
 * Registra una acción de administración/moderación.
 * No lanza error — falla silenciosamente para no interrumpir la acción principal.
 */
export async function insertActionLog(actorId, resourceType, resourceId, actionType, reason = null, metadata = {}) {
  if (!actorId) return;
  try {
    await supabase.from('admin_content_audit_log').insert({
      actor_user_id: actorId,
      resource_type: resourceType,
      resource_id: String(resourceId ?? ''),
      action_type: actionType,
      reason: reason || null,
      metadata: metadata || {},
    });
  } catch {
    // No bloquea la acción principal
  }
}

/**
 * Obtiene logs de acciones de administración/moderación.
 * Si se pasa actorId, filtra solo las acciones de ese actor (para moderadores).
 */
export async function getActionLogs({ actorId = null, limit = 100, offset = 0 } = {}) {
  let query = supabase
    .from('admin_content_audit_log')
    .select('id, resource_type, resource_id, action_type, reason, metadata, actor_user_id, created_at')
    .order('created_at', { ascending: false });

  if (actorId) query = query.eq('actor_user_id', actorId);

  const { data, error } = await query.range(offset, offset + limit - 1);
  return { data: data || [], error };
}

/**
 * Registra una acción de un usuario regular en la plataforma.
 * No lanza error — falla silenciosamente para no interrumpir el flujo principal.
 * Retorna { error } para que el llamador pueda detectar fallos si lo necesita.
 * Acciones: 'crear_publicacion', 'editar_publicacion', 'crear_tienda',
 *           'editar_tienda', 'reportar', 'actualizar_perfil', 'crear_pedido',
 *           'crear_alerta', 'eliminar_alerta', 'agregar_item_lista', 'eliminar_item_lista'
 */
export async function insertUserActivityLog(userId, action, details = {}) {
  if (!userId) return { error: null };
  try {
    const { error } = await supabase.from('user_activity_logs').insert({
      user_id: userId,
      action,
      details: details || {},
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[audit] insertUserActivityLog falló:', error.message, { userId, action });
    }
    return { error: error ?? null };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[audit] insertUserActivityLog excepción:', err?.message, { userId, action });
    return { error: err };
  }
}

/**
 * Obtiene logs de actividad de usuarios.
 * Si se pasa userId, filtra por ese usuario.
 * Solo accesible para admin/moderador (RLS).
 */
export async function getUserActivityLogs({ userId = null, limit = 200, offset = 0 } = {}) {
  let query = supabase
    .from('user_activity_logs')
    .select('id, user_id, action, details, created_at')
    .order('created_at', { ascending: false });

  if (userId) query = query.eq('user_id', userId);

  const { data, error } = await query.range(offset, offset + limit - 1);
  return { data: data || [], error };
}

/**
 * Obtiene logs de acceso/login. Solo accesible para admin (RLS).
 */
export async function getLoginLogs({ limit = 100, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('login_audit_logs')
    .select('id, user_id, event_type, ip_address, user_agent, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data || [], error };
}
