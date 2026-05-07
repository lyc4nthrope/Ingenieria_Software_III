/**
 * publications.ranking.js
 *
 * Lógica de scoring y ranking client-side para publicaciones de NØSEE.
 * Extrae señales de relevancia y ordena resultados por search_score.
 *
 * UBICACIÓN: src/services/api/publications.ranking.js
 * DEPENDENCIAS: NO importar desde publications.api.js (evitar circulares)
 */

import { clamp, normalizeSearchText, tokenTextScore } from "@/services/utils/normalization";
import { RANKING_WEIGHTS, SCORE_THRESHOLDS } from "@/constants/ranking";
import { SORT_OPTIONS } from "@/constants/publications";
import { debugPublications } from "@/utils/debugLogger";

/**
 * Enriquece publicaciones con señales de ranking y ordena por search_score.
 *
 * Calcula un score compuesto para cada publicación usando los pesos definidos
 * en RANKING_WEIGHTS y los umbrales de SCORE_THRESHOLDS. Solo aplica
 * ordenamiento por score cuando sortBy === BEST_MATCH o es RECENT con búsqueda.
 *
 * @param {Array} publications - Lista de publicaciones (ya hidratadas con votos)
 * @param {Object} filters - Filtros activos (productName, storeName, sortBy)
 * @returns {Array} Publicaciones enriquecidas con search_signals y search_score
 */
export const enrichSearchRankingSignals = (publications, filters = {}) => {
  if (!Array.isArray(publications) || publications.length === 0) {
    return publications;
  }

  debugPublications("enrichSearchRankingSignals:start", {
    count: publications.length,
    sortBy: filters.sortBy,
    hasProductName: !!filters.productName,
    hasStoreName: !!filters.storeName,
  });

  // Construir estadísticas de precio por producto en memoria
  // (reutiliza las publicaciones ya obtenidas — sin round-trip extra a la BD)
  const productPriceStats = {};
  publications.forEach((pub) => {
    const pid = pub.product_id;
    const price = Number(pub.price);
    if (!pid || !Number.isFinite(price)) return;
    if (!productPriceStats[pid]) {
      productPriceStats[pid] = { min: price, total: 0, count: 0 };
    }
    const stat = productPriceStats[pid];
    if (price < stat.min) stat.min = price;
    stat.total += price;
    stat.count += 1;
  });

  const hasSearchTerm =
    String(filters.productName || "").trim().length > 0 ||
    String(filters.storeName || "").trim().length > 0;
  const normalizedSortBy = String(filters.sortBy || SORT_OPTIONS.RECENT);
  const normalizedProductQuery = normalizeSearchText(filters.productName || "");
  const normalizedStoreQuery = normalizeSearchText(filters.storeName || "");
  const shouldSortByScore =
    normalizedSortBy === SORT_OPTIONS.BEST_MATCH ||
    (normalizedSortBy === SORT_OPTIONS.RECENT && hasSearchTerm);

  const result = publications
    .map((publication) => {
      // Votos (columnas denormalizadas en price_publications)
      const validatedCount = Number(publication.validated_count ?? 0);
      const downvotedCount = Number(publication.downvoted_count ?? 0);
      // Reportes activos (columna denormalizada)
      const activeReports = Number(publication.active_reports_count ?? 0);
      // Evidencias de tienda (columna denormalizada en stores, via join)
      const storeEvidences = Number(publication?.store?.evidence_count ?? 0);
      const userReputation = Number(publication?.user?.reputation_points || 0);
      const stats = productPriceStats[publication.product_id] || null;

      const productName =
        publication?.product?.name || publication?.products?.name || "";
      const productBrand =
        publication?.product?.brand?.name || publication?.products?.brand?.name || "";
      const storeName =
        publication?.store?.name || publication?.stores?.name || "";

      const normalizedProductText = normalizeSearchText(`${productName} ${productBrand}`);
      const normalizedStoreText = normalizeSearchText(storeName);

      // Señales de scoring
      const distanceScore = Number.isFinite(publication.distance_km)
        ? clamp(1 - publication.distance_km / SCORE_THRESHOLDS.distanceKm, 0, 1)
        : 0.45;

      const voteBalance = validatedCount - downvotedCount;
      const voteScore = clamp(
        (voteBalance + SCORE_THRESHOLDS.voteNorm) / (SCORE_THRESHOLDS.voteNorm * 2),
        0,
        1,
      );

      const reportScore = clamp(1 - activeReports / SCORE_THRESHOLDS.reports, 0, 1);
      const reputationScore = clamp(userReputation / SCORE_THRESHOLDS.reputation, 0, 1);
      const evidenceScore = clamp(storeEvidences / SCORE_THRESHOLDS.evidences, 0, 1);

      const avgPrice = stats ? stats.total / Math.max(stats.count, 1) : null;
      const priceScore = avgPrice !== null
        ? clamp(
            (avgPrice - Number(publication.price)) / Math.max(avgPrice, 1) + 0.5,
            0,
            1,
          )
        : 0.5;

      const productTextScore = tokenTextScore(normalizedProductQuery, normalizedProductText);
      const storeTextScore = tokenTextScore(normalizedStoreQuery, normalizedStoreText);

      const textScore =
        normalizedProductQuery || normalizedStoreQuery
          ? clamp(
              (normalizedProductQuery ? productTextScore * 0.75 : 0) +
                (normalizedStoreQuery ? storeTextScore * 0.25 : 0),
              0,
              1,
            )
          : 0.5;

      // Recencia: decae linealmente en SCORE_THRESHOLDS.ageWeeks semanas
      const ageWeeks =
        (Date.now() - new Date(publication.created_at || 0).getTime()) / 604_800_000;
      const recencyScore = clamp(1 - ageWeeks / SCORE_THRESHOLDS.ageWeeks, 0, 1);

      const searchScore =
        RANKING_WEIGHTS.text       * textScore +
        RANKING_WEIGHTS.price      * priceScore +
        RANKING_WEIGHTS.distance   * distanceScore +
        RANKING_WEIGHTS.vote       * voteScore +
        RANKING_WEIGHTS.report     * reportScore +
        RANKING_WEIGHTS.recency    * recencyScore +
        RANKING_WEIGHTS.reputation * reputationScore +
        RANKING_WEIGHTS.evidence   * evidenceScore;

      return {
        ...publication,
        search_signals: {
          positive: validatedCount,
          negative: downvotedCount,
          reports_active: activeReports,
          store_evidences: storeEvidences,
          text_score: Number(textScore.toFixed(4)),
          recency_score: Number(recencyScore.toFixed(4)),
          user_reputation_points: userReputation,
          product_avg_price: avgPrice,
          product_min_price: stats ? stats.min : null,
        },
        search_score: Number(searchScore.toFixed(4)),
      };
    })
    .sort((a, b) => {
      if (shouldSortByScore) {
        return (b.search_score || 0) - (a.search_score || 0);
      }
      return 0;
    });

  debugPublications("enrichSearchRankingSignals:done", {
    count: result.length,
    sorted: shouldSortByScore,
  });

  return result;
};
