import { useState } from 'react';
import { storesApi } from '@/services/api';
import { StoreTypeEnum, validateStoreForm } from '@/features/stores/schemas';
import { uploadImageToCloudinary } from '@/services/cloudinary';

const DUPLICATE_RADIUS_METERS = 150;
const STORE_TYPE_ID = {
  [StoreTypeEnum.PHYSICAL]: 1,
  [StoreTypeEnum.VIRTUAL]: 2,
};

const initialFormData = {
  name: '',
  type: StoreTypeEnum.PHYSICAL,
  address: '',
  latitude: null,
  longitude: null,
  websiteUrl: '',
  evidenceFiles: [],
};

export function useStoreCreation() {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const updateField = (field, value) => {
    setFormData((prev) => {
      if (field === 'type' && value === StoreTypeEnum.VIRTUAL) {
        return {
          ...prev,
          type: value,
          address: '',
          latitude: null,
          longitude: null,
          evidenceUrls: [],
        };
      }

      return { ...prev, [field]: value };
    });
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

  const addEvidenceFile = (file) => {
    if (!file) return;
    const evidence = {
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
    };
    setFormData((prev) => {
     if (prev.evidenceFiles.length >= 3) return prev;
      return { ...prev, evidenceFiles: [...prev.evidenceFiles, evidence] };
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.evidenceUrls;
      return next;
    });
  };

  const removeEvidenceFile = (evidenceId) => {
    setFormData((prev) => ({
      ...prev,
      evidenceFiles: prev.evidenceFiles.filter((item) => item.id !== evidenceId),
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

   try {
      const duplicateCheck = await checkNearbyDuplicates();
      if (!duplicateCheck.success) {
        setSubmitError(duplicateCheck.error);
        return duplicateCheck;
      }

     const result = await storesApi.createStore({
        ...formData,
        type: STORE_TYPE_ID[formData.type],
      });

        if (!result.success) {
        setSubmitError(result.error || 'No se pudo crear la tienda');
        return result;
      }

        const storeId = result?.data?.store?.id;
      const evidenceUploadErrors = [];

      if (storeId && formData.type === StoreTypeEnum.PHYSICAL && formData.evidenceFiles.length > 0) {
        for (const evidence of formData.evidenceFiles) {
          const uploadResult = await uploadImageToCloudinary(evidence.file, {
            folder: 'nosee/stores/evidence',
          });

          if (!uploadResult.success) {
            evidenceUploadErrors.push(uploadResult.error || 'No se pudo subir una evidencia');
            continue;
          }

          const evidenceResult = await storesApi.uploadStoreEvidence(
            storeId,
            uploadResult.optimizedUrl || uploadResult.url
          );
          if (!evidenceResult.success) {
            evidenceUploadErrors.push(evidenceResult.error || 'No se pudo guardar una evidencia');
          }
        }
      }
   if (evidenceUploadErrors.length > 0) {
        setSubmitSuccess('Tienda creada, pero algunas evidencias no se pudieron registrar');
        setSubmitError(evidenceUploadErrors[0]);
      } else {
        setSubmitSuccess('Tienda creada exitosamente');
      }

    setFormData(initialFormData);
      setErrors({});
      return result;
    } catch (error) {
      const fallbackMessage = 'Error inesperado creando tienda';
      setSubmitError(error?.message || fallbackMessage);
      return { success: false, error: error?.message || fallbackMessage };
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
    updateField,
    setLocation,
    addEvidenceFile,
    removeEvidenceFile,
    submit,
    clearMessages: () => {
      setSubmitError('');
      setSubmitSuccess('');
    },
  };
}

export default useStoreCreation;
