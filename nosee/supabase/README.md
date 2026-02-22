# Supabase

Configuración local de Supabase para desarrollo.

## Estructura

- **migrations/** - Migraciones SQL versionadas (evita conflictos)
- **functions/** - Edge Functions (serverless functions de Supabase)
- **seed.sql** - Datos iniciales (tablas, RLS policies, seed data)

## Uso

### Ejecutar migraciones locales

```bash
supabase migration new create_users_table
```

### Definir Edge Functions

```bash
supabase functions new verify-user
```

### Aplicar seed data

```bash
supabase migration up
```

> 📌 **Nota**: La configuración real de Supabase está en el dashboard de Supabase
