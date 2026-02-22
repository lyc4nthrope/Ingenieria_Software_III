# Features

Módulos organizados por **procesos de negocio** (no por layer como MVC).

## Estructura General

Cada feature (auth, publications, orders, delivery) contiene:

```
features/
└── feature-name/
    ├── components/      # Componentes específicos del feature
    ├── hooks/           # Custom hooks para el feature
    ├── services/        # Lógica + llamadas a services/api/
    ├── store/           # Estado global (Zustand, Context, etc.)
    └── pages/           # Páginas/vistas del feature
```

## Features Actuales

### 1. **auth/** - Gestión de Usuario y Autenticación
- Registro, login, logout
- Perfil de usuario
- Recuperación de contraseña

### 2. **publications/** - Gestión de Publicaciones
- (Por implementar)

### 3. **orders/** - Gestión de Pedidos  
- (Por implementar)

### 4. **delivery/** - Gestión de Entregas
- (Por implementar)

## Ventajas de esta Estructura

✅ **Escalabilidad**: Agregar nuevos features es trivial  
✅ **Aislamiento**: Cada feature es independiente  
✅ **Mantenibilidad**: Todo en un lugar facilita refactorización  
✅ **Reusabilidad**: Si un feature se repite, es fácil de extraer
