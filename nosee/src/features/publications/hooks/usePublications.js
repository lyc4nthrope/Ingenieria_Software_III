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

import { useState, useEffect, useCallback } from 'react';
import * as publicationsApi from '@/services/api/publications.api';

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

  // ─── Cargar publicaciones ──────────────────────────────────────────────────

  /**
   * Fetch publicaciones desde API
   * @private
   */
  const fetchPublications = useCallback(
    async (currentPage = 1) => {
      try {
        setLoading(true);
        setError(null);

        // Agregar página a los filtros
        const queryFilters = {
          ...filters,
          page: currentPage,
        };

        // Llamar a API
        const result = await publicationsApi.getPublications(queryFilters);

        if (result.success) {
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
          setError(result.error || 'Error cargando publicaciones');
        }
      } catch (err) {
        console.error('Error en fetchPublications:', err);
        setError('Error inesperado al cargar publicaciones');
      } finally {
        setLoading(false);
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
    reportPublication,
  };
};

export default usePublications;