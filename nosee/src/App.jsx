/**
 * App.jsx - Punto de entrada de la aplicación
 *
 * RUTAS CONFIGURADAS:
 * ┌─────────────────────────┬──────────────────────────┬───────────┐
 * │ Ruta                    │ Componente               │ Protegida │
 * ├─────────────────────────┼──────────────────────────┼───────────┤
 * │ /                       │ HomePage (RED SOCIAL)    │ ❌ No     │
 * │ /dashboard              │ RoleRouter               │ ✅ Sí     │
 * │ /perfil                 │ ProfilePage              │ ✅ Sí     │
 * │ /publicaciones          │ PublicationsPage         │ ✅ Sí     │
 * │ /publicaciones/nueva    │ PublicationForm          │ ✅ Sí     │
 * │ /dashboard/user         │ UserDashboard            │ ✅ Sí     │
 * │ /dashboard/admin        │ AdminDashboard           │ ✅ Sí     │
 * │ /dashboard/moderator    │ ModeratorDashboard       │ ✅ Sí     │
 * │ /dashboard/dealer       │ DealerDashboard          │ ✅ Sí     │
 * │ /login                  │ LoginPage                │ ❌ No     │
 * │ /registro               │ RegisterPage             │ ❌ No     │
 * │ /auth/callback          │ CallbackPage             │ ❌ No     │
 * │ /recuperar-contrasena   │ ForgotPasswordPage       │ ❌ No     │
 * │ /nueva-contrasena       │ NewPasswordPage          │ ❌ No     │
 * │ *                       │ NotFoundPage             │ ❌ No     │
 * └─────────────────────────┴──────────────────────────┴───────────┘
 *
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

// FIX 1: nombres de import alineados con los nombres reales de cada archivo
import RoleRouter from "@/router/RoleRouter";
import UserDashboard from "@/features/dashboard/user/UserDashboard";
import AdminDashboard from "@/features/dashboard/admin/AdminDashboard";
import ModeratorDashboard from "@/features/dashboard/moderator/ModeratorDashboard";
import DealerDashboard from "@/features/dashboard/dealer/DealerDashboard";

// Importar páginas de publicaciones
import PublicationsPage from "@/features/publications/pages/PublicationsPage";
import CreatePublicationPage from "@/features/publications/pages/CreatePublicationPage";
import CreateStorePage from "@/features/stores/pages/CreateStorePage";

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
    <Routes>
      {/* ── Rutas públicas ───────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/registro" element={<RegisterPage />} />
      <Route path="/auth/callback" element={<CallbackPage />} />
      <Route path="/recuperar-contrasena" element={<ForgotPasswordPage />} />
      <Route path="/nueva-contrasena" element={<NewPasswordPage />} />

      {/* ── Rutas protegidas ─────────────────────────────────── */}

      {/* HOMEPAGE PÚBLICA - Red Social */}
      <Route path="/" element={<HomePage />} />

      {/* Dashboard según rol - Protegido */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <RoleRouter />
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
            <PublicationsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/publicaciones/nueva"
        element={
          <ProtectedRoute>
            <CreatePublicationPage />
          </ProtectedRoute>
        }
      />

        <Route
        path="/tiendas/nueva"
        element={
          <ProtectedRoute>
            <CreateStorePage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tiendas"
        element={
          <ProtectedRoute>
            <CreateStorePage />
          </ProtectedRoute>
        }
      />

      {/* ── Dashboards por rol ───────────────────────────────── */}
      {/* Cada rol accede a su dashboard correspondiente */}
      <Route
        path="/dashboard/user"
        element={
          <ProtectedRoute>
            <UserDashboard />
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
        path="/dashboard/moderator"
        element={
          <ProtectedRoute>
            <ModeratorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/dealer"
        element={
          <ProtectedRoute>
            <DealerDashboard />
          </ProtectedRoute>
        }
      />

      {/*
        FIX 4: wildcard al final para que no capture las rutas de los dashboards.
        Antes estaba ANTES de los dashboards, bloqueándolos.
      */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* 
        ✅ SOLUCIÓN OPCIÓN 3
        
        Estructura del layout:
        ┌─────────────────────────────┐
        │      Navbar (sticky)        │ altura: 60px
        ├─────────────────────────────┤
        │                             │
        │   main (flex: 1)            │ ← Crece para llenar espacio
        │   └─ AppContent (Routes)    │
        │                             │
        └─────────────────────────────┘
        
        Ventajas:
        ✅ Sin superposición
        ✅ Navbar siempre visible al scroll
        ✅ Contenido respeta el espacio
        ✅ Semántica HTML correcta (<main>)
        ✅ Responsive automáticamente
      */}
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-base)",
        }}
      >
        {/* Navbar sticky en la parte superior */}
        <Navbar />

        {/* Main semántico que crece para llenar el espacio disponible */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "auto", // Permite scroll si el contenido es mayor
          }}
        >
          <AppContent />
        </main>
      </div>
    </BrowserRouter>
  );
}
