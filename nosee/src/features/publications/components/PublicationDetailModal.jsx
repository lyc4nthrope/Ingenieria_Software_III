import { useEffect, useRef } from "react";

const DEFAULT_VIRTUAL_IMAGE = "https://via.placeholder.com/1200x800?text=Tienda+virtual";
const DEFAULT_CENTER = { latitude: 4.711, longitude: -74.0721 };
const DEFAULT_ZOOM = 16;
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

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
function getLeaflet() {
  return window.L;
}

  function ensureLeafletLoaded() {
  if (getLeaflet()) return Promise.resolve(getLeaflet());

  if (window.__leafletLoaderPromise) {
    return window.__leafletLoaderPromise;
  }

  window.__leafletLoaderPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[data-leaflet-css="${LEAFLET_CSS_URL}"]`)) {
      const cssLink = document.createElement("link");
      cssLink.rel = "stylesheet";
      cssLink.href = LEAFLET_CSS_URL;
      cssLink.dataset.leafletCss = LEAFLET_CSS_URL;
      document.head.appendChild(cssLink);
    }

    const existingScript = document.querySelector(
      `script[data-leaflet-js="${LEAFLET_JS_URL}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(getLeaflet()));
      existingScript.addEventListener("error", () =>
        reject(new Error("No se pudo cargar Leaflet desde CDN.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.dataset.leafletJs = LEAFLET_JS_URL;
    script.onload = () => resolve(getLeaflet());
    script.onerror = () => reject(new Error("No se pudo cargar Leaflet desde CDN."));
    document.body.appendChild(script);
  }).catch((error) => {
    window.__leafletLoaderPromise = null;
    throw error;
  });

  return window.__leafletLoaderPromise;
}

function PublicationLocationMap({ latitude, longitude }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      if (!mapContainerRef.current) return;

      try {
        const L = await ensureLeafletLoaded();
        if (!mounted || !mapContainerRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const hasCoordinates =
          Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
        const markerLat = hasCoordinates ? Number(latitude) : DEFAULT_CENTER.latitude;
        const markerLon = hasCoordinates ? Number(longitude) : DEFAULT_CENTER.longitude;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
          dragging: true,
          scrollWheelZoom: false,
          doubleClickZoom: true,
        }).setView([markerLat, markerLon], DEFAULT_ZOOM);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        L.marker([markerLat, markerLon], { draggable: false }).addTo(map);

        setTimeout(() => map.invalidateSize(), 0);
        mapRef.current = map;
      } catch {
        // Si Leaflet falla, el mensaje de error ya se muestra fuera del mapa.
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude]);

  return <div ref={mapContainerRef} style={styles.map} aria-label="Mapa de ubicación de tienda" />;
}


export default function PublicationDetailModal({ publication, onClose }) {
  const votes = publication?.votes || [];
  const positiveVotes = votes.filter((vote) => Number(vote.vote_type) === 1).length;
  const negativeVotes = votes.filter((vote) => Number(vote.vote_type) === -1).length;
  const comments = publication?.comments || [];

  const isVirtualStore = Number(publication?.store?.store_type_id) === 2;
  const hasPhoto = !!publication?.photo_url && !isVirtualStore;
  const mainImage = hasPhoto ? publication.photo_url : DEFAULT_VIRTUAL_IMAGE;
  const { latitude, longitude } = parseStoreLocation(publication?.store?.location);
    const hasCoordinates =
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

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
           {hasCoordinates ? (
            <PublicationLocationMap latitude={latitude} longitude={longitude} />
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
  map: { width: "100%", height: 260, border: "none", borderRadius: 8, overflow: "hidden" },
  linkButton: { display: "inline-block", marginBottom: 10, padding: "8px 10px", borderRadius: 6, background: "#ff6b35", color: "#fff", textDecoration: "none", fontSize: 14 },
};
