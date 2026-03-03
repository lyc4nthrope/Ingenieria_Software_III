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
 * - validatePublication()    : Votar (upvote/downvote) una publicación
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

const REQUEST_TIMEOUT_MS = 12000;

const withTimeout = async (promise, timeoutMs = REQUEST_TIMEOUT_MS, timeoutMessage = "Tiempo de espera agotado") => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

const hasCoordinates = (lat, lng) =>
  Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));

const parseStoreLocation = (locationValue) => {
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

  if (typeof locationValue !== "string") {
    return { latitude: null, longitude: null };
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

const hasUserIdentity = (candidate) =>
  !!candidate && typeof candidate === "object" && !!(candidate.id || candidate.full_name);

const hasStoreIdentity = (candidate) =>
  !!candidate && typeof candidate === "object" && !!(candidate.id || candidate.name);

const hydrateRelatedPublicationData = async (publications = []) => {
  if (!Array.isArray(publications) || publications.length === 0) {
    return publications;
  }

  const missingUserIds = [...new Set(
    publications
      .filter((publication) => {
        const embeddedUser = publication?.user || publication?.users;
        return !hasUserIdentity(embeddedUser) && publication?.user_id;
      })
      .map((publication) => publication.user_id),
  )];

  const missingStoreIds = [...new Set(
    publications
      .filter((publication) => {
        const embeddedStore = publication?.store || publication?.stores;
        return !hasStoreIdentity(embeddedStore) && publication?.store_id;
      })
      .map((publication) => publication.store_id),
  )];

  const usersById = {};
  const storesById = {};

  if (missingUserIds.length > 0) {
    const { data: usersData, error: usersError } = await withTimeout(
      supabase
        .from("users")
        .select("id, full_name, reputation_points")
        .in("id", missingUserIds),
      REQUEST_TIMEOUT_MS,
      "Tiempo de espera agotado hidratando usuarios de publicaciones",
    );

    if (usersError) {
      console.error("Error hidratando usuarios de publicaciones:", usersError);
    } else {
      (usersData || []).forEach((userRow) => {
        usersById[userRow.id] = userRow;
      });
    }
  }

  if (missingStoreIds.length > 0) {
    const { data: storesData, error: storesError } = await withTimeout(
      supabase
        .from("stores")
        .select("id, name, address, location")
        .in("id", missingStoreIds),
      REQUEST_TIMEOUT_MS,
      "Tiempo de espera agotado hidratando tiendas de publicaciones",
    );

    if (storesError) {
      console.error("Error hidratando tiendas de publicaciones:", storesError);
    } else {
      (storesData || []).forEach((storeRow) => {
        storesById[storeRow.id] = storeRow;
      });
    }
  }

  return publications.map((publication) => {
    const embeddedUser = publication?.user || publication?.users || null;
    const embeddedStore = publication?.store || publication?.stores || null;

    return {
      ...publication,
      user: hasUserIdentity(embeddedUser)
        ? embeddedUser
        : usersById[publication.user_id] || null,
      store: hasStoreIdentity(embeddedStore)
        ? embeddedStore
        : storesById[publication.store_id] || null,
    };
  });
};


const isAuthSessionError = (error) => {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("jwt") ||
    msg.includes("token") ||
    msg.includes("session") ||
    msg.includes("refresh") ||
    msg.includes("expired") ||
    msg.includes("invalid claim")
  );
};

const runWithSessionRetry = async (operation) => {
  const firstAttempt = await withTimeout(
    operation(),
    REQUEST_TIMEOUT_MS,
    "La sesión tardó demasiado en responder",
  );

  if (!firstAttempt?.error || !isAuthSessionError(firstAttempt.error)) {
    return firstAttempt;
  }

  const { data: refreshData, error: refreshError } = await withTimeout(
    supabase.auth.refreshSession(),
    REQUEST_TIMEOUT_MS,
    "No se pudo refrescar la sesión a tiempo",
  );
  if (refreshError || !refreshData?.session) {
    return firstAttempt;
  }

  return withTimeout(
    operation(),
    REQUEST_TIMEOUT_MS,
    "La sesión no se recuperó a tiempo",
  );
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

    // Verificar estado del usuario (activo + verificado)
    const authEmailConfirmed = !!user.email_confirmed_at;
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("is_verified, is_active")
      .eq("id", user.id)
      .single();

    const profileVerified = !!userData?.is_verified;
    const profileActive = userData?.is_active !== false;

    if (userError || !profileActive) {
      return {
        success: false,
        error: "Tu cuenta no está habilitada para publicar",
      };
    }

    if (!profileVerified && !authEmailConfirmed) {
      return {
        success: false,
        error: "Debes verificar tu email para publicar",
      };
    }

    // Evitar duplicados del mismo usuario/producto/tienda en las últimas 24h
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: duplicatePublication, error: duplicateError } = await supabase
      .from("price_publications")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_id", data.productId)
      .eq("store_id", data.storeId)
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duplicateError) {
      return { success: false, error: duplicateError.message };
    }

    if (duplicatePublication) {
      return {
        success: false,
        error:
          "Ya publicaste este producto en esta tienda durante las últimas 24 horas",
      };
    }

    // Crear la publicación
    const payload = {
      product_id: data.productId,
      store_id: data.storeId,
      user_id: user.id,
      price: data.price,
      photo_url: data.photoUrl,
      description: data.description || "No hay descripción",
    };

    const { data: publication, error } = await supabase
      .from("price_publications")
      .insert(payload)
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
     const offset = (page - 1) * limit;

    const buildPublicationsQuery = (nearbyStoreIds) => {
      let query = supabase.from("price_publications").select(
        `
        id,
        price,
        photo_url,
        description,
        confidence_score,
        is_active,
        created_at,
        user_id,
        user:users!price_publications_user_id_fkey (id, full_name, reputation_points),
        product_id,
        product:products (id, name, category_id),
        store_id,
        store:stores!price_publications_store_id_fkey (id, name, address, location)
        `,
        { count: "planned" },
      );

      // Filtro por nombre de producto
      if (productName) {
        query = query.ilike("products.name", `%${productName}%`);
      }

      // Filtro por rango de precio
      if (minPrice !== null) {
        query = query.gte("price", minPrice);
      }
      if (maxPrice !== null) {
        query = query.lte("price", maxPrice);
      }

      if (storeName && !shouldApplyDistanceFilter) {
        query = query.ilike("stores.name", `%${storeName}%`);
      }

      if (Array.isArray(nearbyStoreIds) && nearbyStoreIds.length > 0) {
        query = query.in("store_id", nearbyStoreIds);
      }

      // Ordenamiento
      switch (sortBy) {
        case "cheapest":
          query = query.order("price", { ascending: true });
          break;
        case "validated":
          query = query.order("confidence_score", { ascending: false });
          break;
        case "recent":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      return query.range(offset, offset + limit - 1);
    };

    const shouldApplyDistanceFilter =
      maxDistance !== null && hasCoordinates(latitude, longitude);
    let appliedDistanceKm = null;

    let nearbyStoreIds = [];

    if (shouldApplyDistanceFilter) {
      const { data: storesData, error: storesError } = await withTimeout(
        supabase
          .from("stores")
          .select("id, name, location"),
        REQUEST_TIMEOUT_MS,
        "Tiempo de espera agotado obteniendo tiendas cercanas",
      );

      if (storesError) {
        console.error("Error obteniendo tiendas para filtrar distancia:", storesError);
        return { success: false, error: storesError.message };
      }

      const searchDistancesKm = [Number(maxDistance)].filter(
        (distance, index, distances) =>
          Number.isFinite(distance) && distance > 0 && distances.indexOf(distance) === index,
      );

      for (const distanceLimit of searchDistancesKm) {
        nearbyStoreIds = (storesData || [])
          .filter((store) => {
            if (
              storeName &&
              !store.name?.toLowerCase().includes(storeName.toLowerCase())
            ) {
              return false;
            }

            const { latitude: storeLat, longitude: storeLng } = parseStoreLocation(
              store.location,
            );

            if (!hasCoordinates(storeLat, storeLng)) return false;

            const distanceKm = calculateDistance(
              Number(latitude),
              Number(longitude),
              Number(storeLat),
              Number(storeLng),
            );

            return distanceKm <= distanceLimit;
          })
          .map((store) => store.id);

        if (nearbyStoreIds.length > 0) {
          appliedDistanceKm = distanceLimit;
          break;
        }
      } 
    }

    if (shouldApplyDistanceFilter && nearbyStoreIds.length === 0) {
      return {
        success: true,
        data: [],
        count: 0,
        hasMore: false,
      };
    }

     const nearbyStoreIdsForQuery = shouldApplyDistanceFilter ? nearbyStoreIds : null;

    const { data, error, count } = await runWithSessionRetry(
      () => buildPublicationsQuery(nearbyStoreIdsForQuery),
      "getPublications",
    );

    if (error) {
      console.error("Error obteniendo publicaciones:", error);
      return { success: false, error: error.message };
    }

    const publicationsWithRelations = await hydrateRelatedPublicationData(data || []);

    const publicationsWithCoordinates = publicationsWithRelations.map((pub) => {
      const storeCoordinates = parseStoreLocation(
        pub?.store?.location || pub?.stores?.location,
      );

      const publicationWithCoords = {
        ...pub,
        user: pub?.user || pub?.users || null,
        store: (pub?.store || pub?.stores)
          ? {
              ...(pub.store || pub.stores),
              ...storeCoordinates,
            }
          : null,
      };

      if (!shouldApplyDistanceFilter || appliedDistanceKm === null) return publicationWithCoords;

      if (!hasCoordinates(storeCoordinates.latitude, storeCoordinates.longitude)) {
        return { ...publicationWithCoords, distance_km: null };
      }

      return {
        ...publicationWithCoords,
        distance_km: calculateDistance(
          Number(latitude),
          Number(longitude),
          Number(storeCoordinates.latitude),
          Number(storeCoordinates.longitude),
        ),
      };
    });
    return {
      success: true,
      data: publicationsWithCoordinates,
      count: count ?? publicationsWithCoordinates.length,
      hasMore: offset + limit < (count ?? publicationsWithCoordinates.length),
    };
  } catch (err) {
    if (err?.code === "QUERY_TIMEOUT") {
      console.error("Timeout en getPublications", {
        operation: err.operation,
        timeoutMs: err.timeoutMs,
        supabaseHost: err.supabaseHost,
        online: err.online,
      });
      return {
        success: false,
        error: `Timeout en ${err.operation}. Revisa conectividad y configuración de Supabase (${err.supabaseHost}).`,
      };
    }
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

// ─── 4️⃣ VOTAR PUBLICACIÓN (UPVOTE / DOWNVOTE) ───────────────────────────────

/**
 * Registrar voto sobre una publicación (upvote/downvote)
 *
 * Usar la tabla publication_votes:
 * - Cada usuario solo puede votar 1 vez por publicación
 * - Soporta vote_type = 1 (upvote) y vote_type = -1 (downvote)
 * - Actualiza reputación del autor de forma explícita como respaldo
 *
 * @param {number} publicationId - ID de la publicación
 *
 * @returns {Promise} { success, data, error }
 *
 * @example
 * const result = await validatePublication(123);
 */
export const validatePublication = async (publicationId, voteType = 1) => {
  try {
    if (!publicationId) {
      return { success: false, error: "ID de publicación requerido" };
    }

    if (![1, -1].includes(voteType)) {
      return { success: false, error: "Tipo de voto inválido" };
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
        vote_type: voteType,
      })
      .select()
      .single();

    if (error) {
      console.error("Error validando publicación:", error);
      return { success: false, error: error.message };
    }

    // Actualizar reputación explícitamente como respaldo (si no existe trigger)
    const { data: publicationData, error: publicationError } = await supabase
      .from("price_publications")
      .select("user_id")
      .eq("id", publicationId)
      .single();

    if (publicationError) {
      return { success: false, error: publicationError.message };
    }

    if (publicationData?.user_id) {
      const reputationDelta = voteType === 1 ? 1 : -1;
      const { error: reputationError } = await supabase.rpc(
        "increment_user_reputation",
        {
          target_user_id: publicationData.user_id,
          reputation_delta: reputationDelta,
        },
      );

      if (reputationError) {
        const { data: authorData, error: authorError } = await supabase
          .from("users")
          .select("reputation_points")
          .eq("id", publicationData.user_id)
          .single();

        if (!authorError) {
          await supabase
            .from("users")
            .update({
              reputation_points:
                (authorData?.reputation_points || 0) + reputationDelta,
            })
            .eq("id", publicationData.user_id);
        }
      }
    }

    return { success: true, data: vote };
  } catch (err) {
    console.error("Error en validatePublication:", err);
    return { success: false, error: err.message };
  }
};

