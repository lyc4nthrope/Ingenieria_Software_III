/**
 * HomePage - Dashboard principal (placeholder)
 *
 * Aquí irán las publicaciones de precios en Sprint 2.
 * Por ahora muestra la bienvenida al usuario autenticado.
 */
import { Link } from "react-router-dom";
import { useAuthStore, selectAuthUser } from "@/features/auth/store/authStore";
import Button from "@/components/ui/Button";

const TagIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const UsersIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

const ShieldIcon = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const features = [
  {
    icon: <TagIcon />,
    title: "Publica precios",
    desc: "Comparte precios de productos con foto como evidencia.",
  },
  {
    icon: <UsersIcon />,
    title: "Valida con la comunidad",
    desc: "La comunidad valida y reporta publicaciones en tiempo real.",
  },
  {
    icon: <ShieldIcon />,
    title: "Datos confiables",
    desc: "Sistema de reputación asegura información precisa.",
  },
];

export default function HomePage() {
  const user = useAuthStore(selectAuthUser);
  const firstName = user?.fullName?.split(" ")[0] || "Hola";

  return (
    <main
      style={{
        flex: 1,
        padding: "28px 16px",
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Saludo */}
      <section
        style={{
          background:
            "linear-gradient(135deg, rgba(56,189,248,0.08) 0%, rgba(14,165,233,0.03) 100%)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "28px",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "26px",
            fontWeight: "800",
            color: "var(--text-primary)",
            marginBottom: "8px",
            letterSpacing: "-0.02em",
          }}
        >
          ¡Hola, {firstName}! 👋
        </h1>
        <p
          style={{
            fontSize: "15px",
            color: "var(--text-secondary)",
            lineHeight: "1.6",
            marginBottom: "20px",
          }}
        >
          Bienvenido a NØSEE. La plataforma colaborativa de comparación de
          precios de la{" "}
          <span style={{ color: "var(--accent)", fontWeight: "600" }}>
            Universidad del Quindío
          </span>
          .
        </p>
        {/* Aviso si no verificó email */}
        {!user?.isVerified && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: "var(--radius-md)",
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.3)",
              color: "#FBBF24",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            ⚠️ Confirma tu email para poder publicar precios. Revisa tu bandeja
            de entrada.
          </div>
        )}

        <Button size="md" disabled={!user?.isVerified} onClick={() => {}}>
          + Publicar precio
        </Button>
      </section>

      {/* Feature cards */}
      <section>
        <h2
          style={{
            fontSize: "14px",
            fontWeight: "600",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: "14px",
          }}
        >
          ¿Qué puedes hacer?
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "12px",
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-lg)",
                padding: "20px",
                transition: "border-color 0.18s ease",
              }}
            >
              <div style={{ color: "var(--accent)", marginBottom: "12px" }}>
                {f.icon}
              </div>
              <h3
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  marginBottom: "6px",
                  color: "var(--text-primary)",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  lineHeight: "1.5",
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Sprint 2 placeholder */}
      <div
        style={{
          marginTop: "24px",
          padding: "20px",
          borderRadius: "var(--radius-lg)",
          background: "var(--bg-surface)",
          border: "1px dashed var(--border-soft)",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "13px",
        }}
      >
        📋 Las publicaciones de precios se mostrarán aquí en el Sprint 2
      </div>
    </main>
  );
}
