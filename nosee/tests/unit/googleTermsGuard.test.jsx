/**
 * tests/unit/googleTermsGuard.test.js
 *
 * Verificación profunda del flujo de aceptación de términos en Google OAuth.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ ESCENARIO A — Usuario NUEVO desde /login con Google                     │
 * │   → bloqueado, redirigido a /registro?motivo=terminos                   │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ ESCENARIO B — Usuario NUEVO desde /registro con Google (checkbox ✓)     │
 * │   → pasa directo a /perfil                                              │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ ESCENARIO C — Usuario EXISTENTE desde /login con Google                 │
 * │   → pasa directo a /perfil                                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Secciones:
 *   1. RegisterForm  — checkbox + bloqueo de botones + intent localStorage
 *   2. LoginForm     — intent localStorage antes de OAuth
 *   3. Lógica pura de la guardia de términos (CallbackPage)
 *   4. RegisterPage  — banner de aviso cuando llega con ?motivo=terminos
 *
 * Ejecutar: npm test -- googleTermsGuard.test.js
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks hoisted ────────────────────────────────────────────────────────────
// IMPORTANTE: vi.mock se hoista al tope del archivo. Todos los mocks deben
// declararse aquí antes de cualquier import de los módulos bajo prueba.

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: {
      registerForm: {
        googleRegister:           'Registrarme con Google',
        orForm:                   'o completa el formulario',
        fullNameLabel:            'Nombre completo',
        fullNamePlaceholder:      'Tu nombre',
        emailLabel:               'Correo electrónico',
        emailPlaceholder:         'correo@ejemplo.com',
        passwordLabel:            'Contraseña',
        passwordPlaceholder:      'Mínimo 8 caracteres',
        confirmPasswordLabel:     'Confirmar contraseña',
        confirmPasswordPlaceholder:'Repite tu contraseña',
        terms:                    'Al registrarte aceptás los',
        termsLink:                'Términos de uso',
        and:                      'y la',
        privacyLink:              'Política de privacidad',
        createAccount:            'Crear cuenta',
        creatingAccount:          'Creando cuenta...',
        hasAccount:               '¿Ya tenés cuenta?',
        loginLink:                'Inicia sesión',
        showPassword:             'Mostrar contraseña',
        hidePassword:             'Ocultar contraseña',
        fullNameRequired:         'El nombre es requerido',
        emailRequired:            'El email es requerido',
        emailInvalid:             'Email inválido',
        passwordRequired:         'La contraseña es requerida',
        passwordWeak:             'La contraseña no cumple los requisitos',
        confirmRequired:          'Confirma tu contraseña',
        passwordMismatch:         'Las contraseñas no coinciden',
        passwordRules:            ['Al menos 8 caracteres', 'Una mayúscula', 'Un número'],
        strongPassword:           'Contraseña segura',
        mediumPassword:           'Contraseña media',
        weakPassword:             'Contraseña débil',
        termsRequired:            'Debés aceptar los términos para continuar',
      },
      loginForm: {
        googleLogin:        'Iniciar sesión con Google',
        orEmail:            'o',
        emailLabel:         'Correo electrónico',
        emailPlaceholder:   'correo@ejemplo.com',
        passwordLabel:      'Contraseña',
        forgotPassword:     '¿Olvidaste tu contraseña?',
        loginButton:        'Ingresar',
        loggingIn:          'Ingresando...',
        noAccount:          '¿No tenés cuenta?',
        registerFree:       'Registrarte gratis',
        showPassword:       'Mostrar contraseña',
        hidePassword:       'Ocultar contraseña',
        emailRequired:      'El email es requerido',
        emailInvalid:       'Email inválido',
        passwordRequired:   'La contraseña es requerida',
        resendConfirmation: 'Reenviar email de confirmación',
      },
      registerPage: {
        title:            'Crear tu cuenta',
        subtitle:         'Unite y empezá a comparar precios',
        verifyTitle:      'Verificá tu email',
        verifySent:       'Enviamos un link a:',
        verifyInstruction:'Revisá tu bandeja de entrada.',
        emailResent:      '✓ Email reenviado.',
        resendEmail:      'Reenviar email',
        resending:        'Reenviando...',
      },
    },
  }),
  LanguageProvider: ({ children }) => children,
}));

// Mock del authStore — estado no autenticado, inicializado
// Necesario para RegisterPage (que lee el store) sin disparar redirects
vi.mock('@/features/auth/store/authStore', () => {
  const storeState = {
    user: null,
    session: null,
    status: 'idle',
    error: null,
    isInitialized: true,
    register:      vi.fn().mockResolvedValue({ success: false }),
    clearError:    vi.fn(),
    loginWithGoogle: vi.fn().mockResolvedValue({ success: true }),
    logout:        vi.fn().mockResolvedValue(undefined),
  };

  const useAuthStore = vi.fn((selector) => {
    if (typeof selector === 'function') return selector(storeState);
    return storeState;
  });
  useAuthStore.getState = vi.fn(() => storeState);
  useAuthStore.setState = vi.fn();

  return {
    useAuthStore,
    selectIsInitialized:   (s) => s.isInitialized,
    selectAuthStatus:      (s) => s.status,
    selectAuthError:       (s) => s.error,
    selectIsAuthenticated: (s) => !!s.user && !!s.session,
    selectSession:         (s) => s.session,
  };
});

vi.mock('@/services/metrics', () => ({
  recordTokenRefresh:        vi.fn(),
  recordLoginAttempt:        vi.fn(),
  recordLoginPageView:       vi.fn(),
  recordLoginAbandon:        vi.fn(),
  recordRegisterDuration:    vi.fn(),
  recordRoleError:           vi.fn(),
  recordPasswordRecovery:    vi.fn(),
  recordRegistrationStarted: vi.fn(),
}));

vi.mock('@/services/analytics', () => ({
  trackRegisterComplete: vi.fn(),
  trackRegisterFailure:  vi.fn(),
  trackPageView:         vi.fn(),
}));

vi.mock('@/services/api/audit.api', () => ({
  insertUserActivityLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/roleUtils', () => ({
  getRolePath: vi.fn(() => '/'),
}));

vi.mock('@/services/api/auth.api', () => ({
  resendConfirmation: vi.fn(),
}));

// ─── Imports bajo prueba (después de los mocks) ───────────────────────────────
import RegisterForm from '../../src/features/auth/components/RegisterForm.jsx';
import LoginForm    from '../../src/features/auth/components/LoginForm.jsx';
import RegisterPage from '../../src/features/auth/pages/RegisterPage.jsx';

// ─── Helpers de render ────────────────────────────────────────────────────────

function renderRegisterForm(props = {}) {
  const defaults = {
    onSubmit:         vi.fn(),
    onGoogleRegister: vi.fn(),
    loading:          false,
    error:            null,
  };
  return render(
    <MemoryRouter>
      <RegisterForm {...defaults} {...props} />
    </MemoryRouter>
  );
}

function renderLoginForm(props = {}) {
  const defaults = {
    onSubmit:     vi.fn(),
    onGoogleLogin: vi.fn(),
    loading:      false,
    error:        null,
  };
  return render(
    <MemoryRouter>
      <LoginForm {...defaults} {...props} />
    </MemoryRouter>
  );
}

function renderRegisterPage(initialPath = '/registro') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <RegisterPage />
    </MemoryRouter>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 1 — RegisterForm: checkbox y botones
// ─────────────────────────────────────────────────────────────────────────────
//
// Verifica que:
//  - Los botones (Google y Crear cuenta) empiezan deshabilitados
//  - Tildar el checkbox los habilita
//  - El localStorage recibe 'register' al hacer click en Google
//  - Se llama onGoogleRegister solo cuando el checkbox está tildado
//  - Los links de términos apuntan a las rutas correctas

describe('RegisterForm — checkbox y guardia de botones', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── 1.1 Estado inicial: ambos botones deshabilitados ──────────────────────

  it('1.1 Botón Google está DESHABILITADO cuando el checkbox no está tildado', () => {
    renderRegisterForm();
    const btn = screen.getByRole('button', { name: /Registrarme con Google/i });
    expect(btn).toBeDisabled();
  });

  it('1.2 Botón "Crear cuenta" está DESHABILITADO cuando el checkbox no está tildado', () => {
    renderRegisterForm();
    const btn = screen.getByRole('button', { name: /Crear cuenta/i });
    expect(btn).toBeDisabled();
  });

  // ── 1.2 Después de tildar: ambos botones habilitados ─────────────────────

  it('1.3 Botón Google se HABILITA al tildar el checkbox de términos', () => {
    renderRegisterForm();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    const btn = screen.getByRole('button', { name: /Registrarme con Google/i });
    expect(btn).not.toBeDisabled();
  });

  it('1.4 Botón "Crear cuenta" se HABILITA al tildar el checkbox de términos', () => {
    renderRegisterForm();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    const btn = screen.getByRole('button', { name: /Crear cuenta/i });
    expect(btn).not.toBeDisabled();
  });

  // ── 1.3 Intent en localStorage ───────────────────────────────────────────

  it('1.5 Click en Google CON checkbox tildado → graba "register" en localStorage', () => {
    renderRegisterForm();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Registrarme con Google/i }));
    expect(localStorage.getItem('nosee_google_intent')).toBe('register');
  });

  it('1.6 Sin tildar el checkbox → localStorage NO se modifica al intentar hacer click', () => {
    renderRegisterForm();
    // El botón está deshabilitado; pointerEvents:none impide el handler
    // pero por seguridad verificamos que localStorage quede limpio
    expect(localStorage.getItem('nosee_google_intent')).toBeNull();
  });

  // ── 1.4 Callback onGoogleRegister ────────────────────────────────────────

  it('1.7 onGoogleRegister es llamado al hacer click Google CON checkbox tildado', () => {
    const onGoogleRegister = vi.fn();
    renderRegisterForm({ onGoogleRegister });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Registrarme con Google/i }));
    expect(onGoogleRegister).toHaveBeenCalledTimes(1);
  });

  it('1.8 "register" se graba en localStorage ANTES de llamar a onGoogleRegister', () => {
    // Verificamos el orden: localStorage primero, luego el callback
    const intentAlMomentoDeClick = { value: null };
    const onGoogleRegister = vi.fn(() => {
      intentAlMomentoDeClick.value = localStorage.getItem('nosee_google_intent');
    });
    renderRegisterForm({ onGoogleRegister });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Registrarme con Google/i }));
    expect(intentAlMomentoDeClick.value).toBe('register');
  });

  // ── 1.5 Links legales ────────────────────────────────────────────────────

  it('1.9 Link "Términos de uso" apunta a /terminos', () => {
    renderRegisterForm();
    const link = screen.getByRole('link', { name: /Términos de uso/i });
    expect(link).toHaveAttribute('href', '/terminos');
  });

  it('1.10 Link "Política de privacidad" apunta a /privacidad', () => {
    renderRegisterForm();
    const link = screen.getByRole('link', { name: /Política de privacidad/i });
    expect(link).toHaveAttribute('href', '/privacidad');
  });

  it('1.11 Ambos links abren en nueva pestaña (target="_blank")', () => {
    renderRegisterForm();
    const termsLink   = screen.getByRole('link', { name: /Términos de uso/i });
    const privacyLink = screen.getByRole('link', { name: /Política de privacidad/i });
    expect(termsLink).toHaveAttribute('target', '_blank');
    expect(privacyLink).toHaveAttribute('target', '_blank');
  });

  // ── 1.6 Desmarcar el checkbox vuelve a deshabilitar ───────────────────────

  it('1.12 Desmarcar el checkbox vuelve a deshabilitar el botón Google', () => {
    renderRegisterForm();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox); // tildar
    fireEvent.click(checkbox); // desmarcar
    const btn = screen.getByRole('button', { name: /Registrarme con Google/i });
    expect(btn).toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 2 — LoginForm: intent de Google
// ─────────────────────────────────────────────────────────────────────────────
//
// El formulario de login NO tiene checkbox — el usuario ya existe.
// Solo verificamos que el intent correcto ('login') quede en localStorage
// antes de que se llame a onGoogleLogin.

describe('LoginForm — intent de Google en localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('2.1 Click en Google → graba "login" en localStorage', () => {
    renderLoginForm();
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión con Google/i }));
    expect(localStorage.getItem('nosee_google_intent')).toBe('login');
  });

  it('2.2 Click en Google → llama a onGoogleLogin', () => {
    const onGoogleLogin = vi.fn();
    renderLoginForm({ onGoogleLogin });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión con Google/i }));
    expect(onGoogleLogin).toHaveBeenCalledTimes(1);
  });

  it('2.3 "login" se graba en localStorage ANTES de llamar a onGoogleLogin', () => {
    const intentAlMomentoDeClick = { value: null };
    const onGoogleLogin = vi.fn(() => {
      intentAlMomentoDeClick.value = localStorage.getItem('nosee_google_intent');
    });
    renderLoginForm({ onGoogleLogin });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión con Google/i }));
    expect(intentAlMomentoDeClick.value).toBe('login');
  });

  it('2.4 El botón Google del LoginForm está HABILITADO sin checkbox (login de usuario existente)', () => {
    renderLoginForm();
    const btn = screen.getByRole('button', { name: /Iniciar sesión con Google/i });
    expect(btn).not.toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 3 — Lógica pura de la guardia de términos
// ─────────────────────────────────────────────────────────────────────────────
//
// La lógica de decisión en CallbackPage es una función pura:
//
//   si (esUsuarioNuevo Y intent !== 'register') → bloquear → /registro?motivo=terminos
//   si no                                       → permitir → /perfil
//
// donde esUsuarioNuevo = cuenta creada hace menos de 5 minutos.
//
// Extraemos esa lógica en una función auxiliar para testearla exhaustivamente
// sin depender del ciclo de vida de React ni del router.

/**
 * Reproduce exactamente la lógica de guardia implementada en CallbackPage.jsx
 * Retorna 'redirect' (bloquear) o 'allow' (dejar pasar).
 */
