/**
 * reports.api.js
 *
 * API unificada para reportar cualquier entidad de la plataforma:
 * publicaciones, tiendas, productos, marcas y usuarios.
 *
 * La tabla `reports` usa un diseño polimórfico limpio:
 *   - `reported_type` VARCHAR: discriminador del tipo de entidad
 *   - `reported_id`   UUID:    ID de la entidad reportada
 *
 * Sin columnas FK nullable por tipo — extensible sin cambiar el schema.
 */

import { supabase } from '@/services/supabase.client';
import { uploadImageToCloudinary } from '@/services/cloudinary';

// ─── Razones de reporte por tipo de entidad ───────────────────────────────────

export const REPORT_REASONS = {
  publication: [
    { value: 'fake_price',   label: 'Precio falso o engañoso' },
    { value: 'wrong_photo',  label: 'La foto no coincide con la publicación' },
    { value: 'spam',         label: 'Spam o contenido repetitivo' },
    { value: 'offensive',    label: 'Contenido ofensivo o inapropiado' },
    { value: 'other',        label: 'Otro motivo' },
  ],
  store: [
    { value: 'wrong_location',      label: 'Ubicación incorrecta' },
    { value: 'permanently_closed',  label: 'Tienda cerrada permanentemente' },
    { value: 'fake_store',          label: 'Tienda falsa o inexistente' },
    { value: 'offensive',           label: 'Nombre o contenido ofensivo' },
    { value: 'other',               label: 'Otro motivo' },
  ],
  product: [
    { value: 'wrong_info',  label: 'Información incorrecta' },
    { value: 'duplicate',   label: 'Producto duplicado' },
    { value: 'offensive',   label: 'Nombre o contenido ofensivo' },
    { value: 'other',       label: 'Otro motivo' },
  ],
  brand: [
    { value: 'duplicate',  label: 'Marca duplicada' },
    { value: 'offensive',  label: 'Nombre ofensivo' },
    { value: 'other',      label: 'Otro motivo' },
  ],
  user: [
    { value: 'spam',         label: 'Spam o contenido repetitivo' },
    { value: 'offensive',    label: 'Comportamiento ofensivo o abusivo' },
    { value: 'fake_account', label: 'Cuenta falsa' },
    { value: 'other',        label: 'Otro motivo' },
  ],
};

// ─── Verificar si el usuario ya reportó una entidad ──────────────────────────

/**
 * @param {'publication'|'store'|'product'|'brand'|'user'} reportedType
 * @param {string} targetId - UUID de la entidad
 */
export async function checkReportStatus(reportedType, targetId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: true, hasReported: false, existingReport: null };

  const { data, error } = await supabase
    .from('reports')
    .select('id, created_at')
    .eq('reporter_user_id', user.id)
    .eq('reported_type', reportedType)
    .eq('reported_id', String(targetId)) // TEXT: cast para consistencia
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, hasReported: !!data, existingReport: data || null };
}

// ─── Enviar un reporte ────────────────────────────────────────────────────────

/**
 * @param {'publication'|'store'|'product'|'brand'|'user'} reportedType
 * @param {string} targetId - UUID de la entidad reportada
 * @param {{ reason: string, description?: string, evidenceFile?: File }} payload
 */
export async function submitReport(reportedType, targetId, { reason, description, evidenceFile } = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Debes iniciar sesión para reportar' };
  if (!reason) return { success: false, error: 'La razón del reporte es obligatoria' };

  // Subir evidencia si se adjuntó
  let evidenceUrl = null;
  if (evidenceFile) {
    const upload = await uploadImageToCloudinary(evidenceFile, { folder: 'nosee/reports-evidence' });
    if (upload.success) evidenceUrl = upload.url;
  }

  // Buscar el propietario de la entidad para `reported_user_id` (útil para acciones de moderación)
  let reportedUserId = null;
  if (reportedType === 'user') {
    reportedUserId = targetId;
  } else if (reportedType === 'publication') {
    const { data } = await supabase.from('price_publications').select('user_id').eq('id', Number(targetId)).single();
    reportedUserId = data?.user_id ?? null;
  } else if (reportedType === 'store') {
    const { data } = await supabase.from('stores').select('created_by').eq('id', targetId).single();
    reportedUserId = data?.created_by ?? null;
  }

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reported_type:    reportedType,
      reported_id:      String(targetId), // TEXT: compatible con bigint (publications) y UUID (resto)
      reporter_user_id: user.id,
      reported_user_id: reportedUserId,
      reason,
      description:  description || null,
      evidence_url: evidenceUrl,
      status:       'pending',
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') return { success: false, error: 'Ya reportaste este elemento anteriormente' };
    return { success: false, error: error.message };
  }

  // Sumar reputación al reportador
  await supabase.rpc('increment_user_reputation', {
    target_user_id: user.id,
    reputation_delta: 2,
  });

  return { success: true, data };
}
