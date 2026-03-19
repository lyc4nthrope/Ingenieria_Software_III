import { useCallback, useEffect, useRef, useState } from "react";
import { useGeoLocation } from "@/features/publications/hooks";
import { useLanguage } from "@/contexts/LanguageContext";
import { recordGeocodingRequest } from "@/services/metrics";

const MAP_HEIGHT = 340;
const DEFAULT_ZOOM = 16;
const DEFAULT_CENTER = { latitude: 4.711, longitude: -74.0721 };
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
  },
  highContrast: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/attributions">CARTO</a>',
  },
};

function getA11yTileTheme() {
  const classes = document.documentElement.classList;
  if (classes.contains('a11y-light-mode')) return 'light';
  if (classes.contains('a11y-high-contrast') || classes.contains('a11y-smart-contrast')) return 'highContrast';
  return 'dark';
}

function createMarkerIcon(L) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 24 14 24S28 23.333 28 14C28 6.268 21.732 0 14 0z"
          fill="var(--accent)" stroke="var(--bg-surface)" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="var(--bg-surface)" opacity="0.9"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 38],
    iconAnchor: [14, 38],
    popupAnchor: [0, -38],
  });
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
    if (
      !document.querySelector(`link[data-leaflet-css="${LEAFLET_CSS_URL}"]`)
    ) {
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
        reject(new Error("No se pudo cargar Leaflet desde CDN.\nCould not load Leaflet from CDN.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.dataset.leafletJs = LEAFLET_JS_URL;
    script.onload = () => {
      if (!getLeaflet()) {
        reject(
          new Error("Leaflet se cargó, pero no está disponible en window.L."),
        );
        return;
      }
      resolve(getLeaflet());
    };
    script.onerror = () =>
      reject(new Error("No se pudo cargar Leaflet desde CDN.\nCould not load Leaflet from CDN."));
    document.body.appendChild(script);
  }).catch((error) => {
    window.__leafletLoaderPromise = null;
    throw error;
  });

  return window.__leafletLoaderPromise;
}

// Nominatim requiere identificar la aplicación. En entornos browser el header
// User-Agent está restringido por el navegador, pero el Referer se envía
// automáticamente. Usamos Accept-Language para mejorar la calidad de respuesta.
const NOMINATIM_HEADERS = {
  Accept: "application/json",
  "Accept-Language": "es,en;q=0.9",
};

async function reverseGeocode(latitude, longitude) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));

  let response;
  try {
    response = await fetch(url, { headers: NOMINATIM_HEADERS });
  } catch (err) {
    recordGeocodingRequest('failure', 'reverse');
    throw err;
  }

  if (!response.ok) {
    recordGeocodingRequest('failure', 'reverse');
    throw new Error("No se pudo resolver la dirección para este punto.\nCould not resolve the address for this point.");
  }

  const data = await response.json();
  recordGeocodingRequest('success', 'reverse');
  return data?.display_name || "";
}

async function geocodeAddress(address) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", address);
  url.searchParams.set("limit", "1");

  let response;
  try {
    response = await fetch(url, { headers: NOMINATIM_HEADERS });
  } catch (err) {
    recordGeocodingRequest('failure', 'forward');
    throw err;
  }

  if (!response.ok) {
    recordGeocodingRequest('failure', 'forward');
    throw new Error("No se pudo ubicar la dirección escrita.\nCould not locate the typed address.");
  }

  const data = await response.json();
  const result = data?.[0];
  if (!result) {
    recordGeocodingRequest('failure', 'forward');
    throw new Error("No encontramos resultados para esa dirección.\nNo results found for that address.");
  }

  recordGeocodingRequest('success', 'forward');
  return {
    latitude: Number(Number(result.lat).toFixed(6)),
    longitude: Number(Number(result.lon).toFixed(6)),
    address: result.display_name || address,
  };
}

