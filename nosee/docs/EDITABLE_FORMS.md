# Sistema de Edición Reutilizable para Publicaciones y Tiendas

## Resumen de Cambios

Se ha implementado un sistema de edición reutilizable para publicaciones y tiendas. Los formularios ahora soportan tanto la creación como la edición de registros mediante props configurables.

## Componentes Actualizados

### 1. **PublicationForm.jsx**
- **Props:**
  - `mode`: `'create'` (default) | `'edit'`
  - `publicationId`: string (requerido si mode='edit')
  - `onSuccess`: function (callback al completar)

- **Cambios:**
  - Carga datos existentes en modo edición
  - Muestra spinner mientras carga
  - Texto dinámico del botón (Publicar vs Actualizar)
  - Usa el nuevo hook `usePublicationCreation`

### 2. **StoreForm.jsx**
- **Props:**
  - `mode`: `'create'` (default) | `'edit'`
  - `storeId`: string (requerido si mode='edit')
  - `onSuccess`: function (callback al completar)

- **Cambios:**
  - Carga datos existentes en modo edición
  - Muestra spinner mientras carga
  - Texto dinámico del botón
  - Usa el hook `useStoreCreation` actualizado

## Nuevos Hooks

### `usePublicationCreation.js`
Maneja la lógica de creación y edición de publicaciones.

```javascript
const {
  formData,              // Datos del formulario
  errors,               // Errores de validación
  isSubmitting,         // Estado de envío
  submitError,          // Error de envío
  submitSuccess,        // Mensaje de éxito
  isLoading,           // Estado de carga inicial
  latitude, longitude,  // Geolocalización
  updateField,         // Actualizar un campo
  submit,              // Enviar formulario
} = usePublicationCreation({ publicationId, mode });
```

### `useStoreCreation.js` (Actualizado)
Se actualizó para soportar modo edición con los mismos principios.

## Nuevas Páginas

### `EditPublicationPage.jsx`
- Ruta: `/publicaciones/editar/:id`
- Envuelve `PublicationForm` en modo edición

### `EditStorePage.jsx`
- Ruta: `/tiendas/editar/:id`
- Envuelve `StoreForm` en modo edición

## Nuevas Rutas Registradas

```
GET  /publicaciones/nueva        → CreatePublicationPage
POST /publicaciones              → PublicationForm (crear)
GET  /publicaciones/editar/:id   → EditPublicationPage
PUT  /publicaciones/:id          → PublicationForm (editar)

GET  /tiendas/nueva              → CreateStorePage
POST /tiendas                    → StoreForm (crear)
GET  /tiendas/editar/:id         → EditStorePage
PUT  /tiendas/:id               → StoreForm (editar)
```

## Nuevas Funciones API

### `stores.api.js`
Se agregó la función `getStore(storeId)` para obtener los detalles de una tienda existente.

```javascript
export async function getStore(storeId) {
  // Retorna: { success, data: { id, name, type, address, latitude, longitude, websiteUrl } }
}
```

## Flujo de Uso

### Crear una Publicación
```jsx
<PublicationForm mode="create" onSuccess={handleSuccess} />
```

### Editar una Publicación
```jsx
<PublicationForm 
  mode="edit" 
  publicationId="123-abc" 
  onSuccess={() => navigate('/')} 
/>
```

### Crear una Tienda
```jsx
<StoreForm mode="create" onSuccess={handleSuccess} />
```

### Editar una Tienda
```jsx
<StoreForm 
  mode="edit" 
  storeId="456-def" 
  onSuccess={() => navigate(-1)} 
/>
```

## Validaciones

- En modo create: se requiere foto
- En modo edit: foto es opcional (no se revalidará si no cambia)
- Duplicados de tienda: solo se validan en modo create
- Ambos formularios validan campos obligatorios

## Beneficios

✅ **DRY Principle**: Un solo formulario para crear y editar
✅ **Mantenibilidad**: Cambios en validación/UI aplican a ambos modos
✅ **Consistencia**: UX idéntica en crear y editar
✅ **Escalabilidad**: Fácil agregar más funcionalidades (draft, preview, etc.)
✅ **Performance**: Reutilización de componentes y lógica

## Notas Técnicas

- Los hooks manejan internamente los llamados a APIs (create/update)
- Los formularios son agnósticos a la fuente de datos
- El loader spinner utiliza el componente `<Spinner />` existente
- Los estilos son reutilizados sin cambios
