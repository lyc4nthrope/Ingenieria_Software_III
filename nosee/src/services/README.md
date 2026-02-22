# Services

Capa de abstracción para comunicación con backends y servicios externos.

## Estructura

- **supabase.client.js** - Instancia única del cliente Supabase (singleton)
- **api/** - Funciones que definen el "contrato" con el backend
  - `auth.api.js` - Operaciones de autenticación (signUp, signIn, signOut, etc.)
  - `users.api.js` - Operaciones CRUD de usuarios en la BD
  - `index.js` - Exporta todas las APIs

## Propósito

Esta capa es **clave para migración futura**. Si necesitas cambiar de Supabase a otro backend:

1. Solo modificas los archivos en `services/api/*`
2. El resto del código no cambia
3. Los nombres de funciones siguen siendo los mismos

## Ejemplo de Uso

```javascript
// En components o hooks:
import { authApi, usersApi } from '@/services/api';

const result = await authApi.signIn(email, password);
const profile = await usersApi.getUserProfile(userId);
```

## Agregar Nuevas APIs

Cuando necesites integrar nuevos endpoints:

1. Crea `src/services/api/newfeature.api.js`
2. Define tus funciones siguiendo el patrón
3. Exporta en `src/services/api/index.js`
4. Úsalas desde tus features
