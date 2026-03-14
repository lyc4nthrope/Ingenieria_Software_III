/**
 * Metrics Service para NØSEE — Integración con Prometheus
 *
 * Envía eventos al metrics-server (Node.js/Express) que los expone en
 * formato Prometheus para ser visualizados en Grafana.
 *
 * Métricas alineadas al Plan de Gestión de Calidad (ISO/IEC 25010).
 *
 * Configuración requerida en .env:
 *   VITE_METRICS_SERVER_URL=http://localhost:3001
 *
 * Iniciar el servidor: cd monitoring && docker compose up
 */

const METRICS_URL = import.meta.env.VITE_METRICS_SERVER_URL;
const IS_ENABLED = !!METRICS_URL;
const IS_DEV = import.meta.env.DEV;

async function push(event, data = {}) {
  if (!IS_ENABLED) {
    if (IS_DEV) {
      console.info('%c[Metrics]', 'color: #10b981; font-weight: bold', event, data);
    }
    return;
  }
  try {
    await fetch(`${METRICS_URL}/api/metrics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
      // keepalive: true para que el envío persista aunque el usuario navegue
      keepalive: true,
    });
  } catch {
    // Las métricas son best-effort: no bloquear la UX por fallos de red
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESO 1 — Gestión de Usuario y Autenticación
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Tasa de éxito de validación + Latencia JWT
 * (sección 3.3.1, meta éxito: >99.9 %, meta latencia: <800 ms)
 *
 * @param {'success'|'failure'} result
 * @param {number} durationMs - Tiempo de respuesta del servidor Auth
 */
export function recordLoginAttempt(result, durationMs) {
  push('login_attempt', { result, duration_ms: durationMs });
}

/**
 * Vista de pantalla de login (denominador para tasa de abandono).
 * Llamar cuando se monta LoginPage.
 */
export function recordLoginPageView() {
  push('login_page_view', {});
}

/**
 * Métrica: Tasa de Abandono en Login (RNF 4.3.5, meta: <5 %)
 * Llamar cuando el usuario abandona LoginPage sin completar login.
 */
export function recordLoginAbandon() {
  push('login_abandon', {});
}

/**
 * Métrica: Tiempo promedio de registro (sección 3.4.1, meta: <45 s)
 *
 * @param {number} durationSeconds
 */
export function recordRegisterDuration(durationSeconds) {
  push('register_duration', { duration_seconds: durationSeconds });
}

/**
 * Métrica: Integridad de Asignación de Roles (sección 3.4.1, meta: 100 %)
 * Llamar cuando se detecta un error de permisos.
 *
 * @param {string} expectedRole
 * @param {string} assignedRole
 */
export function recordRoleError(expectedRole, assignedRole) {
  push('role_error', { expected_role: expectedRole, assigned_role: assignedRole });
}

/**
 * Métrica: Efectividad de recuperación de acceso (sección 3.3.1, meta: >95 %)
 *
 * @param {'success'|'failure'} result
 */
export function recordPasswordRecovery(result) {
  push('password_recovery', { result });
}

// ─────────────────────────────────────────────────────────────────────────────
// PROCESO 2 — Gestión de Publicaciones de Precios
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Integridad de Evidencia Visual (sección 3.4.2, meta: >60 % con foto)
 *
 * @param {boolean} hasImage
 */
export function recordPublicationCreated(hasImage) {
  push('publication_created', { has_image: hasImage });
}

/**
 * Métrica: Índice de Veracidad / Upvote Ratio (sección 3.4.2, meta: >85 %)
 *
 * @param {'upvote'|'downvote'} voteType
 */
export function recordVote(voteType) {
  push('vote', { vote_type: voteType });
}

/**
 * Métrica: Tasa de Contenido Denunciado (sección 3.4.2, meta: <5 %)
 */
export function recordPublicationReport() {
  push('publication_report', {});
}

/**
 * Métrica: Latencia de carga de publicaciones (sección 3.2, meta: <3 000 ms)
 *
 * @param {string} endpoint - Identificador del endpoint (e.g. 'publications_list')
 * @param {number} durationMs
 */
export function recordApiLatency(endpoint, durationMs) {
  push('api_latency', { endpoint, duration_ms: durationMs });
}
