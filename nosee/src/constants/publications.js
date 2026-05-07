/**
 * publications.js
 *
 * Constantes centralizadas para el módulo de publicaciones.
 *
 * UBICACIÓN: src/constants/publications.js
 */

/**
 * Estados posibles de una publicación
 */
export const PUBLICATION_STATUS = {
  PENDING: "pending",
  VALIDATED: "validated",
  REJECTED: "rejected",
  EXPIRED: "expired",
};

/**
 * Opciones de ordenamiento de resultados
 */
export const SORT_OPTIONS = {
  RECENT: "recent",
  VALIDATED: "validated",
  CHEAPEST: "cheapest",
  BEST_MATCH: "best_match",
};

/**
 * Campos de ordenamiento válidos para búsqueda
 */
export const SEARCH_SORT_FIELDS = new Set([
  SORT_OPTIONS.RECENT,
  SORT_OPTIONS.VALIDATED,
  SORT_OPTIONS.CHEAPEST,
  SORT_OPTIONS.BEST_MATCH,
]);

/**
 * Si la moderación de imágenes es obligatoria (configurado por variable de entorno)
 */
export const REQUIRE_IMAGE_MODERATION =
  String(import.meta.env.VITE_REQUIRE_IMAGE_MODERATION || "false").toLowerCase() === "true";

/**
 * Razones válidas para reportar una publicación
 */
export const VALID_REPORT_REASONS = ["fake_price", "wrong_photo", "spam", "offensive", "other"];