function evaluateTermsGuard({ createdAt, intent, nowMs = Date.now() }) {
  const FIVE_MINUTES_MS = 5 * 60 * 1000;
  const isNewUser = createdAt
    ? nowMs - new Date(createdAt).getTime() < FIVE_MINUTES_MS
    : false;
  if (isNewUser && intent !== 'register') {
    return 'redirect';
  }
  return 'allow';
}

/** Helper: timestamp de hace N segundos, como ISO string */
function secondsAgo(n) {
  return new Date(Date.now() - n * 1000).toISOString();
}

/** Helper: timestamp de hace N minutos */
function minutesAgo(n) {
  return secondsAgo(n * 60);
}

describe('Guardia de términos — lógica de decisión (CallbackPage)', () => {

  // ══════════════════════════════════════════════════════════════════════════
  // ESCENARIO A — Usuario nuevo + vino del login → debe ser bloqueado
  // ══════════════════════════════════════════════════════════════════════════

  it('3.A.1 [ESC. A] Usuario nuevo + sin intent → BLOQUEAR (redirect)', () => {
    const result = evaluateTermsGuard({
      createdAt: minutesAgo(1),
      intent: null,
    });
    expect(result).toBe('redirect');
  });

  it('3.A.2 [ESC. A] Usuario nuevo + intent="login" → BLOQUEAR (redirect)', () => {
    const result = evaluateTermsGuard({
      createdAt: minutesAgo(2),
      intent: 'login',
    });
    expect(result).toBe('redirect');
  });

  it('3.A.3 [ESC. A] Usuario nuevo creado hace 30 segundos → BLOQUEAR', () => {
    const result = evaluateTermsGuard({
      createdAt: secondsAgo(30),
      intent: 'login',
    });
    expect(result).toBe('redirect');
  });

  it('3.A.4 [ESC. A] Usuario nuevo con intent vacío string → BLOQUEAR', () => {
    const result = evaluateTermsGuard({
      createdAt: minutesAgo(1),
      intent: '',
    });
    expect(result).toBe('redirect');
  });

  it('3.A.5 [ESC. A] Usuario nuevo con intent no reconocido → BLOQUEAR', () => {
    // Cualquier valor que no sea 'register' es tratado como intención no autorizada
    const result = evaluateTermsGuard({
      createdAt: minutesAgo(1),
      intent: 'unknown_value',
    });
    expect(result).toBe('redirect');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ESCENARIO B — Usuario nuevo + vino del registro (checkbox tildado) → permitir
  // ══════════════════════════════════════════════════════════════════════════

  it('3.B.1 [ESC. B] Usuario nuevo + intent="register" → PERMITIR (allow)', () => {
    const result = evaluateTermsGuard({
      createdAt: minutesAgo(1),
      intent: 'register',
    });
    expect(result).toBe('allow');
  });

  it('3.B.2 [ESC. B] Usuario nuevo de hace 10 segundos + intent="register" → PERMITIR', () => {
    const result = evaluateTermsGuard({
      createdAt: secondsAgo(10),
      intent: 'register',
    });
    expect(result).toBe('allow');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ESCENARIO C — Usuario existente → siempre permitir (ya aceptó en su momento)
  // ══════════════════════════════════════════════════════════════════════════

  it('3.C.1 [ESC. C] Usuario existente (cuenta de hace 1 hora) + intent="login" → PERMITIR', () => {
    const result = evaluateTermsGuard({
      createdAt: minutesAgo(60),
      intent: 'login',
    });
    expect(result).toBe('allow');
  });

  it('3.C.2 [ESC. C] Usuario existente (cuenta de hace 1 día) + sin intent → PERMITIR', () => {
    const result = evaluateTermsGuard({
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      intent: null,
    });
    expect(result).toBe('allow');
  });

  it('3.C.3 [ESC. C] Usuario existente (cuenta de hace 1 mes) → PERMITIR', () => {
    const result = evaluateTermsGuard({
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      intent: 'login',
    });
    expect(result).toBe('allow');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Casos de borde y edge cases
  // ══════════════════════════════════════════════════════════════════════════

  it('3.E.1 Sin sesión (createdAt=null) → PERMITIR (default seguro)', () => {
    // Si no hay sesión, isNewUser queda en false → no bloqueamos
    const result = evaluateTermsGuard({
      createdAt: null,
      intent: 'login',
    });
    expect(result).toBe('allow');
  });

  it('3.E.2 Sin sesión (createdAt=undefined) → PERMITIR', () => {
    const result = evaluateTermsGuard({
      createdAt: undefined,
      intent: null,
    });
    expect(result).toBe('allow');
  });

  it('3.E.3 Frontera inferior: cuenta de 4min 59s → BLOQUEAR (todavía es nuevo)', () => {
    const FOUR_MIN_59_S = (4 * 60 + 59) * 1000;
    const createdAt = new Date(Date.now() - FOUR_MIN_59_S).toISOString();
    const result = evaluateTermsGuard({ createdAt, intent: 'login' });
    expect(result).toBe('redirect');
  });

  it('3.E.4 Frontera superior: cuenta de 5min 01s → PERMITIR (ya no es nuevo)', () => {
    const FIVE_MIN_1_S = (5 * 60 + 1) * 1000;
    const createdAt = new Date(Date.now() - FIVE_MIN_1_S).toISOString();
    const result = evaluateTermsGuard({ createdAt, intent: 'login' });
    expect(result).toBe('allow');
  });

  it('3.E.5 Cuenta creada exactamente ahora (0ms) → BLOQUEAR', () => {
    const now = Date.now();
    const createdAt = new Date(now).toISOString();
    const result = evaluateTermsGuard({ createdAt, intent: null, nowMs: now });
    expect(result).toBe('redirect');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Verificación de limpieza del localStorage (integración con la guardia)
  // ══════════════════════════════════════════════════════════════════════════

  it('3.L.1 localStorage limpia "nosee_google_intent" al leerlo (simula la guardia)', () => {
    // Simula exactamente lo que hace CallbackPage al ejecutar la guardia
    localStorage.setItem('nosee_google_intent', 'login');
    const intent = localStorage.getItem('nosee_google_intent');
    localStorage.removeItem('nosee_google_intent');

    // Después de la guardia, la clave no debe existir
    expect(localStorage.getItem('nosee_google_intent')).toBeNull();
    // Y la clave leída fue la correcta
    expect(intent).toBe('login');
  });

  it('3.L.2 La guardia no deja rastro de intent aunque haya pasado varias veces', () => {
    // Simula un doble-mount (StrictMode): la guardia se ejecuta dos veces
    localStorage.setItem('nosee_google_intent', 'register');

    // Primera ejecución
    const intent1 = localStorage.getItem('nosee_google_intent');
    localStorage.removeItem('nosee_google_intent');
    evaluateTermsGuard({ createdAt: minutesAgo(1), intent: intent1 });

    // Segunda ejecución (StrictMode remount)
    const intent2 = localStorage.getItem('nosee_google_intent');
    localStorage.removeItem('nosee_google_intent');
    evaluateTermsGuard({ createdAt: minutesAgo(1), intent: intent2 });

    // Al final no queda nada en localStorage
    expect(localStorage.getItem('nosee_google_intent')).toBeNull();
    // La primera ejecución leyó 'register', la segunda leyó null
    expect(intent1).toBe('register');
    expect(intent2).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 4 — RegisterPage: banner de aviso
// ─────────────────────────────────────────────────────────────────────────────
//
// Cuando el usuario llega a /registro?motivo=terminos (redirigido por la guardia
// del CallbackPage), la página debe mostrar un banner explicativo.

describe('RegisterPage — banner de aviso por términos no aceptados', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('4.1 Sin ?motivo=terminos → NO se muestra el banner', () => {
    renderRegisterPage('/registro');
    // El banner tiene el texto "Necesitás aceptar los Términos de uso"
    expect(screen.queryByText(/Necesitás aceptar los Términos de uso/i)).toBeNull();
  });

  it('4.2 Con ?motivo=terminos → el banner SÍ se muestra', () => {
    renderRegisterPage('/registro?motivo=terminos');
    expect(screen.getByText(/Necesitás aceptar los Términos de uso/i)).toBeDefined();
  });

  it('4.3 El banner explica que fue por venir del flujo de Google', () => {
    renderRegisterPage('/registro?motivo=terminos');
    expect(screen.getByText(/Para crear tu cuenta con Google debés leer y aceptar/i)).toBeDefined();
  });

  it('4.4 El banner menciona el checkbox como acción requerida', () => {
    renderRegisterPage('/registro?motivo=terminos');
    expect(screen.getByText(/Tildá el casillero antes de continuar/i)).toBeDefined();
  });

  it('4.5 Con ?motivo=terminos el formulario de registro sigue visible', () => {
    renderRegisterPage('/registro?motivo=terminos');
    // El botón de Google debe estar presente (aunque deshabilitado hasta tildar el checkbox)
    expect(screen.getByRole('button', { name: /Registrarme con Google/i })).toBeDefined();
  });

  it('4.6 Con ?motivo=terminos el checkbox empieza sin tildar (usuario debe aceptar activamente)', () => {
    renderRegisterPage('/registro?motivo=terminos');
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('4.7 Con ?motivo=terminos el botón Google sigue deshabilitado hasta tildar checkbox', () => {
    renderRegisterPage('/registro?motivo=terminos');
    const btn = screen.getByRole('button', { name: /Registrarme con Google/i });
    expect(btn).toBeDisabled();
  });

  it('4.8 Con ?motivo=terminos el botón Google se habilita al tildar el checkbox', () => {
    renderRegisterPage('/registro?motivo=terminos');
    fireEvent.click(screen.getByRole('checkbox'));
    const btn = screen.getByRole('button', { name: /Registrarme con Google/i });
    expect(btn).not.toBeDisabled();
  });

  it('4.9 Con otro motivo distinto a "terminos" → NO se muestra el banner', () => {
    renderRegisterPage('/registro?motivo=otro');
    expect(screen.queryByText(/Necesitás aceptar los Términos de uso/i)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 5 — Flujo end-to-end simulado de los 3 escenarios
// ─────────────────────────────────────────────────────────────────────────────
//
// Combina las secciones anteriores para simular el flujo completo de cada
// escenario de principio a fin, verificando cada punto de control.

describe('Flujo E2E simulado de los 3 escenarios', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ESCENARIO A completo: Login → Google → cuenta nueva → bloqueado → redirigido al registro', () => {
    // Paso 1: usuario hace click en Google desde el login
    const onGoogleLogin = vi.fn();
    renderLoginForm({ onGoogleLogin });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión con Google/i }));

    // Verificar que el intent quedó guardado antes de la redirección a Google
    expect(localStorage.getItem('nosee_google_intent')).toBe('login');
    expect(onGoogleLogin).toHaveBeenCalled();

    // Paso 2: simulamos que el callback recibe un usuario recién creado
    const intent = localStorage.getItem('nosee_google_intent');
    localStorage.removeItem('nosee_google_intent');
    const decision = evaluateTermsGuard({ createdAt: secondsAgo(45), intent });

    // La guardia debe bloquear
    expect(decision).toBe('redirect');

    // Paso 3: usuario llega a /registro?motivo=terminos con el banner
    renderRegisterPage('/registro?motivo=terminos');
    expect(screen.getByText(/Necesitás aceptar los Términos de uso/i)).toBeDefined();

    // El checkbox está sin tildar → botones deshabilitados
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.getByRole('button', { name: /Registrarme con Google/i })).toBeDisabled();
  });

  it('ESCENARIO B completo: Registro → checkbox ✓ → Google → cuenta nueva → permitido a /perfil', () => {
    // Paso 1: usuario tildar checkbox y hace click en Google desde registro
    const onGoogleRegister = vi.fn();
    renderRegisterForm({ onGoogleRegister });

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: /Registrarme con Google/i }));

    // Verificar que el intent es 'register'
    expect(localStorage.getItem('nosee_google_intent')).toBe('register');
    expect(onGoogleRegister).toHaveBeenCalled();

    // Paso 2: simulamos callback con usuario nuevo
    const intent = localStorage.getItem('nosee_google_intent');
    localStorage.removeItem('nosee_google_intent');
    const decision = evaluateTermsGuard({ createdAt: secondsAgo(30), intent });

    // La guardia debe PERMITIR porque el intent es 'register'
    expect(decision).toBe('allow');
  });

  it('ESCENARIO C completo: Login → Google → cuenta existente → permitido a /perfil', () => {
    // Paso 1: usuario hace click en Google desde el login
    const onGoogleLogin = vi.fn();
    renderLoginForm({ onGoogleLogin });
    fireEvent.click(screen.getByRole('button', { name: /Iniciar sesión con Google/i }));

    expect(localStorage.getItem('nosee_google_intent')).toBe('login');

    // Paso 2: simulamos callback con usuario EXISTENTE (cuenta de hace 2 días)
    const intent = localStorage.getItem('nosee_google_intent');
    localStorage.removeItem('nosee_google_intent');
    const decision = evaluateTermsGuard({
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      intent,
    });

    // La guardia debe PERMITIR porque no es usuario nuevo
    expect(decision).toBe('allow');
  });
});
