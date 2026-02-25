/**
 * auth.api.js
 * Capa de acceso a datos: operaciones de autenticación con Supabase Auth.
 *
 * TODAS las funciones retornan el mismo shape:
 *   { success: true,  data: <payload> }
 *   { success: false, error: <string>  }
 *
 * De este modo el store puede manejar errores de forma uniforme.
 */

import { supabase } from '@/services/supabase.client';

// ─── Registro ────────────────────────────────────────────────────────────────

/**
 * Registra un nuevo usuario con email y contraseña.
 * Supabase envía automáticamente un email de verificación.
 * @param {string} email
 * @param {string} password
 * @param {string} fullName
 */
export async function signUp(email, password, fullName) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// ─── Login ───────────────────────────────────────────────────────────────────

/**
 * Inicia sesión con email y contraseña.
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// ─── Logout ──────────────────────────────────────────────────────────────────

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Sesión activa ───────────────────────────────────────────────────────────

/**
 * Obtiene la sesión actual (si existe).
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) return { success: false, error: error.message };
  return { success: true, data: data.session };
}

// ─── Recuperación de contraseña ───────────────────────────────────────────────

/**
 * Solicita el envío de un email de recuperación de contraseña.
 *
 * CORRECCIÓN: redirectTo debe apuntar a /auth/callback (no a /auth/reset-password
 * que no existe). CallbackPage detecta type=recovery y redirige a /nueva-contrasena.
 *
 * @param {string} email
 */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/callback`,  // ✅ CORRECTO
  });

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Nueva contraseña ─────────────────────────────────────────────────────────

/**
 * Actualiza la contraseña del usuario autenticado (tras seguir el link de recovery).
 * @param {string} newPassword
 */
export async function updatePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

// ─── Listener de cambios de sesión ───────────────────────────────────────────

/**
 * Suscribe un callback a los cambios de estado de auth (login, logout, token refresh).
 * Retorna la función de unsubscribe.
 * @param {Function} callback - (event, session) => void
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}