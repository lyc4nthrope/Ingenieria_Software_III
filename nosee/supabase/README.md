# Supabase

Configuración local de Supabase para desarrollo. **Toda la infraestructura versionada en git.**

## Estructura

```
supabase/
├── config.toml              # ⭐ Configuración local (nuevo)
├── .env.example             # ⭐ Variables locales (nuevo)
├── migrations/              # Migraciones SQL versionadas
├── functions/               # Edge Functions (serverless)
├── policies/                # RLS (Row Level Security) policies
├── sql/                     # Scripts auxiliares (vistas, triggers)
└── seed.sql                 # Datos iniciales
```

## Inicio Rápido

### 1. Instalar Supabase CLI

```bash
npm install --save-dev supabase
# o globalmente
brew install supabase/tap/supabase
```

### 2. Inicializar proyecto

```bash
supabase init
```

### 3. Correr Supabase localmente

```bash
supabase start
```

Esto inicia:
- PostgreSQL en `localhost:54322`
- API REST en `http://localhost:54321`
- Dashboard en `http://localhost:54323`

### 4. Cargar migraciones y seed

```bash
supabase migration up
supabase seed run
```

## Workflow de Desarrollo

### Crear nueva tabla

```bash
# 1. Crear migración
supabase migration new create_publications_table

# 2. Editar supabase/migrations/[timestamp]_create_publications_table.sql
# 3. Aplicar
supabase migration up
```

### Agregar RLS policy

1. Crear archivo en `supabase/policies/[table_name].rls.sql`
2. Aplicar en consola Postgres:
   ```bash
   psql postgresql://postgres:postgres@localhost:54322/postgres < supabase/policies/publications.rls.sql
   ```

### Crear Edge Function

```bash
supabase functions new verify-user

# Editar supabase/functions/verify-user/index.ts
# Probar localmente
supabase functions serve
```

## Deploy a Producción

### 1. Conectar a proyecto remoto

```bash
supabase link --project-ref project_id_aqui
```

### 2. Pushear migraciones

```bash
supabase push
```

### 3. Deploy Edge Functions

```bash
supabase functions deploy
```

## Testing Local

### Usar Supabase Test Client

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'http://localhost:54321',
  'eyJ...' // anon key de .env.example
);

// Ahora usar en tests
```

### Ejecutar Tests de Integración

```bash
npm run test:integration
```

## Estructura SQL

### Tabla de Ejemplo: users

```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies (en policies/users.rls.sql)
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);
```

## Mejores Prácticas

✅ **Versionado**: Todas las migraciones en `migrations/`  
✅ **RLS First**: Seguridad en la BD, no en la app  
✅ **Seed Local**: Datos de desarrollo en `seed.sql`  
✅ **Edge Functions**: Lógica complexa en el backend  
✅ **Testing**: Tests de integración con DB local  

⚠️ **NO**: Modificar BD desde dashboard en producción  
⚠️ **NO**: Credenciales reales en `.env` (usar variables de entorno del CI/CD)  
⚠️ **NO**: RLS policies solo en código de la app

## Recursos

- [Supabase CLI Docs](https://supabase.com/docs/guides/cli/local-development)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Testing con Supabase](https://supabase.com/docs/guides/api/testing)
