/**
 * HomePage - Red Social Pública (Feed estilo Instagram)
 *
 * Página principal pública donde usuarios autenticados y no autenticados
 * pueden ver publicaciones de precios en un feed vertical scrollable.
 * Solo usuarios autenticados pueden interactuar (publicar, validar, reportar).
 */
import { useNavigate } from "react-router-dom";
import { useAuthStore, selectAuthUser, selectIsAuthenticated } from "@/features/auth/store/authStore";
import Button from "@/components/ui/Button";

// Ícono para botón publicar
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// Ícono de corazón (validación)
const HeartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
);

// Ícono de comentario (reportar)
const MessageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

// Mock data - Publicaciones de ejemplo
const mockPublications = [
  {
    id: 1,
    author: "María García",
    avatar: "MG",
    productName: "Leche (1L)",
    price: 3200,
    store: "Éxito Centro",
    photo: "https://via.placeholder.com/400x500?text=Leche+1L",
    description: "Leche fresca, recién llegó al supermercado",
    likes: 24,
    reports: 0,
    timestamp: "Hace 2 horas",
    verified: true,
  },
  {
    id: 2,
    author: "Carlos López",
    avatar: "CL",
    productName: "Pan integral (500g)",
    price: 4500,
    store: "Carrefour",
    photo: "https://via.placeholder.com/400x500?text=Pan+integral",
    description: "Pan integral de buena calidad, recomendado",
    likes: 12,
    reports: 0,
    timestamp: "Hace 5 horas",
    verified: false,
  },
  {
    id: 3,
    author: "Laura Martínez",
    avatar: "LM",
    productName: "Huevos (Docena)",
    price: 5800,
    store: "Carrefour",
    photo: "https://via.placeholder.com/400x500?text=Huevos",
    description: "Huevos frescos, calidad A",
    likes: 34,
    reports: 1,
    timestamp: "Hace 12 horas",
    verified: true,
  },
];

// Componente PublicationCard
function PublicationCard({ pub, isAuthenticated, onLike, onReport }) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        marginBottom: "12px",
        animation: "fadeIn 0.3s ease",
      }}
    >
      {/* Header de la publicación */}
      <div style={{
        padding: "8px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: "var(--accent-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: "600",
          color: "var(--accent)",
          flexShrink: 0,
        }}>
          {pub.avatar}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {pub.author}
            </span>
            {pub.verified && <span style={{ fontSize: "11px", flexShrink: 0 }}>✓</span>}
          </div>
          <div style={{
            fontSize: "11px",
            color: "var(--text-muted)",
          }}>
            {pub.timestamp} • {pub.store}
          </div>
        </div>
      </div>

      {/* Foto */}
      <img
        src={pub.photo}
        alt={pub.productName}
        style={{
          width: "100%",
          aspectRatio: "1/1",
          objectFit: "cover",
        }}
      />

      {/* Acciones */}
      <div style={{
        padding: "8px 12px",
        display: "flex",
        gap: "12px",
        borderBottom: "1px solid var(--border)",
      }}>
        <button
          onClick={() => onLike && onLike(pub.id)}
          disabled={!isAuthenticated}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: "none",
            color: isAuthenticated ? "var(--accent)" : "var(--text-muted)",
            cursor: isAuthenticated ? "pointer" : "not-allowed",
            fontSize: "12px",
            fontWeight: "500",
            padding: 0,
            opacity: isAuthenticated ? 1 : 0.5,
          }}
        >
          <HeartIcon /> {pub.likes}
        </button>
        <button
          onClick={() => onReport && onReport(pub.id)}
          disabled={!isAuthenticated}
          title="Reportar publicación"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            background: "none",
            border: "none",
            color: isAuthenticated ? "var(--text-secondary)" : "var(--text-muted)",
            cursor: isAuthenticated ? "pointer" : "not-allowed",
            fontSize: "12px",
            padding: 0,
            opacity: isAuthenticated ? 0.7 : 0.5,
          }}
        >
          <MessageIcon /> Reportar
        </button>
      </div>

      {/* Info del producto */}
      <div style={{ padding: "8px 12px" }}>
        <div style={{
          fontSize: "14px",
          fontWeight: "600",
          color: "var(--text-primary)",
          marginBottom: "2px",
        }}>
          {pub.productName}
        </div>
        <div style={{
          fontSize: "13px",
          color: "var(--accent)",
          fontWeight: "600",
          marginBottom: "4px",
        }}>
          ${pub.price.toLocaleString()}
        </div>
        <div style={{
          fontSize: "12px",
          color: "var(--text-secondary)",
          lineHeight: "1.4",
        }}>
          {pub.description}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const user = useAuthStore(selectAuthUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const navigate = useNavigate();

  const handlePublish = () => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    navigate("/publicaciones/nueva");
  };

  const handleLike = (pubId) => {
    console.log("Liked publication:", pubId);
  };

  const handleReport = (pubId) => {
    console.log("Reported publication:", pubId);
  };

  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        overflow: "auto",
      }}
    >
      {/* Aviso de email verification (solo para autenticados sin verificar) */}
      {isAuthenticated && !user?.isVerified && (
        <div style={{
          position: "relative",
          zIndex: 45,
          margin: "0",
          padding: "8px 12px",
          borderRadius: "0",
          background: "rgba(251,191,36,0.1)",
          border: "none",
          borderBottom: "1px solid rgba(251,191,36,0.3)",
          color: "#FBBF24",
          fontSize: "12px",
          display: "flex",
          alignItems: "flex-start",
          gap: "6px",
        }}>
          <span style={{ flexShrink: 0 }}>⚠️</span>
          <div>
            <strong style={{ fontSize: "11px" }}>Email no verificado</strong>
            <div style={{ fontSize: "11px", marginTop: "1px" }}>
              Confirma tu email para publicar precios
            </div>
          </div>
        </div>
      )}

      {/* Feed de publicaciones */}
      <div style={{
        flex: 1,
        maxWidth: "600px",
        margin: "0 auto",
        width: "100%",
        padding: "8px",
        overflowY: "auto",
      }}>
        {mockPublications.length > 0 ? (
          <>
            {mockPublications.map((pub) => (
              <PublicationCard
                key={pub.id}
                pub={pub}
                isAuthenticated={isAuthenticated}
                onLike={handleLike}
                onReport={handleReport}
              />
            ))}
            {/* Fin del feed */}
            <div style={{
              textAlign: "center",
              padding: "24px 8px",
              color: "var(--text-muted)",
              fontSize: "12px",
            }}>
              <div style={{ fontSize: "24px", marginBottom: "6px" }}>🎉</div>
              <p style={{ margin: 0 }}>Has visto todas las publicaciones</p>
              {!isAuthenticated && (
                <>
                  <div style={{ marginTop: "12px" }}>
                    <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                      Inicia sesión para publicar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div style={{
            textAlign: "center",
            padding: "40px 8px",
            color: "var(--text-muted)",
          }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
            <h2 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
              No hay publicaciones aún
            </h2>
            <p style={{ fontSize: "12px", marginBottom: "12px" }}>
              {isAuthenticated ? "¡Sé el primero en publicar un precio!" : "Inicia sesión para ver y compartir precios"}
            </p>
            {isAuthenticated && (
              <Button onClick={handlePublish}>
                <PlusIcon /> Publicar precio
              </Button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}