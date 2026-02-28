/**
 * publications.api.js
 *
 * API para gestionar publicaciones de precios en NØSEE
 *
 * UBICACIÓN: src/services/api/publications.api.js
 * FECHA: 26-02-2026
 * STATUS: Paso 1 de Proceso 2
 *
 * FUNCIONES:
 * - createPublication()      : Crear nueva publicación de precio
 * - getPublications()        : Obtener publicaciones con filtros
 * - getPublicationDetail()   : Obtener detalles de una publicación
 * - validatePublication()    : Upvote a una publicación
 * - reportPublication()      : Reportar una publicación
 * - searchProducts()         : Autocomplete de productos
 * - searchStores()           : Autocomplete de tiendas + distancia
 * - updatePublication()      : Editar propia publicación
 * - deletePublication()      : Eliminar propia publicación
 */

import { supabase } from "@/services/supabase.client";

// ─── TIPOS / INTERFACES ───────────────────────────────────────────────────────

/**
 * Tipo de publicación (para búsqueda)
 */
export const PUBLICATION_STATUS = {
  PENDING: "pending",
  VALIDATED: "validated",
  REJECTED: "rejected",
  EXPIRED: "expired",
};

/**
 * Orden de resultados
 */
export const SORT_OPTIONS = {
  RECENT: "recent",
  VALIDATED: "validated",
  CHEAPEST: "cheapest",
};

// ─── 1️⃣ CREAR PUBLICACIÓN ────────────────────────────────────────────────────

/**
 * Crear una nueva publicación de precio
 *
 * @param {Object} data
 * @param {number} data.productId - ID del producto
 * @param {number} data.storeId - ID de la tienda
 * @param {number} data.price - Precio (debe ser > 0)
 * @param {string} data.currency - Moneda (COP, USD, etc.)
 * @param {string} data.photoUrl - URL de la foto (Cloudinary)
 * @param {string} data.description - Descripción corta (max 500 chars)
 * @param {number} data.latitude - Latitud (de geolocation)
 * @param {number} data.longitude - Longitud (de geolocation)
 *
 * @returns {Promise} { success, data, error }
 *
 * @example
 * const result = await createPublication({
 *   productId: 1,
 *   storeId: 5,
 *   price: 15999,
 *   currency: 'COP',
 *   photoUrl: 'https://res.cloudinary.com/...',
 *   description: 'Buen estado, precio justo',
 *   latitude: 4.7110,
 *   longitude: -74.0721,
 * });
 */
export const createPublication = async (data) => {
  try {
    // Validaciones básicas
    if (!data.productId || !data.storeId || !data.price) {
      return { success: false, error: "Faltan datos requeridos" };
    }

    if (data.price <= 0) {
      return { success: false, error: "El precio debe ser mayor a 0" };
    }

    if (data.description && data.description.length > 500) {
      return {
        success: false,
        error: "Descripción muy larga (máx 500 caracteres)",
      };
    }

    if (!data.photoUrl) {
      return { success: false, error: "La foto es obligatoria" };
    }

    // Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Usuario no autenticado" };
    }

    // Verificar que el usuario está verificado
    const authEmailConfirmed = !!user.email_confirmed_at;
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_verified")
      .eq("id", user.id)
      .single();

    const profileVerified = !!userData?.is_verified;
    if (userError && !authEmailConfirmed) {
      return {
        success: false,
        error: "Debes verificar tu email para publicar",
      };
    }

    if (!profileVerified && !authEmailConfirmed) {
      return {
        success: false,
        error: "Debes verificar tu email para publicar",
      };
    }

    // Si auth ya confirma email pero users.is_verified está atrasado, intentamos sincronizar
    if (authEmailConfirmed && !profileVerified) {
      await supabase
        .from("users")
        .update({ is_verified: true })
        .eq("id", user.id);
    }

    // Crear la publicación
    const { data: publication, error } = await supabase
      .from("price_publications")
      .insert({
        product_id: data.productId,
        store_id: data.storeId,
        user_id: user.id,
        price: data.price,
        currency: data.currency || "COP",
        photo_url: data.photoUrl,
        description: data.description || "",
        latitude: data.latitude,
        longitude: data.longitude,
        status: "validated",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creando publicación:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: publication };
  } catch (err) {
    console.error("Error en createPublication:", err);
    return { success: false, error: err.message };
  }
};

