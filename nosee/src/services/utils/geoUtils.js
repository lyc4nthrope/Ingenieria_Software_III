export const hasCoordinates = (lat, lng) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const parseWKBPoint = (hexString) => {
  try {
    if (typeof hexString !== "string" || hexString.length < 42) return null;
    const bytes = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      bytes[i / 2] = parseInt(hexString.substr(i, 2), 16);
    }
    const view = new DataView(bytes.buffer);
    const littleEndian = bytes[0] === 1;
    const longitude = view.getFloat64(9, littleEndian);
    const latitude = view.getFloat64(17, littleEndian);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
};

export const parseStoreLocation = (locationValue) => {
  if (!locationValue) return { latitude: null, longitude: null };

  if (
    typeof locationValue === "object" &&
    Array.isArray(locationValue.coordinates) &&
    locationValue.coordinates.length >= 2
  ) {
    const [longitude, latitude] = locationValue.coordinates;
    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      return { latitude: Number(latitude), longitude: Number(longitude) };
    }
  }

  if (
    typeof locationValue === "object" &&
    hasCoordinates(locationValue.latitude, locationValue.longitude)
  ) {
    return {
      latitude: Number(locationValue.latitude),
      longitude: Number(locationValue.longitude),
    };
  }

  if (typeof locationValue !== "string") {
    return { latitude: null, longitude: null };
  }

  if (/^[0-9a-fA-F]+$/.test(locationValue)) {
    const wkbPoint = parseWKBPoint(locationValue);
    return wkbPoint || { latitude: null, longitude: null };
  }

  const pointMatch = locationValue.match(
    /POINT\s*\(\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\)/i,
  );

  if (!pointMatch) return { latitude: null, longitude: null };

  const longitude = Number(pointMatch[1]);
  const latitude = Number(pointMatch[2]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { latitude: null, longitude: null };
  }

  return { latitude, longitude };
};

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radio de la Tierra en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export { calculateDistance };
export const _calculateDistance = calculateDistance;
