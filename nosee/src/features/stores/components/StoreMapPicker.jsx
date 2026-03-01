import { useCallback, useEffect, useRef, useState } from 'react';
import { useGeoLocation } from '@/features/publications/hooks';

const MAP_HEIGHT = 360;
const DEFAULT_ZOOM = 16;
const DEFAULT_CENTER = { latitude: 4.711, longitude: -74.0721 };
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

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
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = LEAFLET_CSS_URL;
      cssLink.dataset.leafletCss = LEAFLET_CSS_URL;
      document.head.appendChild(cssLink);
    }

    const existingScript = document.querySelector(`script[data-leaflet-js="${LEAFLET_JS_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(getLeaflet()));
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Leaflet desde CDN.')));
      return;
    }

    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.dataset.leafletJs = LEAFLET_JS_URL;
    script.onload = () => {
      if (!getLeaflet()) {
        reject(new Error('Leaflet se cargó, pero no está disponible en window.L.'));
        return;
      }
      resolve(getLeaflet());
    };
    script.onerror = () => reject(new Error('No se pudo cargar Leaflet desde CDN.'));
    document.body.appendChild(script);
  });

  return window.__leafletLoaderPromise;
}

async function reverseGeocode(latitude, longitude) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(latitude));
  url.searchParams.set('lon', String(longitude));

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('No se pudo resolver la dirección para este punto.');
  }

  const data = await response.json();
  return data?.display_name || '';
}

async function geocodeAddress(address) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', address);
  url.searchParams.set('limit', '1');

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('No se pudo ubicar la dirección escrita.');
  }

  const data = await response.json();
  const result = data?.[0];
  if (!result) {
    throw new Error('No encontramos resultados para esa dirección.');
  }

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
}) {
  const [latInput, setLatInput] = useState(latitude ?? '');
  const [lonInput, setLonInput] = useState(longitude ?? '');
  const [addressInput, setAddressInput] = useState(address ?? '');
  const [status, setStatus] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [leafletError, setLeafletError] = useState('');
  const hasInitializedWithGeo = useRef(false);
  const hasAutoCenteredCurrentLocation = useRef(false);
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);

  // ─── Refs para callbacks estables ────────────────────────────────────────────
  // Guardamos la última versión de los callbacks en refs para que el efecto de
  // inicialización del mapa use deps=[] y no destruya/recree el mapa en cada render.
  const onLocationChangeRef = useRef(onLocationChange);
  const onAddressChangeRef = useRef(onAddressChange);

  useEffect(() => {
    onLocationChangeRef.current = onLocationChange;
  }, [onLocationChange]);

  useEffect(() => {
    onAddressChangeRef.current = onAddressChange;
  }, [onAddressChange]);

  const {
    latitude: geoLatitude,
    longitude: geoLongitude,
    loading: geoLoading,
    error: geoError,
    hasLocation,
    refetch,
  } = useGeoLocation({ autoFetch: true, enableHighAccuracy: true });

  const hasCoords = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  // resolveAddressForCurrentPoint usa la ref para no depender de onLocationChange
  const resolveAddressForCurrentPoint = useCallback(async (nextLat, nextLon) => {
    setLoadingAddress(true);
    setStatus('Resolviendo dirección...');
    try {
      const resolvedAddress = await reverseGeocode(nextLat, nextLon);
      onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: resolvedAddress });
      setStatus('Dirección actualizada desde la ubicación seleccionada.');
    } catch (resolveError) {
      setStatus(resolveError.message);
    } finally {
      setLoadingAddress(false);
    }
  }, []); // sin deps: usa siempre la ref actualizada

  const setMarkerPosition = useCallback((nextLat, nextLon, { panTo = true } = {}) => {
    if (!mapInstanceRef.current || !markerRef.current) return;
    markerRef.current.setLatLng([nextLat, nextLon]);
    if (panTo) {
      mapInstanceRef.current.setView([nextLat, nextLon], mapInstanceRef.current.getZoom(), { animate: false });
    }
  }, []);

  // ─── Inicialización del mapa — solo se ejecuta UNA VEZ ───────────────────────
  useEffect(() => {
    let mounted = true;

    const initializeMap = async () => {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      try {
        const L = await ensureLeafletLoaded();
        if (!mounted || !mapContainerRef.current) return;

        // Leer los valores iniciales de los props via ref para no necesitarlos en deps
        const initLat = Number.isFinite(Number(latitude)) ? Number(latitude) : DEFAULT_CENTER.latitude;
        const initLon = Number.isFinite(Number(longitude)) ? Number(longitude) : DEFAULT_CENTER.longitude;

        const map = L.map(mapContainerRef.current, {
          zoomControl: true,
        }).setView([initLat, initLon], DEFAULT_ZOOM);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors',
        }).addTo(map);

        const marker = L.marker([initLat, initLon], { draggable: true }).addTo(map);

        map.on('click', async (event) => {
          const nextLat = Number(event.latlng.lat.toFixed(6));
          const nextLon = Number(event.latlng.lng.toFixed(6));
          marker.setLatLng([nextLat, nextLon]);
          onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: '' });
          await resolveAddressForCurrentPoint(nextLat, nextLon);
        });

        marker.on('dragend', async () => {
          const nextPosition = marker.getLatLng();
          const nextLat = Number(nextPosition.lat.toFixed(6));
          const nextLon = Number(nextPosition.lng.toFixed(6));
          onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: '' });
          await resolveAddressForCurrentPoint(nextLat, nextLon);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      } catch (loadError) {
        if (!mounted) return;
        setLeafletError(loadError.message || 'No se pudo inicializar Leaflet.');
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
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Sincronizar inputs con los props externos ────────────────────────────────
  useEffect(() => { setLatInput(latitude ?? ''); }, [latitude]);
  useEffect(() => { setLonInput(longitude ?? ''); }, [longitude]);
  useEffect(() => { setAddressInput(address ?? ''); }, [address]);

  // ─── Mover el marcador cuando cambian las coordenadas externamente ────────────
  useEffect(() => {
    if (!hasCoords || !mapInstanceRef.current || !markerRef.current) return;
    setMarkerPosition(Number(latitude), Number(longitude), { panTo: true });
  }, [hasCoords, latitude, longitude, setMarkerPosition]);

  // ─── Auto-centrar el mapa al obtener la ubicación del dispositivo (una vez) ──
  useEffect(() => {
    if (hasAutoCenteredCurrentLocation.current) return;
    if (!hasLocation) return;
    if (!mapInstanceRef.current) return;

    const nextLat = Number(Number(geoLatitude).toFixed(6));
    const nextLon = Number(Number(geoLongitude).toFixed(6));
    if (!Number.isFinite(nextLat) || !Number.isFinite(nextLon)) return;

    hasAutoCenteredCurrentLocation.current = true;
    mapInstanceRef.current.setView([nextLat, nextLon], 17, { animate: true });
  }, [hasLocation, geoLatitude, geoLongitude]);

  // ─── Inicializar formData con la ubicación del dispositivo (si no hay coords) ─
  useEffect(() => {
    if (hasInitializedWithGeo.current) return;
    if (!hasLocation) return;
    if (hasCoords) return;
    hasInitializedWithGeo.current = true;
    const nextLat = Number(Number(geoLatitude).toFixed(6));
    const nextLon = Number(Number(geoLongitude).toFixed(6));
    onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: '' });
  }, [hasLocation, hasCoords, geoLatitude, geoLongitude]);

  // ─── Handlers de la UI ───────────────────────────────────────────────────────

  const applyFromCoordinates = async (nextLat, nextLon, { resolveAddress = false } = {}) => {
    setLatInput(String(nextLat));
    setLonInput(String(nextLon));
    onLocationChangeRef.current({ latitude: nextLat, longitude: nextLon, address: '' });
    setMarkerPosition(nextLat, nextLon);
    if (resolveAddress) {
      await resolveAddressForCurrentPoint(nextLat, nextLon);
    }
  };

  const applyManualCoordinates = async () => {
    const parsedLat = Number(latInput);
    const parsedLon = Number(lonInput);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
      setStatus('Ingresa latitud y longitud válidas.');
      return;
    }
    await applyFromCoordinates(parsedLat, parsedLon, { resolveAddress: true });
  };

  const applyAddressSearch = async () => {
    const query = String(addressInput || '').trim();
    if (!query) {
      setStatus('Escribe una dirección para buscarla.');
      return;
    }
    setLoadingAddress(true);
    setStatus('Buscando dirección...');
    try {
      const result = await geocodeAddress(query);
      onAddressChangeRef.current(result.address);
      onLocationChangeRef.current(result);
      setMarkerPosition(result.latitude, result.longitude);
      setStatus('Dirección encontrada y ubicación actualizada.');
    } catch (geocodeError) {
      setStatus(geocodeError.message);
    } finally {
      setLoadingAddress(false);
    }
  };

  // Botón "Usar mi ubicación actual" — usa la Promise de refetch para coordenadas frescas
  const useCurrentLocation = async () => {
    try {
      setStatus('Obteniendo ubicación...');
      const { latitude: nextLat, longitude: nextLon } = await refetch();
      const lat = Number(Number(nextLat).toFixed(6));
      const lon = Number(Number(nextLon).toFixed(6));
      await applyFromCoordinates(lat, lon, { resolveAddress: true });
    } catch (locationError) {
      setStatus(locationError.message || 'No se pudo obtener tu ubicación actual.');
    }
  };

  const osmUrl = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${Number(latitude)}&mlon=${Number(longitude)}#map=18/${Number(latitude)}/${Number(longitude)}`
    : 'https://www.openstreetmap.org';

  return (
    <div style={styles.container}>
      <div style={styles.title}>📍 Ubicación del local</div>

      <div style={styles.row}>
        <input
          type="text"
          value={addressInput}
          placeholder="Ej: Calle 10 #25-30, Bogotá"
          onChange={(event) => {
            const nextAddress = event.target.value;
            setAddressInput(nextAddress);
            onAddressChangeRef.current(nextAddress);
          }}
          style={styles.input}
        />
        <button type="button" onClick={applyAddressSearch} style={styles.button} disabled={loadingAddress}>
          Buscar dirección
        </button>
      </div>

      <div style={styles.map}>
        <div ref={mapContainerRef} style={styles.mapCanvas} />
      </div>

      <div style={styles.row}>
        <input
          type="number"
          step="any"
          value={latInput}
          placeholder="Latitud"
          onChange={(event) => setLatInput(event.target.value)}
          style={styles.input}
        />
        <input
          type="number"
          step="any"
          value={lonInput}
          placeholder="Longitud"
          onChange={(event) => setLonInput(event.target.value)}
          style={styles.input}
        />
        <button type="button" onClick={applyManualCoordinates} style={styles.button} disabled={loadingAddress}>
          Aplicar
        </button>
      </div>

      <div style={styles.row}>
        <button type="button" onClick={useCurrentLocation} style={styles.secondaryButton} disabled={geoLoading || loadingAddress}>
          {geoLoading ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
        </button>
        <a href={osmUrl} target="_blank" rel="noreferrer" style={styles.link}>
          Ver punto en OpenStreetMap
        </a>
      </div>

      {status ? <div style={styles.helper}>{status}</div> : null}
      {geoError ? <div style={styles.helper}>Geo: {geoError}</div> : null}
      {leafletError ? <div style={styles.error}>{leafletError}</div> : null}
      <div style={styles.helper}>Visualizador: Leaflet + OpenStreetMap. Geocodificación: Nominatim (gratis con límites de uso).</div>
      {error ? <div style={styles.error}>{error}</div> : null}
    </div>
  );
}

const styles = {
  container: {
    border: '1px dashed var(--border-color, #d1d5db)',
    borderRadius: '10px',
    padding: '12px',
    display: 'grid',
    gap: '8px',
  },
  title: { fontWeight: 700 },
  map: {
    position: 'relative',
    zIndex: 0,
    width: '100%',
    height: `${MAP_HEIGHT}px`,
    borderRadius: '10px',
    border: '1px solid #93c5fd',
    overflow: 'hidden',
    isolation: 'isolate',
  },
  mapCanvas: {
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  row: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  input: {
    flex: 1,
    minWidth: '120px',
    border: '1px solid var(--border-color, #d1d5db)',
    borderRadius: '8px',
    padding: '10px',
  },
  button: {
    border: '1px solid var(--accent, #2563eb)',
    background: 'var(--accent-soft, #eff6ff)',
    color: 'var(--accent, #2563eb)',
    borderRadius: '8px',
    fontWeight: 600,
    padding: '10px 14px',
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #94a3b8',
    borderRadius: '8px',
    background: '#f8fafc',
    color: '#0f172a',
    width: 'fit-content',
    padding: '8px 12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  link: { fontSize: '12px', color: '#2563eb', fontWeight: 600 },
  helper: { fontSize: '12px', color: 'var(--text-secondary, #6b7280)' },
  error: { fontSize: '12px', color: '#dc2626', fontWeight: 600 },
};
