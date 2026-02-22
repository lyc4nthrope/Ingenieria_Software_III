# App

Componentes y configuración raíz de la aplicación.

## Archivos

- **App.jsx** - Componente raíz principal
- **router.jsx** - Definición de rutas con React Router
- **providers.jsx** - Providers globales (Auth, Theme, Query, etc.)

## Flujo

```
main.jsx
└── App.jsx
    ├── Providers
    │   ├── AuthProvider (cuando esté listo)
    │   ├── QueryClientProvider (React Query)
    │   └── ...otros providers
    └── Router
        └── Rutas por features (auth, publications, stores, delivery)
```
