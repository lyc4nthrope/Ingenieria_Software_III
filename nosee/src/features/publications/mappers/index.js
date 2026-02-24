/**
 * Publications Mappers - Transformación de datos
 *
 * Transforma respuestas de Supabase en modelos UI para publicaciones de precios
 * Desacopla la UI de la estructura de base de datos
 */

/**
 * Mapear fila de la tabla 'price_publications' a modelo UI
 *
 * @param {Object} dbPublication - Objeto de Supabase
 * @returns {Object} Publicación en formato UI (camelCase)
 */
export const mapDBPublicationToUI = (dbPublication) => {
  if (!dbPublication) return null;

  return {
    id: dbPublication.id,
    productName: dbPublication.product_name,
    price: dbPublication.price,
    currency: dbPublication.currency || 'COP',
    storeId: dbPublication.store_id,
    storeName: dbPublication.stores?.name || null,
    userId: dbPublication.user_id,
    userName: dbPublication.users?.full_name || 'Anónimo',
    photoUrl: dbPublication.photo_url || null,
    description: dbPublication.description || '',
    validatedCount: dbPublication.validated_count || 0,
    reportedCount: dbPublication.reported_count || 0,
    status: dbPublication.status || 'pending',
    latitude: dbPublication.latitude || null,
    longitude: dbPublication.longitude || null,
    createdAt: new Date(dbPublication.created_at),
    updatedAt: dbPublication.updated_at ? new Date(dbPublication.updated_at) : null,
  };
};

/**
 * Mapear datos de formulario UI a payload para insertar en BD
 *
 * @param {Object} formData - Datos del formulario de publicación
 * @param {string} userId - ID del usuario que publica
 * @returns {Object} Payload para Supabase insert
 */
export const mapPublicationFormToAPI = (formData, userId) => {
  return {
    product_name: formData.productName,
    price: parseFloat(formData.price),
    currency: formData.currency || 'COP',
    store_id: formData.storeId || null,
    user_id: userId,
    photo_url: formData.photoUrl || null,
    description: formData.description || '',
    latitude: formData.latitude || null,
    longitude: formData.longitude || null,
    status: 'pending',
  };
};

/**
 * Mapear array de publicaciones de BD a UI
 *
 * @param {Array} dbPublications - Array de objetos de Supabase
 * @returns {Array} Publicaciones en formato UI
 */
export const mapDBPublicationsToUI = (dbPublications) => {
  if (!Array.isArray(dbPublications)) return [];
  return dbPublications.map(mapDBPublicationToUI);
};

/**
 * Mapear errores de publicaciones a mensajes UI
 *
 * @param {Object} error - Error de Supabase
 * @returns {string} Mensaje amigable
 */
export const mapPublicationErrorToUI = (error) => {
  if (!error) return 'Error desconocido';

  const message = error.message || '';

  if (message.includes('violates row-level security')) {
    return 'No tienes permisos para realizar esta acción';
  }
  if (message.includes('duplicate key')) {
    return 'Ya existe una publicación similar reciente';
  }
  if (message.includes('not found')) {
    return 'Publicación no encontrada';
  }

  return error.message || 'Error al procesar la publicación';
};

export default {
  mapDBPublicationToUI,
  mapPublicationFormToAPI,
  mapDBPublicationsToUI,
  mapPublicationErrorToUI,
};