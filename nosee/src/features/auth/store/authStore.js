/**
 * Auth Store - Estado Global de Autenticación
 *
 * PROPÓSITO:
 * Este archivo es el "cerebro" de la autenticación en la UI.
 * Cualquier componente de la app puede suscribirse a este store
 * para saber: ¿hay un usuario logueado? ¿quién es? ¿está cargando?
 *
 * FLUJO COMPLETO:
 * 1. App arranca → initialize() consulta si hay sesión activa
 * 2. Usuario hace login → login() llama a authApi, guarda user en state
 * 3. Componente Navbar → lee `user` del store y muestra el nombre
 * 4. Usuario hace logout → logout() limpia el state
 * 5. Supabase detecta token expirado → onAuthStateChange lo notifica → store se actualiza
 *
 * CORRECCIONES APLICADAS:
 * - Fix 1: initialize() guarda el unsubscribe y evita crear un segundo listener
 *          si se llama dos veces (React StrictMode lo hace en desarrollo).
 * - Fix 2: onAuthStateChange ahora maneja TOKEN_REFRESHED → actualiza `session`
 *          para que el token en el store nunca quede stale.
 * - Fix 3: DomainErrors ya existe en @/types (se exporta desde allí).
 *
 * UBICACIÓN CORRECTA EN EL PROYECTO:
 * nosee/src/features/auth/store/authStore.js
 */

import { create } from 'zustand';

import { authApi, usersApi } from '@/services/api';
import { supabase }          from '@/services/supabase.client';
import { AsyncStateEnum }    from '@/types';

// ─────────────────────────────────────────────────────────────────
// ESTADO INICIAL
// ─────────────────────────────────────────────────────────────────
const initialState = {
  user:          null,
  session:       null,
  status:        AsyncStateEnum.IDLE,
  error:         null,
  isInitialized: false,

  // FIX StrictMode: guardamos la función de unsubscribe del listener de Supabase.
  // Si initialize() se llama de nuevo antes de que el listener anterior se limpie,
  // lo cancelamos primero para no acumular suscripciones duplicadas.
  _unsubscribeAuthListener: null,
};

// ─────────────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({

  ...initialState,


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: initialize
  // ════════════════════════════════════════════════════════════════
  initialize: async () => {
    // FIX StrictMode ─────────────────────────────────────────────
    // React StrictMode (dev) desmonta y vuelve a montar los componentes.
    // Si el componente que llama initialize() lo hace dos veces, aquí
    // cancelamos el listener anterior antes de crear uno nuevo.
    const existingUnsub = get()._unsubscribeAuthListener;
    if (existingUnsub) {
      existingUnsub();
      set({ _unsubscribeAuthListener: null });
    }
    // ────────────────────────────────────────────────────────────

    set({ status: AsyncStateEnum.LOADING });

    try {
      const { data: sessionData } = await authApi.getSession();

      if (sessionData) {
        const profileResult = await usersApi.getUserProfile(sessionData.user.id);

        const mappedUser = profileResult.success
          ? profileResult.data
          : { id: sessionData.user.id, email: sessionData.user.email };

        set({
          user:          mappedUser,
          session:       sessionData,
          status:        AsyncStateEnum.SUCCESS,
          isInitialized: true,
        });
      } else {
        set({
          user:          null,
          session:       null,
          status:        AsyncStateEnum.IDLE,
          isInitialized: true,
        });
      }
    } catch (error) {
      set({
        user:          null,
        session:       null,
        status:        AsyncStateEnum.ERROR,
        error:         error?.message || 'Error al inicializar la sesión',
        isInitialized: true,
      });
    }

    // ── Listener de cambios de sesión ────────────────────────────
    // FIX TOKEN_REFRESHED: añadimos el evento para mantener `session`
    // actualizada cuando Supabase renueva el access_token automáticamente.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // PASSWORD_RECOVERY se dispara al abrir el link de recuperación.
        // Lo tratamos igual que SIGNED_IN para hidratar el store correctamente.
        if ((event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') && session) {
          const profileResult = await usersApi.getUserProfile(session.user.id);

          const mappedUser = profileResult.success
            ? profileResult.data
            : { id: session.user.id, email: session.user.email };

          set({
            user:    mappedUser,
            session,                     // ← token siempre fresco
            status:  AsyncStateEnum.SUCCESS,
            error:   null,
          });

        } else if (event === 'TOKEN_REFRESHED' && session) {
          // FIX TOKEN_REFRESHED ─────────────────────────────────
          // Solo actualizamos la sesión; el perfil de usuario no cambió,
          // así que evitamos un round-trip innecesario a la BD.
          set({ session });
          // ──────────────────────────────────────────────────────

        } else if (event === 'SIGNED_OUT') {
          set({
            user:    null,
            session: null,
            status:  AsyncStateEnum.IDLE,
            error:   null,
          });
        }
      }
    );

    // FIX StrictMode: guardamos el unsubscribe para poder cancelarlo
    // si initialize() se vuelve a ejecutar (doble mount en StrictMode).
    set({ _unsubscribeAuthListener: () => subscription.unsubscribe() });
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: login
  // ════════════════════════════════════════════════════════════════
  login: async (email, password) => {
    set({ status: AsyncStateEnum.LOADING, error: null });

    const result = await authApi.signIn(email, password);

    if (!result.success) {
      set({ status: AsyncStateEnum.ERROR, error: result.error });
      return { success: false, error: result.error };
    }

    const profileResult = await usersApi.getUserProfile(result.data.user.id);

    const mappedUser = profileResult.success
      ? profileResult.data
      : { id: result.data.user.id, email: result.data.user.email };

    set({
      user:    mappedUser,
      session: result.data.session,
      status:  AsyncStateEnum.SUCCESS,
      error:   null,
    });

    return { success: true, error: null };
  },

