import { useEffect, useMemo, useRef, useState } from 'react';
import { useGeoLocation } from '@/features/publications/hooks';

const MAP_WIDTH = 640;
const MAP_HEIGHT = 280;
const ENABLE_CLIENT_REVERSE_GEOCODE = import.meta.env.VITE_ENABLE_CLIENT_REVERSE_GEOCODE === 'true';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pointToCoordinates(x, y, width, height) {
  const longitude = (x / width) * 360 - 180;
  const latitude = 90 - (y / height) * 180;
  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

function coordinatesToPoint(latitude, longitude, width, height) {
  const x = ((Number(longitude) + 180) / 360) * width;
  const y = ((90 - Number(latitude)) / 180) * height;
  return { x: clamp(x, 0, width), y: clamp(y, 0, height) };
}

async function reverseGeocode(latitude, longitude) {
  if (!ENABLE_CLIENT_REVERSE_GEOCODE) return '';

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=jsonv2`,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) return '';

    const data = await response.json();
    return data?.display_name || '';
  } catch {
    return '';
  }
}

export default function StoreMapPicker({ latitude, longitude, onLocationChange, error }) {
  const [latInput, setLatInput] = useState(latitude ?? '');
  const [lonInput, setLonInput] = useState(longitude ?? '');
  const [isDragging, setIsDragging] = useState(false);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const hasInitializedWithGeo = useRef(false);

  const {
    latitude: geoLatitude,
    longitude: geoLongitude,
    loading: geoLoading,
    error: geoError,
    hasLocation,
    refetch,
  } = useGeoLocation({ autoFetch: true, enableHighAccuracy: true });

  const markerPoint = useMemo(() => {
    if (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) return null;
    return coordinatesToPoint(latitude, longitude, MAP_WIDTH, MAP_HEIGHT);
  }, [latitude, longitude]);

  useEffect(() => {
    if (hasInitializedWithGeo.current) return;
    if (!hasLocation) return;
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) return;

    hasInitializedWithGeo.current = true;
    const nextLat = Number(Number(geoLatitude).toFixed(6));
    const nextLon = Number(Number(geoLongitude).toFixed(6));

    onLocationChange({ latitude: nextLat, longitude: nextLon, address: '' });
  }, [hasLocation, geoLatitude, geoLongitude, latitude, longitude, onLocationChange]);

  const setLocationWithoutGeocoding = (nextLat, nextLon) => {
    onLocationChange({ latitude: nextLat, longitude: nextLon, address: '' });
  };

  const resolveAddressForCurrentPoint = async (nextLat, nextLon) => {
    if (!ENABLE_CLIENT_REVERSE_GEOCODE) return;

    setResolvingAddress(true);
    const address = await reverseGeocode(nextLat, nextLon);
    setResolvingAddress(false);

    if (address) {
      onLocationChange({ latitude: nextLat, longitude: nextLon, address });
    }
  };

  const applyFromCoordinates = async (nextLat, nextLon, { resolveAddress = false } = {}) => {
    setLatInput(String(nextLat));
    setLonInput(String(nextLon));
    setLocationWithoutGeocoding(nextLat, nextLon);

    if (resolveAddress) {
      await resolveAddressForCurrentPoint(nextLat, nextLon);
    }
  };

  const applyFromClick = async (clientX, clientY, element, { resolveAddress = false } = {}) => {
    const rect = element.getBoundingClientRect();
    const x = clamp(clientX - rect.left, 0, rect.width);
    const y = clamp(clientY - rect.top, 0, rect.height);

    const { latitude: nextLat, longitude: nextLon } = pointToCoordinates(x, y, rect.width, rect.height);
    await applyFromCoordinates(nextLat, nextLon, { resolveAddress });
  };

  const handleMapClick = async (event) => {
    await applyFromClick(event.clientX, event.clientY, event.currentTarget, { resolveAddress: true });
  };

  const handlePointerDown = (event) => {
    if (!markerPoint) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = async (event) => {
    if (!isDragging) return;
    await applyFromClick(event.clientX, event.clientY, event.currentTarget, { resolveAddress: false });
  };

  const handlePointerUp = async (event) => {
    if (!isDragging) return;
    setIsDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      await resolveAddressForCurrentPoint(Number(latitude), Number(longitude));
    }
  };

  const applyManualCoordinates = async () => {
    const parsedLat = Number(latInput);
    const parsedLon = Number(lonInput);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) return;

    await applyFromCoordinates(parsedLat, parsedLon, { resolveAddress: true });
  };

  const useCurrentLocation = async () => {
    await refetch();

    if (!Number.isFinite(Number(geoLatitude)) || !Number.isFinite(Number(geoLongitude))) {
      return;
    }

    const nextLat = Number(Number(geoLatitude).toFixed(6));
    const nextLon = Number(Number(geoLongitude).toFixed(6));
    await applyFromCoordinates(nextLat, nextLon, { resolveAddress: true });
  };

  return (
    <div style={styles.container}>
      <div style={styles.title}>📍 Ubicación del local</div>

      <div
        style={styles.map}
        role="button"
        tabIndex={0}
        onClick={handleMapClick}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div style={styles.grid} />
        <div style={styles.hint}>Haz click en el mapa o arrastra el marcador</div>
        {markerPoint ? (
          <button
            type="button"
            style={{ ...styles.marker, left: `${markerPoint.x}px`, top: `${markerPoint.y}px` }}
            onPointerDown={handlePointerDown}
            aria-label="Marcador de ubicación"
          />
        ) : null}
      </div>

      <div style={styles.row}>
        <input
          type="number"
          step="any"
          value={latitude ?? latInput}
          placeholder="Latitud"
          onChange={(e) => setLatInput(e.target.value)}
          style={styles.input}
        />
        <input
          type="number"
          step="any"
          value={longitude ?? lonInput}
          placeholder="Longitud"
          onChange={(e) => setLonInput(e.target.value)}
          style={styles.input}
        />
        <button type="button" onClick={applyManualCoordinates} style={styles.button}>
          Aplicar
        </button>
      </div>

      <button type="button" onClick={useCurrentLocation} style={styles.secondaryButton}>
        {geoLoading ? 'Obteniendo ubicación…' : 'Usar mi ubicación actual'}
      </button>

      {resolvingAddress ? <div style={styles.helper}>Resolviendo dirección…</div> : null}
      {geoError ? <div style={styles.helper}>Geo: {geoError}</div> : null}
      <div style={styles.helper}>
        Reverse geocoding en cliente está deshabilitado por defecto para evitar CORS/429 de Nominatim.
      </div>
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
    width: '100%',
    maxWidth: `${MAP_WIDTH}px`,
    height: `${MAP_HEIGHT}px`,
    background: 'linear-gradient(180deg, #c7e9ff 0%, #a7f3d0 100%)',
    borderRadius: '10px',
    border: '1px solid #93c5fd',
    cursor: 'crosshair',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute',
    inset: 0,
    backgroundImage:
      'linear-gradient(to right, rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.35) 1px, transparent 1px)',
    backgroundSize: '32px 32px',
  },
  hint: {
    position: 'absolute',
    top: 8,
    left: 8,
    fontSize: '12px',
    fontWeight: 600,
    color: '#0f172a',
    background: 'rgba(255,255,255,0.85)',
    padding: '4px 8px',
    borderRadius: '999px',
  },
  marker: {
    position: 'absolute',
    transform: 'translate(-50%, -100%)',
    width: '18px',
    height: '18px',
    borderRadius: '999px',
    border: '2px solid #fff',
    background: '#ef4444',
    boxShadow: '0 2px 8px rgba(0,0,0,.25)',
    cursor: 'grab',
  },
  row: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
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
  helper: { fontSize: '12px', color: 'var(--text-secondary, #6b7280)' },
  error: { fontSize: '12px', color: '#dc2626', fontWeight: 600 },
};
