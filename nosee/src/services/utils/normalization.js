export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const normalizeSearchText = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

/**
 * Calcula un score de similitud basado en tokens entre un query y un texto.
 * Tokeniza por espacios, evalúa cada query token contra cada producto token,
 * y pondera con un factor de cobertura.
 *
 * @param {string} query - Texto normalizado del buscador
 * @param {string} text  - Texto normalizado del producto/tienda
 * @returns {number} Score entre 0 y 1 (0.5 si query está vacío)
 */
export const tokenTextScore = (query, text) => {
  if (!query) return 0.5;
  const queryTokens = query.split(/\s+/).filter(Boolean);
  const textTokens = text.split(/\s+/).filter(Boolean);
  if (!textTokens.length) return 0;
  let totalScore = 0;
  for (const qt of queryTokens) {
    let best = 0;
    for (const tt of textTokens) {
      let score = 0;
      if (tt === qt) {
        score = 1.0;
      } else if (tt.startsWith(qt)) {
        score = qt.length / tt.length;
      } else if (qt.startsWith(tt)) {
        score = tt.length / qt.length;
      } else if (tt.includes(qt)) {
        score = (qt.length / tt.length) * 0.6;
      }
      if (score > best) best = score;
    }
    totalScore += best;
  }
  const tokenMatchScore = totalScore / queryTokens.length;
  const coverageRatio = Math.min(1, queryTokens.length / textTokens.length);
  return tokenMatchScore * 0.8 + coverageRatio * 0.2;
};

export const normalizeBarcodeValue = (value = "") =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
