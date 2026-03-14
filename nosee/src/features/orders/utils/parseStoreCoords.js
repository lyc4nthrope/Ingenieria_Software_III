/**
 * parseStoreCoords.js
 *
 * Parser de coordenadas de tienda: soporta GeoJSON, WKT y WKB hex (PostGIS).
 * Exportado para uso en OrderRouteMap y en tests unitarios.
 */

export function parseStoreCoords(locationValue) {
  if (!locationValue) return null;

  // GeoJSON: { type: 'Point', coordinates: [lng, lat] }
  if (typeof locationValue === 'object' && Array.isArray(locationValue.coordinates)) {
    const [lng, lat] = locationValue.coordinates;
    if (isFinite(lat) && isFinite(lng)) return { lat: Number(lat), lng: Number(lng) };
  }

  if (typeof locationValue === 'string') {
    // WKT: POINT(lng lat)
    const wkt = locationValue.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (wkt) return { lat: Number(wkt[2]), lng: Number(wkt[1]) };

    // WKB hex (PostGIS)
    if (/^[0-9a-fA-F]+$/.test(locationValue)) {
      try {
        const bytes = new Uint8Array(locationValue.length / 2);
        for (let i = 0; i < locationValue.length; i += 2)
          bytes[i / 2] = parseInt(locationValue.substr(i, 2), 16);
        const view = new DataView(bytes.buffer);
        const le = bytes[0] === 1;
        // Con SRID: offset 9; sin SRID: offset 5
        const hasSrid = (view.getUint32(1, le) & 0x20000000) !== 0;
        const offset = hasSrid ? 9 : 5;
        const lng = view.getFloat64(offset, le);
        const lat = view.getFloat64(offset + 8, le);
        if (isFinite(lat) && isFinite(lng)) return { lat, lng };
      } catch { /* ignorar */ }
    }
  }
  return null;
}
