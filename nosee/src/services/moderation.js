const MODERATION_SCORE_THRESHOLD = Number(
  import.meta.env.VITE_TEXT_MODERATION_SCORE_THRESHOLD || 3,
);
const IMAGE_CONFIDENCE_THRESHOLD = Number(
  import.meta.env.VITE_IMAGE_MODERATION_CONFIDENCE_THRESHOLD || 0.75,
);
const IMAGE_MAX_ANALYSIS_SIDE = Number(
  import.meta.env.VITE_IMAGE_ANALYSIS_MAX_SIDE || 480,
);
const IMAGE_MIN_ANALYSIS_PIXELS = Number(
  import.meta.env.VITE_IMAGE_MIN_ANALYSIS_PIXELS || 20000,
);
const SKIN_RATIO_BLOCK_THRESHOLD = Number(
  import.meta.env.VITE_IMAGE_SKIN_RATIO_BLOCK || 0.58,
);
const BLOOD_RATIO_BLOCK_THRESHOLD = Number(
  import.meta.env.VITE_IMAGE_BLOOD_RATIO_BLOCK || 0.15,
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
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const loadImageDataFromFile = (file, maxSide = IMAGE_MAX_ANALYSIS_SIDE) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        if (!width || !height) throw new Error("No fue posible leer la imagen");

        const scale = Math.min(1, maxSide / Math.max(width, height));
        const targetWidth = Math.max(1, Math.round(width * scale));
        const targetHeight = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });

        if (!context) throw new Error("No se pudo analizar la imagen");
        context.drawImage(image, 0, 0, targetWidth, targetHeight);
        const imageData = context.getImageData(0, 0, targetWidth, targetHeight);
        resolve({
          width: targetWidth,
          height: targetHeight,
          data: imageData.data,
        });
      } catch (error) {
        reject(error);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("No se pudo decodificar la imagen"));
    };

    image.src = objectUrl;
  });

export const analyzeImageFileForRestrictedContent = async (file) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      flagged: false,
      reason: null,
      confidence: 0,
      strategy: "image-analysis-not-available",
      metrics: null,
      evidence: null,
    };
  }

  try {
    const image = await loadImageDataFromFile(file);
    const pixelCount = image.width * image.height;
    if (pixelCount < IMAGE_MIN_ANALYSIS_PIXELS) {
      return {
        flagged: false,
        reason: null,
        confidence: 0,
        strategy: "pixel-analysis-skipped-small-image",
        metrics: { pixelCount },
        evidence: {
          provider: "local_pixel_guard",
          status: "approved",
          confidence: 0,
          metrics: { pixelCount },
          strategy: "pixel-analysis-skipped-small-image",
        },
      };
    }

    let skinPixels = 0;
    let bloodPixels = 0;
    let validPixels = 0;

    for (let i = 0; i < image.data.length; i += 4) {
      const r = image.data[i];
      const g = image.data[i + 1];
      const b = image.data[i + 2];
      const a = image.data[i + 3];
      if (a < 20) continue;

      validPixels += 1;

      // Detección aproximada de tono piel (RGB rule-based).
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const isSkinTone =
        r > 95 &&
        g > 40 &&
        b > 20 &&
        max - min > 15 &&
        Math.abs(r - g) > 15 &&
        r > g &&
        r > b;
      if (isSkinTone) skinPixels += 1;

      // Detección aproximada de rojo intenso / sangre.
      const redDominance = r / (r + g + b + 1);
      const isBloodLike =
        ((r > 120 && g < 110 && b < 110) || (r > 75 && g < 75 && b < 75)) &&
        redDominance > 0.52 &&
        r - g > 35 &&
        r - b > 35;
      if (isBloodLike) bloodPixels += 1;
    }

    if (!validPixels) {
      return {
        flagged: false,
        reason: null,
        confidence: 0,
        strategy: "pixel-analysis-empty",
        metrics: { validPixels: 0, pixelCount },
        evidence: {
          provider: "local_pixel_guard",
          status: "approved",
          confidence: 0,
          metrics: { validPixels: 0, pixelCount },
          strategy: "pixel-analysis-empty",
        },
      };
    }

    const skinRatio = skinPixels / validPixels;
    const bloodRatio = bloodPixels / validPixels;

    const adultScore = clamp(
      (skinRatio - SKIN_RATIO_BLOCK_THRESHOLD * 0.7) /
        (SKIN_RATIO_BLOCK_THRESHOLD * 0.3 || 1),
      0,
      1,
    );
    const goreScore = clamp(
      (bloodRatio - BLOOD_RATIO_BLOCK_THRESHOLD * 0.65) /
        (BLOOD_RATIO_BLOCK_THRESHOLD * 0.35 || 1),
      0,
      1,
    );

    const flaggedAdult = skinRatio >= SKIN_RATIO_BLOCK_THRESHOLD;
    const flaggedGore = bloodRatio >= BLOOD_RATIO_BLOCK_THRESHOLD;
    const flagged = flaggedAdult || flaggedGore;

    const labels = [];
    if (flaggedAdult) labels.push("adult");
    if (flaggedGore) labels.push("gore");

    const confidence = Number(Math.max(adultScore, goreScore).toFixed(3));
    const reason = flagged
      ? flaggedAdult && flaggedGore
        ? "La imagen parece contener desnudez explícita y señales de gore."
        : flaggedAdult
          ? "La imagen parece contener desnudez o exposición corporal explícita."
          : "La imagen parece contener señales visuales de gore/sangre explícita."
      : null;

    const metrics = {
      skinRatio: Number(skinRatio.toFixed(4)),
      bloodRatio: Number(bloodRatio.toFixed(4)),
      validPixels,
      pixelCount,
      thresholds: {
        skinRatioBlock: SKIN_RATIO_BLOCK_THRESHOLD,
        bloodRatioBlock: BLOOD_RATIO_BLOCK_THRESHOLD,
      },
    };

    return {
      flagged,
      reason,
      confidence,
      strategy: "local-pixel-safety-guard",
      labels,
      metrics,
      evidence: {
        provider: "local_pixel_guard",
        status: flagged ? "rejected" : "approved",
        confidence,
        labels,
        metrics,
        strategy: "local-pixel-safety-guard",
      },
    };
  } catch {
    return {
      flagged: false,
      reason: null,
      confidence: 0,
      strategy: "pixel-analysis-error-safe-fallback",
      metrics: null,
      evidence: {
        provider: "local_pixel_guard",
        status: "unknown",
        confidence: 0,
        strategy: "pixel-analysis-error-safe-fallback",
      },
    };
  }
};
