import { useEffect, useId, useRef, useState } from "react";
import { useLanguage, translateDbValue } from "@/contexts/LanguageContext";
import { useAuthStore, selectAuthUser } from "@/features/auth/store/authStore";
import { addComment, deleteComment, getComments } from "@/services/api/publications.api";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import { playSuccessSound } from "@/utils/celebrationSound";

const DEFAULT_VIRTUAL_IMAGE = "https://via.placeholder.com/1200x800?text=Tienda+virtual";
const DEFAULT_CENTER = { latitude: 4.711, longitude: -74.0721 };
const DEFAULT_ZOOM = 16;
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const parseStoreLocation = (locationValue) => {
  console.log("🔍 parseStoreLocation input:", locationValue, "type:", typeof locationValue);

  if (!locationValue) return { latitude: null, longitude: null };

  // Si es un objeto con coordinates (GeoJSON format)
  if (
    typeof locationValue === "object" &&
    locationValue !== null &&
    Array.isArray(locationValue.coordinates) &&
    locationValue.coordinates.length >= 2
  ) {
    const [longitude, latitude] = locationValue.coordinates;
    const result = { latitude: Number(latitude), longitude: Number(longitude) };
    console.log("✅ Parseado como GeoJSON:", result);
    return result;
  }

  // Si es un string (puede ser WKT o WKB)
  if (typeof locationValue === "string") {
    // Primero intenta WKT (POINT format)
    const pointMatch = locationValue.match(/POINT\s*\(\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\)/i);
    if (pointMatch) {
      const result = {
        longitude: Number(pointMatch[1]),
        latitude: Number(pointMatch[2]),
      };
      console.log("✅ Parseado como WKT:", result);
      return result;
    }

    // Si es hexadecimal (WKB - Well-Known Binary de PostGIS)
    if (/^[0-9a-fA-F]+$/.test(locationValue)) {
      try {
        console.log("🔄 Intentando parsear como WKB...");
        const wkbResult = parseWKB(locationValue);
        if (wkbResult) {
          console.log("✅ Parseado como WKB:", wkbResult);
          return wkbResult;
        }
      } catch (err) {
        console.warn("⚠️ Error decodificando WKB:", err.message);
      }
    }

    console.warn("⚠️ String no coincide con ningún formato conocido:", locationValue);
  }

  console.warn("⚠️ No se pudo parsear location:", locationValue);
  return { latitude: null, longitude: null };
};

// Parse WKB (Well-Known Binary) format from PostGIS
// Format: 01 01000020 E6100000 86CABF9657EA52C0 917F66101F381240
// 01 = little-endian, 01000020 = POINT with SRID, E6100000 = SRID, remaining = coordinates
function parseWKB(hexString) {
  try {
    // Convertir hex string a bytes
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }

    // Crear DataView para leer floats
    const view = new DataView(bytes.buffer);

    // Byte 0: endianness (01 = little-endian)
    const littleEndian = bytes[0] === 1;

    // Bytes 1-4: geometry type (01000020 = POINT with SRID)
    // const geomType = view.getUint32(1, littleEndian);

    // Bytes 5-8: SRID (E6100000 = 4326 en little-endian)
    // const srid = view.getUint32(5, littleEndian);

    // Bytes 9-16: X coordinate (longitude) as double
    const longitude = view.getFloat64(9, littleEndian);

    // Bytes 17-24: Y coordinate (latitude) as double
    const latitude = view.getFloat64(17, littleEndian);

    if (Number.isFinite(longitude) && Number.isFinite(latitude)) {
      return {
        latitude: Number(latitude.toFixed(6)),
        longitude: Number(longitude.toFixed(6)),
      };
    }
  } catch (err) {
    console.error("Error en parseWKB:", err);
  }

  return null;
}
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

