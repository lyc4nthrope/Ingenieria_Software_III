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
  serviceFee,     // → tarifa de plataforma: 2.000 + 3% del total
  strategy,
  paymentMethod,
}) {
  const totalSingleStore = Math.round((totalCost ?? 0) + (savings ?? 0));
  const totalEstimated = totalSingleStore + (deliveryFee ?? 0);
  const compromisoAmount = 2000 + Math.round(totalSingleStore * 0.03);

  const deliveryPin = String(Math.floor(1000 + Math.random() * 9000));

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
      total_estimated:            totalEstimated  ?? 0,
      total_single_store_estimate: totalSingleStore,
      savings_percentage:         savingsPct      ?? 0,
      // Nueva columna agregada en la migración de Proceso 4
      delivery_fee:               deliveryFee     ?? 0,
      service_fee:                serviceFee      ?? compromisoAmount,
      compromiso_amount:          compromisoAmount,
      strategy:                   strategy        ?? 'balanced',
      payment_method:             paymentMethod   ?? 'transferencia',
      confirmed_at:               new Date().toISOString(),
      // PIN de verificación para cerrar el pedido (RF-03)
      delivery_pin:               deliveryPin,
    })
    .select('id, delivery_pin')   // devolvemos el PIN para mostrarlo al cliente
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
    .in('status', ['aceptado', 'pendiente_compromiso', 'comprando', 'en_camino', 'llegando'])
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
 * Cancela un pedido disponible (status='pendiente_repartidor').
 * Solo un repartidor puede llamarlo y solo si el pedido aún no fue aceptado.
 *
 * @param {number} orderId
 */
export async function cancelAvailableOrder(orderId) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelado' })
    .eq('id', orderId)
    .eq('status', 'pendiente_repartidor'); // guard: solo cancela si aún está disponible
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

// ═══════════════════════════════════════════════════════════════════════════════
// PRECIO DE PRODUCTO — corrección inline
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Actualiza el precio de un producto específico dentro del JSONB stores
 * de un pedido. Recalcula total_estimated automáticamente.
 *
 * @param {number} orderId     - id INTEGER del pedido en Supabase
 * @param {number} storeIdx    - índice del store en el array stores[]
 * @param {number} productIdx  - índice del producto en store.products[]
 * @param {number} newPrice    - nuevo precio unitario
 * @returns {{ error, newStores, newTotal }}
 */
export async function updateProductPrice(orderId, storeIdx, productIdx, newPrice) {
  // 1. Traer el stores JSONB actual
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('stores')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order?.stores) return { error: fetchErr ?? new Error('Pedido no encontrado') };

  // 2. Clonar y actualizar el precio puntual
  const stores = JSON.parse(JSON.stringify(order.stores));
  if (!stores[storeIdx]?.products?.[productIdx]) {
    return { error: new Error('Índice de producto fuera de rango') };
  }
  stores[storeIdx].products[productIdx].price = newPrice;

  // 3. Recalcular total estimado
  const newTotal = stores.reduce(
    (sum, s) =>
      sum +
      (s.products ?? []).reduce(
        (psum, p) => psum + (p.price ?? 0) * (p.item?.quantity ?? 1),
        0
      ),
    0
  );

  // 4. Persistir
  const { error } = await supabase
    .from('orders')
    .update({ stores, total_estimated: newTotal })
    .eq('id', orderId);

  return { error, newStores: stores, newTotal, oldPrice: order.stores[storeIdx]?.products?.[productIdx]?.price ?? 0 };
}

/**
 * Registra una corrección de precio en la tabla price_corrections (auditoría).
 * Se llama después de updateProductPrice tanto desde el usuario como del repartidor.
 */
export async function logPriceCorrection({ orderId, storeIdx, productIdx, productName, oldPrice, newPrice, role }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('price_corrections').insert({
    order_id:        orderId,
    store_idx:       storeIdx,
    product_idx:     productIdx,
    product_name:    productName,
    old_price:       oldPrice,
    new_price:       newPrice,
    changed_by:      user?.id ?? null,
    changed_by_role: role ?? 'user',
  });
  if (error) console.warn('[logPriceCorrection] error al guardar log:', error.message);
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

// ═══════════════════════════════════════════════════════════════════════════════
// PAGO PREVIO Y PIN DE VERIFICACIÓN (RF-01, RF-03)
// ═══════════════════════════════════════════════════════════════════════════════

// Importar solo cuando se necesite — evitar import circular con payments.api
// Se importa dinámicamente en submitUpfrontReceipt para no crear dependencia circular.

/**
 * Sube el comprobante de pago previo y libera el pedido al pool de repartidores.
 * Combina: upload → guardar URL en order → confirm_order_payment RPC.
 *
 * @param {number} orderId - id INTEGER del pedido
 * @param {string} userId  - UUID del usuario
 * @param {File}   file    - imagen del comprobante
 */
export async function submitUpfrontReceipt(orderId, userId, file) {
  const { uploadReceipt } = await import('@/services/api/payments.api');
  const { url, error: uploadErr } = await uploadReceipt(userId, orderId, file);
  if (uploadErr) return { error: uploadErr };

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ payment_receipt_url: url })
    .eq('id', orderId);
  if (updateErr) return { error: updateErr };

  const { error } = await supabase.rpc('confirm_order_payment', { p_order_id: orderId });
  return { error };
}

