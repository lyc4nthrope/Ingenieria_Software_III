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

// ─────────────────────────────────────────────────────────────────────────────
// CLOUDINARY — Subida de imágenes de evidencia (sección 3.4.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Tasa de éxito de subida de imágenes + tamaño promedio
 * (RNF 4.2.3: >99 % de éxito; RNF 4.2.4: tamaño ≤ 5 MB)
 *
 * @param {'success'|'failure'} result
 * @param {number} [sizeBytes] - Tamaño del archivo en bytes
 */
export function recordCloudinaryUpload(result, sizeBytes) {
  push('cloudinary_upload', { result, size_bytes: sizeBytes ?? 0 });
}

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN REFRESH — Renovación de sesión JWT (sección 3.3.1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Tasa de éxito de refresh de token (RNF 4.1.4, meta: >99.9 %)
 *
 * @param {'success'|'failure'} result
 */
export function recordTokenRefresh(result) {
  push('token_refresh', { result });
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIOS — Inicio y abandono (RNF 4.3.5, 4.1.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Inicio del flujo de publicación (denominador para tasa de abandono)
 * Llamar cuando se monta PublicationForm en modo 'create'.
 */
export function recordPublicationFormStarted() {
  push('publication_form_started', {});
}

/**
 * Métrica: Abandono del formulario de publicación (RNF 4.3.5, meta: <15 %)
 * Llamar cuando el usuario desmonta el formulario sin completar la publicación.
 */
export function recordPublicationFormAbandoned() {
  push('publication_form_abandoned', {});
}

/**
 * Métrica: Inicio del flujo de registro (denominador para conversión)
 * Llamar cuando se monta RegisterPage.
 */
export function recordRegistrationStarted() {
  push('registration_started', {});
}

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODIFICACIÓN — Nominatim (RNF 4.2.2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Peticiones de geocodificación y su resultado
 * (RNF 4.2.2: disponibilidad geocoder > 99.5 %)
 *
 * @param {'success'|'failure'} result
 * @param {'reverse'|'forward'} [type] - reverse = coordenadas→dirección, forward = dirección→coordenadas
 */
export function recordGeocodingRequest(result, type = 'reverse') {
  push('geocoding_request', { result, type });
}

// ─────────────────────────────────────────────────────────────────────────────
// VOTOS — Duplicados rechazados (RNF 4.1.2, integridad)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Métrica: Intentos de voto duplicado bloqueados
 * (RNF 4.1.2: 0 votos duplicados deben persistir)
 */
export function recordVoteDuplicateRejected() {
  push('vote_duplicate_rejected', {});
}
