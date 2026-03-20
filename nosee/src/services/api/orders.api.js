/**
 * orders.api.js
 *
 * Funciones para crear y gestionar pedidos del Proceso 3/4.
 *
 * ESQUEMA REAL EN SUPABASE:
 *   orders.id          → INTEGER (serial), no UUID
 *   orders.total_estimated       → costo optimizado de la cesta (Proceso 3)
 *   orders.total_single_store    → costo si comprara todo en una sola tienda
 *   orders.savings_percentage    → % de ahorro
 *   orders.delivery_fee          → tarifa de domicilio (agregada en esta migración)
 *   orders.stores / .items       → JSONB del resultado de optimización
 *   orders.dealer_id             → UUID del repartidor asignado
 *   orders.local_id              → "NSE-xxx" generado en el cliente
 *
 * Patrón de retorno: { data, error } — igual que el resto de api/*.js del proyecto.
 */

import { supabase } from '@/services/supabase.client';

// ═══════════════════════════════════════════════════════════════════════════════
// USUARIO — crear y consultar sus pedidos
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea un pedido confirmado en Supabase.
 * Llamado desde CreateOrderPage cuando el usuario confirma su cesta óptima.
 *
 * Devuelve { data: { id } } con el INTEGER generado por Supabase.
 */
export async function createOrder({
  userId,
  localId,
  deliveryMode,
  deliveryAddress,
  deliveryCoords,
  stores,
  items,
  totalCost,      // → total_estimated
  savings,        // → derivamos total_single_store_estimate y savings_percentage
  savingsPct,     // → savings_percentage
  deliveryFee,
  strategy,
}) {
  const totalSingleStore = Math.round((totalCost ?? 0) + (savings ?? 0));

  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id:                    userId,
      local_id:                   localId,
      status:                     deliveryMode ? 'pendiente_repartidor' : 'usuario_se_encarga',
      delivery_mode:              deliveryMode,
      // delivery_address es NOT NULL sin default — usar '' si el usuario no escribió dirección
      delivery_address:           deliveryAddress || '',
      delivery_coords:            deliveryCoords  || null,
      stores:                     stores          ?? [],
      items:                      items           ?? [],
      // Columnas de costos que ya existían en el esquema
      total_estimated:            totalCost       ?? 0,
      total_single_store_estimate: totalSingleStore,
      savings_percentage:         savingsPct      ?? 0,
      // Nueva columna agregada en la migración de Proceso 4
      delivery_fee:               deliveryFee     ?? 0,
      strategy:                   strategy        ?? 'balanced',
      confirmed_at:               new Date().toISOString(),
    })
    .select('id')   // solo necesitamos el id INTEGER generado
    .single();

  return { data, error };
}

/**
 * Obtiene los pedidos del usuario autenticado, más recientes primero.
 */
export async function getUserOrders({ limit = 20, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, local_id, status, delivery_mode, total_estimated, delivery_fee, savings_percentage, strategy, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data ?? [], error };
}

/**
 * Obtiene un pedido completo por su id (INTEGER).
 */
export async function getOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  return { data, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPARTIDOR — ver pedidos disponibles y gestionar los asignados
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene los pedidos disponibles para ser aceptados.
 * Solo devuelve status='pendiente_repartidor', ordenados FIFO
 * (los más antiguos primero — justo para los usuarios que llevan más tiempo esperando).
 */
export async function getAvailableOrders({ limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, local_id, status, delivery_address, delivery_coords, stores, items, total_estimated, delivery_fee, created_at')
    .eq('status', 'pendiente_repartidor')
    .order('created_at', { ascending: true })
    .limit(limit);

  return { data: data ?? [], error };
}

/**
 * Obtiene los pedidos activos asignados al repartidor autenticado.
 */
export async function getDealerActiveOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .in('status', ['aceptado', 'comprando', 'en_camino', 'llegando'])
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

/**
 * Acepta un pedido disponible. Solo usuarios con rol Repartidor pueden llamarlo.
 * La función SECURITY DEFINER en Supabase evita race conditions con FOR UPDATE.
 *
 * @param {number} orderId - id INTEGER del pedido
 */
export async function acceptOrder(orderId) {
  const { error } = await supabase.rpc('accept_order', {
    p_order_id: orderId,
  });
  return { error };
}

/**
 * Avanza el estado del pedido al siguiente paso del flujo de entrega.
 * Solo el repartidor asignado puede llamarlo.
 *
 * Flujo válido: aceptado → comprando → en_camino → llegando → entregado
 *
 * @param {number} orderId
 * @param {string} newStatus
 */
export async function advanceOrderStatus(orderId, newStatus) {
  const { error } = await supabase.rpc('advance_order_status', {
    p_order_id:   orderId,
    p_new_status: newStatus,
  });
  return { error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACKING GPS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upsert de la ubicación GPS del repartidor (~cada 15s mientras tiene pedido activo).
 * Una sola fila por repartidor en dealer_locations — siempre sobreescribe.
 */
export async function upsertDealerLocation(dealerId, lat, lng, isAvailable = true) {
  const { error } = await supabase
    .from('dealer_locations')
    .upsert(
      { dealer_id: dealerId, lat, lng, is_available: isAvailable, updated_at: new Date().toISOString() },
      { onConflict: 'dealer_id' }
    );
  return { error };
}

/**
 * Lee la ubicación actual de un repartidor.
 * RLS permite verla solo si el usuario tiene un pedido activo con ese repartidor.
 */
export async function getDealerLocation(dealerId) {
  const { data, error } = await supabase
    .from('dealer_locations')
    .select('lat, lng, updated_at')
    .eq('dealer_id', dealerId)
    .single();
  return { data, error };
}
