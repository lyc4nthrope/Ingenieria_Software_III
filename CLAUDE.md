# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NØSEE** - A React + Vite SPA for managing publications and stores with role-based access control. Frontend is deployed on Azure Static Web Apps; backend uses Supabase (PostgreSQL + Auth + Edge Functions).

All application code lives in the `nosee/` subdirectory.

## Commands

All commands must be run from `nosee/`:

```bash
cd nosee

npm run dev          # Start dev server (port 5173)
npm run build        # Production build → dist/
npm run lint         # ESLint check
npm run test         # Vitest unit tests (watch mode)
npm run test:ui      # Vitest with interactive UI
npm run test:e2e     # Playwright E2E tests (requires dev server)
npm run test:e2e:ui  # Playwright interactive UI
```

Run a single test file:
```bash
npx vitest run tests/unit/myFile.test.js
npx playwright test tests/e2e/myFile.spec.js
```

## Architecture

### Frontend (`nosee/src/`)

Feature-based structure:

- **`features/`** — Domain modules, each with `pages/`, `components/`, `store/`, `schemas/`
  - `auth/` — Login, register, profile, Zustand `authStore`
  - `publications/` — Listing, creation, editing
  - `stores/` — Store CRUD with Leaflet map picker
  - `dashboard/` — Role-specific views (admin, moderator, dealer)
- **`services/api/`** — Supabase API calls per domain (`auth.api.js`, `publications.api.js`, `stores.api.js`, `alerts.api.js`). All exported from `index.js`.
- **`router/`** — `App.routes.js` defines routes; `RoleRouter.jsx` handles role-based redirects
- **`contexts/LanguageContext.jsx`** — Spanish i18n strings (76KB)
- **`shared/`** — Error handling, Leaflet config, logger
- **`App.jsx`** — Auth initialization and top-level routing

### State Management

Zustand stores per feature (e.g., `authStore` in `features/auth/store/`). No Redux.

### Backend (`nosee/supabase/`)

- **Supabase** manages auth, PostgreSQL DB, and RLS policies
- **Edge Functions** (`supabase/functions/`) run on Deno — notably `notify-price-alerts/` (price monitoring cron)
- **Migrations** go in `supabase/migrations/` as SQL files

### Key Data Flows

1. **Auth:** `authApi` → Supabase Auth session → `authStore` → `ProtectedRoute` checks
2. **Publications:** `publicationsApi` → Supabase queries → infinite scroll (220px trigger, 500ms cooldown)
3. **Stores:** Leaflet map picker → `storesApi.createStore()`
4. **Alerts:** Supabase Edge Function (scheduled) → price_alerts table → notifications

### Role-Based Access

Three roles: **Admin**, **Moderador**, **Repartidor** (dealer). `RoleRouter.jsx` routes to role-specific dashboards.

## Environment Variables

Stored as `VITE_*` in `.env` (see CI workflow for full list):

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CLOUDINARY_CLOUD_NAME
VITE_CLOUDINARY_UPLOAD_PRESET
VITE_CLOUDINARY_UPLOAD_FOLDER
VITE_ENABLE_AUTO_STORE      # Feature flag
VITE_ENABLE_BARCODE_SCAN    # Feature flag
VITE_GA_MEASUREMENT_ID
```

## Testing

- **Unit/Integration:** Vitest with jsdom, React Testing Library. Files in `tests/unit/` and `tests/integration/`
- **E2E:** Playwright (Chromium), base URL `http://localhost:5173`. Files in `tests/e2e/`. Dev server auto-starts.
- Playwright config: screenshots on failure, HTML reports, 1 worker in CI

## Deployment

CI/CD via `.github/workflows/azure-static-web-apps-*.yml`:
- Push to `main` → build `nosee/` → deploy `dist/` to Azure Static Web Apps
- PR open/sync → deploy staging environment; PR close → clean up staging
- VITE env vars are injected from GitHub Actions secrets at build time

## Local Supabase

See `nosee/supabase/README.md` for full local setup. Key points:
- Uses `supabase/config.toml` with `project_id = "nosee-local"`
- Apply migrations: `supabase db push`
- Seed data: `supabase/seed.sql`
- RLS policies defined in `supabase/policies/`

## Path Alias

`@` resolves to `nosee/src/` (configured in `vite.config.js`).
