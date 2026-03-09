/**
 * Google Analytics 4 — Servicio de Analítica para NØSEE
 *
 * Implementa el seguimiento de métricas definidas en el
 * Plan de Gestión de la Calidad del Proyecto (ISO/IEC 25010):
 *
 * Proceso 1 — Gestión de Usuario y Autenticación
 *   · Tasa de éxito de validación          (sección 3.3.1, meta: >99.9 %)
 *   · Latencia de validación de credenciales (sección 3.4.1, meta: <800 ms)
 *   · Tiempo promedio de registro           (sección 3.4.1, meta: <45 s)
 *   · Tasa de Abandono en Login             (RNF 4.3.5,     meta: <5 %)
 *
 * Proceso 2 — Gestión de Publicaciones de Precios
 *   · Integridad de Evidencia Visual        (sección 3.4.2, meta: >60 %)
 *   · Índice de Veracidad (Upvote Ratio)    (sección 3.4.2, meta: >85 %)
 *   · Tasa de Contenido Denunciado          (sección 3.4.2, meta: <5 %)
 *
 * Configuración requerida en .env:
 *   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const IS_ENABLED = !!MEASUREMENT_ID && MEASUREMENT_ID !== 'G-XXXXXXXXXX';
const IS_DEV = import.meta.env.DEV;

function gtag(...args) {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

function devLog(event, params) {
  if (IS_DEV) {
    console.info('%c[Analytics]', 'color: #6366f1; font-weight: bold', event, params ?? '');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Inicialización
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Carga el script de GA4 dinámicamente y lo inicializa.
 * Llamar una sola vez desde main.jsx al arrancar la app.
 */
export function initAnalytics() {
  if (!IS_ENABLED) {
    if (IS_DEV) {
      console.warn(
        '%c[Analytics] GA4 deshabilitado.',
        'color: #f59e0b',
        'Configura VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX en .env para activarlo.'
      );
    }
    return;
  }

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  gtag('js', new Date());
  // send_page_view: false → rastreamos manualmente con trackPageView()
  gtag('config', MEASUREMENT_ID, { send_page_view: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// Páginas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Registra una vista de página.
 * Llamar desde el hook usePageView() en cada cambio de ruta.
 *
 * @param {string} path  - Ruta actual (e.g. '/login', '/publicaciones')
 * @param {string} title - Título de la página
 */
export function trackPageView(path, title) {
  devLog('page_view', { path, title });
  if (!IS_ENABLED) return;
  gtag('event', 'page_view', { page_path: path, page_title: title });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESO 1 — Gestión de Usuario y Autenticación
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Tasa de éxito de validación (sección 3.3.1)
 * Llamar ANTES de enviar las credenciales al servidor.
 *
 * @param {'email'|'google'} method
 */
export function trackLoginAttempt(method = 'email') {
  devLog('login_attempt', { method });
  if (!IS_ENABLED) return;
  gtag('event', 'login', { method, event_category: 'auth' });
}

/**
 * Métrica: Latencia de validación de credenciales (sección 3.4.1, meta: <800 ms)
 * Llamar cuando el login es EXITOSO.
 *
 * @param {'email'|'google'} method
 * @param {number} durationMs - Tiempo de respuesta del servidor en ms
 */
export function trackLoginSuccess(method = 'email', durationMs = 0) {
  devLog('login_success', { method, durationMs, meetsSLA: durationMs < 800 });
  if (!IS_ENABLED) return;
  gtag('event', 'login_success', {
    method,
    duration_ms: Math.round(durationMs),
    meets_sla: durationMs < 800 ? 'yes' : 'no',
    event_category: 'auth',
  });
}

/**
 * Llamar cuando el login FALLA (para calcular la tasa de éxito).
 *
 * @param {'email'|'google'} method
 * @param {string} errorType - Tipo de error (e.g. 'invalid_credentials', 'email_not_confirmed')
 */
export function trackLoginFailure(method = 'email', errorType = 'unknown') {
  devLog('login_failure', { method, errorType });
  if (!IS_ENABLED) return;
  gtag('event', 'login_failure', {
    method,
    error_type: errorType,
    event_category: 'auth',
  });
}

/**
 * Métrica: Tasa de Abandono en Login (RNF 4.3.5, meta: <5%)
 * Llamar cuando el usuario abandona /login sin completar el proceso.
 * Se activa vía beforeunload / navegación fuera de la ruta.
 */
export function trackLoginAbandon() {
  devLog('login_abandon', {});
  if (!IS_ENABLED) return;
  gtag('event', 'login_abandon', { event_category: 'auth' });
}

/**
 * Métrica: Tiempo promedio de registro (sección 3.4.1, meta: <45 s)
 * Llamar cuando el registro se completa exitosamente.
 *
 * @param {number} durationSeconds - Tiempo desde apertura del form hasta confirmación en BD
 */
export function trackRegisterComplete(durationSeconds) {
  const meetsSLA = durationSeconds < 45;
  devLog('register_complete', { durationSeconds, meetsSLA });
  if (!IS_ENABLED) return;
  gtag('event', 'sign_up', {
    method: 'email',
    duration_seconds: Math.round(durationSeconds),
    meets_sla: meetsSLA ? 'yes' : 'no',
    event_category: 'auth',
  });
}

/**
 * Llamar cuando el registro FALLA.
 *
 * @param {string} errorType
 */
export function trackRegisterFailure(errorType = 'unknown') {
  devLog('register_failure', { errorType });
  if (!IS_ENABLED) return;
  gtag('event', 'register_failure', {
    error_type: errorType,
    event_category: 'auth',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESO 2 — Gestión de Publicaciones de Precios
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Densidad de Evidencia Visual (sección 3.4.2, meta: >60 % con foto)
 * Llamar cuando se crea una nueva publicación.
 *
 * @param {boolean} hasImage - Si la publicación incluye foto de evidencia
 */
export function trackPublicationCreate(hasImage = false) {
  devLog('publication_create', { hasImage });
  if (!IS_ENABLED) return;
  gtag('event', 'publication_create', {
    has_image: hasImage ? 'yes' : 'no',
    event_category: 'publications',
  });
}

/**
 * Métrica: Índice de Veracidad / Upvote Ratio (sección 3.4.2, meta: >85 %)
 * Llamar cuando un usuario vota en una publicación.
 *
 * @param {'upvote'|'downvote'} voteType
 */
export function trackVote(voteType) {
  devLog('vote', { voteType });
  if (!IS_ENABLED) return;
  gtag('event', 'vote', {
    vote_type: voteType,
    event_category: 'publications',
  });
}

/**
 * Métrica: Tasa de Contenido Denunciado (sección 3.4.2, meta: <5 % de activas)
 * Llamar cuando un usuario reporta una publicación.
 */
export function trackPublicationReport() {
  devLog('publication_report', {});
  if (!IS_ENABLED) return;
  gtag('event', 'publication_report', { event_category: 'publications' });
}
