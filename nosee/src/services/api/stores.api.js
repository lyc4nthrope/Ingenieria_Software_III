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
const STORE_TYPE_ID = {
  physical: 1,
  virtual: 2,
};

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

function getUiTypeByStoreTypeId(storeTypeId) {
  if (Number(storeTypeId) === STORE_TYPE_ID.physical) return 'physical';
  if (Number(storeTypeId) === STORE_TYPE_ID.virtual) return 'virtual';
  return null;
}

function resolveStoreTypeId(type) {
  if (Number(type) === STORE_TYPE_ID.physical || String(type).toLowerCase() === 'physical') {
    return { success: true, data: STORE_TYPE_ID.physical };
  }

  if (Number(type) === STORE_TYPE_ID.virtual || String(type).toLowerCase() === 'virtual') {
    return { success: true, data: STORE_TYPE_ID.virtual };
  }

  return { success: false, error: 'Tipo de tienda inválido. Usa Tienda física o Tienda virtual' };
}

function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

async function getCurrentUserId() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { success: false, error: userError.message };

  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Usuario no autenticado' };

  return { success: true, data: userId };
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
 * Crea una tienda.
 *
 * Se usa `store_type_id` directamente:
 * - Tienda física  -> 1
 * - Tienda virtual -> 2
 *
 * @param {Object} payload
 * @param {string} payload.name
 * @param {'physical'|'virtual'|1|2} payload.type
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

    const userResult = await getCurrentUserId();
    if (!userResult.success) return userResult;

    const storeTypeResult = resolveStoreTypeId(type);
    if (!storeTypeResult.success) return storeTypeResult;

    const insertPayload = {
      name: name?.trim(),
      created_by: userResult.data,
      store_type_id: storeTypeResult.data,
      address: address?.trim() || null,
      website_url: websiteUrl?.trim() || null,
    };

    if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
      const lat = Number(latitude);
      const lon = Number(longitude);
      insertPayload.location = `POINT(${lon} ${lat})`;
    }

    const { data: createdStore, error: insertError } = await supabase
      .from('stores')
      .insert(insertPayload)
      .select('id, name, address, website_url, store_type_id, location')
      .single();

    if (insertError) return { success: false, error: insertError.message };

    return {
      success: true,
      data: {
        success: true,
        store: {
          ...createdStore,
          type: getUiTypeByStoreTypeId(createdStore.store_type_id),
        },
        distance_threshold_m: distanceThresholdMeters,
      },
    };
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

    const userResult = await getCurrentUserId();
    if (!userResult.success) return userResult;
    const userId = userResult.data;

    // Verificar tipo de tienda (solo física = 1)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, store_type_id')
      .eq('id', storeId)
      .single();

    if (storeError) return { success: false, error: storeError.message };

    if (Number(store?.store_type_id) !== STORE_TYPE_ID.physical) {
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
      .select('id, name, store_type_id, address, website_url, location')
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
        type: getUiTypeByStoreTypeId(store.store_type_id),
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

/**
 * Crea una tienda de forma simple (sin mapa ni evidencias).
 * Usado desde el modal rápido dentro del formulario de publicaciones.
 *
 * @param {string} name
 * @param {'physical'|'virtual'|1|2} type
 * @param {string|null} address
 * @param {string|null} websiteUrl
 */
export async function createStoreSimple(name, type = 'physical', address = null, websiteUrl = null) {
  try {
    const userResult = await getCurrentUserId();
    if (!userResult.success) return userResult;

    const storeTypeResult = resolveStoreTypeId(type);
    if (!storeTypeResult.success) return storeTypeResult;

    const uiType = getUiTypeByStoreTypeId(storeTypeResult.data);
    const insert = {
      name: name.trim(),
      created_by: userResult.data,
      store_type_id: storeTypeResult.data,
    };

    if (uiType === 'physical' && address?.trim()) insert.address = address.trim();
    if (uiType === 'virtual' && websiteUrl?.trim()) insert.website_url = websiteUrl.trim();

    const { data, error } = await supabase
      .from('stores')
      .insert(insert)
      .select('id, name, address, website_url, store_type_id')
      .single();

    if (error) return { success: false, error: error.message };

    return {
      success: true,
      data: {
        ...data,
        type: getUiTypeByStoreTypeId(data.store_type_id),
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Error inesperado creando tienda' };
  }
}

export default {
  createStore,
  createStoreSimple,
  uploadStoreEvidence,
  searchNearbyStores,
};