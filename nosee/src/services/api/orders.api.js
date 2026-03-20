/**
 * orders.api.js
 *
 * Funciones para crear y gestionar pedidos del Proceso 3/4.
 * Tabla principal: orders
 * Tabla secundaria: dealer_locations
 *
 * Patrón de retorno: { data, error } — igual que el resto de api/*.js del proyecto.
 * Las funciones nunca lanzan excepciones; siempre devuelven el error en el objeto.
 */

import { supabase } from '@/services/supabase.client';

// ═══════════════════════════════════════════════════════════════════════════════
// USUARIO — crear y consultar sus pedidos
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea un pedido confirmado en Supabase.
 * Llamado desde CreateOrderPage cuando el usuario confirma su cesta óptima.
 *
 * Devuelve { data: { id } } con el UUID generado por Supabase,
 * que se usa para identificar el pedido en las operaciones posteriores.
 *
 * @param {object} orderData
 * @param {string}  orderData.userId          - UUID del usuario (auth.uid())
 * @param {string}  orderData.localId         - ID legible del cliente ("NSE-xxx")
 * @param {boolean} orderData.deliveryMode    - true = domicilio, false = voy yo
 * @param {string|null} orderData.deliveryAddress - dirección de entrega
 * @param {{lat:number,lng:number}|null} orderData.deliveryCoords
 * @param {Array}   orderData.stores          - resultado del algoritmo de cesta
 * @param {Array}   orderData.items           - ítems originales del usuario
 * @param {number}  orderData.totalCost       - costo total en COP
 * @param {number}  orderData.deliveryFee     - tarifa de domicilio en COP (0 si voy yo)
 * @param {number}  orderData.savings         - ahorro estimado en COP
 * @param {string}  orderData.strategy        - 'price' | 'fewest_stores' | 'balanced'
 */
export async function createOrder({
  userId,
  localId,
  deliveryMode,
  deliveryAddress,
  deliveryCoords,
  stores,
  items,
  totalCost,
  deliveryFee,
  savings,
  strategy,
}) {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      user_id:          userId,
      local_id:         localId,
      // Si el usuario eligió domicilio, el pedido queda "pendiente_repartidor"
      // para que cualquier repartidor disponible lo pueda ver y aceptar.
      // Si eligió "voy yo", el pedido no participa del Proceso 4.
      status:           deliveryMode ? 'pendiente_repartidor' : 'usuario_se_encarga',
      delivery_mode:    deliveryMode,
      delivery_address: deliveryAddress || null,
      delivery_coords:  deliveryCoords  || null,
      stores:           stores  ?? [],
      items:            items   ?? [],
      // Math.round() porque los cálculos de precios pueden dar floats (ej: 15833.333...)
      // y la columna es INTEGER en Supabase.
      total_cost:       Math.round(totalCost    ?? 0),
      delivery_fee:     Math.round(deliveryFee  ?? 0),
      savings:          Math.round(savings      ?? 0),
      strategy:         strategy ?? null,
    })
    .select('id')   // solo necesitamos el UUID generado, no toda la fila
    .single();

  return { data, error };
}

/**
 * Obtiene los pedidos del usuario autenticado, ordenados del más reciente al más antiguo.
 * RLS garantiza que solo devuelve las filas donde user_id = auth.uid().
 */
export async function getUserOrders({ limit = 20, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, local_id, status, delivery_mode, total_cost, delivery_fee, savings, strategy, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  return { data: data ?? [], error };
}

/**
 * Obtiene un pedido completo por su UUID de Supabase.
 * Útil para mostrar los detalles de un pedido al usuario o al repartidor.
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
 * Obtiene los pedidos disponibles para ser aceptados por un repartidor.
 * Solo devuelve pedidos con status='pendiente_repartidor'.
 * RLS garantiza que solo los usuarios con rol Repartidor pueden ver estas filas.
 *
 * Los pedidos se ordenan FIFO (más antiguos primero) para ser justos
 * con los usuarios que llevan más tiempo esperando.
 */
export async function getAvailableOrders({ limit = 30 } = {}) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, local_id, status, delivery_address, delivery_coords, stores, items, total_cost, delivery_fee, created_at')
    .eq('status', 'pendiente_repartidor')
    .order('created_at', { ascending: true })
    .limit(limit);

  return { data: data ?? [], error };
}

/**
 * Obtiene los pedidos activos asignados al repartidor autenticado.
 * "Activos" = estados intermedios (aceptado, comprando, en_camino, llegando).
 */
export async function getDealerActiveOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    // Filtramos por los estados activos del flujo de entrega
    .in('status', ['aceptado', 'comprando', 'en_camino', 'llegando'])
    .order('created_at', { ascending: false });

  return { data: data ?? [], error };
}

/**
 * Acepta un pedido disponible. Solo lo puede llamar un usuario con rol Repartidor.
 * Usa una función SECURITY DEFINER en Supabase para evitar race conditions:
 * si dos repartidores intentan aceptar el mismo pedido al mismo tiempo,
 * solo uno tendrá éxito (el otro recibe el error 'order_not_available').
 */
export async function acceptOrder(orderId) {
  const { error } = await supabase.rpc('accept_order', {
    p_order_id: orderId,
  });
  return { error };
}

/**
 * Avanza el estado del pedido al siguiente paso del flujo de entrega.
 * Solo lo puede llamar el repartidor asignado al pedido.
 *
 * Flujo válido:
 *   aceptado → comprando → en_camino → llegando → entregado
 *
 * @param {string} orderId   - UUID del pedido
 * @param {string} newStatus - el siguiente estado (debe ser el inmediatamente siguiente)
 */
export async function advanceOrderStatus(orderId, newStatus) {
  const { error } = await supabase.rpc('advance_order_status', {
    p_order_id:    orderId,
    p_new_status:  newStatus,
  });
  return { error };
}


// ═══════════════════════════════════════════════════════════════════════════════
// TRACKING GPS — ubicación del repartidor en tiempo real
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Actualiza (upsert) la ubicación GPS del repartidor.
 * Se llama periódicamente (~cada 15s) mientras el repartidor tiene un pedido activo.
 *
 * Por qué upsert y no insert: la tabla dealer_locations tiene solo UNA fila por
 * repartidor. Hacer insert cada vez crearía millones de filas históricas innecesarias.
 * Solo nos interesa la ubicación ACTUAL.
 *
 * @param {string}  dealerId    - UUID del repartidor
 * @param {number}  lat
 * @param {number}  lng
 * @param {boolean} isAvailable - false = repartidor fuera de servicio
 */
export async function upsertDealerLocation(dealerId, lat, lng, isAvailable = true) {
  const { error } = await supabase
    .from('dealer_locations')
    .upsert(
      {
        dealer_id:    dealerId,
        lat,
        lng,
        is_available: isAvailable,
        updated_at:   new Date().toISOString(),
      },
      { onConflict: 'dealer_id' }  // si ya existe una fila con este dealer_id, actualizar
    );

  return { error };
}

/**
 * Obtiene la ubicación actual de un repartidor específico.
 * RLS permite leerla solo si el usuario tiene un pedido activo con ese repartidor.
 *
 * @param {string} dealerId - UUID del repartidor
 */
export async function getDealerLocation(dealerId) {
  const { data, error } = await supabase
    .from('dealer_locations')
    .select('lat, lng, updated_at')
    .eq('dealer_id', dealerId)
    .single();

  return { data, error };
}
