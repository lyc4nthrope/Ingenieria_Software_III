# Proposal: Eliminar Paso 2 del checkout de domicilio

## Intent

El Paso 2 (`DeliveryMapStep`) es redundante: muestra una lista read-only de productos y un mapa full-screen fijo antes de confirmar, pero `PedidosTab` ya tiene una versión superior de ambos (mapa con realtime + tracking, lista interactiva con checkboxes y corrección de precios). Eliminar el Paso 2 reduce fricción en el flujo de confirmación y lleva al usuario directamente a la vista que realmente necesita.

## Scope

### In Scope
- Eliminar el componente `DeliveryMapStep` de `DeliveryCheckout.jsx`
- Eliminar el estado `step` del contenedor `DeliveryCheckout`
- El botón de `DeliveryDetailsStep` confirma directamente (ya no navega a Paso 2)
- Botón renombrado: "Siguiente paso →" → "🛵 Confirmar pedido"
- Indicador de pasos (stepIndicator) eliminado — ya no hay 2 pasos
- `saving` y `saveError` bajan como props a `DeliveryDetailsStep`
- Limpiar estilos dead code del Paso 2 (`mapListPanel`, `summaryCard`, `summaryRow`, `storeCard`, `storeHeader`, `storeName`, `storeSubtotal`, `prodList`, `prodItem`, `prodPrice`, `mapFooter`, `mapTotal`)

### Out of Scope
- Cambios a `PedidosTab.jsx`
- Cambios a `ShoppingListPage.jsx`
- Cambios al mapa (`OrderRouteMap`)
- Cambios al estado del store (`shoppingListStore.js`)

## Approach

1. En `DeliveryCheckout` (contenedor): eliminar `step` state, eliminar render condicional del Paso 2. `handleNext` renombrado a `handleConfirm` — valida campos y llama directamente a `handleConfirmOrder`. Pasar `saving` y `saveError` como props a `DeliveryDetailsStep`.
2. En `DeliveryDetailsStep`: eliminar `stepIndicator`. Renombrar botón. Mostrar spinner/disabled cuando `saving=true`. Mostrar `saveError` si existe.
3. Eliminar función `DeliveryMapStep` completa.
4. Limpiar objeto `s` de estilos huérfanos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `DeliveryCheckout.jsx` | Modificado | Eliminar DeliveryMapStep, estado step, dead styles |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| El usuario pierde vista del mapa antes de confirmar | Baja | El mapa en PedidosTab aparece inmediatamente post-confirmación con mejor UX |
| `saveError` no visible si la red falla al confirmar | Baja | Se pasa como prop y se renderiza en DeliveryDetailsStep igual que antes |

## Rollback Plan

`git revert` del commit. Sin dependencias externas ni migraciones.

## Success Criteria

- [ ] Al hacer clic en "Confirmar pedido" en Paso 1, el pedido se guarda y va directo a Mis Pedidos
- [ ] El Paso 2 (mapa full-screen fijo) ya no aparece en ningún momento
- [ ] El mapa de Mis Pedidos funciona igual que antes
- [ ] Errores de red se muestran en el Paso 1
- [ ] No hay dead code de `DeliveryMapStep` en el archivo
