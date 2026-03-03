import { useMemo } from "react";

const DEFAULT_VIRTUAL_IMAGE = "https://via.placeholder.com/1200x800?text=Tienda+virtual";

const parseStoreLocation = (locationValue) => {
  if (!locationValue) return { latitude: null, longitude: null };

  if (
    typeof locationValue === "object" &&
    Array.isArray(locationValue.coordinates) &&
    locationValue.coordinates.length >= 2
  ) {
    const [longitude, latitude] = locationValue.coordinates;
    return { latitude: Number(latitude), longitude: Number(longitude) };
  }

  if (typeof locationValue !== "string") return { latitude: null, longitude: null };

  const pointMatch = locationValue.match(/POINT\s*\(\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\)/i);
  if (!pointMatch) return { latitude: null, longitude: null };

  return {
    longitude: Number(pointMatch[1]),
    latitude: Number(pointMatch[2]),
  };
};

const getMapEmbedUrl = (latitude, longitude) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.01}%2C${latitude - 0.01}%2C${longitude + 0.01}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

export default function PublicationDetailModal({ publication, onClose }) {
  const votes = publication?.votes || [];
  const positiveVotes = votes.filter((vote) => Number(vote.vote_type) === 1).length;
  const negativeVotes = votes.filter((vote) => Number(vote.vote_type) === -1).length;
  const comments = publication?.comments || [];

  const isVirtualStore = Number(publication?.store?.store_type_id) === 2;
  const hasPhoto = !!publication?.photo_url && !isVirtualStore;
  const mainImage = hasPhoto ? publication.photo_url : DEFAULT_VIRTUAL_IMAGE;
  const { latitude, longitude } = parseStoreLocation(publication?.store?.location);

  const mapEmbedUrl = useMemo(
    () => getMapEmbedUrl(latitude, longitude),
    [latitude, longitude],
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>✕</button>

        <img src={mainImage} alt={publication?.product?.name || "Producto"} style={styles.image} />

        {isVirtualStore && publication?.store?.website_url && (
          <a href={publication.store.website_url} target="_blank" rel="noreferrer" style={styles.linkButton}>
            Ir al enlace de la tienda virtual
          </a>
        )}

        <h2 style={styles.title}>{publication?.product?.name || "Producto sin nombre"}</h2>
        <p style={styles.meta}>
          Unidad: {publication?.product?.base_quantity || "-"} {publication?.product?.unit_type?.abbreviation || ""}
        </p>
        <p style={styles.description}>{publication?.description || "No hay descripción"}</p>

        <p style={styles.meta}>
          Publicado por: {publication?.user?.full_name || "Usuario desconocido"} · Puntaje: {publication?.user?.reputation_points ?? 0}
        </p>
        <p style={styles.meta}>Votos: 👍 {positiveVotes} · 👎 {negativeVotes}</p>

        <div style={styles.commentsBox}>
          <h3 style={styles.sectionTitle}>Comentarios</h3>
          {comments.length === 0 ? (
            <p style={styles.commentItem}>Sin comentarios por ahora.</p>
          ) : (
            comments.map((comment) => (
              <p key={comment.id} style={styles.commentItem}>
                <strong>{comment.user?.full_name || "Usuario"}:</strong> {comment.content || comment.comment || ""}
              </p>
            ))
          )}
        </div>

        <div>
          <h3 style={styles.sectionTitle}>Ubicación de la tienda</h3>
          {mapEmbedUrl ? (
            <iframe title="Mapa tienda" src={mapEmbedUrl} style={styles.map} loading="lazy" />
          ) : (
            <p style={styles.commentItem}>No hay coordenadas disponibles para esta tienda.</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 1300, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" },
  modal: { background: "#fff", width: "min(900px, 100%)", maxHeight: "92vh", overflowY: "auto", borderRadius: "12px", padding: "16px", position: "relative" },
  closeButton: { position: "absolute", right: 16, top: 12, border: "none", background: "transparent", fontSize: 22, cursor: "pointer" },
  image: { width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 8, marginBottom: 10 },
  title: { margin: "4px 0" },
  meta: { margin: "4px 0", color: "#444" },
  description: { margin: "8px 0 10px" },
  commentsBox: { border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, margin: "12px 0" },
  sectionTitle: { margin: "4px 0 8px" },
  commentItem: { margin: "6px 0", color: "#555", fontSize: 14 },
  map: { width: "100%", height: 260, border: "none", borderRadius: 8 },
  linkButton: { display: "inline-block", marginBottom: 10, padding: "8px 10px", borderRadius: 6, background: "#ff6b35", color: "#fff", textDecoration: "none", fontSize: 14 },
};
