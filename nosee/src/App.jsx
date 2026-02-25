/**
 * App.jsx - Punto de entrada de la aplicación
 *
 * RUTAS CONFIGURADAS:
 * ┌─────────────────────────┬──────────────────────────┬───────────┐
 * │ Ruta                    │ Componente               │ Protegida │
 * ├─────────────────────────┼──────────────────────────┼───────────┤
 * │ /                       │ HomePage                 │ ✅ Sí     │
 * │ /perfil                 │ ProfilePage              │ ✅ Sí     │
 * │ /publicaciones          │ HomePage                 │ ✅ Sí     │
 * │ /login                  │ LoginPage                │ ❌ No     │
 * │ /registro               │ RegisterPage             │ ❌ No     │
 * │ /auth/callback          │ CallbackPage             │ ❌ No     │
 * │ /recuperar-contrasena   │ ForgotPasswordPage       │ ❌ No     │
 * │ /nueva-contrasena       │ NewPasswordPage          │ ❌ No     │
 * │ *                       │ NotFoundPage             │ ❌ No     │
 * └─────────────────────────┴──────────────────────────┴───────────┘
 */
import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import {
  useAuthStore,
  selectIsInitialized,
} from "@/features/auth/store/authStore";
import Navbar from "@/components/layout/Navbar";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { PageLoader } from "@/components/ui/Spinner";

import LoginPage from "@/features/auth/pages/LoginPage";
import RegisterPage from "@/features/auth/pages/RegisterPage";
import CallbackPage from "@/features/auth/pages/CallbackPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import NewPasswordPage from "@/features/auth/pages/NewPasswordPage";
import HomePage from "@/pages/HomePage";
import ProfilePage from "@/features/auth/pages/ProfilePage";
import RoleRouter from "@/router/RoleRouter";
import UsuarioDashboard from "@/features/dashboard/usuario/UsuarioDashboard";
import AdminDashboard from "@/features/dashboard/admin/AdminDashboard";
import ModeradorDashboard from "@/features/dashboard/moderador/ModeradorDashboard";
import RepartidorDashboard from "@/features/dashboard/repartidor/RepartidorDashboard";

function NotFoundPage() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
        gap: "16px",
      }}
    >
      <div style={{ fontSize: "72px", lineHeight: 1 }}>🔍</div>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: "800",
          color: "var(--text-primary)",
        }}
      >
        404
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>
        Página no encontrada
      </p>
      <a
        href="/"
        style={{
          padding: "8px 20px",
          background: "var(--accent-soft)",
          color: "var(--accent)",
          borderRadius: "var(--radius-md)",
          fontSize: "14px",
          fontWeight: "500",
          textDecoration: "none",
        }}
      >
        Volver al inicio
      </a>
    </main>
  );
}

function AppContent() {
  const { initialize } = useAuthStore();
  const isInitialized = useAuthStore(selectIsInitialized);

  useEffect(() => {
    initialize();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isInitialized) {
    return <PageLoader message="Iniciando aplicación..." />;
  }

  return (
    <div
      style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
    >
      <Navbar />
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/auth/callback" element={<CallbackPage />} />
        <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
        <Route path="/nueva-contrasena" element={<NewPasswordPage />} />

        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/publicaciones"
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFoundPage />} />

        {/* Raíz protegida: detecta rol y redirige */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleRouter />
            </ProtectedRoute>
          }
        />

        {/* Dashboards */}
        <Route
          path="/dashboard/usuario"
          element={
            <ProtectedRoute>
              <UsuarioDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/moderador"
          element={
            <ProtectedRoute>
              <ModeradorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/repartidor"
          element={
            <ProtectedRoute>
              <RepartidorDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