// ─── 2️⃣ OBTENER PUBLICACIONES CON FILTROS ─────────────────────────────────────

/**
 * Obtener publicaciones de precios con filtros opcionales
 *
 * @param {Object} filters
 * @param {string} filters.productName - Nombre del producto (búsqueda)
 * @param {string} filters.storeName - Nombre de la tienda (búsqueda)
 * @param {number} filters.minPrice - Precio mínimo
 * @param {number} filters.maxPrice - Precio máximo
 * @param {number} filters.maxDistance - Distancia máxima en km
 * @param {number} filters.latitude - Latitud del usuario (para distancia)
 * @param {number} filters.longitude - Longitud del usuario (para distancia)
 * @param {string} filters.sortBy - 'recent', 'validated', 'cheapest'
 * @param {number} filters.page - Número de página (default 1)
 * @param {number} filters.limit - Resultados por página (default 20)
 *
 * @returns {Promise} { success, data, count, hasMore, error }
 *
 * @example
 * const result = await getPublications({
 *   productName: 'aceite',
 *   maxPrice: 30000,
 *   maxDistance: 5,
 *   latitude: 4.7110,
 *   longitude: -74.0721,
 *   sortBy: 'cheapest',
 *   page: 1,
 *   limit: 20,
 * });
 */
export const getPublications = async (filters = {}) => {
  try {
    const {
      productName = "",
      storeName = "",
      minPrice = null,
      maxPrice = null,
      maxDistance = null,
      latitude = null,
      longitude = null,
      sortBy = "recent",
      page = 1,
      limit = 20,
    } = filters;

    let query = supabase.from("price_publications").select(
      `
        id,
        price,
        currency,
        photo_url,
        description,
        status,
        created_at,
        latitude,
        longitude,
        validated_count:publication_votes(count),
        reported_count,
        user_id,
        users!price_publications_user_id_fkey (full_name, reputation_points),
        product_id,
        products (id, name, category_id),
        store_id,
        stores (id, name, address)
        `,
      { count: "exact" },
    );

    // Filtro por nombre de producto
    if (productName) {
      query = query.ilike("products.name", `%${productName}%`);
    }

    // Filtro por nombre de tienda
    if (storeName) {
      query = query.ilike("stores.name", `%${storeName}%`);
    }

    // Filtro por rango de precio
    if (minPrice !== null) {
      query = query.gte("price", minPrice);
    }
    if (maxPrice !== null) {
      query = query.lte("price", maxPrice);
    }

    // Ordenamiento
    switch (sortBy) {
      case "cheapest":
        query = query.order("price", { ascending: true });
        break;
      case "validated":
        query = query.order("validated_count", { ascending: false });
        break;
      case "recent":
      default:
        query = query.order("created_at", { ascending: false });
        break;
    }

    // Paginación
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error obteniendo publicaciones:", error);
      return { success: false, error: error.message };
    }

    // Filtro por distancia (client-side con PostGIS sería mejor)
    let filteredData = data;
    if (maxDistance && latitude && longitude) {
      filteredData = data.filter((pub) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          pub.latitude,
          pub.longitude,
        );
        return distance <= maxDistance;
      });
    }

    return {
      success: true,
      data: filteredData,
      count: count,
      hasMore: offset + limit < count,
    };
  } catch (err) {
    console.error("Error en getPublications:", err);
    return { success: false, error: err.message };
  }
};

// ─── 3️⃣ OBTENER DETALLES DE UNA PUBLICACIÓN ──────────────────────────────────

/**
 * Obtener todos los detalles de una publicación específica
 *
 * @param {number} publicationId - ID de la publicación
 *
 * @returns {Promise} { success, data, error }
 *
 * @example
 * const result = await getPublicationDetail(123);
 */
