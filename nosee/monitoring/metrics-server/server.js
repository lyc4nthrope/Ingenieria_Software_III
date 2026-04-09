/**
 * NØSEE Metrics Server
 *
 * Colector de métricas para Prometheus.
 * Recibe eventos del frontend via POST /api/metrics y los expone
 * en formato Prometheus en GET /metrics para ser scrapeados.
 *
 * Métricas implementadas según Plan de Gestión de Calidad (ISO/IEC 25010):
 *
 * Proceso 1 — Gestión de Usuario y Autenticación
 *   nosee_auth_login_total              (meta éxito: >99.9%)
 *   nosee_auth_login_duration_ms        (meta: <800ms)
 *   nosee_auth_login_page_views_total
 *   nosee_auth_login_abandons_total     (meta: <5%)
 *   nosee_auth_register_duration_seconds (meta: <45s)
 *   nosee_auth_role_errors_total        (meta: 0)
 *   nosee_auth_password_recovery_total  (meta éxito: >95%)
 *
 * Proceso 2 — Gestión de Publicaciones de Precios
 *   nosee_publications_created_total
 *   nosee_publications_with_image_total (meta: >60% del total)
 *   nosee_publications_evidence_ratio   (gauge, meta: >0.60)
 *   nosee_publications_votes_total      (meta upvote ratio: >85%)
 *   nosee_publications_upvote_ratio     (gauge, meta: >0.85)
 *   nosee_publications_reports_total    (meta: <5% de activas)
 *
 * Proceso 3 — Gestión de Pedido, Optimización de Compra y Ubicación
 *   nosee_shopping_list_order_started_total
 *   nosee_shopping_list_order_abandoned_total (meta: <20% de iniciados)
 *   nosee_orders_created_total{strategy,delivery_mode}
 *   nosee_orders_optimization_total{strategy}
 *   nosee_orders_optimization_duration_ms     (meta: <5000ms)
 *   nosee_orders_no_results_items_total       (meta: 0)
 *   nosee_orders_savings_percent              (meta: >0%)
 *
 * Rendimiento
 *   nosee_api_request_duration_ms       (meta: <3000ms)
 */

import express from 'express';
import cors from 'cors';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';

const register = new Registry();
register.setDefaultLabels({ app: 'nosee', env: process.env.NODE_ENV ?? 'development' });

collectDefaultMetrics({ register });

// ─────────────────────────────────────────────────────────────────────────────
// PROCESO 1 — Autenticación
// ─────────────────────────────────────────────────────────────────────────────

const loginAttemptsTotal = new Counter({
  name: 'nosee_auth_login_total',
  help: 'Total de intentos de login. Calcular tasa de éxito con result="success".',
  labelNames: ['result'],
  registers: [register],
});

const loginDurationMs = new Histogram({
  name: 'nosee_auth_login_duration_ms',
  help: 'Tiempo de respuesta del servicio de autenticación en ms (meta: <800ms)',
  buckets: [100, 200, 400, 600, 800, 1000, 1500, 2000, 3000],
  registers: [register],
});

const loginPageViewsTotal = new Counter({
  name: 'nosee_auth_login_page_views_total',
  help: 'Vistas de la pantalla de login (denominador para tasa de abandono)',
  registers: [register],
});

const loginAbandonsTotal = new Counter({
  name: 'nosee_auth_login_abandons_total',
  help: 'Usuarios que abren login pero no completan el proceso (meta: <5% de vistas)',
  registers: [register],
});

const registerDurationSeconds = new Histogram({
  name: 'nosee_auth_register_duration_seconds',
  help: 'Duración del flujo de registro desde apertura del formulario (meta: <45s)',
  buckets: [10, 20, 30, 45, 60, 90, 120, 180, 300],
  registers: [register],
});

const roleErrorsTotal = new Counter({
  name: 'nosee_auth_role_errors_total',
  help: 'Errores en asignación de roles - riesgo crítico de seguridad (meta: 0)',
  labelNames: ['expected_role', 'assigned_role'],
  registers: [register],
});

