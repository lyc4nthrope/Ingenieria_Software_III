/**
 * Publications Schemas - Validaciones y tipos
 *
 * Define contratos de validación para inputs y outputs del feature publications
 */

/**
 * Validaciones de formulario para crear publicación
 */
export const PublicationValidation = {
  productName: (name) => name && name.trim().length >= 2,
  price: (price) => !isNaN(parseFloat(price)) && parseFloat(price) > 0,
  photoUrl: (url) => !url || url.startsWith('https://'),
  description: (desc) => !desc || desc.length <= 500,
};

/**
 * Mensajes de validación
 */
export const PublicationValidationMessages = {
  productName: 'El nombre del producto debe tener al menos 2 caracteres',
  price: 'El precio debe ser un número mayor a 0',
  photoUrl: 'La URL de la foto debe ser https',
  description: 'La descripción no puede superar 500 caracteres',
};

/**
 * Estado posibles de una publicación
 */
export const PublicationStatusEnum = {
  PENDING: 'pending',
  VALIDATED: 'validated',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
};

/**
 * Tipos del feature publications (doc reference)
 */
export const PublicationTypes = {
  Publication: `{
    id: string (UUID);
    productName: string;
    price: number;
    currency: 'COP' | 'USD';
    storeId: string | null;
    storeName: string | null;
    userId: string;
    userName: string;
    photoUrl: string | null;
    description: string;
    validatedCount: number;
    reportedCount: number;
    status: 'pending' | 'validated' | 'rejected' | 'expired';
    latitude: number | null;
    longitude: number | null;
    createdAt: Date;
    updatedAt: Date | null;
  }`,

  CreatePublicationInput: `{
    productName: string;
    price: number;
    currency?: string;
    storeId?: string;
    photoUrl?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
  }`,
};

export default {
  PublicationValidation,
  PublicationValidationMessages,
  PublicationStatusEnum,
  PublicationTypes,
};