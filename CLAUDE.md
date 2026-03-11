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


##Here is the complete development guideline for this repository, derived from all active skills:                                                          
                                     
  ---                                                                                                                                                      
  NØSEE — Development Guidelines                                                                                                                           
  ---                                                                                                                                                      
  1. Feature Structure

  Every new feature follows a strict folder layout inside src/features/:

  features/
    <feature-name>/
      pages/        ← route-level components (lazy-loaded)
      components/   ← presentational UI for this feature
      hooks/        ← all business/UI logic
      store/        ← Zustand store (if needed)
      schemas/      ← Zod validation schemas

  Rules:
  - Shared UI (buttons, inputs, modals) → src/components/ui/
  - Feature logic never leaks into other features
  - Pages are registered in src/router/App.routes.js and lazy-loaded with React.lazy + Suspense

  ---
  2. Frontend Components

  Components must be presentational only — no API calls, no business logic.

  // ✅ Correct
  export function PublicationCard({ title, price, onSelect }) {
    return (
      <article className="publication-card" onClick={onSelect}>
        <h2>{title}</h2>
        <p>{price}</p>
      </article>
    );
  }

  // ❌ Wrong — component calling Supabase directly
  export function PublicationCard({ id }) {
    const [data, setData] = useState(null);
    useEffect(() => { supabase.from('publications').select()... }, []);
  }

  Rules:
  - Functional components only — no class components
  - Logic lives in custom hooks inside the feature's hooks/ folder
  - Pages compose components, hooks handle logic
  - Avoid large monolithic components — keep them small and composable
  - All interactive elements must be keyboard accessible
  - Semantic HTML (<button>, <article>, <nav>, not <div onClick>)
  - All inputs must have <label> or aria-label
  - Never rely on color alone to convey meaning

  ---
  3. Supabase Interaction

  No component or hook ever calls Supabase directly. All calls go through the API service layer:

  Component → Hook → API service (src/services/api/) → Supabase RPC

  // src/services/api/publications.api.js

  export async function getPublications() {
    const { data, error } = await supabase.rpc('get_publications');
    if (error) return { success: false, error };
    return { success: true, data };
  }

  Rules:
  - API functions always return { success: true, data } or { success: false, error } — no exceptions
  - Use supabase.rpc('function_name', { params }) for all data retrieval — no complex .select().eq().order() chains in frontend code
  - All SQL logic lives inside PostgreSQL functions in Supabase
  - Respect RLS policies — never use service role key in frontend code
  - New domains get a new file: src/services/api/<domain>.api.js, exported from index.js

  ---
  4. State Management

  Each feature that needs global state gets its own Zustand store inside features/<name>/store/:

  // features/publications/store/publicationsStore.js

  export const usePublicationsStore = create((set) => ({
    publications: [],
    status: 'idle',
    setPublications: (publications) => set({ publications }),
  }));

  // Selectors — defined alongside the store
  export const selectPublications = (state) => state.publications;
  export const selectPublicationsStatus = (state) => state.status;

  // In a component — always use a selector, never the full store
  const publications = usePublicationsStore(selectPublications);

  Rules:
  - Never do usePublicationsStore() without a selector — this causes every state change to re-render
  - Stores stay minimal — only state that genuinely needs to be global
  - Async actions (API calls) live inside the store or in a hook, never in components

  ---
  5. UI Styling

  Never hardcode colors, font sizes, or spacing. Always use the existing CSS variables:

  /* ✅ Correct */
  color: var(--text-primary);
  background: var(--bg-surface);
  border: 1px solid var(--border-color);

  /* ❌ Wrong */
  color: #333;
  background: white;
  border: 1px solid #ccc;

  Layout rules:
  - Mobile-first — design for small screens first, expand with media queries
  - Use flexbox or grid for layouts — avoid absolute positioning for structure
  - Avoid fixed widths — prefer max-width, min-width, %, rem
  - Respect high contrast mode (the project already has an AccessibilityMenu toggle)

  ---
  6. Validation

  All user input is validated with Zod. Schemas live in features/<name>/schemas/:

  // features/auth/schemas/index.js
  import { z } from 'zod';

  export const LoginSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
  });

  export const RegisterSchema = z.object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
  });

  Rules:
  - No plain regex validation for new code — use Zod
  - Schemas are imported in hooks, not in components
  - The existing features/auth/schemas/index.js should be migrated to Zod as part of ongoing work

  ---
  7. Tests

  Unit/Integration (Vitest):
  - Test hooks and API service functions in isolation
  - Files in tests/unit/ or tests/integration/
  - Run: npm run test

  E2E (Playwright):
  - Test complete user flows in tests/e2e/*.spec.js
  - Cover: login, navigation, CRUD operations, role-based dashboard access

  // tests/e2e/auth.spec.js
  test('user can login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'password123');
    await page.click('button[type=submit]');
    await expect(page).toHaveURL('/');
  });

  - Run: npm run test:e2e
  - CI runs with 1 worker, 2 retries, screenshots on failure

  ---
  8. Commits and Pull Requests

  Commits follow Conventional Commits:

  feat: add price alert creation form
  fix: correct store location validation
  refactor: simplify auth store initialize flow
  test: add E2E test for login flow
  docs: update supabase edge function README

  No generic messages (update, changes, fix stuff).

  Pull Requests:

  Title: feat: add store creation with map picker

  ## Changes
  - Add StoreForm component with Leaflet map integration
  - Add storesApi.createStore() RPC call
  - Add Zod schema for store validation
  - Add Zustand store for stores state

  ## Testing
  - Unit test for schema validation
  - E2E test: user can create a store and see it on the map

  ---
  Summary — The Strict Flow for Any New Feature

  1. Create feature folder:  src/features/<name>/{pages,components,hooks,store,schemas}
  2. Write Zod schema:        features/<name>/schemas/index.js
  3. Write API service:       src/services/api/<name>.api.js  (RPC only, standard envelope)
  4. Export from index:       src/services/api/index.js
  5. Write Zustand store:     features/<name>/store/<name>Store.js  (with selectors)
  6. Write hook:              features/<name>/hooks/use<Name>.js  (calls API, updates store)
  7. Write components:        features/<name>/components/  (presentational, CSS vars, accessible)
  8. Write page:              features/<name>/pages/<Name>Page.jsx  (lazy-loaded, composes components)
  9. Register route:          src/router/App.routes.js
  10. Write tests:            tests/unit/ + tests/e2e/
  11. Commit:                 feat: add <name> feature