const passwordRecoveryTotal = new Counter({
  name: 'nosee_auth_password_recovery_total',
  help: 'Solicitudes de recuperación de contraseña (meta éxito: >95%)',
  labelNames: ['result'],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// PROCESO 2 — Publicaciones
// ─────────────────────────────────────────────────────────────────────────────

const publicationsCreatedTotal = new Counter({
  name: 'nosee_publications_created_total',
  help: 'Total de publicaciones de precios creadas',
  registers: [register],
});

const publicationsWithImageTotal = new Counter({
  name: 'nosee_publications_with_image_total',
  help: 'Publicaciones creadas con foto de evidencia (meta: >60% del total)',
  registers: [register],
});

const evidenceRatioGauge = new Gauge({
  name: 'nosee_publications_evidence_ratio',
  help: 'Proporción de publicaciones con imagen de evidencia (meta: >0.60)',
  registers: [register],
});

const votesTotal = new Counter({
  name: 'nosee_publications_votes_total',
  help: 'Total de votos en publicaciones',
  labelNames: ['type'],
  registers: [register],
});

const upvoteRatioGauge = new Gauge({
  name: 'nosee_publications_upvote_ratio',
  help: 'Proporción de upvotes sobre total de votos — Índice de Veracidad (meta: >0.85)',
  registers: [register],
});

const publicationReportsTotal = new Counter({
  name: 'nosee_publications_reports_total',
  help: 'Publicaciones reportadas por los usuarios (meta: <5% de activas)',
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// CLOUDINARY — Subida de imágenes de evidencia (RNF 4.2.3, 4.2.4)
// ─────────────────────────────────────────────────────────────────────────────

const cloudinaryUploadsTotal = new Counter({
  name: 'nosee_cloudinary_upload_total',
  help: 'Total de subidas de imagen a Cloudinary (meta éxito: >99%)',
  labelNames: ['result'],
  registers: [register],
});

const imageUploadSizeBytes = new Histogram({
  name: 'nosee_image_upload_size_bytes',
  help: 'Tamaño de imágenes subidas en bytes (meta: ≤5MB)',
  buckets: [50000, 200000, 500000, 1000000, 2000000, 5000000, 10000000],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN REFRESH — Renovación de sesión (RNF 4.1.4)
// ─────────────────────────────────────────────────────────────────────────────

const tokenRefreshTotal = new Counter({
  name: 'nosee_token_refresh_total',
  help: 'Renovaciones de token JWT por Supabase (meta éxito: >99.9%)',
  labelNames: ['result'],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// FORMULARIOS — Inicio y abandono (RNF 4.3.5, 4.1.3)
// ─────────────────────────────────────────────────────────────────────────────

const publicationFormStartedTotal = new Counter({
  name: 'nosee_publication_form_started_total',
  help: 'Usuarios que abren el formulario de crear publicación (denominador para tasa de abandono)',
  registers: [register],
});

const publicationFormAbandonedTotal = new Counter({
  name: 'nosee_publication_form_abandoned_total',
  help: 'Usuarios que abandonan el formulario sin publicar (meta: <15% de iniciados)',
  registers: [register],
});

const registrationStartedTotal = new Counter({
  name: 'nosee_registration_started_total',
  help: 'Usuarios que abren el formulario de registro (denominador para conversión)',
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODIFICACIÓN — Nominatim (RNF 4.2.2)
// ─────────────────────────────────────────────────────────────────────────────

const geocodingRequestsTotal = new Counter({
  name: 'nosee_geocoding_requests_total',
  help: 'Peticiones totales a Nominatim (reverse + forward geocoding)',
  labelNames: ['result', 'type'],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// VOTOS — Duplicados rechazados (RNF 4.1.2)
// ─────────────────────────────────────────────────────────────────────────────

const voteDuplicateRejectedTotal = new Counter({
  name: 'nosee_vote_duplicate_rejected_total',
  help: 'Intentos de voto duplicado bloqueados (meta: 0 duplicados persistidos)',
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// PROCESO 3 — Gestión de Pedido, Optimización de Compra y Ubicación
// ─────────────────────────────────────────────────────────────────────────────

const shoppingListOrderStartedTotal = new Counter({
  name: 'nosee_shopping_list_order_started_total',
  help: 'Usuarios que inician el flujo de creación de pedido (denominador para tasa de abandono)',
  registers: [register],
});

const shoppingListOrderAbandonedTotal = new Counter({
  name: 'nosee_shopping_list_order_abandoned_total',
  help: 'Usuarios que abandonan CreateOrderPage sin confirmar (meta: <20% de los iniciados)',
  registers: [register],
});

const ordersCreatedTotal = new Counter({
  name: 'nosee_orders_created_total',
  help: 'Pedidos confirmados por el usuario',
  labelNames: ['strategy', 'delivery_mode'],
  registers: [register],
});

const ordersOptimizationTotal = new Counter({
  name: 'nosee_orders_optimization_total',
  help: 'Ejecuciones del motor de optimización por estrategia',
  labelNames: ['strategy'],
  registers: [register],
});

const ordersOptimizationDurationMs = new Histogram({
  name: 'nosee_orders_optimization_duration_ms',
  help: 'Duración del cálculo de optimización en ms (meta: <5000ms)',
  buckets: [200, 500, 1000, 2000, 3000, 5000, 8000, 15000],
  registers: [register],
});

const ordersNoResultItemsTotal = new Counter({
  name: 'nosee_orders_no_results_items_total',
  help: 'Ítems sin publicaciones encontradas en el área (meta: 0)',
  registers: [register],
});

const ordersSavingsPct = new Histogram({
  name: 'nosee_orders_savings_percent',
  help: 'Porcentaje de ahorro por pedido respecto al precio máximo (meta: >0%)',
  buckets: [0, 5, 10, 15, 20, 30, 40, 50, 60, 75, 100],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// RENDIMIENTO
// ─────────────────────────────────────────────────────────────────────────────

const apiLatencyMs = new Histogram({
  name: 'nosee_api_request_duration_ms',
  help: 'Latencia de peticiones a la API en ms (meta: <3000ms)',
  labelNames: ['endpoint'],
  buckets: [100, 300, 500, 1000, 2000, 3000, 5000, 10000],
  registers: [register],
});

// ─────────────────────────────────────────────────────────────────────────────
// Estado en memoria para calcular ratios dinámicos
// ─────────────────────────────────────────────────────────────────────────────

const state = {
  totalPublications: 0,
  publicationsWithImage: 0,
  totalVotes: 0,
  upvotes: 0,
};

function updateEvidenceRatio() {
  if (state.totalPublications > 0) {
    evidenceRatioGauge.set(state.publicationsWithImage / state.totalPublications);
  }
}

function updateUpvoteRatio() {
  if (state.totalVotes > 0) {
    upvoteRatioGauge.set(state.upvotes / state.totalVotes);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Servidor Express
// ─────────────────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

/**
 * POST /api/metrics
 * Body: { event: string, data: object }
 *
 * Recibe eventos del frontend React y actualiza los contadores/histogramas.
 */
app.post('/api/metrics', (req, res) => {
  const { event, data = {} } = req.body ?? {};

  if (!event) {
    return res.status(400).json({ error: 'Campo "event" requerido' });
  }

  switch (event) {
    // ── Auth ──────────────────────────────────────────────────────────────
    case 'login_attempt': {
      const result = data.result === 'success' ? 'success' : 'failure';
      loginAttemptsTotal.inc({ result });
      if (typeof data.duration_ms === 'number') {
        loginDurationMs.observe(data.duration_ms);
      }
      break;
    }

    case 'login_page_view':
      loginPageViewsTotal.inc();
      break;

    case 'login_abandon':
      loginAbandonsTotal.inc();
      break;

    case 'register_duration':
      if (typeof data.duration_seconds === 'number') {
        registerDurationSeconds.observe(data.duration_seconds);
      }
      break;

    case 'role_error':
      roleErrorsTotal.inc({
        expected_role: data.expected_role ?? 'unknown',
        assigned_role: data.assigned_role ?? 'unknown',
      });
      break;

    case 'password_recovery':
      passwordRecoveryTotal.inc({ result: data.result ?? 'unknown' });
      break;

    // ── Publicaciones ─────────────────────────────────────────────────────
    case 'publication_created':
      publicationsCreatedTotal.inc();
      state.totalPublications++;
      if (data.has_image === true) {
        publicationsWithImageTotal.inc();
        state.publicationsWithImage++;
      }
      updateEvidenceRatio();
      break;

    case 'vote': {
      const voteType = data.vote_type === 'upvote' ? 'upvote' : 'downvote';
      votesTotal.inc({ type: voteType });
      state.totalVotes++;
      if (voteType === 'upvote') state.upvotes++;
      updateUpvoteRatio();
      break;
    }

    case 'publication_report':
      publicationReportsTotal.inc();
      break;

    // ── Cloudinary ────────────────────────────────────────────────────────
    case 'cloudinary_upload': {
      const uploadResult = data.result === 'success' ? 'success' : 'failure';
      cloudinaryUploadsTotal.inc({ result: uploadResult });
      if (typeof data.size_bytes === 'number' && data.size_bytes > 0) {
        imageUploadSizeBytes.observe(data.size_bytes);
      }
      break;
    }

    // ── Token Refresh ─────────────────────────────────────────────────────
    case 'token_refresh':
      tokenRefreshTotal.inc({ result: data.result === 'success' ? 'success' : 'failure' });
      break;

    // ── Formularios ───────────────────────────────────────────────────────
    case 'publication_form_started':
      publicationFormStartedTotal.inc();
      break;

    case 'publication_form_abandoned':
      publicationFormAbandonedTotal.inc();
      break;

    case 'registration_started':
      registrationStartedTotal.inc();
      break;

    // ── Geocodificación ───────────────────────────────────────────────────
    case 'geocoding_request':
      geocodingRequestsTotal.inc({
        result: data.result === 'success' ? 'success' : 'failure',
        type: data.type === 'forward' ? 'forward' : 'reverse',
      });
      break;

    // ── Votos duplicados ──────────────────────────────────────────────────
    case 'vote_duplicate_rejected':
      voteDuplicateRejectedTotal.inc();
      break;

    // ── Proceso 3 ─────────────────────────────────────────────────────────────
    case 'shopping_list_order_started':
      shoppingListOrderStartedTotal.inc();
      break;

    case 'shopping_list_order_abandoned':
      shoppingListOrderAbandonedTotal.inc();
      break;

    case 'optimization_run': {
      const strat = ['price', 'fewest_stores', 'balanced'].includes(data.strategy)
        ? data.strategy : 'unknown';
      ordersOptimizationTotal.inc({ strategy: strat });
      if (typeof data.duration_ms === 'number') {
        ordersOptimizationDurationMs.observe(data.duration_ms);
      }
      if (typeof data.no_result_count === 'number' && data.no_result_count > 0) {
        ordersNoResultItemsTotal.inc(data.no_result_count);
      }
      break;
    }

    case 'order_confirmed': {
      const strat = ['price', 'fewest_stores', 'balanced'].includes(data.strategy)
        ? data.strategy : 'unknown';
      const mode = data.delivery_mode === 'delivery' ? 'delivery' : 'pickup';
      ordersCreatedTotal.inc({ strategy: strat, delivery_mode: mode });
      if (typeof data.savings_pct === 'number') {
        ordersSavingsPct.observe(data.savings_pct);
      }
      break;
    }

    // ── Rendimiento ───────────────────────────────────────────────────────
    case 'api_latency':
      if (typeof data.duration_ms === 'number') {
        apiLatencyMs.observe({ endpoint: data.endpoint ?? 'unknown' }, data.duration_ms);
      }
      break;

    default:
      // Evento desconocido — ignorar silenciosamente
      break;
  }

  res.json({ ok: true });
});

/**
 * GET /metrics
 * Endpoint que Prometheus scrapea cada 15 segundos.
 */
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

/** GET /health — para healthcheck de Docker */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nosee-metrics-server', uptime: process.uptime() });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 NØSEE Metrics Server corriendo en :${PORT}`);
  console.log(`   Prometheus → GET  http://localhost:${PORT}/metrics`);
  console.log(`   Eventos    → POST http://localhost:${PORT}/api/metrics`);
  console.log(`   Health     → GET  http://localhost:${PORT}/health\n`);
});
