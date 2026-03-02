# NØSEE — Documento de Verificación y Regresión

> Actualizado: 2026-03-01
> Método: ESLint + Vitest + Playwright E2E + revisión manual
> Estado general: **APROBADO**

---

## 1. Verificación estática

| Comando          | Resultado |
|------------------|-----------|
| `npm run lint`   | ✅ Sin errores |
| `npm run build`  | ✅ OK — chunks separados por `manualChunks` |

**Chunks de producción esperados tras code splitting:**

| Chunk             | Contenido |
|-------------------|-----------|
| `vendor-react`    | react, react-dom, react-router-dom |
| `vendor-supabase` | @supabase/supabase-js |
| `vendor-state`    | zustand |
| `index` (principal) | App.jsx + componentes eager (HomePage, Navbar, ProtectedRoute) |
| Por ruta (lazy)   | LoginPage, RegisterPage, Dashboards, PublicationsPage, etc. |

---

## 2. Pruebas unitarias (Vitest)

```bash
npm run test -- --run
```

| Resultado | Detalle |
|-----------|---------|
| ✅ 64/64  | Sin regresiones |

---

## 3. Pruebas E2E (Playwright)

```bash
# Primera vez (instalar navegador):
npx playwright install chromium

# Correr specs:
npm run test:e2e

# Modo visual:
npm run test:e2e:ui
```

### Variables de entorno requeridas (`.env.test`)

```
VITE_TEST_EMAIL=test@nosee.com
VITE_TEST_PASSWORD=Test1234!
```

### Specs implementados

| Archivo | Casos cubiertos |
|---------|-----------------|
| `tests/e2e/auth.spec.js` | Redirección sin sesión, login inválido, login exitoso, logout, recuperación de contraseña |
| `tests/e2e/publications.spec.js` | Homepage pública, botones deshabilitados sin auth, crear publicación con/sin sesión, filtros |
| `tests/e2e/roles.spec.js` | Dashboards por rol redirigen sin sesión, 404, callback sin hash |

---

## 4. Flujos críticos verificados manualmente

### Proceso 1 — Autenticación y Perfiles

| Flujo | Estado |
|-------|--------|
| Registro + verificación de email | ✅ |
| Login email/contraseña con is_active | ✅ |
| Login con Google (OAuth) | ✅ |
| Recuperación de contraseña (link + nueva contraseña) | ✅ |
| Perfil: ver stats reales (publicaciones, validaciones, reputación) | ✅ |
| Perfil: actualizar nombre y foto (Cloudinary upload) | ✅ |
| Redirección por rol al dashboard correspondiente | ✅ |
| Cuenta desactivada bloqueada en login | ✅ |
| Verificación de email requerida para publicar | ✅ |

### Proceso 2 — Publicaciones

| Flujo | Estado |
|-------|--------|
| Crear publicación (foto + producto + tienda + ubicación) | ✅ |
| Detección de duplicados 24h | ✅ |
| Validar (upvote) y quitar voto en HomePage | ✅ |
| Reportar publicación con modal (4 tipos) | ✅ |
| Eliminar publicación (solo autor) | ✅ |
| Filtros de búsqueda (producto, tienda, precio, distancia, orden) | ✅ |
| Moderador: ver reportes reales, eliminar publicación, banear usuario, descartar | ✅ |
| Creación de tienda: mapa, geocodificación, evidencias | ✅ |

---

## 5. Alineación ISO/IEC 25010

| Característica | Nivel | Notas |
|----------------|-------|-------|
| Adecuación funcional | Alto | Procesos 1 y 2 completos |
| Eficiencia de desempeño | Medio-Alto | Code splitting implementado; bundle principal reducido |
| Compatibilidad | Medio | No validado cross-browser formalmente |
| Usabilidad | Medio-Alto | Flujos UI consistentes, mensajes de error claros |
| Fiabilidad | Alto | Auth robusta, sin regresiones en tests unitarios |
| Seguridad | Alto | RLS en Supabase, ProtectedRoute por rol, is_active check |
| Mantenibilidad | Alto | Modularidad por features, E2E integrado al runner |
| Portabilidad | Medio | Vite/React portable; sin validación multi-entorno formal |

---

## 6. Acciones pendientes para elevar madurez

| Prioridad | Acción |
|-----------|--------|
| Media | Validación cross-browser (Firefox, Safari) con Playwright multi-proyecto |
| Media | Añadir credenciales de prueba en CI secrets y correr `test:e2e` en pipeline |
| Baja | Monitoreo de bundle size con `vite-bundle-visualizer` |
