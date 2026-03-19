/**
 * publicationFormUtils.js
 *
 * Constants and pure helpers used by PublicationForm and related components.
 */

export const ENABLE_AUTO_STORE = String(import.meta.env.VITE_ENABLE_AUTO_STORE ?? "true").toLowerCase() !== "false";
export const ENABLE_BARCODE_SCAN = String(import.meta.env.VITE_ENABLE_BARCODE_SCAN ?? "true").toLowerCase() !== "false";
export const AUTO_STORE_CANDIDATES_LIMIT = 1500;

export const toRadians = (value) => (Number(value) * Math.PI) / 180;

export const getDistanceMeters = (fromLat, fromLon, toLat, toLon) => {
  const earthRadius = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return earthRadius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const formatDistance = (distanceMeters) => {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return "";
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

export const normalizeUnitAbbreviation = (value = "") => {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/\./g, "")
    .trim();

  const aliases = {
    gramos: "g",
    gramo: "g",
    gr: "g",
    g: "g",
    kilogramo: "kg",
    kilogramos: "kg",
    kg: "kg",
    mililitros: "ml",
    mililitro: "ml",
    ml: "ml",
    litros: "l",
    litro: "l",
    lt: "l",
    l: "l",
    unidad: "u",
    unidades: "u",
    und: "u",
    un: "u",
    u: "u",
  };

  return aliases[normalized] || normalized;
};

export const parseQuantityHint = (value = "") => {
  const raw = String(value || "")
    .toLowerCase()
    .replace(",", ".");

  const match = raw.match(/(\d+(?:\.\d+)?)\s*(kg|g|gr|gramos?|l|lt|litros?|ml|unidad(?:es)?|und|un|u)\b/i);
  if (!match) return { baseQuantity: "", unitAbbreviation: "" };

  const quantity = Number(match[1]);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { baseQuantity: "", unitAbbreviation: "" };
  }

  return {
    baseQuantity: String(quantity),
    unitAbbreviation: normalizeUnitAbbreviation(match[2]),
  };
};

export const fetchProductPrefillFromBarcode = async (barcode) => {
  if (!barcode) {
    return {
      productName: "",
      brandName: "",
      categoryHint: "",
      baseQuantity: "",
      unitAbbreviation: "",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      return {
        productName: "",
        brandName: "",
        categoryHint: "",
        baseQuantity: "",
        unitAbbreviation: "",
      };
    }
    const payload = await response.json();
    const product = payload?.product || {};

    const productName = (
      product.product_name_es ||
      product.product_name ||
      product.generic_name_es ||
      product.generic_name ||
      ""
    ).trim();

    const brandName = String(product.brands || "").split(",")[0]?.trim() || "";
    const categoryHint = String(product.categories || "").split(",")[0]?.trim() || "";
    const quantityHint = parseQuantityHint(product.quantity);

    return {
      productName,
      brandName,
      categoryHint,
      baseQuantity: quantityHint.baseQuantity,
      unitAbbreviation: quantityHint.unitAbbreviation,
    };
  } catch {
    return {
      productName: "",
      brandName: "",
      categoryHint: "",
      baseQuantity: "",
      unitAbbreviation: "",
    };
  } finally {
    clearTimeout(timeoutId);
  }
};
