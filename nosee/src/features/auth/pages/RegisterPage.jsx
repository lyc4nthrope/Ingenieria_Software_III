/**
 * RegisterPage - Página de registro de nuevo usuario
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, selectIsInitialized, selectAuthStatus, selectAuthError } from "@/features/auth/store/authStore";
import RegisterForm from "@/features/auth/components/RegisterForm";
import { resendConfirmation } from "@/services/api/auth.api";

// Vista de verificación de email
function VerificationView({ email, onResend }) {
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    await onResend(email);
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  };

  return (
    <div
      style={{
        textAlign: "center",
        padding: "16px 0",
        animation: "fadeIn 0.3s ease",
      }}
    >
      <div
        style={{
          width: "72px",
          height: "72px",
          background: "var(--accent-soft)",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 20px",
          fontSize: "28px",
        }}
      >
        ✉️
      </div>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: "700",
          marginBottom: "10px",
          color: "var(--text-primary)",
        }}
      >
        Verifica tu email
      </h2>
      <p
        style={{
          fontSize: "14px",
          color: "var(--text-secondary)",
          lineHeight: "1.6",
          marginBottom: "8px",
        }}
      >
        Enviamos un enlace de confirmación a:
      </p>
      <p
        style={{
          fontWeight: "600",
          color: "var(--accent)",
          marginBottom: "20px",
          fontSize: "15px",
        }}
      >
        {email}
      </p>
      <p
        style={{
          fontSize: "13px",
          color: "var(--text-muted)",
          lineHeight: "1.6",
          marginBottom: "20px",
        }}
      >
        Revisa tu bandeja de entrada y haz clic en el enlace para activar tu
        cuenta.
      </p>

      {/* Botón reenvío — genera token nuevo cada vez */}
      {resent ? (
        <p style={{ fontSize: "13px", color: "var(--success)" }}>
          ✓ Email reenviado. Revisa tu bandeja.
        </p>
      ) : (
        <button
          onClick={handleResend}
          disabled={resending}
          style={{
            background: "none",
            border: "1px solid var(--border-soft)",
            color: "var(--accent)",
            borderRadius: "var(--radius-md)",
            padding: "8px 18px",
            fontSize: "13px",
            cursor: resending ? "not-allowed" : "pointer",
            opacity: resending ? 0.6 : 1,
          }}
        >
          {resending ? "Reenviando..." : "¿No llegó? Reenviar email"}
        </button>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const clearError = useAuthStore((s) => s.clearError);
  const status = useAuthStore(selectAuthStatus);
  const error = useAuthStore(selectAuthError);
  const isAuthenticated = useAuthStore((s) => !!s.user && !!s.session);
  const isInitialized = useAuthStore(selectIsInitialized);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Solo redirigir si ya terminó la inicialización y está logueado
  useEffect(() => {
    if (isInitialized && isAuthenticated) navigate("/", { replace: true });
  }, [isInitialized, isAuthenticated, navigate]); // eslint-disable-line

  const handleRegister = async (email, password, metadata) => {
    clearError();
    const result = await register(email, password, metadata);
    if (result.success) {
      if (result.needsVerification) {
        setRegisteredEmail(email);
        setNeedsVerification(true);
      } else {
        navigate("/", { replace: true });
      }
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
          maxWidth: "480px",
          animation: "fadeIn 0.35s ease",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
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
            Crea tu cuenta
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
            Únete y empieza a comparar precios
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
          {needsVerification ? (
            <VerificationView
              email={registeredEmail}
              onResend={resendConfirmation}
            />
          ) : (
            <RegisterForm
              onSubmit={handleRegister}
              loading={status === "loading"}
              error={error}
            />
          )}
        </div>
      </div>
    </main>
  );
}
