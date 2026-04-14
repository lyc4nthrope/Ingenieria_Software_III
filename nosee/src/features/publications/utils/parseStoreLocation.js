/**
 * parseStoreLocation.js
 *
 * Utilidades para parsear coordenadas de tienda desde distintos formatos:
 * - GeoJSON (objeto con .coordinates)
 * - WKT string ("POINT(lon lat)")
 * - WKB hex string (PostGIS binary)
 *
 * Extraídas de PublicationDetailModal.jsx para reutilización.
 */

/**
 * Parse WKB (Well-Known Binary) format from PostGIS hex string.
 * Format: 01 01000020 E6100000 <lon double> <lat double>
 * @param {string} hexString
 * @returns {{ latitude: number, longitude: number } | null}
 */
function parseWKB(hexString) {
  try {
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }

    const view = new DataView(bytes.buffer);
    const littleEndian = bytes[0] === 1;

    const longitude = view.getFloat64(9, littleEndian);
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

/**
 * Parse a store location value into { latitude, longitude }.
 * Handles GeoJSON objects, WKT strings, and WKB hex strings.
 * @param {any} locationValue
 * @returns {{ latitude: number | null, longitude: number | null }}
 */
function parseStoreLocation(locationValue) {
  if (!locationValue) return { latitude: null, longitude: null };

  // GeoJSON object with .coordinates
  if (
    typeof locationValue === "object" &&
    locationValue !== null &&
    Array.isArray(locationValue.coordinates) &&
    locationValue.coordinates.length >= 2
  ) {
    const [longitude, latitude] = locationValue.coordinates;
    return { latitude: Number(latitude), longitude: Number(longitude) };
  }

  if (typeof locationValue === "string") {
    // WKT POINT format
    const pointMatch = locationValue.match(
      /POINT\s*\(\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\)/i
    );
    if (pointMatch) {
      return {
        longitude: Number(pointMatch[1]),
        latitude: Number(pointMatch[2]),
      };
    }

    // WKB hex string
    if (/^[0-9a-fA-F]+$/.test(locationValue)) {
      try {
        const wkbResult = parseWKB(locationValue);
        if (wkbResult) return wkbResult;
      } catch (err) {
        console.warn("Error decodificando WKB:", err.message);
      }
    }
  }

  return { latitude: null, longitude: null };
}

export { parseWKB, parseStoreLocation };
