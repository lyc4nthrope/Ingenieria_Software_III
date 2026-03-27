/**
 * dealerRatings.api.js
 *
 * Calificaciones al repartidor al finalizar un pedido.
 *
 * submitRating    → usuario califica al repartidor (1-5 estrellas)
 * hasRated        → usuario verifica si ya calificó un pedido específico
 * getDealerRating → calificación promedio de un repartidor
 *
 * Patrón de retorno: { success, data?, error? }
 */

import { supabase } from '@/services/supabase.client';

/**
 * Califica al repartidor de un pedido entregado.
 * La tabla tiene UNIQUE(order_id), por lo que solo se puede calificar una vez por pedido.
 *
 * @param {{ orderId: string, dealerId: string, stars: number, comment?: string }} params
 */
export async function submitRating({ orderId, dealerId, stars, comment }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'No autenticado' };

  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return { success: false, error: 'La calificación debe ser entre 1 y 5 estrellas' };
  }

  const { data, error } = await supabase
    .from('dealer_ratings')
    .insert({
      order_id:  Number(orderId),
      dealer_id: dealerId,
      user_id:   user.id,
      stars,
      comment:   comment?.trim() || null,
    })
    .select('id, stars, created_at')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'Ya calificaste este pedido' };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Verifica si el usuario ya calificó un pedido específico.
 * Útil para no mostrar el modal si ya calificó.
 *
 * @param {string} orderId
 * @returns {{ success: boolean, data: { rated: boolean } }}
 */
export async function hasRated(orderId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: true, data: { rated: false } };

  const { data, error } = await supabase
    .from('dealer_ratings')
    .select('id')
    .eq('order_id', Number(orderId))
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return { success: false, error: error.message };
  return { success: true, data: { rated: !!data } };
}

/**
 * Obtiene la calificación promedio y total de calificaciones de un repartidor.
 *
 * @param {string} dealerId - UUID del repartidor
 * @returns {{ success: boolean, data: { average: number, total: number } }}
 */
export async function getDealerRating(dealerId) {
  const { data, error } = await supabase
    .from('dealer_ratings')
    .select('stars')
    .eq('dealer_id', dealerId);

  if (error) return { success: false, error: error.message };

  const ratings = data ?? [];
  const total = ratings.length;
  const average = total > 0
    ? Math.round((ratings.reduce((sum, r) => sum + r.stars, 0) / total) * 10) / 10
    : 0;

  return { success: true, data: { average, total } };
}
