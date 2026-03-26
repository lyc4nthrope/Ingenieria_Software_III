import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useAuthStore,
  selectIsAuthenticated,
} from "@/features/auth/store/authStore";

import { useGeoLocation, usePublications } from "@/features/publications/hooks";
import * as publicationsApi from "@/services/api/publications.api";
import PublicationDetailModal from "@/features/publications/components/PublicationDetailModal";
import PublicationCard from "@/features/publications/components/PublicationCard";
import { useLanguage, translateDbValue } from "@/contexts/LanguageContext";
import { isAdmin } from "@/types";
import { INFINITE_SCROLL_CONFIG } from "@/config/infiniteScroll";
import { useInfiniteScrollTrigger } from "@/hooks/useInfiniteScrollTrigger";

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { t } = useLanguage();
  const th = t.home;

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);

  const {
    publications,
    loading,
    hasMore,
    loadMore,
    setFilters,
    validatePublication,
    downvotePublication,
    unvotePublication,
    reportPublication,
    removePublication,
  } = usePublications({ limit: INFINITE_SCROLL_CONFIG.homePageSize });

  const { latitude, longitude } = useGeoLocation({ autoFetch: true });

  const [detailPublication, setDetailPublication] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryPage, setCategoryPage] = useState(0);
  const CATS_PER_PAGE = 8;
  const hasInitializedRef = useRef(false);
  const lastLocationCoordsRef = useRef(null);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      const firstAttempt = await publicationsApi.getProductCategories();

      if (firstAttempt.success) {
        if (active) setCategories(firstAttempt.data || []);
        return;
      }

      // Reintento corto para fallos transitorios en móvil (token/red al volver al tab).
      const secondAttempt = await publicationsApi.getProductCategories();
      if (secondAttempt.success) {
        if (active) setCategories(secondAttempt.data || []);
        return;
      }

      console.error("No se pudieron cargar categorías:", secondAttempt.error || firstAttempt.error);
    };

    loadCategories();
    return () => {
      active = false;
    };
  }, []);

  const handleCategorySelect = (catId) => {
    const next = selectedCategory === catId ? null : catId;
    setSelectedCategory(next);
    setFilters({ categoryId: next });
  };

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    setFilters({
      latitude: latitude || null,
      longitude: longitude || null,
      sortBy: "recent",
    });
  }, [latitude, longitude, setFilters]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    const coordsKey =
      latitude && longitude ? `${latitude},${longitude}` : "no-location";
    if (lastLocationCoordsRef.current === coordsKey) return;
    lastLocationCoordsRef.current = coordsKey;
    if (latitude && longitude) {
      setFilters({ latitude, longitude, sortBy: "recent" });
    }
  }, [latitude, longitude, setFilters]);

  const normalizedPublications = useMemo(
    () =>
      publications.map((publication) => ({
        ...publication,
        validated_count: Array.isArray(publication.validated_count)
          ? publication.validated_count.length
          : publication.validated_count || 0,
        product: publication.product || publication.products,
        store: publication.store || publication.stores,
      })),
    [publications],
  );

  const handleOpenDetail = useCallback(async (publicationId) => {
    const detailResult =
      await publicationsApi.getPublicationDetail(publicationId);
    if (detailResult.success) {
      setDetailPublication(detailResult.data);
    }
  }, []);

  const handleValidate = useCallback(async (publicationId, userVote) => {
    if (userVote === 1) {
      await unvotePublication(publicationId);
    } else {
      if (userVote === -1) await unvotePublication(publicationId);
      await validatePublication(publicationId);
    }
  }, [unvotePublication, validatePublication]);

  const handleDownvote = useCallback(async (publicationId, userVote) => {
    if (userVote === -1) {
      await unvotePublication(publicationId);
    } else {
      if (userVote === 1) await unvotePublication(publicationId);
      await downvotePublication(publicationId);
    }
  }, [downvotePublication, unvotePublication]);

  const handleReport = useCallback(async (publicationId, reportPayload) => {
    const result = await reportPublication(publicationId, reportPayload);

    if (result.success) {
      setFeedback({
        type: 'success',
        message: result.message || th.reportSuccess,
      });
    } else {
      setFeedback({
        type: 'error',
        message: result.message || result.error || th.reportError,
      });
    }

    setTimeout(() => setFeedback(null), 5000);
    return result;
  }, [reportPublication, th.reportSuccess, th.reportError]);

  const handleRequireAuth = () => {
    alert(th.loginRequiredAction || "Debes iniciar sesión para interactuar.");
  };

  const handleDelete = useCallback(async (publicationId) => {
    const result = await publicationsApi.deletePublication(publicationId);
    if (result.success) {
      removePublication(publicationId);
    }
  }, [removePublication]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStoreUpdated = (event) => {
      const updatedStore = event?.detail?.updatedStore;
      const updatedStoreId = updatedStore?.id || event?.detail?.storeId;
      if (!updatedStoreId) return;

      setDetailPublication((prev) => {
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

  useInfiniteScrollTrigger({
    hasMore,
    loading,
    onLoadMore: loadMore,
    triggerDistancePx: INFINITE_SCROLL_CONFIG.triggerDistancePx,
    cooldownMs: INFINITE_SCROLL_CONFIG.cooldownMs,
  });

  return (
    <div className="home-wrapper">
      <section className="banner">
        <h1>{th.title}</h1>
        <p>{th.subtitle}</p>
      </section>

      {categories.length > 0 && (() => {
        const totalPages = Math.ceil(categories.length / CATS_PER_PAGE);
        const visible = categories.slice(categoryPage * CATS_PER_PAGE, (categoryPage + 1) * CATS_PER_PAGE);
        return (
          <nav className="categories-carousel" aria-label={th.filterByCategoryLabel}>
            <button
              type="button"
              className="categories-arrow"
              onClick={() => setCategoryPage((p) => p - 1)}
              disabled={categoryPage === 0}
              aria-label={th.prevCategories}
            >
              ‹
            </button>

            <div className="categories-track">
              <button
                type="button"
                className={`categories-btn${selectedCategory === null ? " active" : ""}`}
                onClick={() => handleCategorySelect(null)}
              >
                {th.allCategories}
              </button>
              {visible.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`categories-btn${selectedCategory === cat.id ? " active" : ""}`}
                  onClick={() => handleCategorySelect(cat.id)}
                >
                  {translateDbValue(t, 'categories', cat.name)}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="categories-arrow"
              onClick={() => setCategoryPage((p) => p + 1)}
              disabled={categoryPage >= totalPages - 1}
              aria-label={th.moreCategories}
            >
              ›
            </button>
          </nav>
        );
      })()}

      <div className="layout">
        <div className="feed">
          {loading && normalizedPublications.length === 0 ? (
            <p role="status" aria-live="polite">
              {th.loading}
            </p>
          ) : !loading && normalizedPublications.length === 0 ? (
            <p role="status" aria-live="polite">{th.noPublications}</p>
          ) : (
            normalizedPublications.map((pub) => (
              <PublicationCard
                key={pub.id}
                publication={pub}
                isAuthenticated={isAuthenticated}
                isAuthor={user?.id === pub.user_id || user?.id === pub.user?.id}
                isAdmin={isAdmin(user?.role)}
                onRequireAuth={handleRequireAuth}
                onValidate={handleValidate}
                onDownvote={handleDownvote}
                onReport={handleReport}
                onDelete={handleDelete}
                onViewMore={handleOpenDetail}
              />
            ))
          )}
        </div>

        {normalizedPublications.length > 0 && (
          <div
            aria-hidden="true"
            style={{
              display: "flex",
              justifyContent: "center",
              marginTop: "28px",
              paddingTop: "24px",
              borderTop: "1px solid var(--border)",
              minHeight: "48px",
            }}
          >
            {loading && (
              <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                {th.loading}
              </span>
            )}
            {!hasMore && !loading && (
              <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>
                •
              </span>
            )}
          </div>
        )}
      </div>

      {detailPublication && (
        <PublicationDetailModal
          publication={detailPublication}
          onClose={() => setDetailPublication(null)}
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
    </div>
  );
}