// ════════════════════════════════════════════════════════════════
  // ACCIÓN: loginWithGoogle
  // ════════════════════════════════════════════════════════════════
  loginWithGoogle: async () => {
    set({ status: AsyncStateEnum.LOADING, error: null });

    const result = await authApi.signInWithGoogle();

    if (!result.success) {
      set({ status: AsyncStateEnum.ERROR, error: result.error });
      return { success: false, error: result.error };
    }

    // OAuth redirige fuera de la app; mantenemos estado consistente.
    set({ status: AsyncStateEnum.IDLE, error: null });
    return { success: true, error: null };
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: register
  // ════════════════════════════════════════════════════════════════
register: async (email, password, metadata = {}) => {
  set({ status: AsyncStateEnum.LOADING, error: null });

  const signUpResult = await authApi.signUp(email, password, metadata.fullName);

  if (!signUpResult.success) {
    set({ status: AsyncStateEnum.ERROR, error: signUpResult.error });
    return { success: false, error: signUpResult.error, needsVerification: false };
  }

  const needsVerification = !signUpResult.data.session;
  set({ status: AsyncStateEnum.SUCCESS });
  return { success: true, error: null, needsVerification };
},


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: logout
  // ════════════════════════════════════════════════════════════════
  logout: async () => {
    // Cancelamos el listener antes de limpiar el estado para evitar
    // que onAuthStateChange(SIGNED_OUT) dispare un set() redundante
    // sobre un store que ya estamos reseteando.
    const unsub = get()._unsubscribeAuthListener;
    if (unsub) unsub();

    set({ status: AsyncStateEnum.LOADING });

    await authApi.signOut();

    set({
      ...initialState,
      isInitialized:            true,
      _unsubscribeAuthListener: null,
    });
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: updateProfile
  // ════════════════════════════════════════════════════════════════
  updateProfile: async (updates) => {
    const { user } = get();

    if (!user) {
      return { success: false, error: 'No hay usuario logueado' };
    }

    set({ status: AsyncStateEnum.LOADING, error: null });

    const dbUpdates = {};
    if (updates.fullName  !== undefined) dbUpdates.full_name  = updates.fullName;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

    const result = await usersApi.updateUserProfile(user.id, dbUpdates);

    if (!result.success) {
      set({ status: AsyncStateEnum.ERROR, error: result.error });
      return { success: false, error: result.error };
    }

    set({
      user:   result.data,
      status: AsyncStateEnum.SUCCESS,
      error:  null,
    });

    return { success: true, error: null };
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: requestPasswordReset
  // ════════════════════════════════════════════════════════════════
  requestPasswordReset: async (email) => {
    set({ status: AsyncStateEnum.LOADING, error: null });

    const result = await authApi.resetPassword(email);

    if (!result.success) {
      set({ status: AsyncStateEnum.ERROR, error: result.error });
      return { success: false, error: result.error };
    }

    set({ status: AsyncStateEnum.SUCCESS });
    return { success: true, error: null };
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: clearError
  // ════════════════════════════════════════════════════════════════
  clearError: () => set({ error: null, status: AsyncStateEnum.IDLE }),


  // ════════════════════════════════════════════════════════════════
  // SELECTORES
  // ════════════════════════════════════════════════════════════════
  isAuthenticated: () => {
    const { user, session } = get();
    return !!user && !!session;
  },

  isLoading: () => get().status === AsyncStateEnum.LOADING,

}));

// ─────────────────────────────────────────────────────────────────
// SELECTORES PRECONSTRUIDOS
// ─────────────────────────────────────────────────────────────────
export const selectAuthUser        = (state) => state.user;
export const selectAuthStatus      = (state) => state.status;
export const selectAuthError       = (state) => state.error;
export const selectIsInitialized   = (state) => state.isInitialized;
export const selectSession         = (state) => state.session;
export const selectIsAuthenticated = (state) => !!state.user && !!state.session;

export default useAuthStore;