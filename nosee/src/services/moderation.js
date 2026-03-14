const MODERATION_SCORE_THRESHOLD = Number(
  import.meta.env.VITE_TEXT_MODERATION_SCORE_THRESHOLD || 3,
);
const IMAGE_CONFIDENCE_THRESHOLD = Number(
  import.meta.env.VITE_IMAGE_MODERATION_CONFIDENCE_THRESHOLD || 0.75,
);

const OFFENSIVE_TERMS = [
  { term: "hijueputa", weight: 5, category: "insulto_fuerte" },
  { term: "gonorrea", weight: 4, category: "insulto_fuerte" },
  { term: "malparido", weight: 4, category: "insulto_fuerte" },
  { term: "hpta", weight: 4, category: "insulto_fuerte" },
  { term: "hp", weight: 3, category: "insulto_medio" },
  { term: "puta", weight: 3, category: "lenguaje_sexual_ofensivo" },
  { term: "puto", weight: 3, category: "lenguaje_sexual_ofensivo" },
  { term: "mierda", weight: 2, category: "groseria" },
  { term: "imbecil", weight: 2, category: "insulto" },
  { term: "idiota", weight: 2, category: "insulto" },
  { term: "estupido", weight: 2, category: "insulto" },
  { term: "perra", weight: 2, category: "insulto" },
  { term: "pirobo", weight: 3, category: "insulto" },
  { term: "culo", weight: 1, category: "sexual" },
  { term: "marica", weight: 1, category: "slur_contextual" },
  { term: "mk", weight: 1, category: "slur_contextual" },
];

const TARGETING_WORDS = ["usted", "tu", "vos", "eres", "sos", "callate", "idiota"];
const HIGH_RISK_IMAGE_KEYWORDS = [
  "nudity",
  "nude",
  "explicit",
  "sexual",
  "porn",
  "genitals",
  "breast",
  "gore",
  "violence",
  "blood",
];
const ADULT_GORE_KEYWORDS = [
  "adult",
  "adults",
  "xxx",
  "porn",
  "porno",
  "pornografia",
  "nsfw",
  "nude",
  "nudity",
  "desnudo",
  "desnuda",
  "sex",
  "sexual",
  "onlyfans",
  "escort",
  "fetish",
  "gore",
  "blood",
  "sangre",
  "cadaver",
  "decapitado",
  "violence",
  "violento",
  "violencia",
  "mutilacion",
];

const normalizeText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeLeetspeak = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[@4]/g, "a")
    .replace(/[3]/g, "e")
    .replace(/[1!|]/g, "i")
    .replace(/[0]/g, "o")
    .replace(/[5$]/g, "s")
    .replace(/[7]/g, "t")
    .replace(/\*/g, "")
    .replace(/[^a-z0-9\s]/g, " ");

const collapseRepeatedChars = (value = "") => value.replace(/(.)\1{2,}/g, "$1$1");

const extractNumbersDeep = (value, acc = []) => {
  if (value === null || value === undefined) return acc;
  if (typeof value === "number" && Number.isFinite(value)) {
    acc.push(value);
    return acc;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractNumbersDeep(item, acc));
    return acc;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => extractNumbersDeep(item, acc));
    return acc;
  }
  return acc;
};

const extractStringsDeep = (value, acc = []) => {
  if (value === null || value === undefined) return acc;
  if (typeof value === "string") {
    acc.push(value.toLowerCase());
    return acc;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => extractStringsDeep(item, acc));
    return acc;
  }
  if (typeof value === "object") {
    Object.values(value).forEach((item) => extractStringsDeep(item, acc));
    return acc;
  }
  return acc;
};

const findTextMatches = (normalized) => {
  let score = 0;
  const matches = [];
  const tokenSet = new Set(normalized.split(" ").filter(Boolean));
  const containsTargeting = TARGETING_WORDS.some((token) => tokenSet.has(token));

  for (const entry of OFFENSIVE_TERMS) {
    const pattern = new RegExp(`(^|\\s)${entry.term}(\\s|$)`, "i");
    if (!pattern.test(normalized)) continue;

    let effectiveWeight = entry.weight;
    if (entry.category === "slur_contextual" && !containsTargeting) {
      // Penalización menor para términos ambiguos sin ataque explícito
      effectiveWeight = Math.max(0.5, entry.weight * 0.5);
    }
    if (containsTargeting) effectiveWeight += 0.8;

    score += effectiveWeight;
    matches.push({
      term: entry.term,
      category: entry.category,
      weight: Number(effectiveWeight.toFixed(2)),
    });
  }

  return { score: Number(score.toFixed(2)), matches, containsTargeting };
};

