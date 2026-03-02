import { useEffect, useMemo, useState } from "react";

import {
  useAuthStore,
  selectIsAuthenticated,
} from "@/features/auth/store/authStore";

import { useGeoLocation, usePublications } from "@/features/publications/hooks";
import * as publicationsApi from "@/services/api/publications.api";

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
  const [reportType, setReportType] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reportType || submitting) return;
    setSubmitting(true);
    await onSubmit(reportType);
    setSubmitting(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#1e293b",
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "24px",
          width: "min(400px, 100%)",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: "16px",
            fontWeight: 600,
            color: "#e2e8f0",
          }}
        >
          Reportar publicación
        </h3>
        <label
          style={{
            display: "block",
            fontSize: "13px",
            color: "#94a3b8",
            marginBottom: "6px",
          }}
        >
          Motivo del reporte
        </label>
        <select
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "#0f172a",
            border: "1px solid #334155",
            borderRadius: "6px",
            color: "#e2e8f0",
            fontSize: "14px",
            marginBottom: "16px",
          }}
        >
          <option value="">Seleccionar motivo...</option>
          <option value="fake_price">Precio falso</option>
          <option value="wrong_photo">Foto incorrecta</option>
          <option value="spam">Spam</option>
          <option value="offensive">Contenido ofensivo</option>
        </select>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button className="card-action-button" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="card-action-button"
            onClick={handleSubmit}
            disabled={!reportType || submitting}
          >
            {submitting ? "Enviando..." : "Reportar"}
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
  const publicationImage = resolvePublicationPhoto(pub);

  const handleImageError = (event) => {
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  const isAuthor =
    currentUserId &&
    (pub.user_id === currentUserId || pub.user?.id === currentUserId);

  return (
    <article className="card">
      <div className="card-image-wrap">
        <img
          src={publicationImage}
          alt={pub.product?.name || "Publicación"}
          className="card-image"
          loading="lazy"
          onError={handleImageError}
        />
      </div>

      <div className="card-body">
        <div className="card-title">{pub.product?.name || "Producto"}</div>
        <div className="card-price">${pub.price.toLocaleString()}</div>
        <div className="card-description">
          {(pub.description || "Sin descripción").slice(0, 80)}
        </div>
      </div>

      <div className="card-divider" />

      <div
        className="card-actions-row"
        style={{ flexDirection: "column", gap: 8 }}
      >
        <div className="card-indicators" style={{ width: "100%" }}>
          <span>✅ {pub.validated_count || 0}</span>
          <span>🚩 {pub.reported_count || 0}</span>
          <span>{pub.store?.name || "Tienda"}</span>
        </div>
        <div style={{ display: "flex", gap: 8, width: "100%", flexWrap: "wrap" }}>
          <button
            className="card-action-button"
            onClick={() =>
              isVoted ? onUnvote(pub.id) : onValidate(pub.id)
            }
            disabled={!isAuthenticated}
            title={
              !isAuthenticated
                ? "Inicia sesión para votar"
                : isVoted
                ? "Quitar validación"
                : "Validar precio"
            }
          >
            {isVoted ? "✓ Validado" : "✓ Validar"}
          </button>

          <button
            className="card-action-button"
            onClick={() => onReport(pub.id)}
            disabled={!isAuthenticated}
            title={
              !isAuthenticated ? "Inicia sesión para reportar" : "Reportar"
            }
          >
            🚩 Reportar
          </button>

          <button
            className="card-action-button"
            onClick={() => onOpenDetail(pub.id)}
          >
            Ver más
          </button>

          {isAuthor && (
            <button
              className="card-action-button"
              onClick={() => onDelete(pub.id)}
              title="Eliminar mi publicación"
            >
              🗑 Eliminar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── PublicationDetailModal ───────────────────────────────────────────────────
function PublicationDetailModal({ publication, onClose }) {
  if (!publication) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
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
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(800px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          background: "#0f172a",
          borderRadius: "12px",
          border: "1px solid #334155",
          padding: "16px",
        }}
      >
        <button
          onClick={onClose}
          className="card-action-button"
          style={{ marginBottom: 12 }}
        >
          Cerrar
        </button>
        <img
          src={resolvePublicationPhoto(publication)}
          alt={publication.product?.name || "Publicación"}
          style={{
            width: "100%",
            borderRadius: 8,
            maxHeight: "380px",
            objectFit: "cover",
          }}
        />
        <h2 style={{ marginTop: 12 }}>
          {publication.product?.name || "Producto"}
        </h2>
        <p>
          <strong>Precio:</strong> ${publication.price?.toLocaleString()}
        </p>
        <p>
          <strong>Tienda:</strong> {publication.store?.name || "Sin tienda"}
        </p>
        <p>
          <strong>Descripción:</strong>{" "}
          {publication.description || "Sin descripción"}
        </p>
      </article>
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
export default function HomePage() {
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
  const [votedIds, setVotedIds] = useState(new Set());
  const [reportingId, setReportingId] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [lastLocationCoords, setLastLocationCoords] = useState(null);

  // Initialize filters on mount - load recent publications regardless of location
  useEffect(() => {
    if (hasInitialized) return;
    setHasInitialized(true);

    // Load with location if available, otherwise just load recent publications
    setFilters({
      latitude: latitude || null,
      longitude: longitude || null,
      maxDistance: latitude && longitude ? 3 : null,
      sortBy: "recent",
    });
  }, []);

  // Update filters only if location becomes available AND changed significantly
  useEffect(() => {
    if (!hasInitialized) return;

    const coordsKey = latitude && longitude ? `${latitude},${longitude}` : 'no-location';
    if (lastLocationCoords === coordsKey) return; // No change

    setLastLocationCoords(coordsKey);

    // If we got location, update to search nearby
    if (latitude && longitude) {
      setFilters({
        latitude,
        longitude,
        maxDistance: 3,
        sortBy: "recent",
      });
    }
    // If location was lost but we're still initialized, keep showing recent publications
  }, [latitude, longitude, hasInitialized, lastLocationCoords, setFilters]);

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

  const handleReport = (publicationId) => {
    if (!isAuthenticated) return;
    setReportingId(publicationId);
  };

  const handleReportSubmit = async (reportType) => {
    if (!reportingId) return;
    await reportPublication(reportingId, reportType, "");
    setReportingId(null);
  };

  const handleDelete = async (publicationId) => {
    if (!confirm("¿Eliminar esta publicación?")) return;
    const result = await publicationsApi.deletePublication(publicationId);
    if (result.success) {
      removePublication(publicationId);
    }
  };

  return (
    <div className="home-wrapper">
      <section className="banner">
        <h1>Bienvenidos a NØSEE, plataforma colaborativa.</h1>
        <p>No sabes donde es más barato, te mostramos donde no ves.</p>
        {!isAuthenticated && (
          <p>Inicia sesión para crear y votar publicaciones.</p>
        )}
      </section>

      <div className="layout">
        <div className="feed">
          {loading ? (
            <p>Cargando publicaciones...</p>
          ) : normalizedPublications.length === 0 ? (
            <p>
              Aún no hay publicaciones. Cuando un usuario cree una, aparecerá
              aquí.
            </p>
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

      {reportingId && (
        <ReportModal
          onClose={() => setReportingId(null)}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}
