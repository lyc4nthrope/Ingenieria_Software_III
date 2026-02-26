/**
 * useGeoLocation.js
 *
 * Hook personalizado para geolocalización del navegador
 * 
 * UBICACIÓN: src/features/publications/hooks/useGeoLocation.js
 * FECHA: 26-02-2026
 * STATUS: Paso 2c de Proceso 2
 * 
 * FUNCIÓN:
 * - Obtener ubicación actual del usuario
 * - Manejo de permisos
 * - Error handling
 * - Precisión y accuracy
 * 
 * DEPENDENCIAS:
 * - react (useState, useEffect, useCallback)
 * - Geolocation API del navegador (built-in)
 * 
 * NOTAS:
 * - HTTPS requerido en producción
 * - El usuario debe permitir permisos
 * - No funciona en navegadores sin soporte (muy raros)
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook para obtener geolocalización del navegador
 * 
 * Obtiene: latitude, longitude, accuracy
 * Maneja: permisos, errores, retry
 * 
 * @param {Object} options - Opciones
 * @param {boolean} options.autoFetch - Obtener ubicación al montar (default: false)
 * @param {number} options.timeout - Timeout en ms (default: 10000)
 * @param {number} options.maximumAge - Max edad de la ubicación cached en ms (default: 60000)
 * @param {boolean} options.enableHighAccuracy - Alta precisión (usa más batería) (default: true)
 * 
 * @returns {Object} { latitude, longitude, accuracy, loading, error, refetch, supported }
 * 
 * @example
 * const { latitude, longitude, loading, error, refetch } = useGeoLocation({
 *   autoFetch: true,
 *   enableHighAccuracy: true
 * });
 * 
 * if (loading) return <div>Obteniendo ubicación...</div>;
 * if (error) return <div>Error: {error}</div>;
 * if (latitude && longitude) {
 *   return <div>Ubicación: {latitude}, {longitude}</div>;
 * }
 */
export const useGeoLocation = (options = {}) => {
  // ─── Configuración ────────────────────────────────────────────────────────

  const {
    autoFetch = false,
    timeout = 10000,
    maximumAge = 60000,
    enableHighAccuracy = true,
  } = options;

  // ─── Estados ───────────────────────────────────────────────────────────────

  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true);

  // ─── Efectos ───────────────────────────────────────────────────────────────

  /**
   * Verificar soporte de Geolocation al montar
   */
  useEffect(() => {
    if (!navigator.geolocation) {
      setSupported(false);
      setError('Tu navegador no soporta geolocalización');
    }
  }, []);

  /**
   * Auto-fetch al montar si está habilitado
   */
  useEffect(() => {
    if (autoFetch && supported && navigator.geolocation) {
      fetchLocation();
    }
  }, [autoFetch, supported, fetchLocation]);

  // ─── Funciones públicas ────────────────────────────────────────────────────

  /**
   * Obtener ubicación actual
   */
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada');
      return;
    }

    setLoading(true);
    setError(null);

    const options = {
      enableHighAccuracy: enableHighAccuracy,
      timeout: timeout,
      maximumAge: maximumAge,
    };

    navigator.geolocation.getCurrentPosition(
      // Success
      (position) => {
        const { latitude: lat, longitude: lon, accuracy: acc } =
          position.coords;

        setLatitude(lat);
        setLongitude(lon);
        setAccuracy(acc);
        setLoading(false);
        setError(null);
      },

      // Error
      (err) => {
        let errorMessage = 'Error desconocido al obtener ubicación';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage =
              'Permiso denegado. Habilita ubicación en los ajustes del navegador.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible. Intenta en otro lugar.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Tiempo agotado obteniendo ubicación.';
            break;
          default:
            errorMessage = err.message || errorMessage;
        }

        setError(errorMessage);
        setLatitude(null);
        setLongitude(null);
        setAccuracy(null);
        setLoading(false);
      },

      options
    );
  }, [enableHighAccuracy, timeout, maximumAge]);

  /**
   * Reintentar obtener ubicación
   */
  const refetch = useCallback(() => {
    fetchLocation();
  }, [fetchLocation]);

  /**
   * Limpiar ubicación
   */
  const clear = useCallback(() => {
    setLatitude(null);
    setLongitude(null);
    setAccuracy(null);
    setError(null);
  }, []);

  /**
   * Obtener ubicación como objeto
   */
  const getCoordinates = useCallback(() => {
    if (latitude !== null && longitude !== null) {
      return { latitude, longitude, accuracy };
    }
    return null;
  }, [latitude, longitude, accuracy]);

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    // Data
    latitude,
    longitude,
    accuracy, // en metros

    // Status
    loading,
    error,
    supported,

    // Actions
    refetch,
    clear,

    // Helpers
    getCoordinates, // Retorna { latitude, longitude, accuracy } o null
    hasLocation: latitude !== null && longitude !== null,
  };
};

export default useGeoLocation;