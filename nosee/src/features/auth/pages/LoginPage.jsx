/**
 * LoginPage - Página de inicio de sesión
 *
 * Conecta LoginForm con authStore.login().
 * Redirige a la homepage pública "/" después del login exitoso.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, selectIsAuthenticated } from "@/features/auth/store/authStore";
import LoginForm from "@/features/auth/components/LoginForm";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, status, error, clearError } = useAuthStore((s) => ({
    login: s.login,
    status: s.status,
    error: s.error,
    clearError: s.clearError,
  }));
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  // Si ya estaba logueado, redirigir al inicio
  useEffect(() => {
    if (isAuthenticated) navigate("/", { replace: true });
  }, [isAuthenticated, navigate]); // eslint-disable-line

  const handleLogin = async (email, password) => {
    clearError();
    const result = await login(email, password);
    if (result.success) {
      navigate("/", { replace: true });
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
            Bienvenido de nuevo
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Compara precios con tu comunidad
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
            loading={status === "loading"}
            error={error}
          />
        </div>
      </div>
    </main>
  );
}
