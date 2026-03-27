# Proposal: Rediseño del Paso 1 de DeliveryCheckout

## Intent

En el flujo de domicilio, el Paso 1 (`DeliveryDetailsStep`) tiene tres problemas de UX: el usuario no ve qué está pidiendo hasta el Paso 2, el ahorro calculado por el optimizador (`result.savings`, `result.savingsPct`) nunca se muestra, y el layout de 480px desperdicia espacio en desktop. Este cambio mejora la densidad informativa del Paso 1 sin alterar el flujo de 2 pasos ni las validaciones existentes.

## Scope

### In Scope
- Resumen colapsable del carrito (tiendas + productos + subtotales) encima del formulario de dirección
- Badge de ahorro estimado en la card de total usando `result.savings` y `result.savingsPct`
- Hint contextual debajo del campo de dirección explicando que las coordenadas GPS ya fueron capturadas
- Ampliar `maxWidth` de `stepWrap` de 480px a 560px

### Out of Scope
- Cambios al Paso 2 (DeliveryMapStep)
- Cambios al flujo de 2 pasos o al contenedor DeliveryCheckout
- Modificación de validaciones existentes (dirección, método de pago)
- Nuevos servicios API o tablas de base de datos
- Cambios a estilos globales o al design system

## Approach

1. **Resumen colapsable** — Nuevo bloque JSX dentro de `DeliveryDetailsStep`, entre el título y el campo de dirección. Itera `result.stores` (mismo patrón que `DeliveryMapStep` líneas 160–179) con un `useState` booleano para colapsar/expandir. Colapsado muestra solo conteo de tiendas y productos; expandido muestra detalle por tienda.
2. **Badge de ahorro** — Dentro de `totalCard`, renderizar condicionalmente (`result.savings > 0`) un span con el porcentaje y monto ahorrado. Patrón idéntico al de `PedidosTab.jsx` líneas 454–458.
3. **Hint de dirección** — Párrafo `<p>` con `fontSize: 11, color: var(--text-muted)` debajo del input. Texto: "Tu ubicación GPS ya fue registrada. La dirección es para que el repartidor la identifique fácilmente."
4. **maxWidth** — Cambiar 480 → 560 en `s.stepWrap`.

Todos los cambios son aditivos dentro de un solo archivo. No se crean componentes nuevos.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `DeliveryDetailsStep` en `DeliveryCheckout.jsx` | Modificado | Resumen colapsable, badge ahorro, hint, maxWidth |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `result.stores` vacío o undefined | Baja | Optional chaining, ya usado en Paso 2 |
| Resumen colapsable empuja el formulario fuera de viewport en mobile | Media | Iniciar colapsado por defecto; usar overflow si se expande |

## Rollback Plan

Revertir el único commit que modifica `DeliveryCheckout.jsx`. No hay dependencias externas ni migraciones.

## Dependencies

Ninguna nueva. `result.savings` y `result.savingsPct` ya se calculan y se pasan al componente.

## Success Criteria

- [ ] El Paso 1 muestra un resumen colapsable con tiendas y productos del carrito
- [ ] La card de total muestra el ahorro estimado cuando `result.savings > 0`
- [ ] El campo de dirección tiene un hint contextual visible
- [ ] El layout usa 560px de ancho máximo en desktop
- [ ] El flujo de 2 pasos y las validaciones no se ven afectados