function PublicationLocationMap({ latitude, longitude, storeName, td }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState(null);

  // Guardar props en refs para no incluirlas en dependency array
  const propsRef = useRef({ latitude, longitude, storeName });
  useEffect(() => {
    propsRef.current = { latitude, longitude, storeName };
  }, [latitude, longitude, storeName]);

  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      const { latitude: lat, longitude: lon, storeName: name } = propsRef.current;
      console.log("🗺️ Iniciando mapa (UNA SOLA VEZ):", { lat, lon, name });

      if (!mapContainerRef.current) {
        const msg = "Contenedor del mapa no existe";
        console.error(msg);
        if (mounted) setError(msg);
        return;
      }

      const rect = mapContainerRef.current.getBoundingClientRect();
      console.log("📐 Dimensiones del contenedor:", { width: rect.width, height: rect.height });

      if (rect.width === 0 || rect.height === 0) {
        const msg = "El contenedor del mapa no tiene dimensiones (width/height = 0)";
        console.error(msg);
        if (mounted) setError(msg);
        return;
      }

      try {
        console.log("📦 Cargando Leaflet...");
        const L = await ensureLeafletLoaded();
        console.log("✅ Leaflet cargado:", !!L);

        if (!mounted || !mapContainerRef.current) {
          console.warn("Componente desmontado durante carga");
          return;
        }

        if (mapRef.current) {
          console.log("🧹 Removiendo mapa anterior");
          mapRef.current.remove();
          mapRef.current = null;
        }

        const hasCoordinates =
          (lat != null && Number.isFinite(Number(lat))) &&
          (lon != null && Number.isFinite(Number(lon)));

        const markerLat = hasCoordinates ? Number(lat) : DEFAULT_CENTER.latitude;
        const markerLon = hasCoordinates ? Number(lon) : DEFAULT_CENTER.longitude;

        console.log("🎯 Tiene coordenadas válidas:", hasCoordinates);
        console.log("🎯 Coordenadas finales:", { markerLat, markerLon });

        console.log("🗺️ Creando mapa L.map...");
        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
        }).setView([markerLat, markerLon], DEFAULT_ZOOM);
        console.log("✅ Mapa creado");

        console.log("🌍 Añadiendo tile layer OpenStreetMap...");
        const tileLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        });

        tileLayer.on("tileload", () => console.log("✅ Tile cargado"));
        tileLayer.on("tileerror", (err) => console.error("❌ Error cargando tile:", err));

        tileLayer.addTo(map);
        console.log("✅ Tile layer añadido");

        console.log("📍 Añadiendo marcador...");
        const marker = L.marker([markerLat, markerLon], { draggable: false }).addTo(map);

        if (name) {
          marker.bindPopup(`<strong>${name}</strong>`, { autoClose: false });
          marker.openPopup();
          console.log("✅ Popup del marcador configurado");
        }

        console.log("🔧 Llamando invalidateSize...");
        setTimeout(() => {
          if (mapRef.current) {
            map.invalidateSize();
            console.log("✅ invalidateSize ejecutado");
          }
        }, 0);

        mapRef.current = map;
        if (mounted) setError(null);
        console.log("✅ Mapa inicializado correctamente");
      } catch (err) {
        console.error("❌ Error inicializando mapa:", err);
        if (mounted) {
          setError(err.message || "Error desconocido al cargar el mapa");
        }
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      if (mapRef.current) {
        console.log("🧹 Limpiando mapa en cleanup");
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // ← IMPORTANTE: deps vacío para que se ejecute UNA SOLA VEZ

  // ──── Actualizar mapa si las coordenadas se cargan después del mount ──────
  useEffect(() => {
    if (mapRef.current && propsRef.current) {
      const { latitude: lat, longitude: lon } = propsRef.current;

      const hasCoordinates = (lat != null && Number.isFinite(Number(lat))) &&
                             (lon != null && Number.isFinite(Number(lon)));

      if (hasCoordinates) {
        const markerLat = Number(lat);
        const markerLon = Number(lon);
        console.log("🔄 Actualizando mapa a nuevas coordenadas:", { markerLat, markerLon });

        // Delay para asegurar que el mapa esté renderizado
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.setView([markerLat, markerLon], DEFAULT_ZOOM);
            console.log("✅ Mapa centrado en el marcador");
          }
        }, 300);
      }
    }
  }, [latitude, longitude]); // Actualizar cuando cambien las coordenadas

  if (error) {
    return (
      <div style={{ ...styles.map, background: "var(--error-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--error)", padding: "16px", textAlign: "center", fontSize: 12 }}>
          <strong>{td?.mapError ?? "Map error:"}</strong>
          <br />
          {error}
          <br />
          <small style={{ marginTop: 8, display: "block" }}>{td?.mapErrorDetails ?? "Check the console (F12) for more details"}</small>
        </div>
      </div>
    );
  }

  return <div ref={mapContainerRef} style={styles.map} aria-label={td?.mapAria ?? "Store location map"} />;
}

// ─── CommentsSection ──────────────────────────────────────────────────────────

