/**
 * payments.api.js
 *
 * Funciones para el flujo de pago por comprobante (Nu / Nequi).
 *
 * FLUJO COMPLETO:
 *   1. uploadReceipt()   → sube la foto del comprobante a Storage
 *   2. createPayment()   → crea el registro en payments con la URL del comprobante
 *   3. El repartidor ve el comprobante en su dashboard y confirma recepción
 */

import { supabase } from '@/services/supabase.client';

/**
 * Sube la foto del comprobante de pago a Supabase Storage.
 * La ruta es: payment-receipts/{userId}/{orderId}-{timestamp}.{ext}
 *
 * Por qué incluir orderId en el nombre: permite al repartidor y al admin
 * encontrar el comprobante de un pedido específico sin consultar la DB.
 *
 * @param {string} userId  - UUID del usuario
 * @param {number} orderId - id INTEGER del pedido
 * @param {File}   file    - archivo de imagen seleccionado por el usuario
 * @returns {{ url: string|null, error: object|null }}
 */
export async function uploadReceipt(userId, orderId, file) {
  const ext  = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/pedido-${orderId}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('payment-receipts')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,  // no sobreescribir — cada intento genera un archivo nuevo
    });

  if (uploadError) return { url: null, error: uploadError };

  // Obtener la URL firmada (válida 1 hora) para mostrar la preview al usuario
  // y para que el repartidor pueda verla sin que sea pública.
  const { data: signed, error: signError } = await supabase.storage
    .from('payment-receipts')
    .createSignedUrl(path, 3600);

  if (signError) return { url: null, error: signError };

  return { url: signed.signedUrl, path, error: null };
}

/**
 * Crea el registro de pago en la tabla payments.
 * Se llama después de subir el comprobante exitosamente.
 *
 * @param {object} opts
 * @param {number}  opts.orderId      - id del pedido
 * @param {string}  opts.userId       - UUID del usuario
 * @param {number}  opts.amount       - monto total a pagar (productos + domicilio)
 * @param {string}  opts.method       - 'nequi' | 'nu'
 * @param {string}  opts.receiptUrl   - URL firmada del comprobante en Storage
 * @param {string}  opts.receiptPath  - ruta interna del archivo en Storage
 */
export async function createPayment({ orderId, userId, amount, method, receiptUrl, receiptPath }) {
  const { data, error } = await supabase
    .from('payments')
    .insert({
      order_id:           orderId,
      user_id:            userId,
      amount:             amount,
      payment_method:     method,
      // external_reference: guardamos la ruta interna (no la URL firmada que expira)
      external_reference: receiptPath,
      receipt_url:        receiptUrl,
      status:             'pendiente_verificacion',
    })
    .select('id')
    .single();

  return { data, error };
}

/**
 * Obtiene el pago de un pedido específico.
 * Útil para el repartidor que quiere ver el comprobante.
 */
export async function getPaymentByOrderId(orderId) {
  const { data, error } = await supabase
    .from('payments')
    .select('id, amount, payment_method, receipt_url, status, created_at')
    .eq('order_id', orderId)
    .maybeSingle();

  return { data, error };
}

/**
 * Genera una URL firmada fresca para ver el comprobante.
 * Las URLs firmadas expiran — si el repartidor necesita ver el comprobante
 * más de 1 hora después, se necesita regenerar la URL.
 *
 * @param {string} receiptPath - ruta interna guardada en external_reference
 */
export async function getReceiptSignedUrl(receiptPath) {
  const { data, error } = await supabase.storage
    .from('payment-receipts')
    .createSignedUrl(receiptPath, 3600);

  return { url: data?.signedUrl ?? null, error };
}
