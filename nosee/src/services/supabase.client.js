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
 * Problema raíz: el PKCE code verifier debe sobrevivir la navegación completa:
 *   página del login → Google OAuth → redirección de vuelta a /auth/callback
 *
 * En distintos contextos ese viaje puede limpiar el storage:
 *   - iOS Safari con "Prevent Cross-Site Tracking": puede borrar sessionStorage
 *     al navegar a un dominio externo (Google) y volver.
 *   - Chrome Custom Tabs / Android: el contexto de la pestaña original puede
 *     ser restaurado con un sessionStorage vacío.
 *   - PWA en iOS: el WebView tiene su propio sessionStorage aislado.
 *
 * Estrategia triple: guardar el verifier en sessionStorage + localStorage + cookie.
 * Al leer se prueba en orden: sessionStorage → localStorage → cookie.
 * Así al menos una de las tres sobrevive en cualquier contexto.
 *
 * Nota de seguridad: el verifier PKCE solo es válido hasta que se completa el
 * intercambio de código (uso único). No es una credencial persistente.
 * Guardarlo en localStorage tiene el mismo perfil de riesgo XSS que sessionStorage.
 */
const createPKCEStorage = () => {
  const COOKIE_NAME = "sb_pkce_cv";

  const readCookie = () => {
    const m = document.cookie.match(/(?:^|;\s*)sb_pkce_cv=([^;]*)/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const writeCookie = (value) => {
    // max-age=600 → 10 minutos, suficiente para completar el flujo OAuth.
    // SameSite=Lax permite que la cookie se envíe/lea tras el redirect de Google.
    // Omitir "Secure" en local para que funcione en http://localhost.
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; SameSite=Lax${secure}; max-age=600`;
  };

  const deleteCookie = () => {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  };

  const isVerifierKey = (key) => key.includes("code-verifier");

  return {
    getItem: (key) => {
      if (isVerifierKey(key)) {
        // Orden de prioridad: sessionStorage → localStorage → cookie
        const ss = sessionStorage.getItem(key);
        if (ss !== null) return ss;
        const ls = localStorage.getItem(key);
        if (ls !== null) return ls;
        return readCookie();
      }
      return localStorage.getItem(key);
    },
    setItem: (key, value) => {
      if (isVerifierKey(key)) {
        // Triple-write: los tres stores deben tener el verifier
        try { sessionStorage.setItem(key, value); } catch { /* quota */ }
        try { localStorage.setItem(key, value); } catch { /* quota */ }
        writeCookie(value);
      } else {
        localStorage.setItem(key, value);
      }
    },
    removeItem: (key) => {
      localStorage.removeItem(key);
      if (isVerifierKey(key)) {
        try { sessionStorage.removeItem(key); } catch { /* ignorar */ }
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
