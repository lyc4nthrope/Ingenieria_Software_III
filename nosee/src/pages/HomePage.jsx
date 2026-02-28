import { useMemo, useState } from "react";


import {
  useAuthStore,
  selectIsAuthenticated,
} from "@/features/auth/store/authStore";

import { usePublications } from "@/features/publications/hooks";
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

function PublicationCard({
  pub,
  isAuthenticated,
  onVote,
  onUnvote,
  onOpenDetail,
}) {
  const publicationImage = resolvePublicationPhoto(pub);

  const handleImageError = (event) => {
    event.currentTarget.src = FALLBACK_IMAGE;
  };

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
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <button
            className="card-action-button"
            onClick={() => onVote(pub.id)}
            disabled={!isAuthenticated}
            title={!isAuthenticated ? "Inicia sesión para votar" : "Votar"}
          >
            Vote
          </button>

          <button
            className="card-action-button"
            onClick={() => onUnvote(pub.id)}
            disabled={!isAuthenticated}
            title={
              !isAuthenticated ? "Inicia sesión para quitar voto" : "Unvote"
            }
          >
            Unvote
          </button>

          <button
            className="card-action-button"
            onClick={() => onOpenDetail(pub.id)}
          >
            Ver más
          </button>
        </div>
      </div>
    </article>
  );
}

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

export default function HomePage() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { publications, loading, validatePublication, unvotePublication } =
    usePublications({ limit: 12 });

  const [detailPublication, setDetailPublication] = useState(null);

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

  const handleVote = async (publicationId) => {
    await validatePublication(publicationId);
  };

  const handleUnvote = async (publicationId) => {
    await unvotePublication(publicationId);
  };

  return (
    <div className="home-wrapper">
      <section className="banner">
        <h1>Bienvenidos a NØSEE, plataforma colaborativa.</h1>
        <p>No sabes donde es más barato, te mostramos donde no ves.</p>
        <p>{isAuthenticated ? "Para crear una publicación, entra a Productos y pulsa Crear publicación." : "Inicia sesión para crear y votar publicaciones."}</p>
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
                onVote={handleVote}
                onUnvote={handleUnvote}
                onOpenDetail={handleOpenDetail}
              />
            ))
          )}
        </div>
      </div>
      <PublicationDetailModal
        publication={detailPublication}
        onClose={() => setDetailPublication(null)}
      />
    </div>
  );
}
