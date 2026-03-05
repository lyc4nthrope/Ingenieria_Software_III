import { useEffect, useMemo, useRef, useState, useId } from "react";

import {
  useAuthStore,
  selectIsAuthenticated,
} from "@/features/auth/store/authStore";

import { useGeoLocation, usePublications } from "@/features/publications/hooks";
import * as publicationsApi from "@/services/api/publications.api";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReportPublicationModal } from "@/features/publications/components/ReportPublicationModal";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const FALLBACK_IMAGE = "https://via.placeholder.com/400x300?text=Sin+foto";

const isAbsoluteUrl = (value = "") => /^https?:\/\//i.test(value);

const buildCloudinaryImageUrl = (publicId) => {
  if (!publicId || !CLOUDINARY_CLOUD_NAME) return null;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_800/${publicId}`;
};

const resolvePublicationPhoto = (publication) => {
  const candidate =
    publication?.photo ||
    publication?.photo_url ||
    publication?.cloudinary_public_id;

  if (!candidate) return FALLBACK_IMAGE;
  if (isAbsoluteUrl(candidate)) return candidate;
  return buildCloudinaryImageUrl(candidate) || FALLBACK_IMAGE;
};

// ─── ReportModal ──────────────────────────────────────────────────────────────
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
        background: "rgba(0,0,0,0.7)",
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

// ─── PublicationCard ──────────────────────────────────────────────────────────
function PublicationCard({
  pub,
  isAuthenticated,
  currentUserId,
  isVoted,
  onValidate,
  onUnvote,
  onReport,
  onDelete,
  onOpenDetail,
}) {
  const { t } = useLanguage();
  const th = t.home;
  const publicationImage = resolvePublicationPhoto(pub);

  const handleImageError = (event) => {
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  const isAuthor =
    currentUserId &&
    (pub.user_id === currentUserId || pub.user?.id === currentUserId);

  const pubName = pub.product?.name || th.product;

  return (
    <article className="card">
      <div className="card-image-wrap">
        <img
          src={publicationImage}
          alt={pubName}
          className="card-image"
          loading="lazy"
          onError={handleImageError}
        />
      </div>

      <div className="card-body">
        <div className="card-title">{pubName}</div>
        <div className="card-price">${pub.price.toLocaleString()}</div>
        <div className="card-description">
          {(pub.description || th.noDescription).slice(0, 80)}
        </div>
      </div>

      <div className="card-divider" />

      <div
        className="card-actions-row"
        style={{ flexDirection: "column", gap: 8 }}
      >
        <div className="card-indicators" style={{ width: "100%" }}>
          <span><span aria-hidden="true">✅ </span>{pub.validated_count || 0}</span>
          <span><span aria-hidden="true">🚩 </span>{pub.reported_count || 0}</span>
          <span>{pub.store?.name || th.store}</span>
        </div>
        <div
          style={{ display: "flex", gap: 8, width: "100%", flexWrap: "wrap" }}
        >
          <button
            className="card-action-button"
            onClick={() => (isVoted ? onUnvote(pub.id) : onValidate(pub.id))}
            aria-label={
              isVoted
                ? th.removeValidationLabel(pubName)
                : th.validateLabel(pubName)
            }
            disabled={!isAuthenticated}
            title={
              !isAuthenticated
                ? th.loginToVote
                : isVoted
                  ? th.removeValidation
                  : th.validatePrice
            }
          >
            {isVoted ? th.validated : th.validate}
          </button>

          <button
            className="card-action-button"
            onClick={() => onReport(pub)}
            aria-label={th.reportLabel(pubName)}
            disabled={!isAuthenticated}
            title={!isAuthenticated ? th.loginToReport : th.report}
          >
            {th.report}
          </button>

          <button
            className="card-action-button"
            onClick={() => onOpenDetail(pub.id)}
            aria-label={th.detailLabel(pubName)}
          >
            {th.viewMore}
          </button>

          {isAuthor && (
            <button
              className="card-action-button"
              onClick={() => onDelete(pub.id)}
              aria-label={th.deleteLabel(pubName)}
              title={th.deleteBtn}
            >
              {th.deleteBtn}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── PublicationDetailModal ───────────────────────────────────────────────────
function PublicationDetailModal({ publication, onClose }) {
  const { t } = useLanguage();
  const th = t.home;
  const titleId = useId();
  const closeButtonRef = useRef(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  if (!publication) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(e); }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px",
        zIndex: 999,
      }}
    >
      <article
        role="button"
        tabIndex={0}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: "min(800px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "var(--bg-surface)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          padding: "16px",
        }}
      >
        <button
          ref={closeButtonRef}
          onClick={onClose}
          type="button"
          aria-label={th.closeDetail}
          className="card-action-button"
          style={{ marginBottom: 12 }}
        >
          {th.close}
        </button>
        <img
          src={resolvePublicationPhoto(publication)}
          alt={publication.product?.name || th.product}
          style={{
            width: "100%",
            borderRadius: 8,
            maxHeight: "380px",
            objectFit: "cover",
          }}
        />
        <h2 id={titleId} style={{ marginTop: 12 }}>
          {publication.product?.name || th.product}
        </h2>
        <p>
          <strong>{th.price}</strong> ${publication.price?.toLocaleString()}
        </p>
        <p>
          <strong>{th.storeLabel}</strong>{" "}
          {publication.store?.name || th.store}
        </p>
        <p>
          <strong>{th.description}</strong>{" "}
          {publication.description || th.noDescription}
        </p>
      </article>
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { t } = useLanguage();
  const th = t.home;

  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore((s) => s.user);

  const {
    publications,
    loading,
    setFilters,
    validatePublication,
    unvotePublication,
    reportPublication,
    removePublication,
  } = usePublications({ limit: 12 });

  const { latitude, longitude } = useGeoLocation({ autoFetch: true });

  const [detailPublication, setDetailPublication] = useState(null);
  const [reportingPublication, setReportingPublication] = useState(null);
  const [votedIds, setVotedIds] = useState(new Set());
  const [reportingId, setReportingId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const hasInitializedRef = useRef(false);
  const lastLocationCoordsRef = useRef(null);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    setFilters({
      latitude: latitude || null,
      longitude: longitude || null,
      maxDistance: latitude && longitude ? 3 : null,
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
      setFilters({ latitude, longitude, maxDistance: 3, sortBy: "recent" });
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

  const handleOpenDetail = async (publicationId) => {
    const detailResult =
      await publicationsApi.getPublicationDetail(publicationId);
    if (detailResult.success) {
      setDetailPublication(detailResult.data);
    }
  };

  const handleValidate = async (publicationId) => {
    await validatePublication(publicationId);
    setVotedIds((prev) => new Set([...prev, publicationId]));
  };

  const handleUnvote = async (publicationId) => {
    await unvotePublication(publicationId);
    setVotedIds((prev) => {
      const next = new Set(prev);
      next.delete(publicationId);
      return next;
    });
  };

  const handleReport = (publication) => {
    if (!isAuthenticated) return;
    setReportingPublication(publication);
  };

  const handleReportSubmit = async (reportPayload) => {
    if (!reportingPublication) return;
    
    console.log('[📋 HomePage] Enviando reporte con payload:', reportPayload);
    
    const result = await reportPublication(reportingPublication.id, reportPayload);
    
    console.log('[📋 HomePage] Resultado del reporte:', result);
    
    setReportingPublication(null);
    
    // Mostrar feedback al usuario
    if (result.success) {
      setFeedback({
        type: 'success',
        message: result.message || '✅ Reporte enviado correctamente. Gracias por ayudarnos a mejorar NØSEE.'
      });
    } else {
      setFeedback({
        type: 'error',
        message: result.message || result.error || '❌ Hubo un error al enviar el reporte. Intenta de nuevo.'
      });
    }
    
    // Auto-cerrar el feedback después de 5 segundos
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleDelete = async (publicationId) => {
    if (!confirm(th.confirmDelete)) return;
    const result = await publicationsApi.deletePublication(publicationId);
    if (result.success) {
      removePublication(publicationId);
    }
  };

  return (
    <div className="home-wrapper">
      <section className="banner">
        <h1>{th.title}</h1>
        <p>{th.subtitle}</p>
        {!isAuthenticated && <p>{th.loginCta}</p>}
      </section>

      <div className="layout">
        <div className="feed">
          {loading ? (
            <p role="status" aria-live="polite">
              {th.loading}
            </p>
          ) : normalizedPublications.length === 0 ? (
            <p role="status" aria-live="polite">{th.noPublications}</p>
          ) : (
            normalizedPublications.map((pub) => (
              <PublicationCard
                key={pub.id}
                pub={pub}
                isAuthenticated={isAuthenticated}
                currentUserId={user?.id}
                isVoted={votedIds.has(pub.id)}
                onValidate={handleValidate}
                onUnvote={handleUnvote}
                onReport={handleReport}
                onDelete={handleDelete}
                onOpenDetail={handleOpenDetail}
              />
            ))
          )}
        </div>
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
            background: feedback.type === 'success' ? '#10b981' : '#ef4444',
            color: '#fff',
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
