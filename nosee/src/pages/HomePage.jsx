import { memo, useCallback, useEffect, useMemo, useRef, useState, useId } from "react";

import {
  useAuthStore,
  selectIsAuthenticated,
} from "@/features/auth/store/authStore";

import { useGeoLocation, usePublications } from "@/features/publications/hooks";
import * as publicationsApi from "@/services/api/publications.api";
import PublicationDetailModal from "@/features/publications/components/PublicationDetailModal";
import { useLanguage, translateDbValue } from "@/contexts/LanguageContext";
import { isAdmin } from "@/types";
import { ReportPublicationModal } from "@/features/publications/components/ReportPublicationModal";
import { optimizeCloudinaryUrl } from "@/services/cloudinary";
import { INFINITE_SCROLL_CONFIG } from "@/config/infiniteScroll";
import { useInfiniteScrollTrigger } from "@/hooks/useInfiniteScrollTrigger";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const FALLBACK_IMAGE = "https://via.placeholder.com/400x300?text=Sin+foto";

const buildCloudinaryImageUrl = (publicId) => {
  if (!publicId || !CLOUDINARY_CLOUD_NAME) return null;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_800,c_limit/${publicId}`;
};

const resolvePublicationPhoto = (publication) => {
  const candidate =
    publication?.photo ||
    publication?.photo_url ||
    publication?.cloudinary_public_id;

  if (!candidate) return FALLBACK_IMAGE;

  if (candidate.includes('res.cloudinary.com')) {
    return optimizeCloudinaryUrl(candidate, { width: 800 });
  }
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return buildCloudinaryImageUrl(candidate) || FALLBACK_IMAGE;
};

// ─── ReportModal ─────────────────────────────────────

function ReportModal({ onClose, onSubmit }) {
  const { t } = useLanguage();
  const th = t.home;
  const [reportType, setReportType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selectId = useId();
  const titleId = useId();
  const descriptionId = useId();

  const handleSubmit = async () => {
    if (!reportType || submitting) return;
    setSubmitting(true);
    await onSubmit(reportType);
    setSubmitting(false);
  };

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(e); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        padding: "16px",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          width: "min(400px, 100%)",
        }}
      >
        <h3
          id={titleId}
          style={{
            margin: "0 0 16px",
            fontSize: "16px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          {th.reportPublication}
        </h3>
        <p
          id={descriptionId}
          style={{
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginBottom: "12px",
          }}
        >
          {th.reportDescription}
        </p>
        <label
          htmlFor={selectId}
          style={{
            display: "block",
            fontSize: "13px",
            color: "var(--text-secondary)",
            marginBottom: "6px",
          }}
        >
          {th.reportReason}
        </label>
        <select
          id={selectId}
          name="reportType"
          required
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            color: "var(--text-primary)",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          <option value="">{th.selectReason}</option>
          <option value="fake_price">{th.fakePrice}</option>
          <option value="wrong_photo">{th.wrongPhoto}</option>
          <option value="spam">{th.spam}</option>
          <option value="offensive">{th.offensive}</option>
        </select>
        <div
          style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
        >
          <button type="button" className="card-action-button" onClick={onClose}>
            {th.cancel}
          </button>
          <button
            type="button"
            className="card-action-button"
            onClick={handleSubmit}
            disabled={!reportType || submitting}
          >
            {submitting ? th.sending : th.report}
          </button>
        </div>
      </div>
    </div>
  );
}

const HappyFaceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SadFaceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

// ─── PublicationCard ────────────────────────────────────────

const PublicationCard = memo(function PublicationCard({
  pub,
  isAuthenticated,
  currentUserId,
  userIsAdmin,
  onRequireAuth,
  onValidate,
  onDownvote,
  onReport,
  onDelete,
  onOpenDetail,
}) {
  const { t } = useLanguage();
  const th = t.home;
  const publicationImage = resolvePublicationPhoto(pub);
  const [isVoting, setIsVoting] = useState(false);
  const [photoExpanded, setPhotoExpanded] = useState(false);

  const handleImageError = (event) => {
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  const isAuthor =
    currentUserId &&
    (pub.user_id === currentUserId || pub.user?.id === currentUserId);

  const pubName = pub.product?.name || th.product;
  const brandName =
    pub.product?.brand?.name ||
    pub.product?.brands?.name ||
    th.noBrand;
  const unitValue =
    pub.product?.base_quantity != null &&
    (pub.product?.unit_type?.abbreviation || pub.product?.unit_type?.name)
      ? `${pub.product.base_quantity} ${pub.product.unit_type?.abbreviation || pub.product.unit_type?.name}`
      : pub.product?.unit_type?.abbreviation ||
        pub.product?.unit_type?.name ||
        th.noUnit;

  const handleVote = async (action) => {
    if (isVoting) return;
    if (!isAuthenticated) {
      onRequireAuth?.();
      return;
    }
    setIsVoting(true);
    try {
      await action();
    } finally {
      setIsVoting(false);
    }
  };

  const upActive = pub.user_vote === 1;
  const downActive = pub.user_vote === -1;

  useEffect(() => {
    if (!photoExpanded) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") setPhotoExpanded(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [photoExpanded]);

  return (
    <>
      <article className="card">
      <div
        className="card-image-wrap"
        role="button"
        tabIndex={0}
        aria-label={th.expandPhotoLabel(pubName)}
        onClick={() => setPhotoExpanded(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setPhotoExpanded(true);
          }
        }}
        style={{ cursor: "zoom-in" }}
      >
        <img
          src={publicationImage}
          alt={pubName}
          className="card-image"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onError={handleImageError}
        />
      </div>

      <div className="card-body">
        <p className="card-title">{pubName}</p>
        <p className="card-price">${pub.price.toLocaleString()}</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "6px 10px",
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "4px",
          }}
        >
          <span>
            <strong style={{ color: "var(--text-secondary)" }}>{th.brandLabel}</strong> {brandName}
          </span>
          <span>
            <strong style={{ color: "var(--text-secondary)" }}>{th.unitLabel}</strong> {unitValue}
          </span>
        </div>
        <span style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px", display: "block" }}>
          <strong style={{ color: "var(--text-secondary)" }}>{th.storeLabel}</strong> {pub.store?.name || th.store}
        </span>
      </div>

      <div className="card-divider" />

      <div className="card-actions-row" style={{ flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            className="card-action-button"
            onClick={() => onOpenDetail(pub.id)}
            aria-label={th.detailLabel(pubName)}
          >
            {th.viewMore}
          </button>

          <button
            className="card-action-button"
            onClick={() => {
              if (!isAuthenticated) {
                onRequireAuth?.();
                return;
              }
              onReport(pub);
            }}
            aria-label={th.reportLabel(pubName)}
            aria-disabled={!isAuthenticated}
            title={!isAuthenticated ? th.loginToReport : th.report}
            style={!isAuthenticated ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
          >
            {th.report}
          </button>

          {(isAuthor || userIsAdmin) && (
            <button
              className="card-action-button"
              onClick={() => onDelete(pub.id)}
              aria-label={th.deleteLabel(pubName)}
              title={th.deleteBtn}
            >
              {th.deleteBtn}
            </button>
          )}

          {/* Grupo de votos al final */}
          <div style={{ ...homeVoteStyles.group, marginLeft: "auto" }}>
            <button
              type="button"
              aria-label={th.validateLabel(pubName)}
              aria-pressed={upActive}
              aria-disabled={isVoting || !isAuthenticated}
              disabled={isVoting}
              title={!isAuthenticated ? th.loginToVote : undefined}
              onClick={() => handleVote(() => onValidate(pub.id, pub.user_vote))}
              style={{
                ...homeVoteStyles.btn,
                ...homeVoteStyles.btnLeft,
                ...(!isAuthenticated ? homeVoteStyles.btnDisabled : {}),
                ...(upActive ? homeVoteStyles.btnUpActive : {}),
              }}
            >
              <HappyFaceIcon />
              <span style={homeVoteStyles.count}>{pub.validated_count || 0}</span>
            </button>
            <button
              type="button"
              aria-label={th.downvoteLabel(pubName)}
              aria-pressed={downActive}
              aria-disabled={isVoting || !isAuthenticated}
              disabled={isVoting}
              title={!isAuthenticated ? th.loginToVote : undefined}
              onClick={() => handleVote(() => onDownvote(pub.id, pub.user_vote))}
              style={{
                ...homeVoteStyles.btn,
                ...homeVoteStyles.btnRight,
                ...(!isAuthenticated ? homeVoteStyles.btnDisabled : {}),
                ...(downActive ? homeVoteStyles.btnDownActive : {}),
              }}
            >
              <SadFaceIcon />
              <span style={homeVoteStyles.count}>{pub.downvoted_count || 0}</span>
            </button>
          </div>
        </div>
      </div>
      </article>

      {photoExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={th.expandedPhotoLabel(pubName)}
          onClick={() => setPhotoExpanded(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "rgba(0, 0, 0, 0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
          }}
        >
          <button
            type="button"
            aria-label={th.close}
            onClick={() => setPhotoExpanded(false)}
            style={{
              position: "absolute",
              top: "16px",
              right: "16px",
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(0,0,0,0.45)",
              color: "#fff",
              fontSize: "20px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
          <img
            src={publicationImage}
            alt={pubName}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(1100px, 100%)",
              maxHeight: "85vh",
              objectFit: "contain",
              borderRadius: "10px",
              boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
            }}
          />
        </div>
      )}
    </>
  );
});

const homeVoteStyles = {
  group: {
    display: "flex",
    borderRadius: "8px",
    overflow: "hidden",
    border: "1px solid var(--border)",
    flexShrink: 0,
  },
  btn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    border: "none",
    background: "var(--bg-surface)",
    cursor: "pointer",
    color: "var(--text-muted)",
    transition: "background 0.15s, color 0.15s",
  },
  btnLeft: {
    borderRight: "1px solid var(--border)",
  },
  btnRight: {},
  btnDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  btnUpActive: {
    background: "var(--success-soft)",
    color: "#10b981",
  },
  btnDownActive: {
    background: "rgba(239,68,68,0.10)",
    color: "#ef4444",
  },
  count: {
    fontSize: "13px",
    fontWeight: 700,
    minWidth: "14px",
    textAlign: "center",
  },
};

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
  const [reportingPublication, setReportingPublication] = useState(null);
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

  const handleReport = useCallback((publication) => {
    if (!isAuthenticated) return;
    setReportingPublication(publication);
  }, [isAuthenticated]);

  const handleRequireAuth = () => {
    alert(th.loginRequiredAction || "Debes iniciar sesión para interactuar.");
  };

  const handleReportSubmit = useCallback(async (reportPayload) => {
    if (!reportingPublication) return;

    const result = await reportPublication(reportingPublication.id, reportPayload);

    setReportingPublication(null);
    
    // Mostrar feedback al usuario
    if (result.success) {
      setFeedback({
        type: 'success',
        message: result.message || th.reportSuccess
      });
    } else {
      setFeedback({
        type: 'error',
        message: result.message || result.error || th.reportError
      });
    }
    
    // Auto-cerrar el feedback después de 5 segundos
    setTimeout(() => setFeedback(null), 5000);
  }, [reportPublication, reportingPublication]);

  const handleDelete = useCallback(async (publicationId) => {
    if (!confirm(th.confirmDelete)) return;
    const result = await publicationsApi.deletePublication(publicationId);
    if (result.success) {
      removePublication(publicationId);
    }
  }, [removePublication, th.confirmDelete]);

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
                pub={pub}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
                userIsAdmin={isAdmin(user?.role)}
                onRequireAuth={handleRequireAuth}
                onValidate={handleValidate}
                onDownvote={handleDownvote}
                onReport={handleReport}
                onDelete={handleDelete}
                onOpenDetail={handleOpenDetail}
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

      {reportingPublication && (
       <ReportPublicationModal
          publication={reportingPublication}
          onClose={() => setReportingPublication(null)}
          onSubmit={handleReportSubmit}
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
