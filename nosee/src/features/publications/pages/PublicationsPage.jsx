/**
 * PublicationsPage - Listado de publicaciones de precios
 *
 * Ruta: /publicaciones (protegida)
 * Ubicación: src/features/publications/pages/PublicationsPage.jsx
 *
 * Muestra el listado de publicaciones de precios con búsqueda y filtros.
 * Los usuarios pueden ver publicaciones de otros, validarlas y reportar abusos.
 *
 * Features:
 * - Búsqueda y filtrado avanzado
 * - Grid responsivo de publicaciones
 * - Estados de carga y vacío
 * - Botón para crear nuevas publicaciones
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";

// State Management
import { useAuthStore, selectAuthUser } from "@/features/auth/store/authStore";
import { useLanguage } from "@/contexts/LanguageContext";

// Componentes UI compartidos
import Button from "@/components/ui/Button";

// Componentes de publicaciones
import PriceSearchFilter from "@/features/publications/components/PriceSearchFilter";
import PublicationCard from "@/features/publications/components/PublicationCard";
import PublicationDetailModal from "@/features/publications/components/PublicationDetailModal";

import { usePublications } from "@/features/publications/hooks";
import * as publicationsApi from "@/services/api/publications.api";

// Iconos SVG inline
const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EmptyIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    opacity="0.6"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
  </svg>
);

/**
 * Componente principal: PublicationsPage
 * Maneja el listado, búsqueda y filtrado de publicaciones
 */
export default function PublicationsPage() {
  // ─────────────────────────────────────────────────────────────
  // PASO 1: Estado del usuario desde store
  // ─────────────────────────────────────────────────────────────
  const user = useAuthStore(selectAuthUser);
  const { t } = useLanguage();
  const tp = t.publications;

  // ─────────────────────────────────────────────────────────────
  // PASO 2: Hooks de navegación
  // ─────────────────────────────────────────────────────────────
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────
  // PASO 3: Estado local de la página
  // ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    productName: "",
    storeName: "",
    minPrice: null,
    maxPrice: null,
    maxDistance: null,
    sortBy: "recent",
  });
  const [error, setError] = useState(null);
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const {
    publications,
    loading,
    setFilters: setPublicationFilters,
    clearFilters,
    validatePublication,
    reportPublication,
    removePublication,
  } = usePublications(filters);

  const normalizedPublications = publications.map((publication) => ({
    ...publication,
    user: publication.user || publication.users || null,
    product: publication.product || publication.products || null,
    store: publication.store || publication.stores || null,
  }));

  // ─────────────────────────────────────────────────────────────
  // PASO 4: Funciones de manejo de eventos
  // ─────────────────────────────────────────────────────────────

  /**
   * Maneja clic en botón "Crear publicacion"
   * Redirige al formulario de crear publicación
   */
  const handlePublish = () => {
    if (!user?.isVerified) {
      setError(tp.verifyEmailError);
      return;
    }
    navigate("/publicaciones/nueva");
  };

  /**
   * Maneja cambios en la búsqueda
   */
  const handleSearch = (query) => {
    setSearchQuery(query);
    const newFilters = { ...filters, productName: query };
    setFilters(newFilters);
    setPublicationFilters({ productName: query });
  };

  /**
   * Maneja cambios en filtros.
   * Cuando cambia maxDistance, solicita geolocalización al navegador
   * para pasar lat/lng al hook y activar el filtro de distancia en la API.
   */
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    const distanceChanged = newFilters.maxDistance !== filters.maxDistance;

    if (newFilters.maxDistance && distanceChanged) {
      if (!navigator.geolocation) {
        setError("Tu navegador no soporta geolocalización. No se puede aplicar el filtro de distancia.");
        setPublicationFilters(newFilters);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          setPublicationFilters({
            ...newFilters,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        },
        () => {
          setError("No se pudo obtener tu ubicación. El filtro de distancia requiere permiso de ubicación en el navegador.");
          setPublicationFilters({ ...newFilters, latitude: null, longitude: null });
        },
      );
    } else if (!newFilters.maxDistance && filters.maxDistance) {
      // Se eliminó la distancia → limpiar coordenadas para no contaminar futuros filtros
      setPublicationFilters({ ...newFilters, latitude: null, longitude: null });
    } else {
      setPublicationFilters(newFilters);
    }
  };

  /**
   * Maneja validación de publicación
   */
  const handleValidatePublication = async (publicationId) => {
    const result = await validatePublication(publicationId);
    if (!result.success) {
      setError(result.error || tp.errorValidate);
    }
  };

  /**
   * Maneja reporte de publicación
   */
  const handleReportPublication = async (publicationId, reason) => {
    const result = await reportPublication(publicationId, reason, "");
    if (!result.success) {
      setError(result.error || tp.errorReport);
    }
  };

  /**
   * Maneja eliminación de publicación (solo si es autor)
   */
  const handleDeletePublication = async (publicationId) => {
    const result = await publicationsApi.deletePublication(publicationId);

    if (result.success) {
      removePublication(publicationId);
      return;
    }

    setError(result.error || tp.errorDelete);
  };

