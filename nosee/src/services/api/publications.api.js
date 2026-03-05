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
import { uploadImageToCloudinary } from "@/services/cloudinary";

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
  BEST_MATCH: "best_match",
};

const SEARCH_SORT_FIELDS = new Set([
  SORT_OPTIONS.RECENT,
  SORT_OPTIONS.VALIDATED,
  SORT_OPTIONS.CHEAPEST,
  SORT_OPTIONS.BEST_MATCH,
]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const REQUEST_TIMEOUT_MS = 12000;
const BACKGROUND_REQUEST_TIMEOUT_MS = 20000;
const EXTENDED_RETRY_TIMEOUT_MS = 30000;
const HYDRATION_TIMEOUT_MS = 3500;
const FOREGROUND_GRACE_PERIOD_MS = 4000;

const canUseBrowserApis = () => typeof window !== "undefined" && typeof document !== "undefined";

const getRuntimeNetworkState = () => {
  if (!canUseBrowserApis()) {
    return { visibilityState: "server", online: null };
  }

  return {
    visibilityState: document.visibilityState,
    online: typeof navigator !== "undefined" ? navigator.onLine : null,
  };
};

const getAdaptiveRequestTimeout = () => {
  if (!canUseBrowserApis()) return REQUEST_TIMEOUT_MS;

  const isHidden = document.visibilityState === "hidden";
  const resumedRecently = Number(window.__NOSEE_LAST_TAB_VISIBLE_AT__ || 0);
  const elapsedSinceResume = Date.now() - resumedRecently;
  const isInResumeGracePeriod = elapsedSinceResume >= 0 && elapsedSinceResume < FOREGROUND_GRACE_PERIOD_MS;

  return isHidden || isInResumeGracePeriod ? BACKGROUND_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
};

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

const isTimeoutMessage = (message = "") => {
  const normalizedMessage = String(message || "").toLowerCase();
  return normalizedMessage.includes("tardó demasiado") || normalizedMessage.includes("tiempo de espera agotado");
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

   const hydrationTasks = [];
  
  if (missingUserIds.length > 0) {
       hydrationTasks.push(
      withTimeout(
        supabase
          .from("users")
          .select("id, full_name, reputation_points")
          .in("id", missingUserIds),
        HYDRATION_TIMEOUT_MS,
        "Tiempo de espera agotado hidratando usuarios de publicaciones",
      )
        .then(({ data: usersData, error: usersError }) => {
          if (usersError) {
            console.error("Error hidratando usuarios de publicaciones:", usersError);
            return;
          }

          (usersData || []).forEach((userRow) => {
            usersById[userRow.id] = userRow;
          });
        })
        .catch((hydrateUserError) => {
          console.error("Timeout/exception hidratando usuarios de publicaciones:", hydrateUserError);
        }),
      );
  }

  if (missingStoreIds.length > 0) {
      hydrationTasks.push(
      withTimeout(
        supabase
          .from("stores")
          .select("id, name, address, location")
          .in("id", missingStoreIds),
        HYDRATION_TIMEOUT_MS,
        "Tiempo de espera agotado hidratando tiendas de publicaciones",
      )
        .then(({ data: storesData, error: storesError }) => {
          if (storesError) {
            console.error("Error hidratando tiendas de publicaciones:", storesError);
            return;
          }

          (storesData || []).forEach((storeRow) => {
            storesById[storeRow.id] = storeRow;
          });
        })
        .catch((hydrateStoreError) => {
          console.error("Timeout/exception hidratando tiendas de publicaciones:", hydrateStoreError);
        }),
      );
    }
    if (hydrationTasks.length > 0) {
      await Promise.allSettled(hydrationTasks);
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

const enrichPublicationsWithVoteCounts = async (publications) => {
  if (!Array.isArray(publications) || publications.length === 0) {
    return publications;
  }

  const publicationIds = publications.map((p) => p.id);

  const { data: { user } } = await supabase.auth.getUser();
  const currentUserId = user?.id || null;

  const [votesResult, reportsResult, userVotesResult] = await Promise.all([
    supabase.from("publication_votes").select("publication_id, vote_type").in("publication_id", publicationIds),
    supabase.from("reports").select("publication_id, status").in("publication_id", publicationIds),
    currentUserId
      ? supabase.from("publication_votes").select("publication_id, vote_type").in("publication_id", publicationIds).eq("user_id", currentUserId)
      : Promise.resolve({ data: [] }),
  ]);

  const voteCountByPublication = {};
  (votesResult.data || []).forEach((row) => {
    const current = voteCountByPublication[row.publication_id] || { positive: 0, negative: 0 };
    if (row.vote_type === 1) current.positive += 1;
    if (row.vote_type === -1) current.negative += 1;
    voteCountByPublication[row.publication_id] = current;
  });

  const reportCountByPublication = {};
  (reportsResult.data || []).forEach((row) => {
    if (!row.publication_id) return;
    if (String(row.status || "").toLowerCase() !== "rejected") {
      reportCountByPublication[row.publication_id] = (reportCountByPublication[row.publication_id] || 0) + 1;
    }
  });

  const userVoteByPublication = {};
  (userVotesResult.data || []).forEach((row) => {
    userVoteByPublication[row.publication_id] = row.vote_type;
  });

  return publications.map((pub) => ({
    ...pub,
    validated_count: (voteCountByPublication[pub.id]?.positive || 0),
    downvoted_count: (voteCountByPublication[pub.id]?.negative || 0),
    reported_count: (reportCountByPublication[pub.id] || 0),
    user_vote: userVoteByPublication[pub.id] ?? null,
  }));
};

const enrichSearchRankingSignals = async (publications, filters = {}) => {
  if (!Array.isArray(publications) || publications.length === 0) {
    return publications;
  }

  const publicationIds = publications.map((publication) => publication.id);
  const storeIds = [...new Set(publications.map((publication) => publication.store_id).filter(Boolean))];
  const productIds = [...new Set(publications.map((publication) => publication.product_id).filter(Boolean))];

  const [votesResult, reportsResult, evidenceResult, productStatsResult] = await Promise.all([
    supabase.from("publication_votes").select("publication_id, vote_type").in("publication_id", publicationIds),
    supabase.from("reports").select("publication_id, status, evidence_url").in("publication_id", publicationIds),
    supabase.from("store_evidences").select("store_id").in("store_id", storeIds),
    supabase.from("price_publications").select("product_id, price").in("product_id", productIds),
  ]);

  const votesByPublication = {};
  (votesResult.data || []).forEach((row) => {
    const current = votesByPublication[row.publication_id] || { positive: 0, negative: 0 };
    if (row.vote_type === 1) current.positive += 1;
    if (row.vote_type === -1) current.negative += 1;
    votesByPublication[row.publication_id] = current;
  });

  const reportsByPublication = {};
  (reportsResult.data || []).forEach((row) => {
    if (!row.publication_id) return;
    const current = reportsByPublication[row.publication_id] || { active: 0, evidences: 0 };
    if (String(row.status || "").toLowerCase() !== "rejected") {
      current.active += 1;
      if (row.evidence_url) current.evidences += 1;
    }
    reportsByPublication[row.publication_id] = current;
  });

  const evidencesByStore = {};
  (evidenceResult.data || []).forEach((row) => {
    evidencesByStore[row.store_id] = (evidencesByStore[row.store_id] || 0) + 1;
  });

  const productPriceStats = {};
  (productStatsResult.data || []).forEach((row) => {
    if (!productPriceStats[row.product_id]) {
      productPriceStats[row.product_id] = { min: Number(row.price), total: 0, count: 0 };
    }
    const stat = productPriceStats[row.product_id];
    const price = Number(row.price);
    if (price < stat.min) stat.min = price;
    stat.total += price;
    stat.count += 1;
  });

  const hasSearchTerm = String(filters.productName || "").trim().length > 0 || String(filters.storeName || "").trim().length > 0;

  return publications
    .map((publication) => {
      const voteSignals = votesByPublication[publication.id] || { positive: 0, negative: 0 };
      const reportSignals = reportsByPublication[publication.id] || { active: 0, evidences: 0 };
      const userReputation = Number(publication?.user?.reputation_points || 0);
      const storeEvidences = Number(evidencesByStore[publication.store_id] || 0);
      const stats = productPriceStats[publication.product_id] || null;

      const distanceScore = Number.isFinite(publication.distance_km)
        ? clamp(1 - publication.distance_km / 50, 0, 1)
        : 0.45;
      const voteBalance = voteSignals.positive - voteSignals.negative;
      const voteScore = clamp((voteBalance + 5) / 10, 0, 1);
      const reportScore = clamp(1 - reportSignals.active / 5, 0, 1);
      const reputationScore = clamp(userReputation / 500, 0, 1);
      const evidenceScore = clamp((storeEvidences + reportSignals.evidences) / 8, 0, 1);
      const priceScore = stats
        ? clamp(((stats.total / Math.max(stats.count, 1)) - Number(publication.price)) / Math.max(stats.total / Math.max(stats.count, 1), 1) + 0.5, 0, 1)
        : 0.5;

      const searchScore =
        0.26 * distanceScore +
        0.22 * priceScore +
        0.2 * voteScore +
        0.14 * reportScore +
        0.12 * reputationScore +
        0.06 * evidenceScore;

      return {
        ...publication,
        search_signals: {
          ...voteSignals,
          reports_active: reportSignals.active,
          reports_with_evidence: reportSignals.evidences,
          store_evidences: storeEvidences,
          user_reputation_points: userReputation,
          product_avg_price: stats ? stats.total / Math.max(stats.count, 1) : null,
          product_min_price: stats ? stats.min : null,
        },
        search_score: Number(searchScore.toFixed(4)),
      };
    })
    .sort((a, b) => {
      if (hasSearchTerm) {
        return (b.search_score || 0) - (a.search_score || 0);
      }
      return 0;
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

const runWithSessionRetry = async (operation, timeoutMs = getAdaptiveRequestTimeout()) => {
  const firstAttempt = await withTimeout(
    operation(),
    timeoutMs,
    "La sesión tardó demasiado en responder",
  );

  if (!firstAttempt?.error || !isAuthSessionError(firstAttempt.error)) {
    return firstAttempt;
  }

  const { data: refreshData, error: refreshError } = await withTimeout(
    supabase.auth.refreshSession(),
    timeoutMs,
    "No se pudo refrescar la sesión a tiempo",
  );
  if (refreshError || !refreshData?.session) {
    return firstAttempt;
  }

  return withTimeout(
    operation(),
    timeoutMs,
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

    // Calcular puntuación inicial de confiabilidad basada en reputación del usuario
    const { data: userProfile } = await supabase
      .from("users")
      .select("reputation_points")
      .eq("id", user.id)
      .single();
    const reputationPoints = userProfile?.reputation_points ?? 0;
    const confidence_score = Math.min(1.0, 0.5 + reputationPoints / 1000);

    // Crear la publicación
    const payload = {
      product_id: data.productId,
      store_id: data.storeId,
      user_id: user.id,
      price: data.price,
      photo_url: data.photoUrl,
      description: data.description || "No hay descripción",
      confidence_score,
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

    // Sumar reputación al autor por crear publicación (best-effort)
    void (async () => {
      await supabase.rpc("increment_user_reputation", {
        target_user_id: user.id,
        reputation_delta: 5,
      });
    })();

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
  const startedAt = Date.now();
  try {
    const runtimeStateAtStart = getRuntimeNetworkState();
    console.info("[NØSEE:publications.api] getPublications:start", {
      runtime: runtimeStateAtStart,
      hasDistanceFilter: filters?.maxDistance !== null && filters?.maxDistance !== undefined,
      hasCoords: hasCoordinates(filters?.latitude, filters?.longitude),
      page: filters?.page ?? 1,
      limit: filters?.limit ?? 20,
    });

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
      categoryId = null,
    } = filters;
     const offset = (page - 1) * limit;

    const shouldApplyDistanceFilter =
      maxDistance !== null && hasCoordinates(latitude, longitude);

    // Pre-filtro: IDs de productos cuyo nombre O cuya marca coincide con productName
    let productIdFilter = null;
    if (productName) {
      const [{ data: matchingProducts, error: productSearchError }, { data: matchingBrands }] = await Promise.all([
        supabase.from("products").select("id").ilike("name", `%${productName}%`),
        supabase.from("brands").select("id").ilike("name", `%${productName}%`),
      ]);

      if (productSearchError) {
        return { success: false, error: productSearchError.message };
      }

      const productIdsByName = (matchingProducts || []).map((p) => p.id);

      let productIdsByBrand = [];
      if ((matchingBrands || []).length > 0) {
        const brandIds = matchingBrands.map((b) => b.id);
        const { data: brandProducts } = await supabase
          .from("products")
          .select("id")
          .in("brand_id", brandIds);
        productIdsByBrand = (brandProducts || []).map((p) => p.id);
      }

      productIdFilter = [...new Set([...productIdsByName, ...productIdsByBrand])];

      if (productIdFilter.length === 0) {
        return { success: true, data: [], count: 0, hasMore: false };
      }
    }

    // Pre-filtro: IDs de productos de la categoría seleccionada
    if (categoryId) {
      const { data: categoryProducts } = await supabase
        .from("products")
        .select("id")
        .eq("category_id", categoryId);

      const categoryProductIds = (categoryProducts || []).map((p) => p.id);

      if (categoryProductIds.length === 0) {
        return { success: true, data: [], count: 0, hasMore: false };
      }

      if (productIdFilter !== null) {
        productIdFilter = productIdFilter.filter((id) => categoryProductIds.includes(id));
        if (productIdFilter.length === 0) {
          return { success: true, data: [], count: 0, hasMore: false };
        }
      } else {
        productIdFilter = categoryProductIds;
      }
    }

    // Pre-filtro: IDs de tiendas cuyo nombre coincide con storeName
    // (solo sin filtro de distancia, que ya maneja storeName client-side)
    let storeNameFilter = null;
    if (storeName && !shouldApplyDistanceFilter) {
      const { data: matchingStores, error: storeSearchError } = await supabase
        .from("stores")
        .select("id")
        .ilike("name", `%${storeName}%`);

      if (storeSearchError) {
        return { success: false, error: storeSearchError.message };
      }

      storeNameFilter = (matchingStores || []).map((s) => s.id);

      if (storeNameFilter.length === 0) {
        return { success: true, data: [], count: 0, hasMore: false };
      }
    }

     const publicationListSelect = [
      "id",
      "price",
      "photo_url",
      "description",
      "confidence_score",
      "is_active",
      "created_at",
      "user_id",
      "user:users!price_publications_user_id_fkey (id, full_name, reputation_points)",
      "product_id",
      "product:products (id, name, category_id, base_quantity, unit_type:unit_types (id, name, abbreviation))",
      "store_id",
      "store:stores!price_publications_store_id_fkey (id, name, address, location, store_type_id, website_url)",
    ].join(",");

    const buildPublicationsQuery = (nearbyStoreIds, { withCount = true } = {}) => {
      let query = supabase
        .from("price_publications")
        .select(
          publicationListSelect,
          withCount ? { count: "planned" } : undefined,
        );

      // Filtro por producto (IDs pre-filtrados por nombre)
      if (productIdFilter !== null) {
        query = query.in("product_id", productIdFilter);
      }

      // Filtro por rango de precio
      if (minPrice !== null) {
        query = query.gte("price", minPrice);
      }
      if (maxPrice !== null) {
        query = query.lte("price", maxPrice);
      }

      // Filtro por tienda (IDs pre-filtrados por nombre, sin filtro de distancia)
      if (storeNameFilter !== null) {
        query = query.in("store_id", storeNameFilter);
      }

      // Filtro por tiendas cercanas (filtro de distancia)
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
        case "best_match":
          query = query.order("created_at", { ascending: false });
          break;
        case "recent":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      return query.range(offset, offset + limit - 1);
    };

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

    const adaptiveTimeoutMs = getAdaptiveRequestTimeout();
    console.info("[NØSEE:publications.api] publications-query:attempt", {
      attempt: 1,
      timeoutMs: adaptiveTimeoutMs,
      withCount: true,
      runtime: getRuntimeNetworkState(),
    });

    let publicationsResult = await runWithSessionRetry(
      () => buildPublicationsQuery(nearbyStoreIdsForQuery, { withCount: true }),
      adaptiveTimeoutMs,
    );

    if (publicationsResult?.error && isTimeoutMessage(publicationsResult.error.message)) {
      const runtimeState = getRuntimeNetworkState();
      console.warn("Timeout en getPublications (primer intento)", {
        runtimeState,
        timeoutMs: adaptiveTimeoutMs,
      });

      console.info("[NØSEE:publications.api] publications-query:attempt", {
        attempt: 2,
        timeoutMs: EXTENDED_RETRY_TIMEOUT_MS,
        withCount: false,
        runtime: getRuntimeNetworkState(),
      });

      publicationsResult = await runWithSessionRetry(
        () => buildPublicationsQuery(nearbyStoreIdsForQuery, { withCount: false }),
        EXTENDED_RETRY_TIMEOUT_MS,
      );
    }

    const { data, error, count } = publicationsResult;

    if (error) {
      console.error("Error obteniendo publicaciones:", error);
      return { success: false, error: error.message };
    }

    const hydrationStartedAt = Date.now();
    const publicationsWithRelations = await hydrateRelatedPublicationData(data || []);
    console.info("[NØSEE:publications.api] publications-hydration:done", {
      elapsedMs: Date.now() - hydrationStartedAt,
      rows: publicationsWithRelations.length,
    });

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
    const shouldUseBestMatch =
      SEARCH_SORT_FIELDS.has(sortBy) &&
      (sortBy === SORT_OPTIONS.BEST_MATCH || String(productName || "").trim() || String(storeName || "").trim());

    const rankedPublications = shouldUseBestMatch
      ? await enrichSearchRankingSignals(publicationsWithCoordinates, {
          productName,
          storeName,
        })
      : publicationsWithCoordinates;

    const enrichedPublications = await enrichPublicationsWithVoteCounts(rankedPublications);

    return {
      success: true,
      data: enrichedPublications,
      count: count ?? rankedPublications.length,
      hasMore: offset + limit < (count ?? rankedPublications.length),
    };
  } catch (err) {
    const runtimeState = getRuntimeNetworkState();
    console.error("Contexto runtime en getPublications:", runtimeState);
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
    console.error("[NØSEE:publications.api] getPublications:failed", {
      elapsedMs: Date.now() - startedAt,
      runtime: runtimeState,
      message: err?.message,
    });
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
        product:products (id, name, base_quantity, unit_type:unit_types (id, name, abbreviation)),
        store:stores!price_publications_store_id_fkey (id, name, address, location, store_type_id, website_url),
        votes:publication_votes (id, vote_type, user_id)
        `,
      )
      .eq("id", publicationId)
      .single();

    if (error) {
      console.error("Error obteniendo detalles:", error);
      return { success: false, error: error.message };
    }

    let comments = [];
    const { data: commentsData, error: commentsError } = await loadCommentsRows(publicationId);

    if (!commentsError && commentsData?.length) {
      comments = await hydrateCommentUsers(
        commentsData.filter((comment) => comment.is_deleted !== true),
      );
    }

    return { success: true, data: { ...data, comments } };

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
 * @param {object} payload - Objeto con detalles del reporte
 *   - reason: Razón del reporte (fake_price, wrong_photo, spam, offensive, other)
 *   - description: Descripción opcional del reporte
 *   - evidenceFile: Archivo de evidencia opcional
 *
 * @returns {Promise} { success, data, error, message }
 *
 * @example
 * const result = await reportPublication(123, { 
 *   reason: 'fake_price', 
 *   description: 'El precio es imposible',
 *   evidenceFile: fileObject
 * });
 */

/**
 * Verificar si el usuario ya reportó una publicación
 *
 * @param {number} publicationId - ID de la publicación
 * @returns {Promise} { success, hasReported: boolean, existingReport: object|null }
 *
 * @example
 * const result = await checkUserReportStatus(123);
 * // { success: true, hasReported: true, existingReport: { id: '...', createdAt: '...' } }
 */
export const checkUserReportStatus = async (publicationId) => {
  const logPrefix = '[📋 CHECK-REPORT]';
  
  try {
    console.log(`${logPrefix} Verificando si usuario ya reportó publicación #${publicationId}`);
    
    // Obtener usuario actual
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      console.log(`${logPrefix} Usuario no autenticado`);
      return { 
        success: true, 
        hasReported: false, 
        existingReport: null 
      };
    }

    // Buscar reporte existente
    const { data: existingReport, error } = await supabase
      .from("reports")
      .select("id, created_at, reason, description")
      .eq("publication_id", publicationId)
      .eq("reporter_user_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error(`${logPrefix} Error buscando reporte:`, error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }

    const hasReported = !!existingReport;
    console.log(`${logPrefix} Resultado:`, { 
      hasReported, 
      reportId: existingReport?.id 
    });

    return { 
      success: true, 
      hasReported, 
      existingReport: existingReport || null 
    };

  } catch (err) {
    console.error(`${logPrefix} Error crítico:`, err.message);
    return { 
      success: false, 
      error: err.message 
    };
  }
};

export const reportPublication = async (
  publicationId,
  payload,
  _deprecatedDescription,
) => {
  const logPrefix = '[📋 REPORTE]';
  
  try {
    console.log(`${logPrefix} Iniciando reporte de publicación #${publicationId}`);
    console.log(`${logPrefix} Payload recibido:`, payload);

    // ─── VALIDACIONES ───────────────────────────────────────────────────
    
    // Manejar tanto payload object como parámetros antiguos
    const isLegacyCall = typeof payload === 'string';
    const reportData = isLegacyCall 
      ? { reason: payload, description: _deprecatedDescription }
      : payload;

    console.log(`${logPrefix} Datos del reporte:`, {
      reason: reportData.reason,
      hasDescription: !!reportData.description,
      hasEvidence: !!reportData.evidenceFile,
    });

    if (!publicationId || !reportData.reason) {
      const errorMsg = "Datos incompletos: falta publicationId o reason";
      console.error(`${logPrefix} ❌ ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg,
        message: "Por favor completa la razón del reporte"
      };
    }

    const validReasons = ["fake_price", "wrong_photo", "spam", "offensive", "other"];
    if (!validReasons.includes(reportData.reason)) {
      const errorMsg = `Razón de reporte inválida: ${reportData.reason}`;
      console.error(`${logPrefix} ❌ ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg,
        message: "Razón de reporte no válida"
      };
    }

    // ─── AUTENTICACIÓN ──────────────────────────────────────────────────

    console.log(`${logPrefix} Verificando autenticación...`);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    
    if (!user) {
      const errorMsg = "Usuario no autenticado";
      console.error(`${logPrefix} ❌ ${errorMsg}`);
      return { 
        success: false, 
        error: errorMsg,
        message: "Debes iniciar sesión para reportar"
      };
    }

    console.log(`${logPrefix} ✓ Usuario autenticado: ${user.id}`);

    // ─── VERIFICAR REPORTE DUPLICADO ────────────────────────────────────

    console.log(`${logPrefix} Verificando si ya reportó esta publicación...`);
    const { data: existingReport, error: checkError } = await supabase
      .from("reports")
      .select("id, created_at")
      .eq("publication_id", publicationId)
      .eq("reporter_user_id", user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error(`${logPrefix} ❌ Error verificando reporte:`, checkError.message);
      return { 
        success: false, 
        error: checkError.message,
        message: "Error verificando reportes anteriores"
      };
    }

    if (existingReport) {
      const errorMsg = `Ya reportaste esta publicación el ${new Date(existingReport.created_at).toLocaleString()}`;
      console.warn(`${logPrefix} ⚠️ ${errorMsg}`);
      return { 
        success: false, 
        error: "Duplicate report",
        message: errorMsg,
        existingReport
      };
    }

    console.log(`${logPrefix} ✓ Sin reportes previos de este usuario`);

    // ─── SUBIR EVIDENCIA (si existe) ────────────────────────────────────

    let evidenceUrl = null;
    if (reportData.evidenceFile) {
      try {
        console.log(`${logPrefix} Subiendo archivo de evidencia a Cloudinary...`);
        
        const cloudinaryResult = await uploadImageToCloudinary(reportData.evidenceFile, {
          folder: 'nosee/reports-evidence'
        });

        if (cloudinaryResult.success) {
          evidenceUrl = cloudinaryResult.optimizedUrl || cloudinaryResult.url;
          console.log(`${logPrefix} ✓ Evidencia subida: ${evidenceUrl}`);
        } else {
          console.warn(`${logPrefix} ⚠️ Error subiendo evidencia (continuando sin ella):`, cloudinaryResult.error);
        }
      } catch (fileErr) {
        console.warn(`${logPrefix} ⚠️ Error procesando archivo (continuando):`, fileErr.message);
      }
    }

    // ─── CREAR REPORTE EN BD ────────────────────────────────────────────

    console.log(`${logPrefix} Creando reporte en base de datos...`);
    const { data: report, error } = await supabase
      .from("reports")
      .insert({
        publication_id: publicationId,
        reporter_user_id: user.id,
        reason: reportData.reason,
        description: reportData.description || null,
        evidence_url: evidenceUrl,
        status: "PENDING",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error(`${logPrefix} ❌ Error en BD:`, error);
      return { 
        success: false, 
        error: error.message,
        message: "Hubo un error al guardar el reporte"
      };
    }

    console.log(`${logPrefix} ✅ Reporte creado exitosamente:`, {
      id: report.id,
      publicationId: report.publication_id,
      reason: report.reason,
      status: report.status,
    });

    return { 
      success: true, 
      data: report,
      message: "Reporte enviado correctamente. Gracias por ayudarnos a mejorar NØSEE."
    };

  } catch (err) {
    console.error(`${logPrefix} ❌ Error crítico:`, {
      message: err.message,
      stack: err.stack,
      publicationId,
    });
    return { 
      success: false, 
      error: err.message,
      message: "Error al procesar el reporte. Intenta de nuevo."
    };
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

export const searchProductsAndBrands = async (query, limit = 8) => {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, data: [] };
    }

    const safeLimit = Math.max(3, Math.min(Number(limit) || 8, 20));
    const term = query.trim();

    const [{ data: productsData, error: productsError }, { data: brandsData, error: brandsError }] = await Promise.all([
      supabase
        .from("products")
        .select("id, name, brand:brands(id, name)")
        .ilike("name", `%${term}%`)
        .limit(safeLimit),
      supabase
        .from("brands")
        .select("id, name")
        .ilike("name", `%${term}%`)
        .limit(Math.ceil(safeLimit / 2)),
    ]);

    if (productsError) return { success: false, error: productsError.message };
    if (brandsError) return { success: false, error: brandsError.message };

    const seen = new Set();
    const suggestions = [];

    for (const product of productsData || []) {
      const key = `product-${product.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: product.id,
        label: product.brand?.name ? `${product.name} · ${product.brand.name}` : product.name,
        type: "product",
        value: product.name,
      });
    }

    for (const brand of brandsData || []) {
      const key = `brand-${brand.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        id: brand.id,
        label: `${brand.name} (marca)`,
        type: "brand",
        value: brand.name,
      });
    }

    return { success: true, data: suggestions.slice(0, safeLimit) };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

export const searchProducts = async (query, limit = 10) => {
  try {
    if (!query || query.length < 2) {
      return { success: true, data: [] };
    }

    const executeSearch = () =>
      supabase
        .from("products")
        .select("id, name, category_id, base_quantity, brand:brands(name), unit:unit_types(name)")
        .ilike("name", `%${query}%`)
        .limit(limit);
      
    const { data, error } = await runWithSessionRetry(executeSearch, getAdaptiveRequestTimeout());

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

    const { data, error } = await runWithSessionRetry(executeSearch, getAdaptiveRequestTimeout());

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
    return { success: false, error: "Este producto ya está registrado.", alreadyExists: true, data: existingProduct };
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

  // Sumar reputación al creador del producto (best-effort)
  const { data: { user: authUser } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (authUser?.id) {
    void (async () => {
      await supabase.rpc("increment_user_reputation", {
        target_user_id: authUser.id,
        reputation_delta: 2,
      });
    })();
  }

  return { success: true, data };
}

export async function updateProduct(productId, updates = {}) {
  if (!productId) return { success: false, error: "ID de producto requerido" };

  const safeUpdates = {};
  if (typeof updates.name === "string") safeUpdates.name = updates.name.trim();
  if (updates.categoryId !== undefined) safeUpdates.category_id = Number(updates.categoryId);
  if (updates.unitTypeId !== undefined) safeUpdates.unit_type_id = Number(updates.unitTypeId);
  if (updates.brandId !== undefined) safeUpdates.brand_id = Number(updates.brandId);
  if (updates.baseQuantity !== undefined) safeUpdates.base_quantity = Number(updates.baseQuantity);

  if (Object.keys(safeUpdates).length === 0) {
    return { success: false, error: "No hay campos para actualizar" };
  }

  const { data, error } = await supabase
    .from("products")
    .update(safeUpdates)
    .eq("id", productId)
    .select("id, name, category_id, brand_id, unit_type_id, base_quantity")
    .single();

  if (error) return { success: false, error: error.message };
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
    return { success: false, error: "Esta marca ya está registrada.", alreadyExists: true, data: existing };
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

  // Sumar reputación al creador de la marca (best-effort)
  const { data: { user: authUserBrand } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (authUserBrand?.id) {
    void (async () => {
      await supabase.rpc("increment_user_reputation", {
        target_user_id: authUserBrand.id,
        reputation_delta: 1,
      });
    })();
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


// ─── COMENTARIOS ─────────────────────────────────────────────────────────────

/**
 * Obtener todos los comentarios de una publicación (flat, sin borrados)
 */
const hydrateCommentUsers = async (comments) => {
  if (!comments.length) return comments;
  const userIds = [...new Set(comments.map((c) => c.user_id).filter(Boolean))];
  const { data: usersData } = await supabase
    .from("users")
    .select("id, full_name")
    .in("id", userIds);
  const usersMap = {};
  for (const u of usersData || []) usersMap[u.id] = u;
  return comments.map((c) => ({ ...c, user: usersMap[c.user_id] || null }));
};

const loadCommentsRows = async (publicationId) => {
  const baseQuery = supabase
    .from("comments")
    .select("id, content, created_at, user_id, parent_id, is_deleted")
    .eq("publication_id", publicationId)
    .order("created_at", { ascending: true });

    const withSoftDeleteFilter = await baseQuery.eq("is_deleted", false);
  if (!withSoftDeleteFilter.error) return withSoftDeleteFilter;

  // Compatibilidad: algunos entornos siguen sin la columna is_deleted.
  if (withSoftDeleteFilter.error.code === "42703") {
    const withoutSoftDeleteFilter = await supabase
      .from("comments")
      .select("id, content, created_at, user_id, parent_id")
      .eq("publication_id", publicationId)
      .order("created_at", { ascending: true });
    return withoutSoftDeleteFilter;
  }

  return withSoftDeleteFilter;
};

export const getComments = async (publicationId) => {
  try {
    if (!publicationId) return { success: false, error: "ID requerido" };

    const { data, error } = await loadCommentsRows(publicationId);
    if (error) return { success: false, error: error.message };
    const rows = (data || []).filter((comment) => comment.is_deleted !== true);
    return { success: true, data: await hydrateCommentUsers(rows) };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Agregar un comentario (o respuesta) a una publicación
 * @param {number} publicationId
 * @param {string} content
 * @param {string|null} parentId - UUID del comentario padre (null = top-level)
 */
export const addComment = async (publicationId, content, parentId = null) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Usuario no autenticado" };

    const trimmed = String(content || "").trim();
    if (!trimmed) return { success: false, error: "El comentario no puede estar vacío" };

    const { data, error } = await supabase
      .from("comments")
      .insert({
        publication_id: publicationId,
        user_id: user.id,
        content: trimmed,
        parent_id: parentId || null,
      })
      .select("id, content, created_at, user_id, parent_id")
      .single();

    if (error) return { success: false, error: error.message };

    // Obtener nombre del usuario desde public.users
    const { data: userData } = await supabase
      .from("users")
      .select("id, full_name")
      .eq("id", user.id)
      .single();

    // Sumar reputación por comentar (best-effort)
    void (async () => {
      await supabase.rpc("increment_user_reputation", {
        target_user_id: user.id,
        reputation_delta: 1,
      });
    })();

    return { success: true, data: { ...data, user: userData || null } };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Eliminar (soft delete) un comentario propio
 * @param {string} commentId - UUID del comentario
 */
export const deleteComment = async (commentId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Usuario no autenticado" };

    const { error } = await supabase
      .from("comments")
      .update({ is_deleted: true })
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
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
  checkUserReportStatus,
  searchProducts,
  createProduct,
  searchProductsAndBrands,
  getProducts,
  searchStores,
  getStores,
  getProductCategories,
  getUnitTypes,
  searchBrands,
  createBrand,
  updateProduct,
  updatePublication,
  deletePublication,
  getComments,
  addComment,
  deleteComment,
  PUBLICATION_STATUS,
  SORT_OPTIONS,
};
