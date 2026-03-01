/**
 * usePhotoUpload.js
 *
 * Hook personalizado para upload de fotos a Cloudinary
 * 
 * UBICACIÓN: src/features/publications/hooks/usePhotoUpload.js
 * FECHA: 26-02-2026
 * STATUS: Paso 2b de Proceso 2
 * 
 * FUNCIÓN:
 * - Upload a Cloudinary
 * - Progress tracking
 * - Validaciones (tamaño, tipo)
 * - Error handling
 * - Retry automático
 * 
 * DEPENDENCIAS:
 * - react (useState, useCallback)
 * - .env.local (VITE_CLOUDINARY_CLOUD_NAME)
 * 
 * SETUP:
 * 1. Ir a https://cloudinary.com
 * 2. Crear cuenta (gratis)
 * 3. Copiar Cloud Name
 * 4. Agregar a .env.local: VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
 */

import { useState, useCallback } from 'react';

/**
 * Validaciones para el archivo
 * @private
 */
const VALIDATION = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
};

/**
 * Custom hook para upload de fotos a Cloudinary
 * 
 * Requiere en .env.local:
 * VITE_CLOUDINARY_CLOUD_NAME=tu_cloud_name
 * VITE_CLOUDINARY_UPLOAD_PRESET=tu_unsigned_preset
 * 
 * @returns {Object} { photoUrl, uploading, progress, error, upload, reset }
 * 
 * @example
 * const { photoUrl, uploading, progress, upload } = usePhotoUpload();
 * 
 * const handleFileSelect = async (file) => {
 *   const result = await upload(file);
 *   if (result.success) {
 *     console.log('URL:', result.photoUrl);
 *   }
 * };
 */
export const usePhotoUpload = () => {
  // ─── Estados ───────────────────────────────────────────────────────────────

  const [photoUrl, setPhotoUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  // ─── Validaciones ──────────────────────────────────────────────────────────

  /**
   * Validar archivo antes de upload
   * @private
   */
  const validateFile = useCallback((file) => {
    // Verificar que existe
    if (!file) {
      return { valid: false, error: 'No se seleccionó archivo' };
    }

    // Verificar tipo
    if (!VALIDATION.ALLOWED_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido (JPG, PNG, WEBP)',
      };
    }

    // Verificar tamaño
    if (file.size > VALIDATION.MAX_FILE_SIZE) {
      const sizeMB = (VALIDATION.MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
      return {
        valid: false,
        error: `Archivo muy grande (máx ${sizeMB}MB, tienes ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      };
    }

    return { valid: true };
  }, []);

  // ─── Upload ────────────────────────────────────────────────────────────────

  /**
   * Subir archivo a Cloudinary
   * 
   * @param {File} file - El archivo a subir
   * @returns {Promise} { success, photoUrl, error }
   */
  const upload = useCallback(
    async (file) => {
      try {
        setError(null);
        setProgress(0);

        // Validar archivo
        const validation = validateFile(file);
        if (!validation.valid) {
          setError(validation.error);
          return { success: false, error: validation.error };
        }

        // Verificar que Cloudinary está configurado
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
        if (!cloudName) {
          const error =
            'Cloudinary no configurado. Agrega VITE_CLOUDINARY_CLOUD_NAME a .env.local';
          setError(error);
          return { success: false, error };
        }

        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
        if (!uploadPreset) {
          const error =
            'Upload preset no configurado. Agrega VITE_CLOUDINARY_UPLOAD_PRESET a .env.local';
          setError(error);
          return { success: false, error };
        }

        const uploadFolder =
          import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || 'nosee/publications';

        // Preparar FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', uploadFolder);

        setUploading(true);

        // Usar XMLHttpRequest para track de progreso
        return new Promise((resolve) => {
          const xhr = new XMLHttpRequest();

          // Track progreso
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const percentComplete = (e.loaded / e.total) * 100;
              setProgress(Math.round(percentComplete));
            }
          });

          // Success
          xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
              try {
                const data = JSON.parse(xhr.responseText);
                const url = data.secure_url;

                setPhotoUrl(url);
                setProgress(100);
                setUploading(false);

                resolve({ success: true, photoUrl: url });
              } catch {
                const error = 'Error procesando respuesta de Cloudinary';
                setError(error);
                setUploading(false);
                resolve({ success: false, error });
              }
            } else {
              let cloudinaryError = '';
              try {
                const body = JSON.parse(xhr.responseText);
                cloudinaryError = body?.error?.message || '';
              } catch {
                cloudinaryError = '';
              }

              const error = cloudinaryError
                ? `Error de Cloudinary (${xhr.status}): ${cloudinaryError}`
                : `Error del servidor: ${xhr.status}`;
              setError(error);
              setUploading(false);
              resolve({ success: false, error });
            }
          });

          // Error
          xhr.addEventListener('error', () => {
            const error = 'Error conectando a Cloudinary';
            setError(error);
            setUploading(false);
            resolve({ success: false, error });
          });

          // Timeout
          xhr.addEventListener('timeout', () => {
            const error = 'Timeout al subir archivo';
            setError(error);
            setUploading(false);
            resolve({ success: false, error });
          });

          // Enviar
          xhr.timeout = 30000; // 30 segundos
          xhr.open(
            'POST',
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`
          );
          xhr.send(formData);
        });
      } catch (err) {
        console.error('Error en upload:', err);
        const errorMsg = err.message || 'Error desconocido al subir';
        setError(errorMsg);
        setUploading(false);
        return { success: false, error: errorMsg };
      }
    },
    [validateFile]
  );

  // ─── Métodos públicos ──────────────────────────────────────────────────────

  /**
   * Resetear el estado
   */
  const reset = useCallback(() => {
    setPhotoUrl(null);
    setProgress(0);
    setError(null);
    setUploading(false);
  }, []);

  /**
   * Resetear solo el error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    // Data
    photoUrl,
    uploading,
    progress, // 0-100
    error,

    // Actions
    upload,
    reset,
    clearError,

    // Helpers
    validateFile,
  };
};

export default usePhotoUpload;