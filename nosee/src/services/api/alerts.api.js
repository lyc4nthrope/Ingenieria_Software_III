/**
 * alerts.api.js — API de alertas de precios
 * Tabla: price_alerts (user_id, product_id bigint, target_price, is_active)
 */

import { supabase } from '@/services/supabase.client';

/** Obtener alertas activas del usuario autenticado */
export const getUserAlerts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data, error } = await supabase
      .from('price_alerts')
      .select(`
        id, target_price, is_active, created_at,
        products ( id, name )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/** Crear una alerta de precio */
export const createAlert = async ({ productId, targetPrice }) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'No autenticado' };

    const { data, error } = await supabase
      .from('price_alerts')
      .insert({ user_id: user.id, product_id: productId, target_price: targetPrice })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/** Desactivar (eliminar) una alerta */
export const deleteAlert = async (alertId) => {
  try {
    const { error } = await supabase
      .from('price_alerts')
      .update({ is_active: false })
      .eq('id', alertId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/** Verificar si alguna publicación activa cumple las alertas del usuario */
export const checkMatchingAlerts = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, data: [] };

    const { data: alerts } = await supabase
      .from('price_alerts')
      .select('id, product_id, target_price')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!alerts?.length) return { success: true, data: [] };

    const matches = [];
    for (const alert of alerts) {
      const { data: pubs } = await supabase
        .from('price_publications')
        .select('id, price, stores(name), products(name)')
        .eq('product_id', alert.product_id)
        .eq('is_active', true)
        .lte('price', alert.target_price)
        .limit(1);

      if (pubs?.length) {
        matches.push({ alert, publication: pubs[0] });
      }
    }

    return { success: true, data: matches };
  } catch (err) {
    return { success: false, data: [] };
  }
};
