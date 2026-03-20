/**
 * bankAccounts.api.js
 *
 * CRUD de cuentas bancarias del repartidor.
 * Tabla: dealer_bank_accounts
 */

import { supabase } from '@/services/supabase.client';
import { uploadImageToCloudinary } from '@/services/cloudinary';

/**
 * Obtiene las cuentas bancarias de un repartidor.
 * @param {string} dealerId - UUID del repartidor
 */
export async function getDealerBankAccounts(dealerId) {
  const { data, error } = await supabase
    .from('dealer_bank_accounts')
    .select('*')
    .eq('dealer_id', dealerId)
    .order('created_at', { ascending: true });

  return { data: data ?? [], error };
}

/**
 * Agrega una cuenta bancaria al repartidor autenticado.
 */
export async function addDealerBankAccount({ dealerId, method, label, accountNumber, alias, qrUrl }) {
  const { data, error } = await supabase
    .from('dealer_bank_accounts')
    .insert({
      dealer_id:      dealerId,
      method,
      label:          label || null,
      account_number: accountNumber || null,
      alias:          alias || null,
      qr_url:         qrUrl || null,
    })
    .select('*')
    .single();

  return { data, error };
}

/**
 * Elimina una cuenta bancaria por id.
 * @param {number} id
 */
export async function deleteDealerBankAccount(id) {
  const { error } = await supabase
    .from('dealer_bank_accounts')
    .delete()
    .eq('id', id);

  return { error };
}

/**
 * Sube la imagen del QR a Cloudinary y devuelve la URL pública.
 * @param {File} file
 */
export async function uploadQrImage(file) {
  const result = await uploadImageToCloudinary(file, {
    folder: 'nosee/dealer-qr',
    width: 600,
  });

  if (!result.success) return { url: null, error: result.error };
  return { url: result.url, error: null };
}
