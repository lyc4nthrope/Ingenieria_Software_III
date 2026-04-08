/**
 * DeliveryMapPicker.jsx
 *
 * Mapa interactivo para el formulario de domicilio:
 *  - Marker draggable para el punto de entrega (acento)
 *  - Markers de tiendas del resultado (no draggables, con popup de nombre)
 *  - Botón GPS flotante
 *  - geocodeAndMove(query) expuesto via ref para que el campo dirección mueva el marker
 */
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ensureLeafletLoaded } from '@/services/utils/leafletLoader';
import { parseStoreCoords } from '@/features/orders/utils/parseStoreCoords';

const DEFAULT_CENTER = { lat: 4.711, lng: -74.0721 }; // Bogotá
const MAP_HEIGHT = 220;
const DEFAULT_ZOOM = 14;

const NOMINATIM = {
  headers: { Accept: 'application/json', 'Accept-Language': 'es,en;q=0.9' },
};

async function forwardGeocode(query) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  const res = await fetch(url, { headers: NOMINATIM.headers });
  if (!res.ok) throw new Error('No se pudo buscar la dirección.');
  const data = await res.json();
  if (!data[0]) throw new Error('No encontramos esa dirección en el mapa.');
  return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
}

// ── Iconos ────────────────────────────────────────────────────────────────────

function createDeliveryIcon(L) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 9.333 14 24 14 24S28 23.333 28 14C28 6.268 21.732 0 14 0z"
          fill="var(--accent)" stroke="var(--bg-surface)" stroke-width="1.5"/>
    <circle cx="14" cy="14" r="5" fill="var(--bg-surface)" opacity="0.9"/>
  </svg>`;
  return L.divIcon({ html: svg, className: '', iconSize: [28, 38], iconAnchor: [14, 38] });
}

function createStoreIcon(L, isOnline) {
  const emoji = isOnline ? '🌐' : '🏪';
  return L.divIcon({
    html: `<div style="
      background:var(--bg-surface);
      border:2px solid var(--border);
      border-radius:6px;
      padding:3px 5px;
      font-size:16px;
      line-height:1;
      box-shadow:0 2px 6px rgba(0,0,0,.35);
      white-space:nowrap;
    ">${emoji}</div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -34],
  });
}

// ── Componente ────────────────────────────────────────────────────────────────

export const DeliveryMapPicker = forwardRef(function DeliveryMapPicker(
  { initialCoords, stores = [], onChange, deliveryFee = null },
  ref,
) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  const markerRef     = useRef(null);
  const onChangeRef   = useRef(onChange);
  const storesRef     = useRef(stores);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { storesRef.current   = stores;   }, [stores]);

  const [locating,  setLocating]  = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [error,     setError]     = useState(null);

  // ── API pública expuesta al padre ─────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    async geocodeAndMove(query) {
      const q = query?.trim();
      if (!q) return;
      setGeocoding(true);
      setError(null);
      try {
        const { lat, lng } = await forwardGeocode(q);
        moveTo(lat, lng);
      } catch (e) {
        setError(e.message);
      } finally {
        setGeocoding(false);
      }
    },
  }));

  // ── Helper: mover marker + mapa + emitir ─────────────────────────────────
  function moveTo(lat, lng) {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], DEFAULT_ZOOM, { animate: true });
    }
    onChangeRef.current?.({ lat, lng });
  }

  // ── Inicialización del mapa — solo una vez ────────────────────────────────
  useEffect(() => {
    let mounted = true;

    ensureLeafletLoaded().then((L) => {
      if (!mounted || !containerRef.current || mapRef.current) return;

      const center = initialCoords ?? DEFAULT_CENTER;

      const map = L.map(containerRef.current, { zoomControl: true })
        .setView([center.lat, center.lng], DEFAULT_ZOOM);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Marker de entrega (draggable)
      const deliveryMarker = L.marker([center.lat, center.lng], {
        draggable: true,
        icon: createDeliveryIcon(L),
        zIndexOffset: 1000,
      }).addTo(map);

      const emit = (latlng) => {
        const lat = Number(latlng.lat.toFixed(6));
        const lng = Number(latlng.lng.toFixed(6));
        onChangeRef.current?.({ lat, lng });
      };

      deliveryMarker.on('dragend', () => emit(deliveryMarker.getLatLng()));
      map.on('click', (e) => {
        deliveryMarker.setLatLng(e.latlng);
        emit(e.latlng);
      });

      // Markers de tiendas (estáticos)
      for (const s of storesRef.current) {
        const coords = parseStoreCoords(s.store?.location);
        if (!coords) continue;
        const isOnline = Number(s.store?.store_type_id) === 2;
        const name = s.store?.name ?? 'Tienda';
        L.marker([coords.lat, coords.lng], {
          draggable: false,
          icon: createStoreIcon(L, isOnline),
        })
          .bindPopup(`<strong style="font-size:13px">${name}</strong>`)
          .addTo(map);
      }

      setTimeout(() => map.invalidateSize(), 0);

      mapRef.current    = map;
      markerRef.current = deliveryMarker;

      emit(deliveryMarker.getLatLng());
    }).catch(() => {
      if (mounted) setError('No se pudo cargar el mapa.');
    });

    return () => {
      mounted = false;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      markerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── GPS ───────────────────────────────────────────────────────────────────
  const handleGPS = () => {
    if (!navigator.geolocation) { setError('GPS no disponible en este dispositivo.'); return; }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        moveTo(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6)));
      },
      () => { setLocating(false); setError('No se pudo obtener tu ubicación GPS.'); },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  const busy = locating || geocoding;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <div style={{
        position: 'relative',
        borderRadius: 'var(--radius-sm)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        <div ref={containerRef} style={{ width: '100%', height: `${MAP_HEIGHT}px` }} />

        {/* Costo de domicilio — overlay inferior izquierdo */}
        {deliveryFee !== null && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            zIndex: 800,
            background: 'var(--bg-surface)',
            border: '1px solid var(--accent)',
            borderRadius: '6px',
            padding: '5px 10px',
            fontSize: '12px',
            fontWeight: 700,
            color: 'var(--accent)',
            boxShadow: 'var(--shadow-md)',
            lineHeight: 1.3,
            pointerEvents: 'none',
          }}>
            🛵 ${deliveryFee.toLocaleString('es-CO')} COP
          </div>
        )}

        {/* Botón GPS flotante */}
        <button
          type="button"
          onClick={handleGPS}
          disabled={busy}
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            zIndex: 800,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            color: 'var(--accent)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: busy ? 0.6 : 1,
            fontFamily: 'inherit',
          }}
        >
          {locating ? '⏳ Ubicando…' : geocoding ? '🔍 Buscando…' : '📍 Mi GPS'}
        </button>
      </div>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
        Tocá el mapa, arrastrá el marcador azul o escribí la dirección arriba y presioná Enter.
      </p>

      {error && <p style={{ fontSize: '11px', color: 'var(--error)', margin: 0 }}>{error}</p>}
    </div>
  );
});
