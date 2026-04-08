import { useCallback } from 'react';
import * as publicationsApi from '@/services/api/publications.api';

/**
 * Hook that returns an async function to optimize a single item.
 * Extracted from ListaTab so it can be reused in other contexts (e.g. ShoppingListPage for recogidas).
 *
 * @param {object} prefs - optimization preferences (sortMode, storeType, maxDistance, validatedOnly)
 * @param {boolean} hasLocation
 * @param {number|null} latitude
 * @param {number|null} longitude
 * @returns {{ optimizeSingleItem: (item) => Promise<{pubs: [], bestPub: object|null}> }}
 */
export function useOptimizeSingleItem({ prefs, hasLocation, latitude, longitude }) {
  const optimizeSingleItem = useCallback(async (item) => {
    const needsCoords = prefs.sortMode === 'nearest' || prefs.sortMode === 'balanced';
    const apiSortBy   = prefs.validatedOnly ? 'validated' : 'cheapest';
    const distanceParams = needsCoords && hasLocation
      ? { maxDistance: prefs.maxDistance, latitude, longitude }
      : {};

    const res  = await publicationsApi.getPublications({
      productName: item.productName,
      sortBy: apiSortBy,
      limit: 30,
      ...distanceParams,
    });

    let pubs = res.success ? (res.data ?? []) : [];
    if (prefs.storeType === 'physical') pubs = pubs.filter((p) => Number(p.store?.store_type_id) !== 2);
    else if (prefs.storeType === 'online')  pubs = pubs.filter((p) => Number(p.store?.store_type_id) === 2);

    const sorted = [...pubs].sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    return { pubs: sorted, bestPub: sorted[0] ?? null };
  }, [prefs, hasLocation, latitude, longitude]);

  return { optimizeSingleItem };
}