export const detectInappropriateText = (text = "") => {
  const base = normalizeText(text);
  if (!base) {
    return {
      flagged: false,
      score: 0,
      matches: [],
      strategy: "empty",
    };
  }

  const leet = collapseRepeatedChars(normalizeText(normalizeLeetspeak(text)));
  const direct = findTextMatches(base);
  const obfuscated = base === leet ? { score: 0, matches: [] } : findTextMatches(leet);

  const mergedMatches = [...direct.matches];
  for (const item of obfuscated.matches) {
    if (!mergedMatches.find((m) => m.term === item.term)) mergedMatches.push(item);
  }

  const score = Number(Math.max(direct.score, obfuscated.score).toFixed(2));
  const flagged = score >= MODERATION_SCORE_THRESHOLD;

  return {
    flagged,
    score,
    threshold: MODERATION_SCORE_THRESHOLD,
    matches: mergedMatches,
    strategy: flagged ? "weighted-terms+context+obfuscation" : "safe",
  };
};

export const detectRestrictedContentText = (text = "") => {
  const normalized = collapseRepeatedChars(
    normalizeText(normalizeLeetspeak(text)),
  );
  if (!normalized) {
    return { flagged: false, score: 0, matches: [], strategy: "empty" };
  }

  const matches = ADULT_GORE_KEYWORDS.filter((term) => {
    const pattern = new RegExp(`(^|\\s)${term}(\\s|$)`, "i");
    return pattern.test(normalized);
  });

  const score = matches.reduce((acc, term) => {
    // Penaliza más términos explícitos fuertes.
    if (["porn", "porno", "xxx", "nsfw", "gore", "decapitado", "mutilacion"].includes(term)) return acc + 2;
    return acc + 1;
  }, 0);

  return {
    flagged: score >= 2 || matches.length >= 1,
    score,
    matches,
    strategy: "adult-gore-keywords",
  };
};

export const detectIndecentImageByModeration = (moderation) => {
  const entries = Array.isArray(moderation) ? moderation : [];
  if (!entries.length) {
    return { flagged: false, reason: null, confidence: 0, strategy: "no-metadata" };
  }

  let topConfidence = 0;
  let topKeyword = null;
  let strictStatus = null;

  for (const entry of entries) {
    const status = String(entry?.status || "").toLowerCase();
    if (status === "rejected") strictStatus = "rejected";
    if (status === "flagged" && !strictStatus) strictStatus = "flagged";

    const strings = extractStringsDeep(entry);
    const numbers = extractNumbersDeep(entry);
    const maxRaw = numbers.length ? Math.max(...numbers) : 0;
    const normalizedScore = maxRaw > 1 ? maxRaw / 100 : maxRaw;
    if (normalizedScore > topConfidence) topConfidence = normalizedScore;

    const foundKeyword = strings.find((snippet) =>
      HIGH_RISK_IMAGE_KEYWORDS.some((k) => snippet.includes(k)),
    );
    if (foundKeyword) {
      const key = HIGH_RISK_IMAGE_KEYWORDS.find((k) => foundKeyword.includes(k));
      topKeyword = key || topKeyword;
    }
  }

  // Reglas de mayor precisión:
  // - rejected siempre bloquea
  // - flagged bloquea si además hay confianza alta o keyword de alto riesgo
  if (strictStatus === "rejected") {
    return {
      flagged: true,
      reason: "Cloudinary moderation status: rejected",
      confidence: Number(topConfidence.toFixed(3)),
      strategy: "status-hard-block",
    };
  }

  const hasHighRiskSignal = !!topKeyword || topConfidence >= IMAGE_CONFIDENCE_THRESHOLD;
  if (strictStatus === "flagged" && hasHighRiskSignal) {
    return {
      flagged: true,
      reason: `Cloudinary flagged${topKeyword ? ` (${topKeyword})` : ""}`,
      confidence: Number(topConfidence.toFixed(3)),
      threshold: IMAGE_CONFIDENCE_THRESHOLD,
      strategy: "status+confidence+keyword",
    };
  }

  return {
    flagged: false,
    reason: null,
    confidence: Number(topConfidence.toFixed(3)),
    threshold: IMAGE_CONFIDENCE_THRESHOLD,
    strategy: "safe",
  };
};
