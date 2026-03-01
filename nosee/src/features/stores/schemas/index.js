/**
 * Validaciones del feature stores.
 */

export const StoreTypeEnum = {
  PHYSICAL: '1',
  VIRTUAL: '2',
};

const ALLOWED_EVIDENCE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

function isValidHttpsUrl(value) {
  if (!value || typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function hasAllowedImageExtension(value) {
  if (!isValidHttpsUrl(value)) return false;

  try {
    const url = new URL(value);
    const pathname = (url.pathname || '').toLowerCase();
    return ALLOWED_EVIDENCE_EXTENSIONS.some((ext) => pathname.endsWith(`.${ext}`));
  } catch {
    return false;
  }
}

export const StoreValidation = {
  // Alias explícito solicitado por especificación
  storeName: (value) => Boolean(value && value.trim().length >= 3),
  name: (value) => Boolean(value && value.trim().length >= 3),
  type: (value) => [StoreTypeEnum.PHYSICAL, StoreTypeEnum.VIRTUAL].includes(value),
  coordinates: (latitude, longitude) => {
    return Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));
  },
  websiteUrl: (value) => isValidHttpsUrl(value),
  evidence: (urls) => {
    if (!Array.isArray(urls)) return false;
    if (urls.length > 3) return false;
    return urls.every((url) => hasAllowedImageExtension(url));
  },
  // Mantener alias backward-compatible
  evidenceUrls: (urls) => {
    if (!Array.isArray(urls)) return false;
    if (urls.length > 3) return false;
    return urls.every((url) => hasAllowedImageExtension(url));
  },
};

export function validateStoreForm(formData) {
  const errors = {};

  if (!StoreValidation.storeName(formData.name)) {
    errors.name = 'El nombre de la tienda debe tener al menos 3 caracteres';
  }

  if (!StoreValidation.type(formData.type)) {
    errors.type = 'Selecciona un tipo de tienda válido';
  }

  if (formData.type === StoreTypeEnum.PHYSICAL) {
    if (!StoreValidation.coordinates(formData.latitude, formData.longitude)) {
      errors.location = 'Debes seleccionar una ubicación válida en el mapa';
    }

    if (!StoreValidation.evidence(formData.evidenceUrls || [])) {
      errors.evidenceUrls =
        'Máximo 3 evidencias y solo formatos .jpg/.jpeg/.png/.webp (URL https://)';
    }
  }

  if (formData.type === StoreTypeEnum.VIRTUAL) {
    if (!StoreValidation.websiteUrl(formData.websiteUrl)) {
      errors.websiteUrl = 'La URL de tienda virtual debe ser https:// válida';
    }

    if ((formData.evidenceUrls || []).length > 0) {
      errors.evidenceUrls = 'Las evidencias solo están permitidas para tiendas físicas';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export default {
  StoreTypeEnum,
  StoreValidation,
  validateStoreForm,
};
