/**
 * Architecture Documentation
 * 
 * Guía completa de la arquitectura de NoSee optimizada para Supabase
 */

// ESTRUCTURA RECOMENDADA PARA DESARROLLO

const architectureOverview = `
nosee/
├── src/
│   ├── app/                    # Configuración raíz
│   │   ├── App.jsx
│   │   ├── router.jsx          # React Router config
│   │   ├── providers.jsx       # Context/Providers globales
│   │   └── README.md
│   │
│   ├── features/               # ⭐ Módulos por negocio (escalable)
│   │   ├── auth/
│   │   │   ├── pages/          # LoginPage, RegisterPage
│   │   │   ├── components/     # LoginForm, RegisterForm
│   │   │   ├── hooks/          # useAuth, useSession
│   │   │   ├── services/       # Lógica de auth
│   │   │   ├── store/          # Zustand/Context
│   │   │   ├── schemas/        # ⭐ Validaciones (zod)
│   │   │   ├── mappers/        # ⭐ DTO transformations
│   │   │   └── README.md
│   │   │
│   │   ├── publications/       # (placeholder)
│   │   ├── orders/            # (placeholder)
│   │   └── delivery/          # (placeholder)
│   │
│   ├── components/             # Componentes reutilizables
│   │   ├── ui/                 # Button, Input, Modal
│   │   ├── layout/             # Navbar, Sidebar
│   │   └── README.md
│   │
│   ├── services/               # ⭐⭐ Capa de abstracción (crucial para migración)
│   │   ├── supabase.client.js  # Cliente singleton
│   │   ├── api/                # "Contrato" con backend
│   │   │   ├── auth.api.js
│   │   │   ├── users.api.js
│   │   │   └── index.js
│   │   └── README.md
│   │
│   ├── shared/                 # ⭐ Servicios compartidos
│   │   ├── logger/             # Centralizado logging
│   │   ├── errors/             # Parser Supabase errors
│   │   ├── index.js
│   │   └── README.md
│   │
│   ├── types/                  # ⭐ Tipos globales
│   │   ├── index.js
│   │   └── README.md
│   │
│   ├── hooks/                  # Hooks globales (reutilización)
│   ├── utils/                  # Helpers, formatters
│   ├── constants/              # Enums, roles, URLs
│   ├── assets/                 # Imágenes, fuentes
│   ├── index.css
│   └── main.jsx
│
├── supabase/                   # ⭐ Infraestructura versionada
│   ├── config.toml             # ⭐ Config local Supabase CLI
│   ├── .env.example            # ⭐ Variables para dev local
│   ├── migrations/             # SQL versionadas
│   │   └── [timestamp]_initial_schema.sql
│   ├── functions/              # Edge Functions serverless
│   │   └── verify-user/
│   ├── policies/               # ⭐ RLS por tabla
│   │   └── users.rls.sql
│   ├── sql/                    # ⭐ Scripts auxiliares
│   │   ├── functions_and_triggers.sql
│   │   └── seed_data.sql
│   ├── seed.sql                # Datos iniciales
│   └── README.md
│
├── tests/                      # ⭐ Testing organizado
│   ├── unit/                   # Funciones puras
│   │   └── auth.mappers.test.js (comentado, espera vitest)
│   ├── integration/            # API + DB
│   │   └── auth.test.js (comentado, espera vitest)
│   ├── e2e/                    # Flujos completos
│   │   └── auth.e2e.js (comentado, espera playwright)
│   └── README.md
│
├── public/
│   ├── manifest.json           # PWA config
│   ├── sw.js                   # Service Worker
│   └── icons/
│
├── .env                        # ❌ NO SUBIR (local)
├── .env.example                # ✅ Template (subir)
├── vite.config.js
├── eslint.config.js
├── package.json
└── README.md
`;

// FLUJO DE DATOS

const dataFlowExample = \`
component/hook
    ↓
features/auth/hooks/useAuth.js
    ↓
features/auth/services/ (lógica)
    ↓
mappers/ ❌ No consumir directo Supabase
    ↓
services/api/auth.api.js ⭐ Contrato
    ↓
services/supabase.client.js (singleton)
    ↓
Supabase (Auth + RLS)
\`;

// PASO A PASO PARA SETUP INICIAL

const setupSteps = \`
1. Install Supabase CLI
   npm install --save-dev supabase

2. Start Supabase local
   supabase start
   → PostgreSQL: localhost:54322
   → API: http://localhost:54321

3. Load migrations
   supabase migration up

4. Run seed data
   supabase seed run

5. Test auth flow
   npm run test:integration

6. Para producción, link proyecto
   supabase link --project-ref XXX
   supabase push
\`;

// DEPENDENCIAS A INSTALAR

const recommendedDeps = \`
# Core
npm install @supabase/supabase-js react-router-dom zustand

# Validation & types
npm install zod                          # Cuando migres a TS

# Logging / Monitoring
npm install @sentry/react                # En producción

# Testing
npm install --save-dev vitest @vitest/ui
npm install --save-dev @playwright/test  # E2E

# Dev tools
npm install --save-dev supabase
\`;

// CHECKLIST PRODUCCIÓN

const productionChecklist = \`
✅ Migraciones en supabase/migrations/
✅ RLS policies en supabase/policies/ y aplicadas
✅ Edge Functions testeadas localmente
✅ Tests de integración pasando (auth, RLS)
✅ Logger centralizado (Sentry ready)
✅ Error handling robusto (parseSupabaseError)
✅ .env.example actualizado
✅ Supabase linked a proyecto remoto
✅ Migraciones pusheadas (supabase push)
✅ Variables de entorno en CI/CD
✅ CORS configurado en Supabase
\`;

console.log('Arquitectura refactorizada para Supabase BaaS');
