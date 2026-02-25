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
 * UBICACIÓN CORRECTA EN EL PROYECTO:
 * nosee/src/features/auth/store/authStore.js
 */

import { create } from 'zustand';

// Importamos las funciones de la capa de servicios (auth.api.js y users.api.js)
// Estas ya saben cómo hablar con Supabase; el store solo las orquesta.
import { authApi, usersApi } from '@/services/api';

// Importamos el cliente de Supabase directamente para escuchar
// cambios de sesión en tiempo real (cuando el token se refresca, etc.)
import { supabase } from '@/services/supabase.client';

// NOTA: mapDBUserToUI ya NO se importa aquí porque usersApi lo aplica
// internamente. Importarlo y usarlo de nuevo corrompía los datos (doble mapeo).

// Importamos los tipos de estado asincrónico definidos en types/
// IDLE = sin actividad, LOADING = esperando, SUCCESS = ok, ERROR = falló
import { AsyncStateEnum } from '@/types';

// ─────────────────────────────────────────────────────────────────
// ESTADO INICIAL
// Definimos la "forma" del estado para tener claridad en todo momento
// ─────────────────────────────────────────────────────────────────
const initialState = {
  // El objeto usuario mapeado a formato UI (ver mappers/index.js)
  // null = no hay nadie logueado
  user: null,

  // La sesión cruda de Supabase (contiene access_token, etc.)
  // La guardamos por si algún servicio necesita el token directamente
  session: null,

  // Estado de la operación actual: 'idle' | 'loading' | 'success' | 'error'
  // Sirve para mostrar spinners, deshabilitar botones, etc. en la UI
  status: AsyncStateEnum.IDLE,

  // Mensaje de error legible para mostrar al usuario
  // null = sin error
  error: null,

  // Flag especial: ¿ya verificamos si hay una sesión guardada?
  // Esto evita que la app "parpadee" mostrando la pantalla de login
  // por un instante antes de saber que el usuario ya estaba logueado.
  isInitialized: false,
};

