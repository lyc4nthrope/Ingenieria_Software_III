# Types

Tipos y interfaces compartidas entre toda la aplicación.

## Archivos

- **index.js** - Tipos globales, enums, y interfaces

## Tipos Principales

### AuthUser
Usuario autenticado en el sistema.

```javascript
{
  id: string (UUID),
  email: string,
  full_name: string | null,
  role: 'user' | 'admin',
  created_at: string (ISO 8601),
  updated_at: string (ISO 8601)
}
```

### AsyncState
Estado de operaciones asincrónicas.

```javascript
'idle' | 'loading' | 'success' | 'error'
```

### APIResponse
Respuesta estándar de API.

```javascript
{
  success: boolean,
  data: T (genérico),
  error: string | null
}
```

## Migración a TypeScript

Cuando decidas migrar a TypeScript completo:

1. Renombra `index.js` a `index.ts`
2. Define interfaces reales en lugar de comentarios
3. Usa en todos los servicios y componentes

```typescript
interface AuthUser {
  id: string;
  email: string;
  full_name: string | null;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}
```
