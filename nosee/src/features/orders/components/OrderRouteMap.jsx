/**
 * OrderRouteMap.jsx
 *
 * Mapa de ruta para el pedido:
 * - Pin azul: ubicación del usuario (origen)
 * - Pines numerados: tiendas a visitar en orden
 * - Línea de ruta: calculada con OSRM (enrutamiento real por calles)
 *
 * Si una tienda no tiene coordenadas, se omite del mapa y se indica.
 * Si OSRM falla, se traza una polilínea recta entre los puntos.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { ensureLeafletLoaded, addTileLayerWithFallback } from '@/shared/maps/leaflet';
import { parseStoreCoords } from '@/features/orders/utils/parseStoreCoords';

const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';
const DEFAULT_CENTER = { lat: 4.711, lng: -74.0721 }; // Bogotá
const DEFAULT_ZOOM = 14;

// ─── Crear icono numerado ─────────────────────────────────────────────────────
function makeNumberedIcon(L, number, color = '#2563eb') {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:28px;height:28px;border-radius:50%;
      background:${color};color:#fff;
      font-size:13px;font-weight:800;
      display:flex;align-items:center;justify-content:center;
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
    ">${number}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function makeDriverIcon(L) {
  return L.divIcon({
    className: '',
    html: `<div style="font-size:22px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.4));">🛵</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function makeUserIcon(L) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:#10b981;
      border:3px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// ─── Obtener ruta de OSRM ─────────────────────────────────────────────────────
async function fetchOsrmRoute(waypoints) {
  // waypoints: Array<{ lat, lng }>
  const coords = waypoints.map((p) => `${p.lng},${p.lat}`).join(';');
  const url = `${OSRM_URL}/${coords}?geometries=geojson&overview=full&steps=false`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) throw new Error('Sin ruta OSRM');

  // coordinates: Array<[lng, lat]>
  return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

// ─── Componente ───────────────────────────────────────────────────────────────
export default function OrderRouteMap({ stores, userCoords, driverLocation = null, mapHeight = '340px' }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const leafletRef = useRef(null); // guardar instancia de L para efectos posteriores
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [routeMode, setRouteMode] = useState('osrm'); // 'osrm' | 'straight' (fallback)
  const [missingStores, setMissingStores] = useState([]);
  const [centering, setCentering] = useState(false); // estado del botón centrar
  const userMarkerRef = useRef(null); // referencia al pin verde para moverlo
  const driverMarkerRef = useRef(null); // referencia al marcador 🛵

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!containerRef.current || mapRef.current) return;

      let L;
      try {
        L = await ensureLeafletLoaded();
      } catch {
        if (mounted) setStatus('error');
        return;
      }
      if (!mounted || !containerRef.current) return;
      leafletRef.current = L;

      // ── Calcular puntos ──────────────────────────────────────────────────
      const storeWaypoints = stores.map((s, i) => {
        const coords = parseStoreCoords(s.store?.location);
        return { index: i + 1, store: s.store, coords, products: s.products };
      });

      const available = storeWaypoints.filter((w) => w.coords);
      const missing = storeWaypoints.filter((w) => !w.coords);
      if (mounted) setMissingStores(missing.map((w) => w.store?.name ?? `Tienda ${w.index}`));

      // Punto de inicio: GPS del usuario o primera tienda disponible
      const origin = userCoords
        ? { lat: userCoords.lat, lng: userCoords.lng }
        : available[0]?.coords ?? DEFAULT_CENTER;

      // ── Crear mapa ───────────────────────────────────────────────────────
      const map = L.map(containerRef.current).setView(
        [origin.lat, origin.lng],
        DEFAULT_ZOOM
      );
      addTileLayerWithFallback(L, map);
      setTimeout(() => map.invalidateSize(), 0);
      mapRef.current = map;

      // ── Pin del usuario ───────────────────────────────────────────────────
      if (userCoords) {
        userMarkerRef.current = L.marker([userCoords.lat, userCoords.lng], { icon: makeUserIcon(L) })
          .addTo(map)
          .bindPopup('<b>📍 Tu ubicación</b>');
      }

      // ── Pines de tiendas ─────────────────────────────────────────────────
      const bounds = [];
      if (userCoords) bounds.push([userCoords.lat, userCoords.lng]);

      for (const w of available) {
        const { lat, lng } = w.coords;
        bounds.push([lat, lng]);
        const productList = w.products
          .map((p) => `• ${p.item.productName} ×${p.item.quantity} — $${p.price.toLocaleString('es-CO')}`)
          .join('<br>');
        L.marker([lat, lng], { icon: makeNumberedIcon(L, w.index) })
          .addTo(map)
          .bindPopup(`
            <b>${Number(w.store?.store_type_id) === 2 ? '🌐' : '🏪'} ${w.store?.name ?? 'Tienda'}</b>
            <br><br>${productList}
          `);
      }

      if (bounds.length > 1) map.fitBounds(bounds, { padding: [40, 40] });

      // ── Ruta ─────────────────────────────────────────────────────────────
      const routePoints = [
        ...(userCoords ? [{ lat: userCoords.lat, lng: userCoords.lng }] : []),
        ...available.map((w) => w.coords),
      ];

      if (routePoints.length >= 2) {
        try {
          const latlngs = await fetchOsrmRoute(routePoints);
          if (!mounted) return;
          L.polyline(latlngs, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.8,
          }).addTo(map);
          if (mounted) setRouteMode('osrm');
        } catch {
          // Fallback: línea recta entre puntos
          if (!mounted) return;
          L.polyline(
            routePoints.map((p) => [p.lat, p.lng]),
            { color: '#2563eb', weight: 3, opacity: 0.6, dashArray: '8 6' }
          ).addTo(map);
          if (mounted) setRouteMode('straight');
        }
      }

      if (mounted) setStatus('ready');
    }

    init();

    return () => {
      mounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actualizar marcador del repartidor en tiempo real ──────────────────────
  useEffect(() => {
    if (!driverLocation || !mapRef.current || !leafletRef.current) return;
    const L = leafletRef.current;
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
    } else {
      driverMarkerRef.current = L.marker(
        [driverLocation.lat, driverLocation.lng],
        { icon: makeDriverIcon(L) }
      ).addTo(mapRef.current).bindPopup('<b>🛵 Repartidor</b>');
    }
  }, [driverLocation]);

  // ── Centrar en ubicación actual ────────────────────────────────────────────
  const handleCenterOnMe = useCallback(() => {
    if (!mapRef.current || !navigator.geolocation) return;
    setCentering(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        mapRef.current.setView([lat, lng], 16, { animate: true });
        // Mover el pin verde a la posición actual
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([lat, lng]);
        }
        setCentering(false);
      },
      () => setCentering(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  return (
    <div>
      {/* Leyenda */}
      <div style={styles.legend}>
        <span style={styles.legendItem}>
          <span style={{ ...styles.dot, background: '#10b981' }} /> Tu ubicación
        </span>
        {driverLocation && (
          <span style={styles.legendItem}>🛵 Repartidor</span>
        )}
        {stores.map((s, i) => (
          <span key={i} style={styles.legendItem}>
            <span style={{ ...styles.dot, background: '#2563eb' }}>{i + 1}</span>
            {s.store?.name ?? `Tienda ${i + 1}`}
          </span>
        ))}
      </div>

      {/* Aviso ruta aproximada */}
      {status === 'ready' && routeMode === 'straight' && (
        <p style={styles.notice}>
          ⚠️ Ruta aproximada (línea recta) — OSRM no disponible en este momento
        </p>
      )}

      {/* Aviso tiendas sin coordenadas */}
      {missingStores.length > 0 && (
        <p style={styles.notice}>
          ℹ️ Sin coordenadas: {missingStores.join(', ')} — no se muestran en el mapa
        </p>
      )}

      {/* Mapa */}
      <div style={styles.mapWrapper}>
        {status === 'loading' && (
          <div style={styles.overlay}>Cargando mapa...</div>
        )}
        {status === 'error' && (
          <div style={styles.overlay}>No se pudo cargar el mapa</div>
        )}
        <div ref={containerRef} style={{ ...styles.map, height: mapHeight }} />

        {/* Botón centrar en mi ubicación — superpuesto sobre el mapa */}
        {status === 'ready' && (
          <button
            type="button"
            onClick={handleCenterOnMe}
            disabled={centering}
            title="Centrar en mi ubicación"
            aria-label="Centrar mapa en mi ubicación actual"
            style={styles.centerBtn}
          >
            {centering ? '⏳' : '📍'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles = {
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '10px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: 'var(--text-secondary)',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    padding: '3px 8px',
    borderRadius: '999px',
  },
  dot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: 800,
    color: '#fff',
    flexShrink: 0,
  },
  notice: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    margin: '0 0 8px',
    padding: '6px 10px',
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
  },
  mapWrapper: {
    position: 'relative',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  map: {
    width: '100%',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-elevated)',
    fontSize: '14px',
    color: 'var(--text-muted)',
    zIndex: 10,
  },
  centerBtn: {
    position: 'absolute',
    bottom: '12px',
    right: '12px',
    zIndex: 1000, // sobre los tiles de Leaflet
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: '2px solid rgba(0,0,0,0.2)',
    background: '#fff',
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
    cursor: 'pointer',
    fontSize: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
};