// ─────────────────────────────────────────────────────────────────
// STORE
// create() de Zustand recibe una función que retorna el estado + acciones
// set() es la función que Zustand nos da para actualizar el estado
// get() nos permite leer el estado actual desde dentro de una acción
// ─────────────────────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({

  // ── Spread del estado inicial ──────────────────────────────────
  // Esto "pega" todas las propiedades de initialState en el store
  ...initialState,


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: initialize
  // ════════════════════════════════════════════════════════════════
  /**
   * Se llama UNA SOLA VEZ cuando la app arranca (en App.jsx o main.jsx).
   *
   * Hace dos cosas:
   * 1. Verifica si hay una sesión activa guardada en localStorage
   * 2. Configura el listener de Supabase para cambios futuros de sesión
   *
   * Sin esto, al recargar la página el usuario siempre aparecería
   * como deslogueado aunque tuviera un token válido guardado.
   */
  initialize: async () => {
    // Ponemos status en LOADING para que la app sepa que estamos verificando
    set({ status: AsyncStateEnum.LOADING });

    try {
      // Pedimos a Supabase la sesión guardada (en localStorage por defecto)
      const { data: sessionData } = await authApi.getSession();

      if (sessionData) {
        // Hay sesión activa → buscamos el perfil extendido del usuario
        // en nuestra tabla 'users' (no solo el objeto de Auth de Supabase)
        const profileResult = await usersApi.getUserProfile(sessionData.user.id);

        // FIX Bug 2: getUserProfile ya devuelve datos mapeados con mapDBUserToUI
        // internamente, así que usamos profileResult.data directo (sin re-mapear)
        const mappedUser = profileResult.success
          ? profileResult.data
          : { id: sessionData.user.id, email: sessionData.user.email };

        set({
          user: mappedUser,
          session: sessionData,
          status: AsyncStateEnum.SUCCESS,
          isInitialized: true,
        });
      } else {
        // No hay sesión → usuario no está logueado, eso es completamente normal
        set({
          user: null,
          session: null,
          status: AsyncStateEnum.IDLE,
          isInitialized: true,
        });
      }
    } catch (error) {

      set({
        user: null,
        session: null,
        status: AsyncStateEnum.ERROR,
        error: error?.message || 'Error al inicializar la sesión',
        isInitialized: true,
      });
    }

    // ── Listener de cambios de sesión ───────────────────────────
    // Supabase puede cambiar la sesión por su cuenta:
    // - Token expirado y refrescado automáticamente
    // - Logout desde otra pestaña del navegador
    // - Confirmación de email desde el link que recibió el usuario
    //
    // Este listener escucha esos eventos y mantiene el store sincronizado.
    supabase.auth.onAuthStateChange(async (event, session) => {
      // 'SIGNED_IN'  → usuario logueó (incluye refresh de token)
      // 'SIGNED_OUT' → usuario cerró sesión
      // 'TOKEN_REFRESHED' → token renovado automáticamente

      if (event === 'SIGNED_IN' && session) {
        // Actualizamos el perfil del usuario con los datos frescos
        const profileResult = await usersApi.getUserProfile(session.user.id);

        // FIX Bug 2: ídem, profileResult.data ya viene mapeado
        const mappedUser = profileResult.success
          ? profileResult.data
          : { id: session.user.id, email: session.user.email };

        set({
          user: mappedUser,
          session,
          status: AsyncStateEnum.SUCCESS,
          error: null,
        });
      } else if (event === 'SIGNED_OUT') {
        // Limpiamos todo el estado cuando Supabase confirma el logout
        set({
          user: null,
          session: null,
          status: AsyncStateEnum.IDLE,
          error: null,
        });
      }
    });
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: login
  // ════════════════════════════════════════════════════════════════
  /**
   * Inicia sesión con email y contraseña.
   *
   * El componente LoginPage llama esto directamente.
   * Retorna { success, error } para que el componente
   * pueda mostrar el error inline sin depender del store.
   *
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{ success: boolean, error: string|null }>}
   */
  login: async (email, password) => {
    // Indicamos que estamos procesando → el botón "Iniciar sesión" se puede deshabilitar
    set({ status: AsyncStateEnum.LOADING, error: null });

    // Llamamos a auth.api.js que sabe cómo hablar con Supabase
    const result = await authApi.signIn(email, password);

    if (!result.success) {
      // El login falló → guardamos el error y lo retornamos
      set({
        status: AsyncStateEnum.ERROR,
        error: result.error,
      });
      return { success: false, error: result.error };
    }

    // Login exitoso → buscamos el perfil completo en nuestra tabla 'users'
    // (Supabase Auth solo guarda email/id, nosotros guardamos nombre, rol, etc.)
    const profileResult = await usersApi.getUserProfile(result.data.user.id);

    // FIX Bug 2: profileResult.data ya viene mapeado por usersApi
    const mappedUser = profileResult.success
      ? profileResult.data
      : { id: result.data.user.id, email: result.data.user.email };

    set({
      user: mappedUser,
      session: result.data.session,
      status: AsyncStateEnum.SUCCESS,
      error: null,
    });

    return { success: true, error: null };
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: register
  // ════════════════════════════════════════════════════════════════
  /**
   * Registra un nuevo usuario.
   *
   * Proceso:
   * 1. Crea la cuenta en Supabase Auth (email + password)
   * 2. Crea el perfil extendido en nuestra tabla 'users'
   *
   * Nota: Supabase enviará un email de verificación automáticamente
   * (si está configurado en el dashboard). El usuario debe confirmarlo
   * antes de poder loguearse según Proceso 1 del proyecto.
   *
   * @param {string} email
   * @param {string} password
   * @param {Object} metadata - { fullName, ... }
   * @returns {Promise<{ success: boolean, error: string|null, needsVerification: boolean }>}
   */
  register: async (email, password, metadata = {}) => {
    set({ status: AsyncStateEnum.LOADING, error: null });

    // Paso 1: Crear cuenta en Supabase Auth
    // FIX Bug 3: signUp espera fullName como string, no como objeto
    const signUpResult = await authApi.signUp(email, password, metadata.fullName);

    if (!signUpResult.success) {
      set({ status: AsyncStateEnum.ERROR, error: signUpResult.error });
      return { success: false, error: signUpResult.error, needsVerification: false };
    }

    const newUser = signUpResult.data.user;

    // Paso 2: Crear perfil en nuestra tabla 'users'
    // Esto es necesario porque Supabase Auth no guarda campos personalizados como role
    if (newUser) {
      // FIX Bug 4: createUserProfile espera (userId, fullName, email) como strings separados
      await usersApi.createUserProfile(
        newUser.id,
        metadata.fullName || '',
        newUser.email
      );
    }

    // Si Supabase requiere verificación de email (autoconfirm = false en config.toml),
    // el usuario existe pero su sesión está vacía hasta que confirme el email.
    const needsVerification = !signUpResult.data.session;

    set({
      status: AsyncStateEnum.SUCCESS,
      // No guardamos user/session aquí porque debe verificar email primero
    });

    return { success: true, error: null, needsVerification };
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: logout
  // ════════════════════════════════════════════════════════════════
  /**
   * Cierra la sesión del usuario.
   *
   * Llama a Supabase para invalidar el token en el servidor,
   * luego limpia el estado local. El listener onAuthStateChange
   * también lo detectará y hará un set adicional (inofensivo).
   */
  logout: async () => {
    set({ status: AsyncStateEnum.LOADING });

    await authApi.signOut();

    // Limpiamos el estado sin esperar confirmación de Supabase
    // (el listener lo confirmará después, pero esto hace la UI más rápida)
    set({
      ...initialState,
      isInitialized: true, // Mantenemos isInitialized en true para no re-verificar
    });
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: updateProfile
  // ════════════════════════════════════════════════════════════════
  /**
   * Actualiza el perfil del usuario logueado.
   *
   * Solo actualiza los campos que se pasan en 'updates'.
   * Después de actualizar en BD, refresca el estado del store
   * para que todos los componentes suscritos vean los cambios.
   *
   * @param {Object} updates - { fullName, avatarUrl, ... }
   * @returns {Promise<{ success: boolean, error: string|null }>}
   */
  updateProfile: async (updates) => {
    // Leemos el usuario actual del store (necesitamos su ID)
    const { user } = get();

    if (!user) {
      return { success: false, error: 'No hay usuario logueado' };
    }

    set({ status: AsyncStateEnum.LOADING, error: null });

    // Convertimos camelCase (UI) a snake_case (BD)
    // Ejemplo: fullName → full_name
    const dbUpdates = {};
    if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

    const result = await usersApi.updateUserProfile(user.id, dbUpdates);

    if (!result.success) {
      set({ status: AsyncStateEnum.ERROR, error: result.error });
      return { success: false, error: result.error };
    }

    // FIX Bug 5: updateUserProfile usa .single() y ya devuelve un objeto mapeado,
    // no un array. Usamos result.data directo (sin [0] ni re-mapear).
    const updatedUser = result.data;

    set({
      user: updatedUser,
      status: AsyncStateEnum.SUCCESS,
      error: null,
    });

    return { success: true, error: null };
  },


  // ════════════════════════════════════════════════════════════════
  // ACCIÓN: requestPasswordReset
  // ════════════════════════════════════════════════════════════════
  /**
   * Solicita un email para resetear contraseña.
   *
   * Supabase enviará un link al email del usuario.
   * No modifica el estado del usuario logueado.
   *
   * @param {string} email
   */
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
  /**
   * Limpia el error actual del store.
   *
   * Se usa cuando el usuario empieza a escribir en el formulario
   * de login después de un error: queremos limpiar el mensaje rojo
   * antes de que intente de nuevo.
   */
  clearError: () => set({ error: null, status: AsyncStateEnum.IDLE }),


  // ════════════════════════════════════════════════════════════════
  // SELECTORES (computed helpers)
  // ════════════════════════════════════════════════════════════════
  // No son acciones, sino helpers para que los componentes no tengan
  // que escribir lógica derivada por su cuenta.

  /**
   * ¿Hay un usuario logueado?
   * Uso en componente: const isAuthenticated = useAuthStore(s => s.isAuthenticated())
   */
  isAuthenticated: () => {
    const { user, session } = get();
    return !!user && !!session;
  },

  /**
   * ¿Está en proceso de carga?
   * Uso: const loading = useAuthStore(s => s.isLoading())
   */
  isLoading: () => get().status === AsyncStateEnum.LOADING,

}));

// ─────────────────────────────────────────────────────────────────
// EXPORTACIÓN DE SELECTORES PRECONSTRUIDOS
// ─────────────────────────────────────────────────────────────────
// Estos son atajos opcionales para componentes que solo necesitan
// una parte del estado. Evitan re-renders innecesarios porque
// Zustand solo re-renderiza si el valor seleccionado cambia.
//
// Uso en componente:
//   import { selectAuthUser } from '@/features/auth/store/authStore';
//   const user = useAuthStore(selectAuthUser);

export const selectAuthUser = (state) => state.user;
export const selectAuthStatus = (state) => state.status;
export const selectAuthError = (state) => state.error;
export const selectIsInitialized = (state) => state.isInitialized;
export const selectSession = (state) => state.session;

export default useAuthStore;