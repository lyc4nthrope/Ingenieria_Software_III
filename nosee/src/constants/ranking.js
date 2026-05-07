/**
 * ranking.js
 *
 * Constantes de scoring y ranking para publicaciones.
 *
 * UBICACIÓN: src/constants/ranking.js
 */

/**
 * Pesos para el cálculo del search_score.
 * La suma de todos los pesos debe ser 1.00.
 *
 * text:        0.40  — relevancia textual (nombre producto + tienda)
 * price:       0.18  — precio relativo al promedio del producto
 * distance:    0.14  — proximidad geográfica del usuario a la tienda
 * vote:        0.10  — balance de upvotes/downvotes
 * report:      0.06  — ausencia de reportes activos
 * recency:     0.05  — qué tan reciente es la publicación
 * reputation:  0.04  — reputación del autor
 * evidence:    0.03  — cantidad de evidencias de la tienda
 */
export const RANKING_WEIGHTS = {
  text: 0.40,
  price: 0.18,
  distance: 0.14,
  vote: 0.10,
  report: 0.06,
  recency: 0.05,
  reputation: 0.04,
  evidence: 0.03,
};

/**
 * Umbrales de normalización para cada señal de ranking.
 *
 * distanceKm:  Radio máximo en km para normalizar distancia (score 0 = 50 km)
 * voteNorm:    Rango de normalización de votos (±5 → 0..1)
 * reports:     Cantidad de reportes que llevan el reportScore a 0
 * reputation:  Puntos de reputación que representan el máximo (score 1.0)
 * evidences:   Evidencias de tienda que representan el máximo (score 1.0)
 * ageWeeks:    Semanas de antigüedad en las que el recencyScore llega a 0
 */
export const SCORE_THRESHOLDS = {
  distanceKm: 50,
  voteNorm: 5,
  reports: 5,
  reputation: 500,
  evidences: 8,
  ageWeeks: 52,
};