export const getPublicationDetail = async (publicationId) => {
  try {
    if (!publicationId) {
      return { success: false, error: "ID de publicación requerido" };
    }

    const { data, error } = await supabase
      .from("price_publications")
      .select(
        `
        *,
        user:users!price_publications_user_id_fkey (id, full_name, reputation_points),
        product:products (id, name, description),
        store:stores (id, name, address),
        votes:publication_votes (id, vote_type, user_id),
        reports:price_reports (id, report_type, status)
        `,
      )
      .eq("id", publicationId)
      .single();

    if (error) {
      console.error("Error obteniendo detalles:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error en getPublicationDetail:", err);
    return { success: false, error: err.message };
  }
};

// ─── 4️⃣ VALIDAR PUBLICACIÓN (UPVOTE) ─────────────────────────────────────────

/**
 * Upvote a una publicación (aumenta validated_count)
 *
 * Usar la tabla publication_votes:
 * - Cada usuario solo puede votar 1 vez por publicación
 * - Trigger automático incrementa validated_count
 * - Trigger automático suma puntos de reputación al autor
 *
 * @param {number} publicationId - ID de la publicación
 *
 * @returns {Promise} { success, data, error }
 *
 * @example
 * const result = await validatePublication(123);
 */
export const validatePublication = async (publicationId) => {
  try {
    if (!publicationId) {
      return { success: false, error: "ID de publicación requerido" };
    }

    // Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Usuario no autenticado" };
    }

    // Verificar si ya votó
    const { data: existingVote } = await supabase
      .from("publication_votes")
      .select("id")
      .eq("publication_id", publicationId)
      .eq("user_id", user.id)
      .single();

    if (existingVote) {
      return { success: false, error: "Ya votaste esta publicación" };
    }

    // Crear el voto
    const { data: vote, error } = await supabase
      .from("publication_votes")
      .insert({
        publication_id: publicationId,
        user_id: user.id,
        vote_type: 1, // 1 = upvote, -1 = downvote (implementar después)
      })
      .select()
      .single();

    if (error) {
      console.error("Error validando publicación:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: vote };
  } catch (err) {
    console.error("Error en validatePublication:", err);
    return { success: false, error: err.message };
  }
};

// ─── 5️⃣ REPORTAR PUBLICACIÓN ───────────────────────────────────────────────────

/**
 * Reportar una publicación (abuso, precio falso, etc.)
 *
 * @param {number} publicationId - ID de la publicación
 * @param {string} reportType - 'fake_price', 'wrong_photo', 'spam', 'offensive'
 * @param {string} description - Descripción del reporte (max 500 chars)
 *
 * @returns {Promise} { success, data, error }
 *
 * @example
 * const result = await reportPublication(123, 'fake_price', 'El precio es imposible');
 */
export const reportPublication = async (
  publicationId,
  reportType,
  description,
) => {
  try {
    // Validaciones
    if (!publicationId || !reportType) {
      return { success: false, error: "Datos incompletos" };
    }

    const validTypes = ["fake_price", "wrong_photo", "spam", "offensive"];
    if (!validTypes.includes(reportType)) {
      return { success: false, error: "Tipo de reporte inválido" };
    }

    // Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Usuario no autenticado" };
    }

    // Crear el reporte
    const { data: report, error } = await supabase
      .from("price_reports")
      .insert({
        publication_id: publicationId,
        reporter_id: user.id,
        report_type: reportType,
        description: description || "",
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error reportando publicación:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data: report };
  } catch (err) {
    console.error("Error en reportPublication:", err);
    return { success: false, error: err.message };
  }
};

// ─── 6️⃣ BUSCAR PRODUCTOS (AUTOCOMPLETE) ───────────────────────────────────────

/**
 * Buscar productos por nombre (autocomplete)
 *
 * @param {string} query - Texto de búsqueda (min 2 caracteres)
 * @param {number} limit - Máximo de resultados (default 10)
 *
 * @returns {Promise} { success, data, error }
 *
 * @example
 * const result = await searchProducts('ace');
 * // Retorna: [{ id: 1, name: 'Aceite de oliva' }, ...]
 */
export const searchProducts = async (query, limit = 10) => {
  try {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, name, category_id")
      .ilike("name", `%${query}%`)
      .limit(limit);

    if (error) {
      console.error("Error buscando productos:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error en searchProducts:", err);
    return { success: false, error: err.message };
  }
};

// ─── 7️⃣ BUSCAR TIENDAS (AUTOCOMPLETE + DISTANCIA) ─────────────────────────────

/**
 * Buscar tiendas por nombre y opcionalmente por distancia
 *
 * @param {string} query - Nombre de la tienda (min 2 caracteres)
 * @param {number} maxDistance - Distancia máxima en km (opcional)
 * @param {number} latitude - Latitud del usuario (necesario si maxDistance)
 * @param {number} longitude - Longitud del usuario (necesario si maxDistance)
 * @param {number} limit - Máximo de resultados (default 10)
 *
 * @returns {Promise} { success, data, error }
 *
 * @example
 * const result = await searchStores('carrefour', 5, 4.7110, -74.0721);
 */
export const searchStores = async (
  query,
  maxDistance = null,
  latitude = null,
  longitude = null,
  limit = 10,
) => {
  try {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    const { data, error } = await supabase
      .from("stores")
      .select("id, name, address, latitude, longitude")
      .ilike("name", `%${query}%`)
      .limit(limit);

    if (error) {
      console.error("Error buscando tiendas:", error);
      return { success: false, error: error.message };
    }

    // Filtro por distancia (client-side)
    let filtered = data;
    if (maxDistance && latitude && longitude) {
      filtered = data.filter((store) => {
        const distance = calculateDistance(
          latitude,
          longitude,
          store.latitude,
          store.longitude,
        );
        return distance <= maxDistance;
      });
    }

    return { success: true, data: filtered };
  } catch (err) {
    console.error("Error en searchStores:", err);
    return { success: false, error: err.message };
  }
};

// ─── 8️⃣ ACTUALIZAR PUBLICACIÓN ─────────────────────────────────────────────────

/**
 * Actualizar una publicación (solo el autor puede hacerlo)
 *
 * @param {number} publicationId - ID de la publicación
 * @param {Object} updates - Campos a actualizar { price, description, photoUrl }
 *
 * @returns {Promise} { success, data, error }
 *
 * @example
 * const result = await updatePublication(123, { price: 16000, description: 'Actualizado' });
 */
export const updatePublication = async (publicationId, updates) => {
  try {
    if (!publicationId) {
      return { success: false, error: "ID de publicación requerido" };
    }

    // Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Usuario no autenticado" };
    }

    // Verificar que es el autor
    const { data: publication } = await supabase
      .from("price_publications")
      .select("user_id")
      .eq("id", publicationId)
      .single();

    if (publication?.user_id !== user.id) {
      return { success: false, error: "No puedes editar esta publicación" };
    }

    // Actualizar
    const { data, error } = await supabase
      .from("price_publications")
      .update(updates)
      .eq("id", publicationId)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando publicación:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error("Error en updatePublication:", err);
    return { success: false, error: err.message };
  }
};

// ─── 9️⃣ ELIMINAR PUBLICACIÓN ──────────────────────────────────────────────────

/**
 * Eliminar una publicación (solo el autor o admin)
 *
 * @param {number} publicationId - ID de la publicación
 *
 * @returns {Promise} { success, error }
 *
 * @example
 * const result = await deletePublication(123);
 */
export const deletePublication = async (publicationId) => {
  try {
    if (!publicationId) {
      return { success: false, error: "ID de publicación requerido" };
    }

    // Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Usuario no autenticado" };
    }

    // Verificar que es el autor o admin
    const { data: publication } = await supabase
      .from("price_publications")
      .select("user_id")
      .eq("id", publicationId)
      .single();

    const { data: userData } = await supabase
      .from("users")
      .select("role_id")
      .eq("id", user.id)
      .single();

    // Solo autor (role 1) o admin (role 3)
    if (publication?.user_id !== user.id && userData?.role_id !== 3) {
      return { success: false, error: "No puedes eliminar esta publicación" };
    }

    // Eliminar
    const { error } = await supabase
      .from("price_publications")
      .delete()
      .eq("id", publicationId);

    if (error) {
      console.error("Error eliminando publicación:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("Error en deletePublication:", err);
    return { success: false, error: err.message };
  }
};

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

/**
 * Calcular distancia entre dos puntos geográficos (Haversine formula)
 * Resultado en kilómetros
 *
 * @private
 */
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

/**
 * Exportar función de distancia para testing
 */
export const _calculateDistance = calculateDistance;

// ─── EXPORTAR TODO ────────────────────────────────────────────────────────────

export default {
  createPublication,
  getPublications,
  getPublicationDetail,
  validatePublication,
  reportPublication,
  searchProducts,
  searchStores,
  updatePublication,
  deletePublication,
  PUBLICATION_STATUS,
  SORT_OPTIONS,
};
