# NØSEE — Stack de Monitoreo

Implementación de Google Analytics 4, Prometheus y Grafana para las métricas del
**Plan de Gestión de la Calidad del Proyecto (ISO/IEC 25010)**.

---

## Arquitectura

```
React Frontend
    │
    ├── Google Analytics 4 ──→ GA4 Dashboard (comportamiento de usuario)
    │      src/services/analytics.js
    │
    └── Metrics Service ──→ metrics-server:3001/api/metrics
           src/services/metrics.js         │
                                     Prometheus scrape
                                           │
                                    prometheus:9090
                                           │
                                    grafana:3000 ──→ Dashboard ISO 25010
```

---

## Inicio rápido

### 1. Configurar la URL de producción (Azure SWA)

Editar `monitoring/prometheus/targets/blackbox_targets.yml` y reemplazar:
```yaml
- https://NOSEE_APP.azurestaticapps.net
```
con la URL real de tu Azure Static Web App (ej: `https://brave-sea-1234.azurestaticapps.net`).

### 2. Levantar el stack de monitoreo

```bash
cd monitoring
docker compose up -d
```

| Servicio            | URL                          | Credenciales    |
|---------------------|------------------------------|-----------------|
| Grafana             | http://localhost:3000        | admin / nosee2026 |
| Prometheus          | http://localhost:9090        | —               |
| Métricas            | http://localhost:3001/metrics | —              |
| Blackbox Exporter   | http://localhost:9115        | —               |

### 3. Verificar que el Blackbox Exporter funciona

```bash
# Probar manualmente cualquier URL
curl "http://localhost:9115/probe?target=http://metrics-server:3001/health&module=http_2xx_strict"
```

### 4. Configurar métricas de CI desde GitHub Actions (opcional)

Para que el workflow `.github/workflows/ci-metrics.yml` envíe métricas al Pushgateway local:

```bash
# Terminal 1 — exponer el Pushgateway al exterior (requiere ngrok)
ngrok http 9091
# Copia la URL pública: https://xxxxxxxx.ngrok-free.app

# Terminal 2 — ir a GitHub → Settings → Secrets → New secret
# Nombre: PUSHGATEWAY_URL
# Valor:  https://xxxxxxxx.ngrok-free.app
```

El workflow corre automáticamente en cada push a `main` o `cristhian`.

### 2. Configurar el frontend

Agregar en `.env`:
```env
# Google Analytics 4 (obtener en analytics.google.com)
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Prometheus metrics server
VITE_METRICS_SERVER_URL=http://localhost:3001
```

### 3. Reiniciar el servidor de desarrollo

```bash
npm run dev
```

---

## Métricas implementadas

### Proceso 1 — Gestión de Usuario y Autenticación

| Métrica Prometheus | Descripción | Meta (PDF) |
|--------------------|-------------|------------|
| `nosee_auth_login_total{result}` | Tasa de éxito de validación | >99.9% |
| `nosee_auth_login_duration_ms` | Latencia JWT (histogram) | <800 ms |
| `nosee_auth_login_page_views_total` | Vistas de pantalla de login | — |
| `nosee_auth_login_abandons_total` | Abandonos en login | <5% |
| `nosee_auth_register_duration_seconds` | Tiempo de registro (histogram) | <45 s |
| `nosee_auth_role_errors_total` | Errores de asignación de roles | 0 |
| `nosee_auth_password_recovery_total{result}` | Efectividad recuperación acceso | >95% |

### Proceso 2 — Gestión de Publicaciones de Precios

| Métrica Prometheus | Descripción | Meta (PDF) |
|--------------------|-------------|------------|
| `nosee_publications_created_total` | Total publicaciones creadas | — |
| `nosee_publications_with_image_total` | Publicaciones con foto | — |
| `nosee_publications_evidence_ratio` | Densidad evidencia visual (gauge) | >0.60 |
| `nosee_publications_votes_total{type}` | Votos upvote/downvote | — |
| `nosee_publications_upvote_ratio` | Índice de veracidad (gauge) | >0.85 |
| `nosee_publications_reports_total` | Contenido denunciado | <5% activas |

### Rendimiento

| Métrica Prometheus | Descripción | Meta (PDF) |
|--------------------|-------------|------------|
| `nosee_api_request_duration_ms` | Latencia API (histogram) | <3000 ms |

### Google Analytics 4 (eventos)

| Evento GA4 | Descripción |
|------------|-------------|
| `page_view` | Vista de página por ruta |
| `login` | Intento de login |
| `login_success` | Login exitoso + latencia |
| `login_failure` | Login fallido + tipo de error |
| `login_abandon` | Abandono de pantalla de login |
| `sign_up` | Registro completado + duración |
| `register_failure` | Fallo en registro |
| `publication_create` | Nueva publicación + tiene foto |
| `vote` | Voto upvote/downvote |
| `publication_report` | Publicación reportada |

---

## Dashboard de Grafana

El dashboard **NØSEE — Métricas de Calidad ISO/IEC 25010** se carga automáticamente.

Paneles incluidos:
- **Fila 1 — Auth:** Tasa éxito login, Latencia JWT P95, Tasa abandono, Tiempo registro P95
- **Fila 2 — Auth histórico:** Intentos en el tiempo, Errores de rol, Recuperación contraseña
- **Fila 3 — Publicaciones:** Upvote ratio, Densidad evidencia, Publicaciones 24h, Reportes 24h
- **Fila 4 — Votos:** Upvotes vs Downvotes en el tiempo
- **Fila 5 — Rendimiento:** Latencia API P95 por endpoint, Percentiles P50/P95/P99

---

## Usar las métricas en código

### Enviar evento al metrics server (Prometheus)

```js
import { recordLoginAttempt, recordPublicationCreated } from '@/services/metrics'

// Login exitoso en 430ms
recordLoginAttempt('success', 430)

// Publicación con imagen
recordPublicationCreated(true)
```

### Enviar evento a Google Analytics 4

```js
import { trackVote, trackPublicationCreate } from '@/services/analytics'

trackVote('upvote')
trackPublicationCreate(hasImage)
```

---

## Comandos útiles

```bash
# Ver logs del metrics-server
docker compose logs -f metrics-server

# Ver métricas actuales
curl http://localhost:3001/metrics

# Recargar config de Prometheus sin reiniciar
curl -X POST http://localhost:9090/-/reload

# Detener el stack
docker compose down

# Detener y borrar volúmenes (datos históricos)
docker compose down -v
```
