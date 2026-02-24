/**
 * Supabase Client Configuration
 * 
 * Instancia única del cliente Supabase para toda la aplicación
 * Centraliza la configuración y conexión a Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials are not configured. Check your .env file.');
}

/**
 * Cliente Supabase singleton
 * Usar este cliente para cualquier operación con Supabase
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export default supabase;