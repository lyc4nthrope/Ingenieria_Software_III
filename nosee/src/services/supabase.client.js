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
 * Storage personalizado para PKCE.
 *
 * Problema: en móviles (Android Chrome Custom Tabs, iOS SFSafariViewController),
 * el login con Google abre en un contexto de browser separado con su propio
 * localStorage. Al volver a la app, el PKCE code verifier no está en el
 * localStorage de ese contexto → AuthPKCECodeVerifierMissingError.
 *
 * Solución: al guardar el verifier también se escribe en una cookie
 * (las cookies SÍ se comparten entre contextos del mismo origen).
 * Al leer, se intenta localStorage primero y luego la cookie de respaldo.
 */
const createPKCEStorage = () => {
  const COOKIE_NAME = "sb_pkce_cv";

  const readCookie = () => {
    const m = document.cookie.match(/(?:^|;\s*)sb_pkce_cv=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const writeCookie = (value) => {
    // max-age=600 → 10 minutos, suficiente para completar el flujo OAuth
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; SameSite=Lax; Secure; max-age=600`;
  };

  const deleteCookie = () => {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  };

  const isVerifierKey = (key) => key.includes("code-verifier");

  return {
    getItem: (key) => {
      if (isVerifierKey(key)) {
        // El verifier se guarda en sessionStorage (no en localStorage).
        // sessionStorage persiste en la misma pestaña a través de navegaciones
        // (window.location.assign), pero _removeSession() solo llama a
        // localStorage.removeItem → nunca puede borrar el verifier accidentalmente.
        const ss = sessionStorage.getItem(key);
        if (ss !== null) return ss;
        // Fallback cookie: cubre iOS PWA / Chrome Custom Tabs (contexto separado)
        return readCookie();
      }
      return localStorage.getItem(key);
    },
    setItem: (key, value) => {
      if (isVerifierKey(key)) {
        // Verifier → sessionStorage + cookie de respaldo
        sessionStorage.setItem(key, value);
        writeCookie(value);
      } else {
        localStorage.setItem(key, value);
      }
    },
    removeItem: (key) => {
      localStorage.removeItem(key);
      if (isVerifierKey(key)) {
        sessionStorage.removeItem(key);
        deleteCookie();
      }
    },
  };
};

/**
 * Cliente Supabase singleton
 * Usar este cliente para cualquier operación con Supabase
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: createPKCEStorage(),
    persistSession: true,
    autoRefreshToken: true,
    flowType: "pkce",
    // detectSessionInUrl: false — el cliente NO auto-intercambia el ?code= de la URL.
    // CallbackPage.jsx llama a exchangeCodeForSession() de forma explícita.
    // Si esto estuviera en true (default), el cliente consumiría el verifier
    // antes del llamado explícito → segundo error de verifier missing.
    detectSessionInUrl: false,
    // Usar processLock (mutex en memoria) en lugar del Navigator LockManager.
    // navigator.locks coordina entre pestañas del mismo origen: si una pestaña
    // retiene el lock (ej. flujo OAuth en progreso) y la página de callback
    // carga en la misma/otra pestaña, las operaciones de auth del callback
    // esperan 10 s y luego lanzan "LockManager timed out".
    // processLock serializa solo dentro del mismo proceso/pestaña, lo cual
    // es suficiente para una SPA donde cada pestaña maneja su propio estado.
    lock: processLock,
  },
});

export default supabase;