export const downvotePublication = async (publicationId) =>
  validatePublication(publicationId, -1);

/**
 * Quitar voto de una publicación (unvote)
 *
 * @param {number} publicationId - ID de la publicación
 * @returns {Promise} { success, data, error }
 */
export const unvotePublication = async (publicationId) => {
  try {
    if (!publicationId) {
      return { success: false, error: "ID de publicación requerido" };
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Usuario no autenticado" };
    }

    const { data: deletedVote, error } = await supabase
      .from("publication_votes")
      .delete()
      .eq("publication_id", publicationId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    if (!deletedVote) {
      return { success: false, error: "No habías votado esta publicación" };
    }

    return { success: true, data: deletedVote };
  } catch (err) {
    console.error("Error en unvotePublication:", err);
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

    const executeSearch = () =>
      supabase
        .from("products")
        .select("id, name, category_id")
        .ilike("name", `%${query}%`)
        .limit(limit);
      
    const { data, error } = await runWithSessionRetry(executeSearch, "searchProducts");

    if (error) {
      console.error("Error buscando productos:", error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    if (err?.code === "QUERY_TIMEOUT") {
      console.error("Timeout en searchProducts", {
        operation: err.operation,
        timeoutMs: err.timeoutMs,
        supabaseHost: err.supabaseHost,
        online: err.online,
      });
      return {
        success: false,
        error: `Timeout en ${err.operation}. Revisa conectividad y configuración de Supabase (${err.supabaseHost}).`,
      };
    }
    console.error("Error en searchProducts:", err);
    return { success: false, error: err.message };
  }
};

/**
 * Obtener listado base de productos para el formulario de publicación
 */
export const getProducts = async (limit = 100) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, category_id, brand_id, unit_type_id, base_quantity")
      .order("name", { ascending: true })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Obtener listado base de tiendas para el formulario de publicación
 */
export const getStores = async (limit = 100) => {
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name", { ascending: true })
      .limit(limit);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
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

    const executeSearch = () =>
      supabase
        .from("stores")
        .select("id, name, address, location")
        .ilike("name", `%${query}%`)
        .limit(limit);

    const { data, error } = await runWithSessionRetry(executeSearch, "searchStores");

    if (error) {
      console.error("Error buscando tiendas:", error);
      return { success: false, error: error.message };
    }

    // Filtro por distancia (client-side)
    const storesWithCoordinates = (data || []).map((store) => ({
      ...store,
      ...parseStoreLocation(store.location),
    }));

    let filtered = storesWithCoordinates;
    if (maxDistance && hasCoordinates(latitude, longitude)) {
      filtered = storesWithCoordinates.filter((store) => {
        const distance = calculateDistance(
          Number(latitude),
          Number(longitude),
          store.latitude,
          store.longitude,
        );
        return distance <= maxDistance;
      });
    }

    return { success: true, data: filtered };
  } catch (err) {
    if (err?.code === "QUERY_TIMEOUT") {
      console.error("Timeout en searchStores", {
        operation: err.operation,
        timeoutMs: err.timeoutMs,
        supabaseHost: err.supabaseHost,
        online: err.online,
      });
      return {
        success: false,
        error: `Timeout en ${err.operation}. Revisa conectividad y configuración de Supabase (${err.supabaseHost}).`,
      };
    }

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

// ─── CREAR PRODUCTO ───────────────────────────────────────────────────────────

/**
 * Crear un producto nuevo si no existe en el catálogo.
 * @param {string} name - Nombre del producto
 */
export async function createProduct(name) {
  const normalizedName = String(name?.name || name || "").trim();
  const categoryId = Number(name?.categoryId);
  const unitTypeId = Number(name?.unitTypeId);
  const brandId = Number(name?.brandId);
  const brandName = String(name?.brandName || "").trim();
  const baseQuantity = Number(name?.baseQuantity);
  if (!normalizedName || normalizedName.length < 2) {
    return {
      success: false,
      error: "El nombre del producto debe tener al menos 2 caracteres",
    };
  }

  if (!categoryId || !unitTypeId || !baseQuantity || baseQuantity <= 0) {
    return {
      success: false,
      error:
        "Debes indicar categoría, unidad de medida y cantidad base válida",
    };
  }

  const { data: existingProduct, error: existingError } = await supabase
    .from("products")
    .select("id, name, category_id, brand_id, unit_type_id, base_quantity")
    .ilike("name", normalizedName)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  // Si ya existe (case-insensitive), no creamos duplicado y retornamos el existente.
  if (existingProduct) {
    return { success: true, data: existingProduct };
  }

  let resolvedBrandId = brandId;
  if (!resolvedBrandId && brandName) {
    const { data: existingBrand, error: existingBrandError } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", brandName)
      .limit(1)
      .maybeSingle();

    if (existingBrandError) {
      return { success: false, error: existingBrandError.message };
    }

    if (existingBrand) {
      resolvedBrandId = existingBrand.id;
    }
  }

  if (!resolvedBrandId) {
    return {
      success: false,
      error: "Selecciona o registra una marca antes de crear el producto",
    };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: normalizedName,
      category_id: categoryId,
      unit_type_id: unitTypeId,
      brand_id: brandId,
      base_quantity: baseQuantity,
    })
    .select("id, name, category_id, brand_id, unit_type_id, base_quantity")
    .select("id, name, category_id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const { data: duplicateProduct } = await supabase
        .from("products")
        .select("id, name, category_id, brand_id, unit_type_id, base_quantity")
        .ilike("name", normalizedName)
        .limit(1)
        .maybeSingle();

      if (duplicateProduct) {
        return { success: true, data: duplicateProduct };
      }
    }

    return { success: false, error: error.message };
  }

  return { success: true, data };
}

export const createBrand = async (name) => {
  const normalizedName = String(name || "").trim();
  if (!normalizedName || normalizedName.length < 2) {
    return {
      success: false,
      error: "El nombre de la marca debe tener al menos 2 caracteres",
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", normalizedName)
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { success: false, error: existingError.message };
  }

  if (existing) {
    return { success: true, data: existing };
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({ name: normalizedName })
    .select("id, name")
    .single();

  if (error) {
    if (error.code === "42501") {
      return {
        success: false,
        error:
          "No tienes permiso para registrar marcas. Solicita habilitar la política RLS de inserción en brands.",
      };
    }
    return { success: false, error: error.message };
  }

  return { success: true, data };
};

export const getProductCategories = async () => {
  const { data, error } = await supabase
    .from("product_categories")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
};

export const getUnitTypes = async () => {
  const { data, error } = await supabase
    .from("unit_types")
    .select("id, name, abbreviation, category")
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
};

export const searchBrands = async (query, limit = 10) => {
  if (!query || query.length < 1) return { success: true, data: [] };

  const { data, error } = await supabase
    .from("brands")
    .select("id, name")
    .ilike("name", `%${query}%`)
    .order("name", { ascending: true })
    .limit(limit);

  if (error) return { success: false, error: error.message };
  return { success: true, data: data || [] };
};


// ─── EXPORTAR TODO ────────────────────────────────────────────────────────────

export default {
  createPublication,
  getPublications,
  getPublicationDetail,
  validatePublication,
  downvotePublication,
  unvotePublication,
  reportPublication,
  searchProducts,
  createProduct,
  getProducts,
  searchStores,
  getStores,
  getProductCategories,
  getUnitTypes,
  searchBrands,
  createBrand,
  updatePublication,
  deletePublication,
  PUBLICATION_STATUS,
  SORT_OPTIONS,
};
