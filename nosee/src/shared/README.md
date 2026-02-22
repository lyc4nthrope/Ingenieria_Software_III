# Shared

Servicios y utilidades compartidas entre features.

## Estructura

- **logger/** - Sistema de logging centralizado
- **errors/** - Manejo de errores y parsers de Supabase

## Logger

Centraliza todo logging para facilitar integración con servicios como Sentry.

```javascript
import { logger } from '@/shared/logger';

logger.info('Usuario logueado', { userId });
logger.error('Error de autenticación', error);
logger.warn('Operación lenta detectada');
logger.debug('Estado actual:', state);
```

### Integración con Sentry

Cuando quieras agregar Sentry:

```javascript
import * as Sentry from "@sentry/react";

// En logger/index.js extender la clase Logger
if (level === LogLevel.ERROR) {
  Sentry.captureException(new Error(message), { data });
}
```

## Error Handling

Parser inteligente de errores de Supabase.

```javascript
import { parseSupabaseError, isRLSError } from '@/shared/errors';

try {
  const result = await authApi.signIn(email, password);
} catch (error) {
  const appError = parseSupabaseError(error);
  console.log(appError.message); // Mensaje amigable
}
```

### Tipos de Error

- `AppError` - Error genérico
- `AuthError` - Errores de autenticación
- `ValidationError` - Errores de validación con detalles de campos

## Próximos Servicios Compartidos

- `cache/` - Gestión de caché
- `storage/` - Manejo de localStorage/sessionStorage
- `http/` - Interceptor HTTP para Supabase
- `analytics/` - Tracking de eventos