const handleViewMore = async (publicationId) => {
    setDetailLoading(true);
    setError(null);

    const result = await publicationsApi.getPublicationDetail(publicationId);
    if (!result.success) {
      setError(result.error || tp.errorDetail);
      setDetailLoading(false);
      return;
    }

    setSelectedPublication(result.data);
    setDetailLoading(false);
  };

  // ─────────────────────────────────────────────────────────────
  // PASO 5: Render - Estructura de la página
  // ─────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        flex: 1,
        padding: "28px 16px",
        maxWidth: "1200px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* ─────────── SECCIÓN: Encabezado ─────────── */}
      <section
        style={{
          marginBottom: "32px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
            marginBottom: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: "800",
                color: "var(--text-primary)",
                marginBottom: "8px",
                letterSpacing: "-0.02em",
              }}
            >
              {tp.title}
            </h1>
            <p
              style={{
                fontSize: "15px",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
              }}
            >
              {tp.subtitle}
            </p>
          </div>

          {/* Botón Crear publicacion */}
          <Button
            size="md"
            onClick={handlePublish}
            disabled={!user?.isVerified}
            title={!user?.isVerified ? tp.verifyEmailTitle : ""}
          >
            <PlusIcon style={{ marginRight: "6px" }} />
            {tp.createBtn}
          </Button>
        </div>

        {/* Aviso de email no verificado */}
        {!user?.isVerified && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(251,191,36,0.1)",
              border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: "var(--radius-md)",
              color: "#FBBF24",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {tp.verifyEmailWarning}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              padding: "12px 16px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-md)",
              color: "#EF4444",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}
      </section>

      {/* ─────────── SECCIÓN: Barra de búsqueda ─────────── */}
      <section
        style={{
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "14px 16px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <SearchIcon aria-hidden="true" />
          <input
            type="search"
            aria-label={tp.searchPlaceholder}
            placeholder={tp.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              color: "var(--text-primary)",
              fontSize: "14px",
              outline: "none",
              fontFamily: "inherit",
            }}
          />
        </div>
      </section>

      {/* ─────────── SECCIÓN: Filtros ─────────── */}
      <section
        style={{
          marginBottom: "32px",
        }}
      >
        <PriceSearchFilter
          filters={filters}
          onFiltersChange={handleFilterChange}
          onClearFilters={() => {
            setFilters({
              productName: "",
              storeName: "",
              minPrice: null,
              maxPrice: null,
              maxDistance: null,
              sortBy: "recent",
            });
            setSearchQuery("");
            clearFilters();
          }}
        />
      </section>

      {/* ─────────── SECCIÓN: Listado de publicaciones ─────────── */}
      <section>
        {loading && normalizedPublications.length === 0 ? (
          // Estado: Cargando (solo cuando no hay datos previos)
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 20px",
              color: "var(--text-muted)",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "3px solid rgba(56,189,248,0.15)",
                borderTop: "3px solid var(--accent, #38BDF8)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                marginBottom: "16px",
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: "14px" }}>{tp.loading}</p>
          </div>
        ) : !loading && normalizedPublications.length === 0 ? (
          // Estado: Vacío
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 20px",
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            <EmptyIcon />
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginTop: "16px",
                marginBottom: "8px",
              }}
            >
              {tp.noPublicationsTitle}
            </h2>
            <p
              style={{ fontSize: "14px", maxWidth: "320px", lineHeight: "1.6" }}
            >
              {tp.noPublicationsDesc}{" "}
              <button
                onClick={handlePublish}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontWeight: "600",
                  textDecoration: "underline",
                }}
              >
                {tp.beFirst}
              </button>
              .
            </p>
          </div>
        ) : (
          // Estado: Con publicaciones
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {normalizedPublications.map((publication) => (
              <PublicationCard
                key={publication.id}
                publication={publication}
                onValidate={handleValidatePublication}
                onReport={handleReportPublication}
                onDelete={handleDeletePublication}
                onViewMore={handleViewMore}
                isAuthor={user?.id === publication.user_id}
              />
            ))}
          </div>
        )}

        {/* Indicador de "Cargar más" (para infinite scroll futuro) */}
        {normalizedPublications.length > 0 && !loading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "32px",
              paddingTop: "32px",
              borderTop: "1px solid var(--border)",
            }}
          >
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                // En producción: loadMore()
                console.log("Cargar más publicaciones");
              }}
            >
              {tp.loadMore}
            </Button>
          </div>
        )}
      </section>

      {detailLoading && (
        <div style={{ marginTop: "16px", color: "var(--text-muted)", fontSize: "14px" }}>
          {tp.loadingDetail}
        </div>
      )}

      {selectedPublication && (
        <PublicationDetailModal
          publication={selectedPublication}
          onClose={() => setSelectedPublication(null)}
        />
      )}
    </main>
  );
}
