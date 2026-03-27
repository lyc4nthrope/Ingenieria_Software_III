# Proposal: Proceso 4 — Servicio de Domicilio Completo

## Intent
El Proceso 4 (domicilios) existe en esqueleto pero no es funcional. Ningún usuario puede solicitar ser repartidor, los pedidos no tienen seguimiento en tiempo real, no hay flujo de pago, y el ciclo nunca cierra con calificación. Este cambio completa las 5 piezas faltantes para que el flujo funcione de extremo a extremo.

## Scope

### In Scope
- Onboarding de repartidor (solicitud desde ProfilePage → aprobación admin)
- DealerDashboard con 4 fases: aceptar → comprar → entregar → confirmar pago
- Seguimiento en tiempo real vía Supabase Realtime (estado del pedido)
- Flujo de pago: transferencia con comprobante (Cloudinary) o efectivo
- Banner persistente si repartidor no tiene cuentas bancarias configuradas
- Calificación del repartidor post-entrega
- Notificaciones in-app vía Supabase Realtime

### Out of Scope
- Pasarelas de pago externas (Wompi, PayU)
- Push notifications (FCM)
- Google Maps (se usa Leaflet existente)
- Chat entre usuario y repartidor
- Asignación automática de pedidos (repartidor elige manualmente)

## Approach
1. **Feature `dealer/`** — nueva feature screaming con onboarding, dashboard y componentes de fase
2. **Feature `delivery-tracking/`** — suscripción Realtime al estado del pedido, vista de seguimiento para el usuario
3. **Extensión `orders/`** — agregar flujo de pago (transferencia/efectivo) y calificación post-entrega
4. **Extensión `admin/`** — panel de aprobación de solicitudes de repartidor
5. **Services** — `dealer.api.js`, `delivery.api.js` en `src/services/api/`
6. **Supabase** — RLS policies para `dealer_bank_accounts`, nueva tabla `dealer_requests`, canal Realtime por pedido

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `src/features/dealer/` | Nuevo | Onboarding + DealerDashboard 4 fases |
| `src/features/delivery-tracking/` | Nuevo | Seguimiento en tiempo real para usuario |
| `src/features/orders/` | Modificado | Flujo de pago y calificación |
| `src/features/admin/` | Modificado | Aprobación solicitudes repartidor |
| `src/services/api/` | Nuevo | `dealer.api.js`, `delivery.api.js` |
| Supabase (tablas/RLS) | Modificado | `dealer_requests`, policies, Realtime |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Realtime de Supabase inestable en free tier | Media | Fallback polling cada 15s si canal se desconecta |
| Upload Cloudinary falla en comprobante de pago | Baja | Validación previa de imagen + retry con feedback |
| Repartidor no configura cuenta bancaria | Alta | Banner persistente + bloqueo de aceptar pedidos sin cuenta |

## Rollback Plan
Cada feature es aditiva. Revertir = eliminar rutas nuevas y features `dealer/` y `delivery-tracking/`. Las extensiones a `orders/` y `admin/` se revierten por commits individuales.

## Dependencies
- Supabase Realtime habilitado en el proyecto
- Cloudinary ya integrado (upload de imágenes)
- Tabla `dealer_bank_accounts` ya existe
- Leaflet ya integrado para mapas

## Success Criteria
- [ ] Un usuario puede solicitar rol de repartidor desde ProfilePage
- [ ] Admin puede aprobar/rechazar solicitudes en AdminDashboard
- [ ] Repartidor ve pedidos disponibles y los acepta en DealerDashboard
- [ ] DealerDashboard refleja las 4 fases del flujo completo
- [ ] Usuario ve estado del pedido en tiempo real (sin refresh)
- [ ] Flujo de pago por transferencia con comprobante funciona end-to-end
- [ ] Flujo de pago en efectivo con confirmación del repartidor funciona
- [ ] Banner de aviso aparece si repartidor no tiene cuenta bancaria
- [ ] Usuario puede calificar al repartidor tras la entrega
- [ ] Notificaciones in-app se reciben en cambios de estado
