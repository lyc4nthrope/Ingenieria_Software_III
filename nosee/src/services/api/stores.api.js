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
const STORE_TYPE_NAME_BY_KEY = {
  physical: 'physical',
  virtual: 'virtual',
};

let storeTypesCache = null;
/*
function isValidHttpsUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
*/

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

async function getCurrentUserId() {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) return { success: false, error: userError.message };

  const userId = userData?.user?.id;
  if (!userId) return { success: false, error: 'Usuario no autenticado' };

  return { success: true, data: userId };
}

async function getStoreTypesMap() {
  if (storeTypesCache) return { success: true, data: storeTypesCache };

  const { data, error } = await supabase.from('store_types').select('id, name');
  if (error) return { success: false, error: error.message };

  const map = new Map((data || []).map((item) => [String(item.name || '').toLowerCase(), item.id]));
  storeTypesCache = map;
  return { success: true, data: map };
}

async function getStoreTypeId(type) {
  const normalizedType = String(type || '').toLowerCase();
  const typeName = STORE_TYPE_NAME_BY_KEY[normalizedType] || normalizedType;

  const typesResult = await getStoreTypesMap();
  if (!typesResult.success) return typesResult;

  const id = typesResult.data.get(typeName);
  if (!id) {
    return {
      success: false,
      error: `No se encontró el tipo de tienda "${typeName}" en store_types`,
    };
  }

  return { success: true, data: id };
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
      type, // 1 = physical, 2 = virtual (coincide con enum en BD)
      address = null,
      latitude = null,
      longitude = null,
      websiteUrl = null,
      evidenceUrls = [],
      distanceThresholdMeters = DEFAULT_RADIUS_METERS,
    } = payload;

    // Validaciones de cliente (mínimas)
    if (!name || !String(name).trim()) {
      return { success: false, error: 'El nombre de la tienda es obligatorio' };
    }
    // 1 = physical y 2 = virtual (coincide con enum en BD)
    if (!['1', '2'].includes(type)) {
      return { success: false, error: 'Tipo de tienda inválido. Usa physical o virtual' };
    }

    if (type === '1' && (latitude === null || longitude === null)) {
      return { success: false, error: 'Para tienda física la latitud y longitud son obligatorias' };
    }

    /*
    if (type === '2' && !isValidHttpsUrl(websiteUrl)) {
      return { success: false, error: 'Para tienda virtual la URL debe ser https:// válida' };
    }
    */

    if (!Array.isArray(evidenceUrls)) {
      return { success: false, error: 'evidenceUrls debe ser un arreglo' };
    }

    if (evidenceUrls.length > 3) {
      return { success: false, error: 'Máximo 3 imágenes de evidencia por tienda' };
    }

    if (type !== '1' && evidenceUrls.length > 0) {
      return { success: false, error: 'Las evidencias solo aplican para tiendas físicas' };
    }
    /*
    if (evidenceUrls.some((url) => !isValidHttpsUrl(url))) {
      return { success: false, error: 'Todas las evidencias deben tener una URL https:// válida' };
    }
    */

    const rpcResult = await supabase.rpc('create_store_with_validation', {
      p_name: name,
      p_store_type_id: parseInt(type),
      p_address: address,
      p_latitude: latitude,
      p_longitude: longitude,
      p_website_url: websiteUrl,
      p_distance_threshold_m: distanceThresholdMeters,
    });

    const { data, error } = rpcResult;

    // Compatibilidad: si el RPC no existe en BD, insertar directo en tabla stores.
    if (error && String(error.message || '').toLowerCase().includes('create_store_with_validation')) {
      const userResult = await getCurrentUserId();
      if (!userResult.success) return userResult;

      const typeResult = await getStoreTypeId(type);
      if (!typeResult.success) return typeResult;

      const insertPayload = {
        name: name?.trim(),
        created_by: userResult.data,
        store_type_id: typeResult.data,
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
          store: createdStore,
          distance_threshold_m: distanceThresholdMeters,
        },
      };
    }

    if (error) return { success: false, error: error.message };

    if (!data?.success) {
      return { success: false, error: data?.error || 'No se pudo crear la tienda' };
    }

    const createdStoreId = data?.store_id;

    // Si no hay evidencias, devolver éxito inmediatamente
    if (!createdStoreId || evidenceUrls.length === 0) {
      return { success: true, data };
    }

    // Adjuntar evidencias una por una (uploadStoreEvidence también valida límite y tipo)
    const evidenceResults = [];

    for (const imageUrl of evidenceUrls) {
      const evidenceResult = await uploadStoreEvidence(createdStoreId, imageUrl);
      if (!evidenceResult.success) {
        return {
          success: false,
          error: `Tienda creada pero falló la carga de evidencias: ${evidenceResult.error}`,
          data: {
            ...data,
            evidenceResults,
          },
        };
      }

      evidenceResults.push(evidenceResult.data);
    }

    return {
      success: true,
      data: {
        ...data,
        evidences: evidenceResults,
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

   const storeTypeResult = await getStoreTypeId('physical');
    if (!storeTypeResult.success) return storeTypeResult;

    // Verificar tipo de tienda (solo physical)
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, store_type_id')
      .eq('id', storeId)
      .single();

    if (storeError) return { success: false, error: storeError.message };

     if (store?.store_type_id !== storeTypeResult.data) {
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

      const storeTypesResult = await getStoreTypesMap();
    if (!storeTypesResult.success) return storeTypesResult;

    const typeById = new Map();
    for (const [typeName, typeId] of storeTypesResult.data.entries()) {
      typeById.set(typeId, typeName);
    }
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
        type: typeById.get(store.store_type_id) || null,
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
 * @param {'physical'|'virtual'} type
 * @param {string|null} address
 * @param {string|null} websiteUrl
 */
export async function createStoreSimple(name, type = 'physical', address = null, websiteUrl = null) {
  try {
    const userResult = await getCurrentUserId();
    if (!userResult.success) return userResult;

    const typeResult = await getStoreTypeId(type);
    if (!typeResult.success) return typeResult;

    const insert = {
      name: name.trim(),
      created_by: userResult.data,
      store_type_id: typeResult.data,
    };

    if (type === 'physical' && address?.trim()) insert.address = address.trim();
    if (type === 'virtual' && websiteUrl?.trim()) insert.website_url = websiteUrl.trim();

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
        type,
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