/**
 * Libera el pedido al pool de repartidores tras confirmar el pago.
 * Cambia status de 'pendiente_pago' → 'pendiente_repartidor'.
 * Solo el dueño del pedido puede llamarlo (validado en la RPC SECURITY DEFINER).
 *
 * @param {number} orderId - id INTEGER del pedido
 */
export async function confirmOrderPayment(orderId) {
  const { error } = await supabase.rpc('confirm_order_payment', {
    p_order_id: orderId,
  });
  return { error };
}

/**
 * Verifica el PIN de entrega ingresado por el repartidor.
 * Si es correcto, la RPC avanza el estado a 'entregado' atómicamente.
 * El repartidor nunca puede leer el PIN directamente (solo el dueño del pedido).
 *
 * @param {number} orderId - id INTEGER del pedido
 * @param {string} pin     - PIN de 4 dígitos ingresado por el repartidor
 * @returns {{ data: boolean, error }}
 */
export async function verifyDeliveryPin(orderId, pin) {
  const { data, error } = await supabase.rpc('verify_delivery_pin', {
    p_order_id: orderId,
    p_pin:      pin,
  });
  return { data: data === true, error };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AJUSTE DE PRECIO — Caso B del spec (discrepancia > 5%)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Porcentaje de tolerancia para aplicar ajuste de precio sin pedir aprobación.
 * Si el nuevo precio supera este umbral sobre el original → se requiere aprobación.
 */
export const PRICE_ADJUSTMENT_THRESHOLD = 0.05;

/**
 * Crea una solicitud de ajuste de precio pendiente de aprobación por el cliente.
 * Llamado por el repartidor cuando el precio real difiere > 5% del estimado.
 */
export async function requestPriceAdjustment({ orderId, storeIdx, productIdx, productName, originalPrice, requestedPrice }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('price_adjustment_requests')
    .insert({
      order_id:        orderId,
      store_idx:       storeIdx,
      product_idx:     productIdx,
      product_name:    productName,
      original_price:  originalPrice,
      requested_price: requestedPrice,
      requested_by:    user?.id,
    })
    .select('id')
    .single();
  return { data, error };
}

/**
 * Aprueba o rechaza una solicitud de ajuste de precio (solo el dueño del pedido).
 * Retorna los datos de la solicitud para que el frontend actualice el precio si aplica.
 *
 * @param {number}  requestId - id de la solicitud en price_adjustment_requests
 * @param {boolean} approved  - true = aprobar, false = rechazar
 */
export async function resolvePriceAdjustment(requestId, approved) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('price_adjustment_requests')
    .update({
      status:       approved ? 'approved' : 'rejected',
      resolved_by:  user?.id,
      resolved_at:  new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending')
    .select('id, order_id, store_idx, product_idx, requested_price, original_price, product_name')
    .single();
  return { data, error };
}

/**
 * Obtiene las solicitudes de ajuste de precio pendientes para un pedido.
 * Usado para cargar el estado inicial cuando el cliente abre PedidosTab.
 */
export async function getPendingAdjustments(orderId) {
  const { data, error } = await supabase
    .from('price_adjustment_requests')
    .select('id, store_idx, product_idx, product_name, original_price, requested_price, created_at')
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  return { data: data ?? [], error };
}

/**
 * Cancela un pedido desde el lado del cliente (ej: tras rechazar un ajuste de precio).
 * Funciona en cualquier estado excepto 'entregado' o ya 'cancelado'.
 */
export async function cancelOrderByUser(orderId) {
  const { error } = await supabase.rpc('cancel_order_by_user', { p_order_id: orderId });
  return { error };
}

/**
 * Procesa el pago del fondo de compromiso vía MercadoPago.
 * Invoca la Edge Function process-mp-compromiso con los datos del CardPayment brick.
 * Si el pago es aprobado, el pedido avanza automáticamente a 'comprando'.
 *
 * @param {number} orderId - id INTEGER del pedido
 * @param {object} paymentData - datos del formulario de CardPayment
 */
export async function confirmCompromisoPago(orderId, { token, paymentMethodId, issuerId, installments, email, identificationType, identificationNumber }) {
  return supabase.functions.invoke('process-mp-compromiso', {
    body: { orderId, token, paymentMethodId, issuerId, installments, email, identificationType, identificationNumber },
  });
}
