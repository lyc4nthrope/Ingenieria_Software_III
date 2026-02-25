/**
 * App.jsx  (fragmento — sección de rutas)
 *
 * Agrega estas rutas a tu árbol de Routes existente.
 * Asegúrate de importar RoleRouter y los 4 dashboards.
 *
 * UBICACIÓN: src/App.jsx
 *
 * ─────────────────────────────────────────────────────────────────
 * IMPORTS que necesitas agregar al principio del archivo:
 * ─────────────────────────────────────────────────────────────────
 *
 *   import RoleRouter                  from '@/router/RoleRouter';
 *   import UsuarioDashboard            from '@/features/dashboard/usuario/UsuarioDashboard';
 *   import AdminDashboard              from '@/features/dashboard/admin/AdminDashboard';
 *   import ModeradorDashboard          from '@/features/dashboard/moderador/ModeradorDashboard';
 *   import RepartidorDashboard         from '@/features/dashboard/repartidor/RepartidorDashboard';
 *
 * ─────────────────────────────────────────────────────────────────
 * RUTAS que necesitas agregar dentro de <Routes>:
 * ─────────────────────────────────────────────────────────────────
 *
 *   {/* Ruta raíz protegida: RoleRouter detecta el rol y redirige *\/}
 *   <Route
 *     path="/"
 *     element={
 *       <ProtectedRoute>
 *         <RoleRouter />
 *       </ProtectedRoute>
 *     }
 *   />
 *
 *   {/* Dashboards por rol *\/}
 *   <Route
 *     path="/dashboard/usuario"
 *     element={
 *       <ProtectedRoute allowedRoles={['Usuario']}>
 *         <UsuarioDashboard />
 *       </ProtectedRoute>
 *     }
 *   />
 *   <Route
 *     path="/dashboard/moderador"
 *     element={
 *       <ProtectedRoute allowedRoles={['Moderador', 'Admin']}>
 *         <ModeradorDashboard />
 *       </ProtectedRoute>
 *     }
 *   />
 *   <Route
 *     path="/dashboard/admin"
 *     element={
 *       <ProtectedRoute allowedRoles={['Admin']}>
 *         <AdminDashboard />
 *       </ProtectedRoute>
 *     }
 *   />
 *   <Route
 *     path="/dashboard/repartidor"
 *     element={
 *       <ProtectedRoute allowedRoles={['Repartidor']}>
 *         <RepartidorDashboard />
 *       </ProtectedRoute>
 *     }
 *   />
 *
 * ─────────────────────────────────────────────────────────────────
 * NOTA sobre ProtectedRoute y allowedRoles:
 * ─────────────────────────────────────────────────────────────────
 * Si tu ProtectedRoute aún no soporta `allowedRoles`, no te preocupes:
 * puedes omitir esa prop por ahora — simplemente protegen contra
 * usuarios no logueados. La seguridad por rol ya la maneja RLS en Supabase.
 * ─────────────────────────────────────────────────────────────────
 */

// Este archivo es solo documentación/referencia.
// Aplica los cambios directamente en tu src/App.jsx existente.