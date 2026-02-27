import { useState } from 'react';
import { storesApi } from '@/services/api';
import { StoreTypeEnum, validateStoreForm } from '@/features/stores/schemas';

const DUPLICATE_RADIUS_METERS = 150;

const initialFormData = {
  name: '',
  type: StoreTypeEnum.PHYSICAL,
  address: '',
  latitude: null,
  longitude: null,
  websiteUrl: '',
  evidenceUrls: [],
};

export function useStoreCreation() {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      if (field === 'latitude' || field === 'longitude') delete next.location;
      if (field === 'name') delete next.name;
      return next;
    });
  };

  const setLocation = ({ latitude, longitude, address }) => {
    setFormData((prev) => ({
      ...prev,
      latitude,
      longitude,
      address: address ?? prev.address,
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.location;
      return next;
    });
  };

  const addEvidenceUrl = (url) => {
    if (!url) return;
    setFormData((prev) => {
      if (prev.evidenceUrls.length >= 3 || prev.evidenceUrls.includes(url)) return prev;
      return { ...prev, evidenceUrls: [...prev.evidenceUrls, url] };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.evidenceUrls;
      return next;
    });
  };

  const removeEvidenceUrl = (url) => {
    setFormData((prev) => ({
      ...prev,
      evidenceUrls: prev.evidenceUrls.filter((item) => item !== url),
    }));
  };

  const checkNearbyDuplicates = async () => {
    if (formData.type !== StoreTypeEnum.PHYSICAL) {
      return { success: true };
    }

    const result = await storesApi.searchNearbyStores(
      formData.name,
      Number(formData.latitude),
      Number(formData.longitude),
      DUPLICATE_RADIUS_METERS
    );

    if (!result.success) {
      return { success: false, error: result.error || 'No se pudo validar duplicados cercanos' };
    }

    const candidates = (result.data || []).filter(
      (store) => String(store.name || '').trim().toLowerCase() === String(formData.name || '').trim().toLowerCase()
    );

    if (candidates.length > 0) {
      const nearest = candidates[0];
      return {
        success: false,
        error: `Posible duplicado: ya existe "${nearest.name}" cerca de esta ubicación.`,
      };
    }

    return { success: true };
  };

  const submit = async () => {
    setSubmitError('');
    setSubmitSuccess('');

    const { isValid, errors: validationErrors } = validateStoreForm(formData);
    if (!isValid) {
      setErrors(validationErrors);
      return { success: false, error: 'Corrige los errores del formulario' };
    }

    setIsSubmitting(true);

    const duplicateCheck = await checkNearbyDuplicates();
    if (!duplicateCheck.success) {
      setIsSubmitting(false);
      setSubmitError(duplicateCheck.error);
      return duplicateCheck;
    }

    const result = await storesApi.createStore(formData);
    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(result.error || 'No se pudo crear la tienda');
      return result;
    }

    setSubmitSuccess('Tienda creada exitosamente');
    setFormData(initialFormData);
    setErrors({});
    return result;
  };

  return {
    formData,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    updateField,
    setLocation,
    addEvidenceUrl,
    removeEvidenceUrl,
    submit,
    clearMessages: () => {
      setSubmitError('');
      setSubmitSuccess('');
    },
  };
}

export default useStoreCreation;
