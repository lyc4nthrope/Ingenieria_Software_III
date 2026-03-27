/**
 * dealerApplications.api.js
 *
 * Gestión de solicitudes para ser repartidor.
 *
 * FLUJO:
 *   submitApplication  → usuario envía solicitud (status='pending')
 *   getMyApplication   → usuario consulta el estado de su solicitud
 *   getApplications    → admin lista todas las solicitudes
 *   reviewApplication  → admin aprueba o rechaza (y cambia el rol si aprueba)
 *
 * Patrón de retorno: { success, data?, error? }
 */

import { supabase } from '@/services/supabase.client';
import { changeUserRole } from '@/services/api/users.api';

/**
 * Envía una solicitud para ser repartidor.
 * UNIQUE(user_id) en la tabla garantiza que no haya duplicados.
 *
 * @param {{ fullName: string, phone: string, motivation: string }} params
 */
export async function submitApplication({ fullName, phone, motivation }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data, error } = await supabase
    .from('dealer_applications')
    .insert({
      user_id:    user.id,
      full_name:  fullName,
      phone,
      motivation: motivation || null,
    })
    .select('id, status, created_at')
    .single();

  if (error) {
    // Código 23505 = violación de UNIQUE → ya tiene solicitud enviada
    if (error.code === '23505') {
      return { success: false, error: 'Ya tienes una solicitud enviada' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Obtiene la solicitud del usuario autenticado (si existe).
 * Devuelve null en data si no hay solicitud aún.
 */
export async function getMyApplication() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  const { data, error } = await supabase
    .from('dealer_applications')
    .select('id, full_name, phone, motivation, status, rejection_reason, created_at, reviewed_at')
    .eq('user_id', user.id)
    .maybeSingle();  // maybeSingle: no lanza error si no hay fila

  if (error) return { success: false, error: error.message };
  return { success: true, data };  // data puede ser null si no envió solicitud
}

/**
 * Lista todas las solicitudes (solo Admin).
 * Ordena: pending primero, luego por fecha de creación.
 *
 * @param {{ status?: 'pending'|'approved'|'rejected' }} options
 */
export async function getApplications({ status } = {}) {
  let query = supabase
    .from('dealer_applications')
    .select(`
      id,
      user_id,
      full_name,
      phone,
      motivation,
      status,
      rejection_reason,
      created_at,
      reviewed_at,
      applicant:users!dealer_applications_user_id_fkey(id, full_name, avatar_url, reputation_points)
    `)
    .order('status', { ascending: true })   // pending < approved/rejected (alfabético)
    .order('created_at', { ascending: true });

  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return { success: false, error: error.message };
  return { success: true, data: data ?? [] };
}

/**
 * El Admin aprueba o rechaza una solicitud.
 *
 * Al aprobar: cambia el rol del usuario a Repartidor (role_id=4).
 * Al rechazar: guarda el motivo de rechazo.
 *
 * @param {string} applicationId - UUID de la solicitud
 * @param {'approved'|'rejected'} decision
 * @param {{ rejectionReason?: string, applicantUserId: string }} options
 */
export async function reviewApplication(applicationId, decision, { rejectionReason, applicantUserId }) {
  const { data: { user: admin } } = await supabase.auth.getUser();
  if (!admin) return { success: false, error: 'No autenticado' };

  const updates = {
    status:      decision,
    reviewed_by: admin.id,
    reviewed_at: new Date().toISOString(),
  };

  if (decision === 'rejected' && rejectionReason) {
    updates.rejection_reason = rejectionReason;
  }

  const { error } = await supabase
    .from('dealer_applications')
    .update(updates)
    .eq('id', applicationId);

  if (error) return { success: false, error: error.message };

  // Si aprueba → cambiar rol a Repartidor (role_id=4)
  if (decision === 'approved') {
    const roleResult = await changeUserRole(applicantUserId, 4);
    if (!roleResult.success) {
      return { success: false, error: `Solicitud aprobada pero no se pudo cambiar el rol: ${roleResult.error}` };
    }
  }

  return { success: true };
}
