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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

// State Management
import { useAuthStore, selectAuthUser } from "@/features/auth/store/authStore";
import { isAdmin } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

// Componentes UI compartidos
import Button from "@/components/ui/Button";

// Componentes de publicaciones
import PriceSearchFilter from "@/features/publications/components/PriceSearchFilter";
import PublicationCard from "@/features/publications/components/PublicationCard";
import PublicationDetailModal from "@/features/publications/components/PublicationDetailModal";

import { usePublications } from "@/features/publications/hooks";
import * as publicationsApi from "@/services/api/publications.api";
import { INFINITE_SCROLL_CONFIG } from "@/config/infiniteScroll";
import { useInfiniteScrollTrigger } from "@/hooks/useInfiniteScrollTrigger";

// Iconos SVG inline
const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
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
  const [searchParams, setSearchParams] = useSearchParams();

  // ─────────────────────────────────────────────────────────────
  // PASO 3: Estado local de la página
  // ─────────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    productId: null,
    productName: "",
    storeName: "",
    categoryId: null,
    minPrice: null,
    maxPrice: null,
    maxDistance: null,
    sortBy: "recent",
    limit: INFINITE_SCROLL_CONFIG.publicationsPageSize,
  });
  const [error, setError] = useState(null);
  const [geolocationLoading, setGeolocationLoading] = useState(false);
  const cachedLocationRef = useRef(null);
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [categories, setCategories] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchBoxRef = useRef(null);

  const {
    publications,
    loading,
    hasMore,
    loadMore,
    setFilters: setPublicationFilters,
    clearFilters,
    validatePublication,
    downvotePublication,
    unvotePublication,
    reportPublication,
    removePublication,
  } = usePublications(filters);

  const normalizedPublications = useMemo(
    () => publications.map((publication) => ({
      ...publication,
      user: publication.user || publication.users || null,
      product: publication.product || publication.products || null,
      store: publication.store || publication.stores || null,
    })),
    [publications]
  );

  useInfiniteScrollTrigger({
    hasMore,
    loading,
    onLoadMore: loadMore,
    triggerDistancePx: INFINITE_SCROLL_CONFIG.triggerDistancePx,
    cooldownMs: INFINITE_SCROLL_CONFIG.cooldownMs,
  });

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
    setFilters((prev) => {
      const merged = { ...prev, productId: null, productName: query };
      setPublicationFilters({
        ...merged,
        sortBy: query?.trim() ? "best_match" : (merged.sortBy || "recent"),
      });
      return merged;
    });
  };

  /**
   * Maneja cambios en filtros.
   * Cuando cambia maxDistance, solicita geolocalización al navegador
   * para pasar lat/lng al hook y activar el filtro de distancia en la API.
   * Cachea la ubicación para no re-solicitarla en cada cambio de filtro.
   */
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);

    const shouldUseBestMatch = String(newFilters.sortBy || '') === 'best_match';

    const requestGeolocationAndApply = () => {
      if (!navigator.geolocation) {
        setError("Tu navegador no soporta geolocalización. No se puede aplicar el filtro de distancia.");
        setPublicationFilters({ ...newFilters, latitude: null, longitude: null });
        return;
      }

      setGeolocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          cachedLocationRef.current = { latitude: coords.latitude, longitude: coords.longitude };
          setGeolocationLoading(false);
          setPublicationFilters({
            ...newFilters,
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        },
        () => {
          setGeolocationLoading(false);
          setError("No se pudo obtener tu ubicación. El filtro de distancia requiere permiso de ubicación en el navegador.");
          setPublicationFilters({ ...newFilters, latitude: null, longitude: null });
        },
        { timeout: 10000 },
      );
    };

    if (newFilters.maxDistance) {
      if (cachedLocationRef.current) {
        setPublicationFilters({
          ...newFilters,
          latitude: cachedLocationRef.current.latitude,
          longitude: cachedLocationRef.current.longitude,
        });
      } else if (!geolocationLoading) {
        // Reintenta cada vez que haya filtro de distancia sin coordenadas cacheadas.
        requestGeolocationAndApply();
      } else {
        // Mientras se obtiene ubicación, mantener el resto de filtros.
        setPublicationFilters({ ...newFilters });
      }
    } else if (!newFilters.maxDistance && filters.maxDistance) {
      cachedLocationRef.current = null;
      setPublicationFilters({ ...newFilters, latitude: null, longitude: null });
    } else {
      if (shouldUseBestMatch) {
        if (cachedLocationRef.current) {
          setPublicationFilters({
            ...newFilters,
            latitude: cachedLocationRef.current.latitude,
            longitude: cachedLocationRef.current.longitude,
          });
        } else if (!geolocationLoading) {
          requestGeolocationAndApply();
        } else {
          setPublicationFilters(newFilters);
        }
      } else {
        setPublicationFilters(newFilters);
      }
    }
  };

  /**
   * Maneja voto positivo (toggle; si ya tenía voto negativo, lo cambia)
   */
  const handleValidatePublication = async (publicationId) => {
    const pub = publications.find((p) => p.id === publicationId);
    if (pub?.user_vote === 1) {
      const result = await unvotePublication(publicationId);
      if (!result.success) setError(result.error || tp.errorValidate);
    } else {
      if (pub?.user_vote === -1) await unvotePublication(publicationId);
      const result = await validatePublication(publicationId);
      if (!result.success) setError(result.error || tp.errorValidate);
    }
  };

  /**
   * Maneja voto negativo (toggle; si ya tenía voto positivo, lo cambia)
   */
  const handleDownvotePublication = async (publicationId) => {
    const pub = publications.find((p) => p.id === publicationId);
    if (pub?.user_vote === -1) {
      const result = await unvotePublication(publicationId);
      if (!result.success) setError(result.error || tp.errorValidate);
    } else {
      if (pub?.user_vote === 1) await unvotePublication(publicationId);
      const result = await downvotePublication(publicationId);
      if (!result.success) setError(result.error || tp.errorValidate);
    }
  };

  /**
   * Maneja reporte de publicación
   */
  const handleReportPublication = async (publicationId, reportPayload) => {
    const result = await reportPublication(publicationId, reportPayload);

    if (result.success) {
      setError(null);
      setFeedback({
        type: 'success',
        message: result.message || 'Reporte enviado correctamente.',
      });
    } else {
      const errorMessage = result.error || tp.errorReport;
      setError(errorMessage);
      setFeedback({
        type: 'error',
        message: errorMessage,
      });
    }
    
    // Auto-cerrar el feedback después de 5 segundos
    setTimeout(() => setFeedback(null), 5000);
    return result;
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

  const handleViewMore = useCallback(async (publicationId) => {
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
  }, [tp.errorDetail]);

  // Abre el modal de detalle si la URL tiene ?pub=<id>
  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      const firstAttempt = await publicationsApi.getProductCategories();
      if (firstAttempt.success) {
        if (active) setCategories(firstAttempt.data || []);
        return;
      }

      const secondAttempt = await publicationsApi.getProductCategories();
      if (secondAttempt.success) {
        if (active) setCategories(secondAttempt.data || []);
        return;
      }

      console.error(
        "No se pudieron cargar categorías en PublicationsPage:",
        secondAttempt.error || firstAttempt.error,
      );
    };

    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const pubId = searchParams.get("pub");
    if (!pubId) return;

    handleViewMore(pubId).then(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("pub");
        return next;
      });
    });
  }, [handleViewMore, searchParams, setSearchParams]);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      const result = await publicationsApi.searchProductsAndBrands(searchQuery, 8);
      if (result.success) {
        setSearchSuggestions(result.data || []);
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (!searchBoxRef.current?.contains(event.target)) {
        setSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStoreUpdated = (event) => {
      const updatedStore = event?.detail?.updatedStore;
      const updatedStoreId = updatedStore?.id || event?.detail?.storeId;
      if (!updatedStoreId) return;

      setSelectedPublication((prev) => {
        if (!prev?.store?.id || prev.store.id !== updatedStoreId) return prev;
        return {
          ...prev,
          store: {
            ...prev.store,
            ...updatedStore,
          },
        };
      });
    };

    window.addEventListener("nosee:store-updated", handleStoreUpdated);
    return () => window.removeEventListener("nosee:store-updated", handleStoreUpdated);
  }, []);


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
          marginBottom: "28px",
        }}
      >
        {/* Título + botón en la misma línea */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "4px",
          }}
        >
          <h1
            style={{
              fontSize: "32px",
              fontWeight: "800",
              color: "var(--text-primary)",
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            {tp.title}
          </h1>

          <Button
            size="sm"
            onClick={handlePublish}
            disabled={!user?.isVerified}
            title={!user?.isVerified ? tp.verifyEmailTitle : ""}
          >
            <PlusIcon style={{ marginRight: "6px" }} />
            {tp.createBtn}
          </Button>
        </div>

        <p
          style={{
            fontSize: "15px",
            color: "var(--text-secondary)",
            lineHeight: "1.6",
            margin: "0 0 16px",
          }}
        >
          {tp.subtitle}
        </p>

        {/* Aviso de email no verificado */}
        {!user?.isVerified && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--warning-soft)",
              border: "1px solid rgba(251,191,36,0.3)",
              borderRadius: "var(--radius-md)",
              color: "var(--warning)",
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
              background: "var(--error-soft)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "var(--radius-md)",
              color: "var(--error)",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}
      </section>

      {/* ─────────── SECCIÓN: Búsqueda + Filtros ─────────── */}
      <section style={{ marginBottom: "32px" }}>
        {/* Barra de búsqueda con botón de filtros */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div
            ref={searchBoxRef}
            style={{
              position: "relative",
              flex: 1,
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "12px 16px",
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
              onFocus={() => setSearchFocused(true)}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch(searchQuery);
                }
              }}
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
            {searchFocused && searchSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  zIndex: 20,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                }}
              >
                {searchSuggestions.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => {
                      const nextQuery = item.value;
                      setSearchQuery(nextQuery);
                      setFilters((prev) => {
                        const nextFilters = {
                          ...prev,
                          productId: item.type === "product" ? item.id : null,
                          productName: nextQuery,
                          sortBy: "best_match",
                        };
                        setPublicationFilters(nextFilters);
                        return nextFilters;
                      });
                      setSearchSuggestions([]);
                      setSearchFocused(false);
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      background: "transparent",
                      color: "var(--text-primary)",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón filtros */}
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            title="Filtros"
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "44px",
              height: "44px",
              flexShrink: 0,
              background: showFilters ? "var(--accent)" : "var(--bg-surface)",
              border: "1px solid",
              borderColor: showFilters ? "var(--accent)" : "var(--border)",
              borderRadius: "var(--radius-lg)",
              color: showFilters ? "#fff" : "var(--text-muted)",
              cursor: "pointer",
              transition: "background-color 0.15s, border-color 0.15s, color 0.15s",
            }}
          >
            <FilterIcon />
            {Object.values(filters).filter((v) => v !== null && v !== "" && v !== "recent").length > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: "5px",
                  right: "5px",
                  width: "7px",
                  height: "7px",
                  background: showFilters ? "#fff" : "var(--accent)",
                  borderRadius: "50%",
                }}
              />
            )}
          </button>
        </div>

        {/* Filtros activos como tags + panel expandible */}
        <PriceSearchFilter
          filters={filters}
          onFiltersChange={handleFilterChange}
          open={showFilters}
          distanceLoading={geolocationLoading}
          categories={categories}
          onClearFilters={() => {
            cachedLocationRef.current = null;
            setGeolocationLoading(false);
            setFilters({
              productId: null,
              productName: "",
              storeName: "",
              categoryId: null,
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
                onDownvote={handleDownvotePublication}
                onReport={handleReportPublication}
                onDelete={handleDeletePublication}
                onViewMore={handleViewMore}
                isAuthor={user?.id === publication.user_id}
                isAdmin={isAdmin(user?.role)}
              />
            ))}
          </div>
        )}

        {/* Scroll infinito */}
        {normalizedPublications.length > 0 && (
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "32px",
              paddingTop: "32px",
              borderTop: "1px solid var(--border)",
              minHeight: "48px",
            }}
          >
            {loading && (
              <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                {tp.loading}
              </span>
            )}
            {!hasMore && !loading && <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>•</span>}
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

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '16px 20px',
            borderRadius: '8px',
            background: feedback.type === 'success' ? 'var(--success)' : 'var(--error)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 2000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            maxWidth: '300px',
            animation: 'slideInUp 0.3s ease-out',
          }}
        >
          {feedback.message}
        </div>
      )}
    </main>
  );
}
