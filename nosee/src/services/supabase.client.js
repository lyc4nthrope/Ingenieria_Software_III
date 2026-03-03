/**
 * Supabase Client Configuration
 *
 * Instancia única del cliente Supabase para toda la aplicación
 * Centraliza la configuración y conexión a Supabase
 */

import { createClient, processLock } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️  Supabase credentials are not configured. Check your .env file.",
  );
}

/**
 * Cliente Supabase singleton
 * Usar este cliente para cualquier operación con Supabase
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
    // En navegador dejamos el lock por defecto (Navigator LockManager).
    // processLock está pensado para entornos no-browser y puede bloquear sesiones al cambiar de pestaña.
    ...(typeof window === "undefined" ? { lock: processLock } : {}),
  },
});

export default supabase;
