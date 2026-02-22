# Tests

Estructura de tests para la aplicación.

## Carpetas

- **unit/** - Tests unitarios (funciones puras, mappers, validaciones)
- **integration/** - Tests de integración (API + Supabase local)
- **e2e/** - Tests end-to-end (flujos completos en navegador)

## Comenzar

### 1. Instalar dependencias

```bash
npm install --save-dev vitest @vitest/ui
npm install --save-dev @playwright/test  # Para E2E
```

### 2. Configurar vitest.config.js

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

### 3. Scripts en package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:integration": "vitest run tests/integration",
    "test:e2e": "playwright test"
  }
}
```

### 4. Ejecutar tests

```bash
npm test                  # Watch mode
npm test:ui             # UI dashboard
npm test:integration    # Solo integración
npm test:e2e           # End-to-end
```

## Estrategia

1. **Unit** - Valida lógica pura (mappers, validators)
2. **Integration** - Valida flujos con Supabase local
3. **E2E** - Valida experiencia de usuario completa

## Cobertura mínima

- ✅ Auth: signUp, signIn, signOut
- ✅ RLS: Verificar restricciones de acceso
- ✅ Error handling: Mapeo de errores Supabase