export default function StoreMapPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  onAddressChange,
  error,
  readOnly = false,
}) {
  const { t } = useLanguage();
  const tMapRef = useRef(t.storeMap);
  useEffect(() => {
    tMapRef.current = t.storeMap;
  }, [t]);

  const addressInput = address ?? "";
  const [status, setStatus] = useState("");
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [leafletError, setLeafletError] = useState("");
  const hasInitializedWithGeo = useRef(false);
  const lastExternalSyncRef = useRef("");
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const tileLayerRef = useRef(null);

  const onLocationChangeRef = useRef(onLocationChange);
  const onAddressChangeRef = useRef(onAddressChange);
  const readOnlyRef = useRef(readOnly);

  useEffect(() => { onLocationChangeRef.current = onLocationChange; }, [onLocationChange]);
  useEffect(() => { onAddressChangeRef.current = onAddressChange; }, [onAddressChange]);
  useEffect(() => { readOnlyRef.current = readOnly; }, [readOnly]);

  const {
    latitude: geoLatitude,
    longitude: geoLongitude,
    loading: geoLoading,
    error: geoError,
    hasLocation,
    refetch,
  } = useGeoLocation({ autoFetch: true, enableHighAccuracy: true });

  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude));

  const resolveAddressForCurrentPoint = useCallback(
    async (nextLat, nextLon) => {
      setLoadingAddress(true);
      setStatus(tMapRef.current.statusResolving);
      try {
        const resolvedAddress = await reverseGeocode(nextLat, nextLon);
        onLocationChangeRef.current({
          latitude: nextLat,
          longitude: nextLon,
          address: resolvedAddress,
        });
        setStatus("");
      } catch (resolveError) {
        setStatus(resolveError.message);
      } finally {
        setLoadingAddress(false);
      }
    },
    [],
  );

  const setMarkerPosition = useCallback(
    (nextLat, nextLon, { panTo = true } = {}) => {
      if (!mapInstanceRef.current || !markerRef.current) return;
      markerRef.current.setLatLng([nextLat, nextLon]);
      if (panTo) {
        mapInstanceRef.current.setView(
          [nextLat, nextLon],
          mapInstanceRef.current.getZoom(),
          { animate: false },
        );
      }
    },
    [],
  );

  // ─── Inicialización del mapa — solo se ejecuta UNA VEZ ───────────────────────
  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const L = await ensureLeafletLoaded();
        if (!mounted || !mapContainerRef.current) return;

        const initLat =
          latitude != null && Number.isFinite(Number(latitude))
            ? Number(latitude)
            : DEFAULT_CENTER.latitude;
        const initLon =
          longitude != null && Number.isFinite(Number(longitude))
            ? Number(longitude)
            : DEFAULT_CENTER.longitude;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
        }).setView([initLat, initLon], DEFAULT_ZOOM);

        const initialTheme = getA11yTileTheme();
        const tileCfg = TILE_LAYERS[initialTheme];
        tileLayerRef.current = L.tileLayer(tileCfg.url, {
          attribution: tileCfg.attribution,
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(map);

        const marker = L.marker([initLat, initLon], {
          draggable: !readOnlyRef.current,
          icon: createMarkerIcon(L),
        }).addTo(map);

        setTimeout(() => map.invalidateSize(), 0);

        if (!readOnlyRef.current) {
          map.on("click", async (event) => {
            const nextLat = Number(event.latlng.lat.toFixed(6));
            const nextLon = Number(event.latlng.lng.toFixed(6));
            marker.setLatLng([nextLat, nextLon]);
            if (typeof onLocationChangeRef.current === 'function') {
              onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: "" });
            }
            await resolveAddressForCurrentPoint(nextLat, nextLon);
          });

          marker.on("dragend", async () => {
            const nextPosition = marker.getLatLng();
            const nextLat = Number(nextPosition.lat.toFixed(6));
            const nextLon = Number(nextPosition.lng.toFixed(6));
            if (typeof onLocationChangeRef.current === 'function') {
              onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: "" });
            }
            await resolveAddressForCurrentPoint(nextLat, nextLon);
          });
        }

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } catch (loadError) {
        if (!mounted) return;
        setLeafletError(loadError.message || "No se pudo inicializar Leaflet.\nCould not initialize Leaflet.");
      }
    };

    initializeMap();

    return () => {
      mounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      markerRef.current = null;
      tileLayerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Observar cambios de accesibilidad y cambiar tile layer ──────────────────
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const map = mapInstanceRef.current;
      const L = window.L;
      if (!map || !L || !tileLayerRef.current) return;

      const theme = getA11yTileTheme();
      const tileCfg = TILE_LAYERS[theme];
      tileLayerRef.current.remove();
      tileLayerRef.current = L.tileLayer(tileCfg.url, {
        attribution: tileCfg.attribution,
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      if (markerRef.current) {
        markerRef.current.setIcon(createMarkerIcon(L));
      }
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // ─── Inicializar con ubicación del dispositivo (si no hay coords) ─────────────
  useEffect(() => {
    if (hasInitializedWithGeo.current) return;
    if (!hasLocation) return;
    if (hasCoords) return;
    hasInitializedWithGeo.current = true;
    const nextLat = Number(Number(geoLatitude).toFixed(6));
    const nextLon = Number(Number(geoLongitude).toFixed(6));
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLon)) return;
    if (!readOnlyRef.current && typeof onLocationChangeRef.current === 'function') {
      onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: "" });
    }
    setMarkerPosition(nextLat, nextLon);
  }, [hasLocation, hasCoords, geoLatitude, geoLongitude, setMarkerPosition]);

  // Sincronizar marcador cuando coordenadas externas cambian
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    if (!hasCoords) return;
    const nextLat = Number(latitude);
    const nextLon = Number(longitude);
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLon)) return;
    const signature = `${nextLat.toFixed(6)}:${nextLon.toFixed(6)}`;
    if (lastExternalSyncRef.current === signature) return;
    lastExternalSyncRef.current = signature;
    markerRef.current.setLatLng([nextLat, nextLon]);
    mapInstanceRef.current.setView([nextLat, nextLon], mapInstanceRef.current.getZoom(), { animate: false });
  }, [hasCoords, latitude, longitude]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const applyFromCoordinates = async (nextLat, nextLon, { resolveAddress = false } = {}) => {
    onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: "" });
    setMarkerPosition(nextLat, nextLon);
    if (resolveAddress) {
      await resolveAddressForCurrentPoint(nextLat, nextLon);
    }
  };

  const applyAddressSearch = async () => {
    const query = String(addressInput || "").trim();
    if (!query) {
      setStatus(tMapRef.current.statusNoAddress);
      return;
    }
    setLoadingAddress(true);
    setStatus(tMapRef.current.statusSearching);
    try {
      const result = await geocodeAddress(query);
      onAddressChangeRef.current(result.address);
      onLocationChangeRef.current(result);
      setMarkerPosition(result.latitude, result.longitude);
      setStatus("");
    } catch (geocodeError) {
      setStatus(geocodeError.message);
    } finally {
      setLoadingAddress(false);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setStatus(tMapRef.current.statusGetting);
      const { latitude: nextLat, longitude: nextLon } = await refetch();
      const lat = Number(Number(nextLat).toFixed(6));
      const lon = Number(Number(nextLon).toFixed(6));
      await applyFromCoordinates(lat, lon, { resolveAddress: true });
    } catch (locationError) {
      setStatus(locationError.message || tMapRef.current.statusGetting);
    }
  };

  const centerMap = () => {
    const parsedLat = Number(latitude);
    const parsedLon = Number(longitude);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon) || !mapInstanceRef.current) {
      setStatus(tMapRef.current.statusCenterSelect);
      return;
    }
    setMarkerPosition(parsedLat, parsedLon, { panTo: true });
  };

  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${Number(latitude)}&mlon=${Number(longitude)}#map=18/${Number(latitude)}/${Number(longitude)}`
    : "https://www.openstreetmap.org";

  const tm = t.storeMap;

  return (
    <div style={styles.container}>
      {/* Mapa con botones flotantes */}
      <div style={styles.mapWrapper} className="store-map-container" role="region" aria-label={tm.title}>
        <div ref={mapContainerRef} style={styles.mapCanvas} />
        {!readOnly && (
          <div style={styles.mapControls}>
            <button
              type="button"
              onClick={useCurrentLocation}
              style={{
                ...styles.mapBtn,
                opacity: (geoLoading || loadingAddress) ? 0.5 : 1,
              }}
              disabled={geoLoading || loadingAddress}
              aria-label={geoLoading ? tm.gettingLocation : tm.useLocationBtn}
              title={geoLoading ? tm.gettingLocation : tm.useLocationBtn}
            >
              <span style={styles.mapBtnIcon}>📍</span>
              <span style={styles.mapBtnLabel}>
                {geoLoading ? '…' : tm.btnLabelLocate}
              </span>
            </button>
            <button
              type="button"
              onClick={centerMap}
              style={{
                ...styles.mapBtn,
                opacity: loadingAddress ? 0.5 : 1,
              }}
              disabled={loadingAddress}
              aria-label={tm.centerMap}
              title={tm.centerMap}
            >
              <span style={styles.mapBtnIcon}>⊕</span>
              <span style={styles.mapBtnLabel}>{tm.btnLabelCenter}</span>
            </button>
          </div>
        )}
      </div>

      {/* Dirección debajo del mapa */}
      {!readOnly && (
        <div style={styles.addressRow}>
          <input
            type="text"
            aria-label={tm.addressPlaceholder}
            value={addressInput}
            placeholder={tm.addressPlaceholder}
            onChange={(e) => onAddressChangeRef.current(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyAddressSearch()}
            style={styles.addressInput}
          />
          <button
            type="button"
            aria-label={tm.searchBtn}
            onClick={applyAddressSearch}
            style={styles.searchBtn}
            disabled={loadingAddress}
          >
            {loadingAddress ? '…' : tm.searchBtn}
          </button>
        </div>
      )}

      {readOnly && (
        <div style={styles.addressRow}>
          {address && <span style={styles.addressText}>{address}</span>}
          {hasCoords && (
            <a href={osmUrl} target="_blank" rel="noreferrer" style={styles.osmLink}>
              {tm.viewOSM}
            </a>
          )}
        </div>
      )}

      {!readOnly && status && <div style={styles.helper}>{status}</div>}
      {!readOnly && geoError && <div style={styles.helper}>{tm.geoPrefix} {geoError}</div>}
      {leafletError && <div style={styles.error}>{leafletError}</div>}
      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  mapWrapper: {
    position: "relative",
    zIndex: 0,
    width: "100%",
    height: `${MAP_HEIGHT}px`,
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    overflow: "hidden",
    isolation: "isolate",
  },
  mapCanvas: {
    width: "100%",
    height: "100%",
    zIndex: 0,
  },
  mapControls: {
    position: "absolute",
    bottom: "10px",
    right: "10px",
    zIndex: 800,
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  mapBtn: {
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "6px",
    minWidth: "48px",
    padding: "6px 4px 5px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    boxShadow: "var(--shadow-md)",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
  },
  mapBtnIcon: {
    fontSize: "17px",
    lineHeight: 1,
  },
  mapBtnLabel: {
    fontSize: "9px",
    color: "var(--text-muted)",
    lineHeight: 1,
    fontWeight: 500,
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
  },
  addressRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  addressInput: {
    flex: 1,
    minWidth: 0,
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontFamily: "inherit",
    outline: "none",
  },
  addressText: {
    flex: 1,
    fontSize: "13px",
    color: "var(--text-secondary)",
  },
  searchBtn: {
    border: "1px solid var(--accent)",
    background: "var(--accent-soft)",
    color: "var(--accent)",
    borderRadius: "var(--radius-sm)",
    fontWeight: 600,
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "13px",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  },
  osmLink: {
    fontSize: "12px",
    color: "var(--accent)",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  helper: { fontSize: "12px", color: "var(--text-muted)" },
  error: { fontSize: "12px", color: "var(--error)", fontWeight: 600 },
};
