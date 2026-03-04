import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

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
      <div style={{ ...styles.map, background: "#fee", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#c33", padding: "16px", textAlign: "center", fontSize: 12 }}>
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


export default function PublicationDetailModal({ publication, onClose }) {
  const { t } = useLanguage();
  const td = t.publicationDetail;
  const titleId = useId();

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
    <div style={styles.overlay} onClick={onClose} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={styles.modal}
        onClick={(event) => event.stopPropagation()}
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

        {isVirtualStore && publication?.store?.website_url && (
          <a href={publication.store.website_url} target="_blank" rel="noreferrer" style={styles.linkButton}>
            {td.virtualStoreLink}
          </a>
        )}

        <h2 id={titleId} style={styles.title}>{publication?.product?.name || td.noName}</h2>
        <p style={styles.meta}>
          {td.unit} {publication?.product?.base_quantity || "-"} {publication?.product?.unit_type?.abbreviation || ""}
        </p>
        <p style={styles.description}>{publication?.description || td.noDescription}</p>

        <p style={styles.meta}>
          {td.publishedBy} {publication?.user?.full_name || td.unknownUser} · {td.score} {publication?.user?.reputation_points ?? 0}
        </p>
        <p style={styles.meta}>
          {td.votes}{" "}
          <span aria-hidden="true">👍</span> {positiveVotes} ·{" "}
          <span aria-hidden="true">👎</span> {negativeVotes}
        </p>

        <div style={styles.commentsBox}>
          <h3 style={styles.sectionTitle}>{td.comments}</h3>
          {comments.length === 0 ? (
            <p style={styles.commentItem}>{td.noComments}</p>
          ) : (
            comments.map((comment) => (
              <p key={comment.id} style={styles.commentItem}>
                <strong>{comment.user?.full_name || td.unknownUser}:</strong> {comment.content || comment.comment || ""}
              </p>
            ))
          )}
        </div>

        <div>
          <h3 style={styles.sectionTitle}>{td.storeLocation}</h3>
          {hasCoordinates ? (
            <div style={styles.mapWrapper}>
              <PublicationLocationMap latitude={latitude} longitude={longitude} storeName={publication?.store?.name} td={td} />
            </div>
          ) : (
            <p style={styles.commentItem}>{td.noCoordinates}</p>
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
  mapWrapper: { position: "relative", zIndex: 0, width: "100%", height: 260, borderRadius: 8, border: "1px solid #93c5fd", overflow: "hidden", isolation: "isolate" },
  map: { width: "100%", height: "100%", zIndex: 0 },
  linkButton: { display: "inline-block", marginBottom: 10, padding: "8px 10px", borderRadius: 6, background: "#ff6b35", color: "#fff", textDecoration: "none", fontSize: 14 },
};
