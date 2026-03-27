# Tasks: proceso4-natural — Proceso 4 Natural

## Phase 1: Infraestructura (Supabase + APIs)

- [ ] 1.1 Crear migración `nosee/supabase/migrations/20260326_dealer_applications.sql` con tabla `dealer_applications` (id, user_id, full_name, phone, motivation, status, reviewed_by, reviewed_at, created_at) + RLS policies
- [ ] 1.2 Crear migración `nosee/supabase/migrations/20260326_dealer_ratings.sql` con tabla `dealer_ratings` (id, order_id, dealer_id, user_id, stars INT, comment TEXT, created_at) + RLS policies
- [ ] 1.3 Crear migración `nosee/supabase/migrations/20260326_realtime_orders.sql` con `ALTER TABLE orders REPLICA IDENTITY FULL` y habilitar realtime en `dealer_locations`
- [ ] 1.4 Crear `nosee/src/services/api/dealerApplications.api.js` con `submitApplication`, `getMyApplication`, `reviewApplication`
- [ ] 1.5 Crear `nosee/src/services/api/dealerLocations.api.js` con `publishLocation(orderId, lat, lng)`
- [ ] 1.6 Crear `nosee/src/services/api/dealerRatings.api.js` con `submitRating(orderId, stars, comment)` y `getDealerRating(dealerId)`
- [ ] 1.7 Agregar a `nosee/src/services/api/orders.api.js`: `getAvailableOrders()`, `acceptOrder(orderId)`, `updateOrderStatus(id, status)`, `reportUnavailableProduct(orderId, productId, storeId)`
- [ ] 1.8 Exportar los 3 nuevos módulos api en `nosee/src/services/api/index.js`

## Phase 2: Onboarding Repartidor

- [ ] 2.1 Crear `nosee/src/features/auth/components/profile/DealerOnboardingCard.jsx` — tarjeta "¿Quieres ser repartidor?" con formulario (full_name, phone, motivation) y visualización de estado (pendiente/aprobado/rechazado)
- [ ] 2.2 Crear `nosee/src/features/auth/components/profile/dealerOnboardingStyles.js` con estilos inline para la tarjeta
- [ ] 2.3 Integrar `DealerOnboardingCard` en `nosee/src/features/auth/pages/ProfilePage.jsx` (visible solo si role != Repartidor)
- [ ] 2.4 Crear `nosee/src/features/dashboard/admin/tables/DealerApplicationsTable.jsx` — lista de solicitudes con botones Aprobar/Rechazar
- [ ] 2.5 Agregar pestaña "Solicitudes Repartidor" en `nosee/src/features/dashboard/admin/AdminDashboard.jsx` que renderice `DealerApplicationsTable`
- [ ] 2.6 Al aprobar: `reviewApplication` actualiza status + `updateUserRole(userId, 4)` en `users.api.js` + crear alerta vía `alerts.api.js`

## Phase 3: DealerDashboard — Fases 1 y 2 (Aceptar + Comprar)

- [ ] 3.1 Crear `nosee/src/features/dashboard/dealer/components/AvailableOrderCard.jsx` — card con productos, tiendas, dirección, valor y botón "Aceptar"
- [ ] 3.2 Crear `nosee/src/features/dashboard/dealer/components/ActiveOrderStepper.jsx` — stepper visual de las 4 fases del proceso
- [ ] 3.3 Crear `nosee/src/features/dashboard/dealer/components/StoreVisitPanel.jsx` — mapa Leaflet con pin de tienda, checklist de productos, botones "Llegué" y "Producto no disponible"
- [ ] 3.4 Crear `nosee/src/features/dashboard/dealer/dealerStyles.js` con estilos inline para todos los subcomponentes
- [ ] 3.5 Actualizar `nosee/src/features/dashboard/dealer/DealerDashboard.jsx`: integrar lista de pedidos disponibles y vista de pedido activo con `AvailableOrderCard`, `ActiveOrderStepper` y `StoreVisitPanel`

## Phase 4: DealerDashboard — Fases 3 y 4 (Entregar + Pago)

- [ ] 4.1 Agregar botón "Salir a entregar" en `ActiveOrderStepper` → llama `updateOrderStatus(id, 'in_transit')` e inicia publicación GPS periódica vía `publishLocation`
- [ ] 4.2 Agregar botón "Llegué a la dirección" → llama `updateOrderStatus(id, 'arrived')`
- [ ] 4.3 Crear `nosee/src/features/dashboard/dealer/components/PaymentConfirmationPanel.jsx` — muestra comprobante de transferencia (imagen) o botón "Confirmar efectivo" → `updateOrderStatus(id, 'delivered')`
- [ ] 4.4 Integrar banner persistente en `DealerDashboard.jsx` si repartidor no tiene cuentas bancarias registradas
- [ ] 4.5 Crear `nosee/src/features/shopping-list/components/PaymentUploadPanel.jsx` — muestra datos bancarios del repartidor + upload de comprobante (Cloudinary) + opción efectivo → estado `payment_pending_confirmation`

## Phase 5: Seguimiento en tiempo real (usuario)

- [ ] 5.1 En `nosee/src/features/shopping-list/components/PedidosTab.jsx`: agregar suscripción Supabase Realtime a cambios de estado del pedido activo del usuario
- [ ] 5.2 Crear `nosee/src/features/shopping-list/components/OrderStatusBadge.jsx` — badge con color según estado (pendiente, en_compra, in_transit, arrived, delivered)
- [ ] 5.3 Cuando estado = `in_transit`: mostrar mapa Leaflet con pin del repartidor suscrito a `dealer_locations` en tiempo real, dentro de `PedidosTab.jsx`
- [ ] 5.4 Integrar `PaymentUploadPanel` en `PedidosTab.jsx` cuando estado = `arrived`

## Phase 6: Calificación

- [ ] 6.1 Crear `nosee/src/features/shopping-list/components/RatingModal.jsx` — modal post-entrega con 1-5 estrellas y comentario opcional; llama `submitRating`
- [ ] 6.2 Activar `RatingModal` automáticamente en `PedidosTab.jsx` cuando estado cambia a `delivered` y aún no existe calificación
- [ ] 6.3 Mostrar calificación promedio del repartidor en el header de `DealerDashboard.jsx` via `getDealerRating`
