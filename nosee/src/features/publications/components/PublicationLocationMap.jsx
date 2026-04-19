/**
 * PublicationLocationMap.jsx
 *
 * Standalone Leaflet map component for store location.
 * Extracted from PublicationDetailModal.jsx.
 *
 * Props:
 *   latitude  {number|null}
 *   longitude {number|null}
 *   storeName {string|undefined}
 *   td        {object} — t.publicationDetail translation dict
 *
 * NOTE: This component does NOT apply a CSS filter.
 * The parent wrapper must apply: filter: brightness(0.5) contrast(1.25) saturate(0.3)
 */

import { useEffect, useRef, useState } from "react";

const DEFAULT_CENTER = { latitude: 4.711, longitude: -74.0721 };
const DEFAULT_ZOOM = 16;
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

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
      `script[data-leaflet-js="${LEAFLET_JS_URL}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(getLeaflet()));
      existingScript.addEventListener("error", () =>
        reject(new Error("No se pudo cargar Leaflet desde CDN."))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.dataset.leafletJs = LEAFLET_JS_URL;
    script.onload = () => resolve(getLeaflet());
    script.onerror = () =>
      reject(new Error("No se pudo cargar Leaflet desde CDN."));
    document.body.appendChild(script);
  }).catch((error) => {
    window.__leafletLoaderPromise = null;
    throw error;
  });

  return window.__leafletLoaderPromise;
}

const mapStyles = {
  wrapper: {
    position: "relative",
    width: "100%",
    height: "100%",
    zIndex: 0,
    isolation: "isolate",
  },
  map: {
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
};

export default function PublicationLocationMap({ latitude, longitude, storeName, td }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState(null);

  const propsRef = useRef({ latitude, longitude, storeName });
  useEffect(() => {
    propsRef.current = { latitude, longitude, storeName };
  }, [latitude, longitude, storeName]);

  // Initialize map once on mount
  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      const { latitude: lat, longitude: lon, storeName: name } = propsRef.current;

      if (!mapContainerRef.current) {
        if (mounted) setError("Contenedor del mapa no existe");
        return;
      }

      const rect = mapContainerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        if (mounted) setError("El contenedor del mapa no tiene dimensiones");
        return;
      }

      try {
        const L = await ensureLeafletLoaded();

        if (!mounted || !mapContainerRef.current) return;

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const hasCoordinates =
          lat != null &&
          Number.isFinite(Number(lat)) &&
          lon != null &&
          Number.isFinite(Number(lon));

        const markerLat = hasCoordinates ? Number(lat) : DEFAULT_CENTER.latitude;
        const markerLon = hasCoordinates ? Number(lon) : DEFAULT_CENTER.longitude;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
        }).setView([markerLat, markerLon], DEFAULT_ZOOM);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        const marker = L.marker([markerLat, markerLon], { draggable: false }).addTo(map);

        if (name) {
          marker.bindPopup(`<strong>${name}</strong>`, { autoClose: false });
          marker.openPopup();
        }

        setTimeout(() => {
          if (mapRef.current) {
            map.invalidateSize();
          }
        }, 0);

        mapRef.current = map;
        if (mounted) setError(null);
      } catch (err) {
        if (mounted) {
          setError(err.message || "Error desconocido al cargar el mapa");
        }
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update map view when coordinates change after mount
  useEffect(() => {
    if (mapRef.current && propsRef.current) {
      const { latitude: lat, longitude: lon } = propsRef.current;
      const hasCoordinates =
        lat != null &&
        Number.isFinite(Number(lat)) &&
        lon != null &&
        Number.isFinite(Number(lon));

      if (hasCoordinates) {
        setTimeout(() => {
          if (mapRef.current) {
            mapRef.current.setView([Number(lat), Number(lon)], DEFAULT_ZOOM);
          }
        }, 300);
      }
    }
  }, [latitude, longitude]);

  if (error) {
    return (
      <div
        style={{
          ...mapStyles.map,
          background: "var(--error-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            color: "var(--error)",
            padding: "16px",
            textAlign: "center",
            fontSize: 12,
          }}
        >
          <strong>{td?.mapError ?? "Map error:"}</strong>
          <br />
          {error}
          <br />
          <small style={{ marginTop: 8, display: "block" }}>
            {td?.mapErrorDetails ?? "Check the console (F12) for more details"}
          </small>
        </div>
      </div>
    );
  }

  return (
    <div style={mapStyles.wrapper}>
      <div
        ref={mapContainerRef}
        style={mapStyles.map}
        role="img"
        aria-label={td?.mapAria ?? "Store location map"}
      />
    </div>
  );
}
