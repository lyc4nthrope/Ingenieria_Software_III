# Features

Módulos organizados por **procesos de negocio** (Screaming Architecture — no por layer como MVC).

## Estructura General

Cada feature contiene:

```
features/
└── feature-name/
    ├── components/      # Componentes UI específicos del feature
    ├── hooks/           # Custom hooks (datos + mutaciones)
    ├── pages/           # Páginas/vistas del feature
    ├── schemas/         # Validación de formularios (donde aplica)
    └── store/           # Estado global Zustand (donde aplica)
```

## Features Actuales

### 1. **auth/** — Autenticación y perfil de usuario
- Login / registro / logout con Supabase Auth (PKCE)
- Perfil de usuario, cambio de contraseña
- Store: `authStore.js` (Zustand) con StrictMode guard y recovery mode

### 2. **publications/** — Publicaciones de precios
- Listado con filtros, paginación infinita, distancia geográfica
- Crear / editar / eliminar publicaciones (soft y hard delete)
- Votos (upvote/downvote/unvote) con optimistic updates
- Reportes con evidencia fotográfica
- Hooks: `usePublications` (datos) + `usePublicationMutations` (mutaciones)
- API: `publications.api.js` (CRUD) + `publications.ranking.js` + `publications.moderation.js`

### 3. **stores/** — Tiendas
- Listado con búsqueda y mapa interactivo (bottom sheet)
- Crear / editar tiendas con geolocalización
- Hook: `useStoresList` con infinite scroll y deduplicación

### 4. **shopping-list/** — Lista de compras
- Agregar / quitar / limpiar productos de la lista
- Persistencia local con `withAutosave` middleware (localStorage)

### 5. **dashboard/** — Panel de administración
- Gestión de usuarios, publicaciones y reportes
- Acceso restringido a role_id = 3 (Admin)

### 6. **chat/** — Asistente IA
- Chat con contexto de productos y precios

### 7. **orders/** — Órdenes
- (En desarrollo)

## Ventajas de esta Estructura

- **Escalabilidad**: agregar un feature nuevo no toca los existentes
- **Aislamiento**: cada feature es independiente — sus hooks, store y componentes viven juntos
- **Mantenibilidad**: todo lo relacionado a un proceso de negocio está en un solo lugar
- **Separación de responsabilidades**: hooks de datos separados de hooks de mutaciones
