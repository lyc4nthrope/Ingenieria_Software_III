import { useState, useEffect, useRef } from 'react';
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

export function useStoreCreation({ storeId = null, mode = 'create' } = {}) {
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(mode === 'edit' && !!storeId);
  const [nearbyStoreMessage, setNearbyStoreMessage] = useState('');
  const lastAutoFillSignatureRef = useRef('');

  // Cargar tienda si estamos editando
  useEffect(() => {
    if (mode === 'edit' && storeId) {
      const loadStore = async () => {
        const result = await storesApi.getStore(storeId);
        if (result.success) {
          const storeData = result.data;
          setFormData({
            name: storeData.name || '',
            type: storeData.type === STORE_TYPE_ID[StoreTypeEnum.PHYSICAL] 
              ? StoreTypeEnum.PHYSICAL 
              : StoreTypeEnum.VIRTUAL,
            address: storeData.address || '',
            latitude: storeData.latitude || null,
            longitude: storeData.longitude || null,
            websiteUrl: storeData.websiteUrl || storeData.website_url || '',
            evidenceFiles: [],
          });
        } else {
          setSubmitError(result.error || 'No se pudo cargar la tienda');
        }
        setIsLoading(false);
      };
      loadStore();
    }
  }, [storeId, mode]);

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
    // En modo edición, no validar duplicados (la tienda ya existe)
    if (mode === 'edit') {
      return { success: true };
    }

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

  useEffect(() => {
    if (mode !== 'create') return;
    if (formData.type !== StoreTypeEnum.PHYSICAL) {
      setNearbyStoreMessage('');
      return;
    }

    const lat = Number(formData.latitude);
    const lon = Number(formData.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setNearbyStoreMessage('');
      return;
    }

    let cancelled = false;
    setNearbyStoreMessage('Detectando tienda cercana...');

    const timer = setTimeout(async () => {
      const nearestResult = await storesApi.findNearestPhysicalStore(lat, lon, {
        maxCandidates: 1500,
        batchSize: 250,
      });
      if (cancelled) return;

      if (!nearestResult.success) {
        setNearbyStoreMessage('No se pudo detectar tienda cercana automáticamente.');
        return;
      }

      const nearest = nearestResult.data;
      if (!nearest) {
        setNearbyStoreMessage('No encontramos tiendas físicas cercanas.');
        return;
      }

      const distance =
        nearest.distanceMeters < 1000
          ? `${Math.round(nearest.distanceMeters)} m`
          : `${(nearest.distanceMeters / 1000).toFixed(1)} km`;

      const signature = `${nearest.id}:${lat.toFixed(5)}:${lon.toFixed(5)}`;
      if (lastAutoFillSignatureRef.current !== signature) {
        setFormData((prev) => ({
          ...prev,
          // Autocompleta nombre y dirección con la tienda detectada.
          name: nearest.name || prev.name,
          address: nearest.address || prev.address || '',
        }));
        lastAutoFillSignatureRef.current = signature;
      }

      setNearbyStoreMessage(`Tienda cercana detectada: ${nearest.name} (${distance}). Nombre y dirección autocompletados.`);
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [formData.latitude, formData.longitude, formData.type, mode]);

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

      const payload = {
        ...formData,
        type: STORE_TYPE_ID[formData.type],
      };

      // Diferenciar entre create y update
      const result = mode === 'create'
        ? await storesApi.createStore(payload)
        : await storesApi.updateStore(storeId, payload);

      if (!result.success) {
        const action = mode === 'create' ? 'crear' : 'actualizar';
        setSubmitError(result.error || `No se pudo ${action} la tienda`);
        return result;
      }

      // Manejar evidencias solo en modo create/physical
      const resultStoreId = result?.data?.store?.id || result?.data?.id;
      const evidenceUploadErrors = [];

      if (mode === 'create' && resultStoreId && formData.type === StoreTypeEnum.PHYSICAL && formData.evidenceFiles.length > 0) {
        for (const evidence of formData.evidenceFiles) {
          const uploadResult = await uploadImageToCloudinary(evidence.file, {
            folder: 'nosee/stores/evidence',
          });

          if (!uploadResult.success) {
            evidenceUploadErrors.push(uploadResult.error || 'No se pudo subir una evidencia');
            continue;
          }

          const evidenceResult = await storesApi.uploadStoreEvidence(
            resultStoreId,
            uploadResult.optimizedUrl || uploadResult.url
          );
          if (!evidenceResult.success) {
            evidenceUploadErrors.push(evidenceResult.error || 'No se pudo guardar una evidencia');
          }
        }
      }

      if (evidenceUploadErrors.length > 0) {
        const action = mode === 'create' ? 'creada' : 'actualizada';
        setSubmitSuccess(`Tienda ${action}, pero algunas evidencias no se pudieron registrar`);
        setSubmitError(evidenceUploadErrors[0]);
      } else {
        const action = mode === 'create' ? 'creada' : 'actualizada';
        setSubmitSuccess(`Tienda ${action} exitosamente`);
      }

      // Solo resetear en modo create
      if (mode === 'create') {
        setFormData(initialFormData);
      }

      setErrors({});
      return result;
    } catch (error) {
      const fallbackMessage = `Error inesperado ${mode === 'create' ? 'creando' : 'actualizando'} tienda`;
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
    isLoading,
    nearbyStoreMessage,
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