function CommentItem({ comment, currentUser, onReply, onDelete, td, depth }) {
  const isOwn = currentUser && comment.user_id === currentUser.id;
  const userName = comment.user?.full_name || td.unknownUser;
  const time = comment.created_at
    ? new Date(comment.created_at).toLocaleString()
    : "";

  return (
    <div style={{ ...styles.commentItem, marginLeft: depth > 0 ? 20 : 0, borderLeft: depth > 0 ? "2px solid var(--border)" : "none", paddingLeft: depth > 0 ? 10 : 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{userName}</span>
          {time && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{time}</span>}
          <p style={{ margin: "4px 0 6px", fontSize: 14, color: "var(--text-secondary)" }}>{comment.content}</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          {currentUser && depth < 3 && (
            <button
              type="button"
              style={styles.commentActionBtn}
              onClick={() => onReply(comment)}
            >
              {td.replyBtn ?? "Responder"}
            </button>
          )}
          {isOwn && (
            <button
              type="button"
              style={{ ...styles.commentActionBtn, color: "var(--error, #e53)" }}
              onClick={() => onDelete(comment.id)}
            >
              {td.deleteComment ?? "Eliminar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function CommentThread({ comment, byParent, currentUser, onReply, onDelete, td, depth = 0, replyTo, replyText, onReplyTextChange, onSubmitReply, onCancelReply, submitting, replyInputRef }) {
  const replies = byParent[comment.id] || [];
  const isReplyTarget = replyTo?.id === comment.id;
  return (
    <div>
      <CommentItem
        comment={comment}
        currentUser={currentUser}
        onReply={onReply}
        onDelete={onDelete}
        td={td}
        depth={depth}
      />
      {isReplyTarget && (
        <div style={{ marginLeft: 20, marginTop: 4, padding: "8px", background: "var(--bg-muted, var(--bg-surface))", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>
            {td.replyingTo ?? "Respondiendo a"} <strong>{replyTo?.user?.full_name || td.unknownUser}</strong>
          </p>
          <textarea
            ref={replyInputRef}
            value={replyText}
            onChange={(e) => onReplyTextChange(e.target.value)}
            placeholder={td.replyPlaceholder ?? "Escribe tu respuesta..."}
            rows={2}
            maxLength={1000}
            style={styles.commentTextarea}
            disabled={submitting}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button type="button" style={styles.commentCancelBtn} onClick={onCancelReply}>
              {td.cancelReply ?? "Cancelar"}
            </button>
            <button
              type="button"
              style={styles.commentSubmitBtn}
              disabled={submitting || !replyText.trim()}
              onClick={() => onSubmitReply(replyText, replyTo.id)}
            >
              {submitting ? "..." : (td.addCommentBtn ?? "Comentar")}
            </button>
          </div>
        </div>
      )}
      {replies.map((reply) => (
        <CommentThread
          key={reply.id}
          comment={reply}
          byParent={byParent}
          currentUser={currentUser}
          onReply={onReply}
          onDelete={onDelete}
          td={td}
          depth={depth + 1}
          replyTo={replyTo}
          replyText={replyText}
          onReplyTextChange={onReplyTextChange}
          onSubmitReply={onSubmitReply}
          onCancelReply={onCancelReply}
          submitting={submitting}
          replyInputRef={replyInputRef}
        />
      ))}
    </div>
  );
}

function CommentsSection({ publicationId, initialComments, td }) {
  const { t } = useLanguage();
  const currentUser = useAuthStore(selectAuthUser);
  const [comments, setComments] = useState(initialComments || []);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // comment object being replied to
  const [replyText, setReplyText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const replyInputRef = useRef(null);

  // Refresh comments from API on mount
  useEffect(() => {
    let cancelled = false;
    getComments(publicationId).then((result) => {
      if (!cancelled && result.success) setComments(result.data);
    });
    return () => { cancelled = true; };
  }, [publicationId]);

  // Focus reply input when replyTo changes
  useEffect(() => {
    if (replyTo && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [replyTo]);

  // Build comment tree
  const topLevel = comments.filter((c) => !c.parent_id);
  const byParent = {};
  for (const c of comments) {
    if (c.parent_id) {
      if (!byParent[c.parent_id]) byParent[c.parent_id] = [];
      byParent[c.parent_id].push(c);
    }
  }

  const handleSubmit = async (content, parentId) => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError(null);
    const result = await addComment(publicationId, content, parentId);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setComments((prev) => [...prev, result.data]);
    playSuccessSound();
    setShowCelebration(true);
    if (parentId) {
      setReplyTo(null);
      setReplyText("");
    } else {
      setText("");
    }
  };

  const handleDelete = async (commentId) => {
    const result = await deleteComment(commentId);
    if (result.success) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
    setReplyText("");
  };

  return (
    <div style={styles.commentsBox}>
      <h3 style={styles.sectionTitle}>{td.comments}</h3>

      {/* Add comment form */}
      {currentUser ? (
        <div style={{ marginBottom: 12 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={td.commentPlaceholder ?? "Escribe un comentario..."}
            rows={2}
            maxLength={1000}
            style={styles.commentTextarea}
            disabled={submitting}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button
              type="button"
              style={styles.commentSubmitBtn}
              disabled={submitting || !text.trim()}
              onClick={() => handleSubmit(text, null)}
            >
              {submitting ? "..." : (td.addCommentBtn ?? "Comentar")}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10 }}>
          {td.loginToComment}
        </p>
      )}

      {error && <p style={{ color: "var(--error, #e53)", fontSize: 13, marginBottom: 8 }}>{error}</p>}

      {/* Comment list */}
      {comments.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{td.noComments}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {topLevel.map((comment) => (
            <CommentThread
              key={comment.id}
              comment={comment}
              byParent={byParent}
              currentUser={currentUser}
              onReply={handleReply}
              onDelete={handleDelete}
              td={td}
              replyTo={replyTo}
              replyText={replyText}
              onReplyTextChange={setReplyText}
              onSubmitReply={handleSubmit}
              onCancelReply={() => setReplyTo(null)}
              submitting={submitting}
              replyInputRef={replyInputRef}
            />
          ))}
        </div>
      )}
      <CelebrationOverlay
        visible={showCelebration}
        message={t.celebration?.comment || "¡Comentario agregado! +1 punto de reputación"}
        onDone={() => setShowCelebration(false)}
      />
    </div>
  );
}

// ─── PublicationDetailModal ───────────────────────────────────────────────────

export default function PublicationDetailModal({ publication, onClose }) {
  const { t } = useLanguage();
  const td = t.publicationDetail;
  const priceLabel = td?.price || "Precio";
  const storeLabel = td?.storeLabel || "Tienda";
  const titleId = useId();

  const votes = publication?.votes || [];
  const positiveVotes = votes.filter((vote) => Number(vote.vote_type) === 1).length;
  const negativeVotes = votes.filter((vote) => Number(vote.vote_type) === -1).length;
  const initialComments = publication?.comments || [];

  const isVirtualStore = Number(publication?.store?.store_type_id) === 2;
  const hasPhoto = !!publication?.photo_url;
  const mainImage = hasPhoto ? publication.photo_url : DEFAULT_VIRTUAL_IMAGE;
  const { latitude, longitude } = parseStoreLocation(publication?.store?.location);
  const hasCoordinates =
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  return (
    <div style={styles.overlay} onClick={onClose} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={styles.modal}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        aria-hidden="false"
      >
        <button
          type="button"
          style={styles.closeButton}
          onClick={onClose}
          aria-label={td.closeModal ?? "Cerrar"}
        >
          <span aria-hidden="true">✕</span>
        </button>

        <img src={mainImage} alt={publication?.product?.name || td.noName} style={styles.image} />

        <h2 id={titleId} style={styles.title}>{publication?.product?.name || td.noName}</h2>
        <p style={styles.meta}>
          <strong>{td.brandLabel}</strong> {publication?.product?.brand?.name || td.noBrand} ·{" "}
          <strong>{td.categoryLabel}</strong> {translateDbValue(t, 'categories', publication?.product?.category?.name) || td.noCategory}
        </p>
        <p style={styles.meta}>
          <strong>{td.barcodeLabel}</strong> {publication?.product?.barcode || td.noBarcode}
        </p>
        <p style={styles.meta}>
          {td.unit} {publication?.product?.base_quantity || "-"} {publication?.product?.unit_type?.abbreviation || ""}
        </p>
        <p style={styles.meta}>
          <strong>{priceLabel}:</strong> ${Number(publication?.price || 0).toLocaleString("es-CO")}
        </p>
        <p style={styles.meta}>
          <strong>{storeLabel}:</strong> {publication?.store?.name || "-"}
        </p>
        <p style={styles.meta}>
          <strong>Dirección:</strong> {publication?.store?.address || "No disponible"}
        </p>
        {publication?.store?.website_url && (
          <p style={styles.meta}>
            <strong>Sitio web:</strong>{" "}
            <a href={publication.store.website_url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
              {publication.store.website_url}
            </a>
          </p>
        )}
        <p style={styles.description}>{publication?.description || td.noDescription}</p>

        <p style={styles.meta}>
          {td.publishedBy} {publication?.user?.full_name || td.unknownUser} · {td.score} {publication?.user?.reputation_points ?? 0}
        </p>
        <p style={styles.meta}>
          <strong>Fecha:</strong>{" "}
          {publication?.created_at
            ? new Date(publication.created_at).toLocaleString("es-CO")
            : "No disponible"}
        </p>
        <p style={styles.meta}>
          {td.votes}{" "}
          <span aria-hidden="true">👍</span> {positiveVotes} ·{" "}
          <span aria-hidden="true">👎</span> {negativeVotes}
        </p>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ ...styles.sectionTitle, margin: 0 }}>{td.storeLocation}</h3>
            {!isVirtualStore && hasCoordinates && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
                target="_blank"
                rel="noreferrer"
                style={styles.googleMapsBtn}
                aria-label={td.openInGoogleMaps ?? "Abrir en Google Maps"}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                {td.openInGoogleMaps ?? "Abrir en Google Maps"}
              </a>
            )}
          </div>
          {isVirtualStore ? (
            publication?.store?.website_url ? (
              <a
                href={publication.store.website_url}
                target="_blank"
                rel="noreferrer"
                style={styles.linkButton}
              >
                {td.virtualStoreLink}
              </a>
            ) : (
              <p style={styles.commentItem}>{td.noCoordinates}</p>
            )
          ) : hasCoordinates ? (
            <div style={styles.mapWrapper}>
              <PublicationLocationMap latitude={latitude} longitude={longitude} storeName={publication?.store?.name} td={td} />
            </div>
          ) : (
            <p style={styles.commentItem}>{td.noCoordinates}</p>
          )}
        </div>

        <CommentsSection
          publicationId={publication?.id}
          initialComments={initialComments}
          td={td}
        />
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "var(--overlay)", zIndex: 1300, display: "flex", justifyContent: "center", alignItems: "center", padding: "20px" },
  modal: { background: "var(--bg-surface)", color: "var(--text-primary)", width: "min(900px, 100%)", maxHeight: "92vh", overflowY: "auto", borderRadius: "var(--radius-lg)", padding: "16px", position: "relative", border: "1px solid var(--border)" },
  closeButton: { position: "absolute", right: 12, top: 12, border: "2px solid var(--border)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontSize: 18, fontWeight: 800, cursor: "pointer", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 },
  image: { width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: "var(--radius-md)", marginBottom: 10 },
  title: { margin: "4px 0", color: "var(--text-primary)" },
  meta: { margin: "4px 0", color: "var(--text-secondary)" },
  description: { margin: "8px 0 10px", color: "var(--text-secondary)" },
  commentsBox: { border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 12, margin: "12px 0", background: "var(--bg-surface)" },
  sectionTitle: { margin: "4px 0 10px", color: "var(--text-primary)" },
  commentItem: { margin: "6px 0", padding: "6px 0", borderBottom: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 14 },
  commentTextarea: { width: "100%", padding: "8px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "var(--bg-surface)", color: "var(--text-primary)", fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" },
  commentSubmitBtn: { padding: "6px 14px", borderRadius: "var(--radius-md)", border: "none", background: "var(--accent)", color: "var(--text-primary)", fontSize: 13, cursor: "pointer", fontWeight: 600 },
  commentCancelBtn: { padding: "6px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer" },
  commentActionBtn: { padding: "2px 8px", borderRadius: "var(--radius-sm, 4px)", border: "1px solid var(--border)", background: "transparent", color: "var(--accent)", fontSize: 12, cursor: "pointer" },
  mapWrapper: { position: "relative", zIndex: 0, width: "100%", height: 260, borderRadius: "var(--radius-md)", border: "1px solid var(--border)", overflow: "hidden", isolation: "isolate" },
  map: { width: "100%", height: "100%", zIndex: 0 },
  linkButton: { display: "inline-block", marginBottom: 10, padding: "8px 10px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--text-primary)", textDecoration: "none", fontSize: 14 },
  googleMapsBtn: { display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--text-primary)", textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0 },
};
