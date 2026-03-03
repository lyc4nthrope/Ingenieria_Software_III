/**
 * usePublications.js
 *
 * Hook personalizado para gestionar publicaciones de precios
 * 
 * UBICACIÓN: src/features/publications/hooks/usePublications.js
 * FECHA: 26-02-2026
 * STATUS: Paso 2a de Proceso 2
 * 
 * FUNCIÓN:
 * - Carga publicaciones desde BD
 * - Aplica filtros
 * - Paginación (infinite scroll)
 * - Refetch automático
 * - Estados: loading, error, data
 * 
 * DEPENDENCIAS:
 * - publications.api.js
 * - react (useState, useEffect, useCallback)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as publicationsApi from '@/services/api/publications.api';
import { debugPublications } from '@/utils/debugLogger';

const REQUEST_GUARD_TIMEOUT_MS = 20000;
const TAB_REFETCH_DEBOUNCE_MS = 1500;
/**
 * Custom hook para gestionar publicaciones de precios
 * 
 * @param {Object} initialFilters - Filtros iniciales
 * @param {string} initialFilters.productName - Nombre de producto
 * @param {string} initialFilters.storeName - Nombre de tienda
 * @param {number} initialFilters.minPrice - Precio mínimo
 * @param {number} initialFilters.maxPrice - Precio máximo
 * @param {number} initialFilters.maxDistance - Distancia máxima (km)
 * @param {number} initialFilters.latitude - Latitud usuario
 * @param {number} initialFilters.longitude - Longitud usuario
 * @param {string} initialFilters.sortBy - 'recent', 'validated', 'cheapest'
 * @param {number} initialFilters.limit - Resultados por página (default 20)
 * 
 * @returns {Object} { publications, loading, error, filters, setFilters, refetch, hasMore, loadMore }
 * 
 * @example
 * const { 
 *   publications, 
 *   loading, 
 *   error, 
 *   filters, 
 *   setFilters, 
 *   refetch,
 *   hasMore,
 *   loadMore 
 * } = usePublications({ 
 *   productName: 'aceite',
 *   maxPrice: 30000,
 *   sortBy: 'cheapest'
 * });
 */
