/**
 * App.jsx - Punto de entrada de la aplicación
 *
 */
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import {
  useAuthStore,
  selectIsInitialized,
} from "@/features/auth/store/authStore";
import Navbar from "@/components/layout/Navbar";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { PageLoader } from "@/components/ui/Spinner";
import ErrorBoundary from "@/components/ErrorBoundary";
import AccessibilityMenu from "@/components/layout/AccessibilityMenu";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";

// ── Carga eager: solo lo imprescindible para el primer render ──────────────
import HomePage from "@/pages/HomePage";

// ── Carga diferida: el resto de páginas se separan en chunks propios ───────
const LoginPage = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage = lazy(() => import("@/features/auth/pages/RegisterPage"));
const CallbackPage = lazy(() => import("@/features/auth/pages/CallbackPage"));
const ForgotPasswordPage = lazy(
  () => import("@/features/auth/pages/ForgotPasswordPage"),
);
const NewPasswordPage = lazy(
  () => import("@/features/auth/pages/NewPasswordPage"),
);
const ProfilePage = lazy(() => import("@/features/auth/pages/ProfilePage"));

const RoleRouter = lazy(() => import("@/router/RoleRouter"));
const AdminDashboard = lazy(
  () => import("@/features/dashboard/admin/AdminDashboard"),
);
const ModeratorDashboard = lazy(
  () => import("@/features/dashboard/moderator/ModeratorDashboard"),
);
const DealerDashboard = lazy(
  () => import("@/features/dashboard/dealer/DealerDashboard"),
);

const PublicationsPage = lazy(
  () => import("@/features/publications/pages/PublicationsPage"),
);
const CreatePublicationPage = lazy(
  () => import("@/features/publications/pages/CreatePublicationPage"),
);
const CreateStorePage = lazy(
  () => import("@/features/stores/pages/CreateStorePage"),
);

function NotFoundPage() {
  const { t } = useLanguage();
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
        {t.app.notFound}
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
        {t.app.backHome}
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
    <Suspense fallback={<PageLoader message="Cargando..." />}>
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
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute allowedRoles={["Admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/moderator"
          element={
            <ProtectedRoute allowedRoles={["Moderador", "Admin"]}>
              <ModeratorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/dealer"
          element={
            <ProtectedRoute allowedRoles={["Repartidor"]}>
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
    </Suspense>
  );
}

function AppShell() {
  const { t } = useLanguage();
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
      }}
    >
      <a href="#main-content" className="skip-link">
        {t.app.skipToContent}
      </a>

      {/* Navbar sticky en la parte superior */}
      <Navbar />

      {/* Main semántico que crece para llenar el espacio disponible */}
      <main
        id="main-content"
        tabIndex={-1}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "auto",
        }}
      >
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </main>

      <AccessibilityMenu />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AppShell />
      </LanguageProvider>
    </BrowserRouter>
  );
}
