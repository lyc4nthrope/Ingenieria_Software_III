const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

export const MAP_TILE_PROVIDERS = [
  {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" },
  },
  {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: {
      maxZoom: 20,
      subdomains: "abcd",
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    },
  },
];

function getLeaflet() {
  return window.L;
}

export function ensureLeafletLoaded() {
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

export function addTileLayerWithFallback(
  L,
  map,
  { providers = MAP_TILE_PROVIDERS, timeoutMs = 5000, onAllProvidersFailed, onProviderLoaded } = {},
) {
  const timers = [];
  let activeLayer = null;

  const clearTimers = () => {
    timers.forEach((timer) => clearTimeout(timer));
    timers.length = 0;
  };

  const tryProvider = (providerIndex = 0) => {
    if (providerIndex >= providers.length) {
      onAllProvidersFailed?.();
      return;
    }

    const provider = providers[providerIndex];
    activeLayer = L.tileLayer(provider.url, provider.options).addTo(map);

    let loadedTile = false;

    activeLayer.on("tileload", () => {
      loadedTile = true;
      onProviderLoaded?.(providerIndex);
      clearTimers();
    });

    activeLayer.once("tileerror", () => {
      if (loadedTile) return;
      map.removeLayer(activeLayer);
      tryProvider(providerIndex + 1);
    });

    const timer = setTimeout(() => {
      if (loadedTile) return;
      map.removeLayer(activeLayer);
      tryProvider(providerIndex + 1);
    }, timeoutMs);

    timers.push(timer);
  };

  tryProvider();

  return () => {
    clearTimers();
    if (activeLayer && map.hasLayer(activeLayer)) {
      map.removeLayer(activeLayer);
    }
  };
}


const leafletMapUtils = {
  ensureLeafletLoaded,
  addTileLayerWithFallback,
  MAP_TILE_PROVIDERS,
};

export default leafletMapUtils;
