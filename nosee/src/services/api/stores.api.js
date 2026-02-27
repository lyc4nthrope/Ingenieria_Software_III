/**
 * stores.api.js
 * Capa de acceso a datos para tiendas.
 *
 * Contrato uniforme de respuesta:
 *   { success: true, data: <payload> }
 *   { success: false, error: <string> }
 */

import { supabase } from '@/services/supabase.client';

const DEFAULT_RADIUS_METERS = 150;

/**
 * Convierte POINT(lon lat) -> { latitude, longitude }.
 * Soporta respuestas textuales comunes de PostgREST para geography/geometry.
 */
function parsePointText(pointText) {
  if (!pointText || typeof pointText !== 'string') return null;

  const match = pointText.match(/POINT\s*\(\s*([-+]?\d*\.?\d+)\s+([-+]?\d*\.?\d+)\s*\)/i);
  if (!match) return null;

  const longitude = Number(match[1]);
  const latitude = Number(match[2]);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
  return { latitude, longitude };
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Distancia Haversine en metros.
 */
function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const earthRadius = 6371000;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
      Math.cos(degreesToRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

/**
 * Crea una tienda delegando reglas de negocio al RPC SQL.
 *
 * @param {Object} payload
 * @param {string} payload.name
 * @param {'physical'|'virtual'} payload.type
 * @param {string=} payload.address
 * @param {number=} payload.latitude
 * @param {number=} payload.longitude
 * @param {string=} payload.websiteUrl
 * @param {number=} payload.distanceThresholdMeters
 */
export async function createStore(payload = {}) {
  try {
    const {
      name,
      type,
      address = null,
      latitude = null,
      longitude = null,
      websiteUrl = null,
      distanceThresholdMeters = DEFAULT_RADIUS_METERS,
    } = payload;

    const { data, error } = await supabase.rpc('create_store_with_validation', {
      p_name: name,
      p_type: type,
      p_address: address,
      p_latitude: latitude,
      p_longitude: longitude,
      p_website_url: websiteUrl,
      p_distance_threshold_m: distanceThresholdMeters,
    });

    if (error) return { success: false, error: error.message };

    if (!data?.success) {
      return { success: false, error: data?.error || 'No se pudo crear la tienda' };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Error inesperado creando tienda' };
  }
}

/**
 * Adjunta una evidencia de tienda (máx 3 por tienda).
 * Reglas críticas deben mantenerse también en RLS/BD.
 *
 * @param {string|number} storeId
 * @param {string} imageUrl
 */
export async function uploadStoreEvidence(storeId, imageUrl) {
  try {
    if (!storeId) return { success: false, error: 'storeId es obligatorio' };
    if (!imageUrl) return { success: false, error: 'imageUrl es obligatorio' };

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) return { success: false, error: userError.message };

    const userId = userData?.user?.id;
    if (!userId) return { success: false, error: 'Usuario no autenticado' };

    // Verificar tipo de tienda (solo physical)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, type')
      .eq('id', storeId)
      .single();

    if (storeError) return { success: false, error: storeError.message };

    if (store?.type !== 'physical') {
      return { success: false, error: 'Solo las tiendas físicas permiten evidencias' };
    }

    // Verificar límite de 3 evidencias
    const { count, error: countError } = await supabase
      .from('store_evidences')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId);

    if (countError) return { success: false, error: countError.message };

    if ((count || 0) >= 3) {
      return { success: false, error: 'Máximo 3 imágenes de evidencia por tienda' };
    }

    const { data, error } = await supabase
      .from('store_evidences')
      .insert({
        store_id: storeId,
        image_url: imageUrl,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Error inesperado subiendo evidencia' };
  }
}

/**
 * Busca tiendas por nombre y opcionalmente filtra por radio en metros.
 *
 * Nota: si PostgREST devuelve geography como texto POINT(lon lat),
 * el filtrado por distancia se realiza en cliente con Haversine.
 *
 * @param {string} name
 * @param {number=} latitude
 * @param {number=} longitude
 * @param {number=} radiusMeters
 */
export async function searchNearbyStores(
  name,
  latitude = null,
  longitude = null,
  radiusMeters = DEFAULT_RADIUS_METERS
) {
  try {
    if (!name || name.trim().length < 2) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from('stores')
      .select('id, name, type, address, website_url, location')
      .ilike('name', `%${name.trim()}%`)
      .limit(20);

    if (error) return { success: false, error: error.message };

    const canFilterByDistance =
      latitude !== null &&
      longitude !== null &&
      !Number.isNaN(Number(latitude)) &&
      !Number.isNaN(Number(longitude)) &&
      radiusMeters !== null &&
      Number(radiusMeters) > 0;

    const mapped = (data || []).map((store) => {
      const point = parsePointText(store.location);
      const distanceMeters =
        canFilterByDistance && point
          ? getDistanceMeters(Number(latitude), Number(longitude), point.latitude, point.longitude)
          : null;

      return {
        ...store,
        latitude: point?.latitude ?? null,
        longitude: point?.longitude ?? null,
        distanceMeters,
      };
    });

    const filtered = canFilterByDistance
      ? mapped.filter((store) => store.distanceMeters !== null && store.distanceMeters <= Number(radiusMeters))
      : mapped;

    return { success: true, data: filtered };
  } catch (err) {
    return { success: false, error: err.message || 'Error inesperado buscando tiendas' };
  }
}

export default {
  createStore,
  uploadStoreEvidence,
  searchNearbyStores,
};
