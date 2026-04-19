/**
 * LoginPage - Página de inicio de sesión
 *
 * Conecta LoginForm con authStore.login().
 * Redirige a la homepage pública "/" después del login exitoso.
 */
import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  useAuthStore,
  selectIsAuthenticated,
  selectIsInitialized,
  selectAuthStatus,
  selectAuthError,
} from "@/features/auth/store/authStore";
import LoginForm from "@/features/auth/components/LoginForm";
import { resendConfirmation } from "@/services/api/auth.api";
import { getRolePath } from "@/utils/roleUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  trackLoginAttempt,
  trackLoginSuccess,
  trackLoginFailure,
  trackLoginAbandon,
} from "@/services/analytics";
import {
  recordLoginAttempt,
  recordLoginPageView,
  recordLoginAbandon,
} from "@/services/metrics";

export default function LoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const clearError = useAuthStore((s) => s.clearError);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const status = useAuthStore(selectAuthStatus);
  const error = useAuthStore(selectAuthError);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitialized = useAuthStore(selectIsInitialized);
  const [lastEmailAttempt, setLastEmailAttempt] = useState("");

  // Ref para saber si el login se completó (evitar falsos abandonos)
  const loginCompleted = useRef(false);

  // Métrica: vista de pantalla + detección de abandono (RNF 4.3.5, meta: <5%)
  useEffect(() => {
    recordLoginPageView();
    return () => {
      if (!loginCompleted.current) {
        trackLoginAbandon();
        recordLoginAbandon();
      }
    };
  }, []);

  // Solo redirigir si ya terminó la inicialización y está logueado
  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      const user = useAuthStore.getState().user;
      const redirectTo = location.state?.from || getRolePath(user?.role);
      navigate(redirectTo, { replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate, location.state]);

  const handleLogin = async (email, password) => {
    clearError();
    setLastEmailAttempt(email);
    // Métrica: intento de login (GA4)
    trackLoginAttempt('email');
    const loginStart = Date.now();
    const result = await login(email, password);
    const durationMs = Date.now() - loginStart;
    if (result.success) {
      loginCompleted.current = true;
      // Métrica: latencia JWT + tasa de éxito (sección 3.4.1, meta: <800ms)
      trackLoginSuccess('email', durationMs);
      recordLoginAttempt('success', durationMs);
      const user = useAuthStore.getState().user;
      const redirectTo = location.state?.from || getRolePath(user?.role);
      navigate(redirectTo, { replace: true });
    } else {
      trackLoginFailure('email', result.error?.code ?? 'unknown');
      recordLoginAttempt('failure', durationMs);
    }
  };

  const handleResendConfirmation = async (email) => {
    await resendConfirmation(email);
  };

  const handleGoogleLogin = async () => {
    clearError();
    trackLoginAttempt('google');
    const loginStart = Date.now();
    const result = await loginWithGoogle();
    const durationMs = Date.now() - loginStart;
    if (result?.success) {
      loginCompleted.current = true;
      trackLoginSuccess('google', durationMs);
      recordLoginAttempt('success', durationMs);
    }
  };
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        minHeight: "calc(100vh - 60px)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          animation: "fadeIn 0.35s ease",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              fontSize: "32px",
              fontWeight: "800",
              letterSpacing: "-0.04em",
              color: "var(--accent)",
              marginBottom: "8px",
            }}
          >
            NØ<span style={{ color: "var(--text-secondary)" }}>SEE</span>
          </div>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "var(--text-primary)",
              marginBottom: "6px",
            }}
          >
            {t.loginPage.title}
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            {t.loginPage.subtitle}
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "28px",
          }}
        >
          <LoginForm
            onSubmit={handleLogin}
            onGoogleLogin={handleGoogleLogin}
            loading={status === "loading"}
            error={error}
            onResendConfirmation={handleResendConfirmation}
            emailForResend={lastEmailAttempt}
          />
        </div>
      </div>
    </main>
  );
}
