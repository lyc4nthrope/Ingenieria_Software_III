import { useState, useEffect } from 'react';
import * as publicationsApi from '@/services/api/publications.api';
import { useGeoLocation } from './useGeoLocation';
import { playSuccessSound } from '@/utils/celebrationSound';

const initialFormData = {
  productId: '',
  storeId: '',
  price: '',
  currency: 'COP',
  description: '',
  photoUrl: '',
};

export function usePublicationCreation({ publicationId = null, mode = 'create' } = {}) {
  const { latitude, longitude } = useGeoLocation({ autoFetch: true });

  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(mode === 'edit' && !!publicationId);
  const [showCelebration, setShowCelebration] = useState(false);

  // Cargar publicación si estamos editando
  useEffect(() => {
    if (mode === 'edit' && publicationId) {
      const loadPublication = async () => {
        const result = await publicationsApi.getPublicationDetail(publicationId);
        if (result.success) {
          setFormData({
            productId: String(result.data.product?.id || result.data.productId || ''),
            storeId: result.data.store?.id || result.data.storeId || '',
            price: String(result.data.price || ''),
            currency: result.data.currency || 'COP',
            description: result.data.description || '',
            photoUrl: result.data.photoUrl || '',
          });
        } else {
          setSubmitError(result.error || 'No se pudo cargar la publicación');
        }
        setIsLoading(false);
      };
      loadPublication();
    }
  }, [publicationId, mode]);

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const setPhotoUrl = (url) => {
    updateField('photoUrl', url);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.productId) {
      newErrors.productId = 'Selecciona o crea un producto';
    }
    if (!formData.storeId) {
      newErrors.storeId = 'Selecciona o crea una tienda';
    }
    if (!formData.price || Number(formData.price) <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }
    if (!formData.photoUrl && mode === 'create') {
      newErrors.photoUrl = 'La foto es obligatoria';
    }
    if (formData.description?.length > 500) {
      newErrors.description = 'Máximo 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async () => {
    setSubmitError('');
    setSubmitSuccess('');

    if (!validateForm()) {
      return { success: false, error: 'Corrige los errores del formulario' };
    }

    setIsSubmitting(true);

    try {
      const payload = {
        productId: Number(formData.productId),
        storeId: formData.storeId,
        price: Number(formData.price),
        photoUrl: formData.photoUrl,
        description: formData.description,
      };

      const result = mode === 'create'
        ? await publicationsApi.createPublication(payload)
        : await publicationsApi.updatePublication(publicationId, payload);

      if (!result.success) {
        setSubmitError(result.error || 'Error al procesar la publicación');
        return result;
      }

      setSubmitSuccess(
        mode === 'create'
          ? 'Publicación creada exitosamente'
          : 'Publicación actualizada exitosamente'
      );

      // Solo resetear en modo create
      if (mode === 'create') {
        setFormData(initialFormData);
        setShowCelebration(true);
        playSuccessSound();
      }

      return result;
    } catch (error) {
      const errorMsg = error?.message || 'Error inesperado procesando publicación';
      setSubmitError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    isLoading,
    latitude,
    longitude,
    updateField,
    setPhotoUrl,
    submit,
    showCelebration,
    setShowCelebration,
  };
}