export const usePublications = (initialFilters = {}) => {
  // ─── Estados ───────────────────────────────────────────────────────────────

  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const isMountedRef = useRef(true);
  const activeRequestIdRef = useRef(0);
  const inFlightRef = useRef(false);
  const lastFetchAtRef = useRef(0);

  // Filtros
  const [filters, setFilters] = useState({
    productName: '',
    storeName: '',
    minPrice: null,
    maxPrice: null,
    maxDistance: null,
    latitude: null,
    longitude: null,
    sortBy: 'recent',
    limit: 20,
    ...initialFilters,
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─── Cargar publicaciones ──────────────────────────────────────────────────

  /**
   * Fetch publicaciones desde API
   * @private
   */
  const fetchPublications = useCallback(
    async (currentPage = 1) => {
       if (inFlightRef.current) {
        debugPublications('fetch:skipped-inflight', { currentPage });
        return;
      }

      const requestId = activeRequestIdRef.current + 1;
      activeRequestIdRef.current = requestId;
      const startedAt = Date.now();
      let guardTimeoutId = null;
      try {
        inFlightRef.current = true;
        if (isMountedRef.current) {
          setLoading(true);
          setError(null);
        }

        // Agregar página a los filtros
        const queryFilters = {
          ...filters,
          page: currentPage,
        };

        debugPublications('fetch:start', {
          requestId,
          currentPage,
          filters: queryFilters,
        });

        guardTimeoutId = setTimeout(() => {
          if (!isMountedRef.current || requestId !== activeRequestIdRef.current) return;
          debugPublications('fetch:guard-timeout', {
            requestId,
            elapsedMs: Date.now() - startedAt,
          });
          setError('La carga de publicaciones está tardando demasiado. Intenta nuevamente.');
          setLoading(false);
        }, REQUEST_GUARD_TIMEOUT_MS);

        // Llamar a API
        const result = await publicationsApi.getPublications(queryFilters);

        if (!isMountedRef.current || requestId !== activeRequestIdRef.current) {
          return;
        }

        if (result.success) {
           debugPublications('fetch:success', {
            requestId,
            currentPage,
            elapsedMs: Date.now() - startedAt,
            results: result.data?.length || 0,
          });
          // Si es primera página, reemplazar todo; sino, agregar
          if (currentPage === 1) {
            setPublications(result.data);
          } else {
            setPublications((prev) => [...prev, ...result.data]);
          }

          setTotalCount(result.count || 0);
          setHasMore(result.hasMore || false);
          setPage(currentPage);
        } else {
          debugPublications('fetch:api-error', {
            requestId,
            currentPage,
            elapsedMs: Date.now() - startedAt,
            error: result.error,
          });
          setError(result.error || 'Error cargando publicaciones');
          if (currentPage === 1) {
            setPublications([]);
            setHasMore(false);
            setTotalCount(0);
          }
        }
      } catch (err) {
        console.error('Error en fetchPublications:', err);
        debugPublications('fetch:exception', {
          requestId,
          currentPage,
          elapsedMs: Date.now() - startedAt,
          error: err?.message || String(err),
        });

        if (!isMountedRef.current || requestId !== activeRequestIdRef.current) {
          return;
        }

        setError('Error inesperado al cargar publicaciones');
      } finally {
        if (guardTimeoutId) clearTimeout(guardTimeoutId);
        if (isMountedRef.current && requestId === activeRequestIdRef.current) {
          setLoading(false);
        }
        inFlightRef.current = false;
        lastFetchAtRef.current = Date.now();
      }
    },
    [filters]
  );

  // ─── Efectos ───────────────────────────────────────────────────────────────

  /**
   * Cargar publicaciones cuando filtros cambien
   */
  useEffect(() => {
    fetchPublications(1);
  }, [filters, fetchPublications]);

  useEffect(() => {
    const handleTabActive = () => {
      if (document.visibilityState === 'visible') {
        const elapsedSinceLastFetch = Date.now() - lastFetchAtRef.current;
        if (elapsedSinceLastFetch < TAB_REFETCH_DEBOUNCE_MS) {
          debugPublications('fetch:skipped-tab-active-debounced', {
            elapsedSinceLastFetch,
          });
          return;
        }
        fetchPublications(1);
      }
    };

    window.addEventListener('focus', handleTabActive);
    document.addEventListener('visibilitychange', handleTabActive);

    return () => {
      window.removeEventListener('focus', handleTabActive);
      document.removeEventListener('visibilitychange', handleTabActive);
    };
  }, [fetchPublications]);

  // ─── Funciones públicas ────────────────────────────────────────────────────

  /**
   * Cambiar filtros (inicia búsqueda desde página 1)
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
    }));
    // Reset a página 1 cuando cambian filtros
    setPage(1);
  }, []);

  /**
   * Limpiar todos los filtros
   */
  const clearFilters = useCallback(() => {
    setFilters({
      productName: '',
      storeName: '',
      minPrice: null,
      maxPrice: null,
      maxDistance: null,
      latitude: null,
      longitude: null,
      sortBy: 'recent',
      limit: 20,
    });
    setPage(1);
  }, []);

  /**
   * Recargar publicaciones (refetch)
   */
  const refetch = useCallback(() => {
    fetchPublications(1);
  }, [fetchPublications]);

  /**
   * Cargar más resultados (infinite scroll)
   */
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      fetchPublications(page + 1);
    }
  }, [hasMore, loading, page, fetchPublications]);

  /**
   * Agregar una publicación a la lista (después de crear)
   */
  const addPublication = useCallback((publication) => {
    setPublications((prev) => [publication, ...prev]);
  }, []);

  /**
   * Eliminar una publicación de la lista
   */
  const removePublication = useCallback((publicationId) => {
    setPublications((prev) =>
      prev.filter((pub) => pub.id !== publicationId)
    );
  }, []);

  /**
   * Validar (upvote) una publicación
   */
  const validatePublication = useCallback(async (publicationId) => {
    try {
      const result = await publicationsApi.validatePublication(publicationId);

      if (result.success) {
        // Actualizar contador en la lista
        setPublications((prev) =>
          prev.map((pub) =>
            pub.id === publicationId
              ? { ...pub, validated_count: (pub.validated_count || 0) + 1 }
              : pub
          )
        );
        return result;
      } else {
        return result;
      }
    } catch (err) {
      console.error('Error validando publicación:', err);
      return { success: false, error: err.message };
    }
  }, []);

  /**
   * Quitar validación (unvote) de una publicación
   */
  const unvotePublication = useCallback(async (publicationId) => {
    try {
      const result = await publicationsApi.unvotePublication(publicationId);

      if (result.success) {
        setPublications((prev) =>
          prev.map((pub) =>
            pub.id === publicationId
              ? {
                  ...pub,
                  validated_count: Math.max((pub.validated_count || 1) - 1, 0),
                }
              : pub,
          ),
        );
      }

      return result;
    } catch (err) {
      console.error('Error quitando voto de publicación:', err);
      return { success: false, error: err.message };
    }
  }, []);


  /**
   * Reportar una publicación
   */
  const reportPublication = useCallback(
    async (publicationId, reportType, description) => {
      try {
        const result = await publicationsApi.reportPublication(
          publicationId,
          reportType,
          description
        );

        if (result.success) {
          // Actualizar contador en la lista
          setPublications((prev) =>
            prev.map((pub) =>
              pub.id === publicationId
                ? { ...pub, reported_count: (pub.reported_count || 0) + 1 }
                : pub
            )
          );
          return result;
        } else {
          return result;
        }
      } catch (err) {
        console.error('Error reportando publicación:', err);
        return { success: false, error: err.message };
      }
    },
    []
  );

  // ─── Return ────────────────────────────────────────────────────────────────

  return {
    // Data
    publications,
    loading,
    error,
    totalCount,

    // Filters
    filters,
    setFilters: updateFilters,
    clearFilters,

    // Pagination
    page,
    hasMore,
    loadMore,

    // Actions
    refetch,
    addPublication,
    removePublication,
    validatePublication,
    unvotePublication,
    reportPublication,
  };
};

export default usePublications;