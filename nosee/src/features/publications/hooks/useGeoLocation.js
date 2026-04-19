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

import { useState, useEffect, useCallback, useRef } from 'react';

const LAST_LOCATION_STORAGE_KEY = 'nosee:last-known-location';

/**
 * Obtiene ubicación aproximada por IP como último recurso.
 * Se usa solo cuando el permiso fue denegado y no hay ubicación guardada.
 */
const fetchIpLocation = async () => {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch('https://ipwho.is/', { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
      return { latitude: data.latitude, longitude: data.longitude };
    }
  } catch {
    // silently fail — IP geolocation es best-effort
  }
  return null;
};

const readStoredLocation = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(LAST_LOCATION_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.latitude === 'number' &&
      typeof parsed?.longitude === 'number'
    ) {
      return parsed;
    }
  } catch (error) {
    console.warn('No se pudo leer la última ubicación guardada:', error);
  }

  return null;
};

const persistLocation = (location) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      LAST_LOCATION_STORAGE_KEY,
      JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy ?? null,
        updatedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn('No se pudo guardar la última ubicación:', error);
  }
};

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

  const storedLocationRef = useRef(readStoredLocation());
  const [latitude, setLatitude] = useState(storedLocationRef.current?.latitude ?? null);
  const [longitude, setLongitude] = useState(storedLocationRef.current?.longitude ?? null);
  const [accuracy, setAccuracy] = useState(storedLocationRef.current?.accuracy ?? null);
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
      setError('Tu navegador no soporta geolocalización\nYour browser does not support geolocation');
      setLoading(false);
    }
  }, []);

  // ─── Funciones públicas ────────────────────────────────────────────────────

  /**
   * Obtener ubicación actual
   */
  const fetchLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada\nGeolocation not supported');
      setLoading(false);
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
        persistLocation({ latitude: lat, longitude: lon, accuracy: acc });
      },

      // Error
      (err) => {
        let errorMessage = 'Error desconocido al obtener ubicación\nUnknown error getting location';

        switch (err.code) {
          case err.PERMISSION_DENIED:
            errorMessage =
              'Permiso denegado. Habilita ubicación en los ajustes del navegador.\nPermission denied. Enable location in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            errorMessage = 'Ubicación no disponible. Intenta en otro lugar.\nLocation unavailable. Try from a different place.';
            break;
          case err.TIMEOUT:
            errorMessage = 'Tiempo agotado obteniendo ubicación.\nTimed out getting location.';
            break;
          default:
            errorMessage = err.message || errorMessage;
        }

        setError(errorMessage);
        setLoading(false);

        if (storedLocationRef.current) {
          // Ya tenemos la última ubicación conocida — mantener los valores actuales
        } else {
          // Último recurso: aproximación por IP
          fetchIpLocation().then((ipLoc) => {
            if (ipLoc) {
              setLatitude(ipLoc.latitude);
              setLongitude(ipLoc.longitude);
              setAccuracy(null);
              persistLocation({ latitude: ipLoc.latitude, longitude: ipLoc.longitude, accuracy: null });
              storedLocationRef.current = ipLoc;
            } else {
              setLatitude(null);
              setLongitude(null);
              setAccuracy(null);
            }
          });
        }
      },

      options
    );
  }, [enableHighAccuracy, timeout, maximumAge]);

   /**
   * Auto-fetch al montar si está habilitado
   */
  useEffect(() => {
    if (autoFetch && supported && navigator.geolocation) {
      fetchLocation();
    }
  }, [autoFetch, supported, fetchLocation]);
  
  /**
   * Reintentar obtener ubicación. Retorna una Promise que resuelve con { latitude, longitude, accuracy }.
   */
  const refetch = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setLoading(false);
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude: lat, longitude: lon, accuracy: acc } = position.coords;
          setLatitude(lat);
          setLongitude(lon);
          setAccuracy(acc);
          setLoading(false);
          setError(null);
          persistLocation({ latitude: lat, longitude: lon, accuracy: acc });
          resolve({ latitude: lat, longitude: lon, accuracy: acc });
        },
        (err) => {
          let errorMessage = 'Error desconocido al obtener ubicación\nUnknown error getting location';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Permiso denegado. Habilita ubicación en los ajustes del navegador.\nPermission denied. Enable location in your browser settings.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Ubicación no disponible. Intenta en otro lugar.\nLocation unavailable. Try from a different place.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Tiempo agotado obteniendo ubicación.\nTimed out getting location.';
              break;
            default:
              errorMessage = err.message || errorMessage;
          }
          setError(errorMessage);
          setLoading(false);

          if (storedLocationRef.current) {
            resolve({
              latitude: storedLocationRef.current.latitude,
              longitude: storedLocationRef.current.longitude,
              accuracy: storedLocationRef.current.accuracy ?? null,
            });
          } else {
            fetchIpLocation().then((ipLoc) => {
              if (ipLoc) {
                setLatitude(ipLoc.latitude);
                setLongitude(ipLoc.longitude);
                setAccuracy(null);
                persistLocation({ latitude: ipLoc.latitude, longitude: ipLoc.longitude, accuracy: null });
                storedLocationRef.current = ipLoc;
                resolve({ latitude: ipLoc.latitude, longitude: ipLoc.longitude, accuracy: null });
              } else {
                setLatitude(null);
                setLongitude(null);
                setAccuracy(null);
                reject(new Error(errorMessage));
              }
            });
          }
        },
        { enableHighAccuracy, timeout, maximumAge },
      );
    });
  }, [enableHighAccuracy, timeout, maximumAge]);

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