import { useCallback, useEffect, useRef } from "react";
import { INFINITE_SCROLL_CONFIG } from "@/config/infiniteScroll";

/**
 * Dispara onLoadMore solo cuando el usuario hace scroll hacia abajo
 * y está cerca del final del contenedor.
 */
export function useInfiniteScrollTrigger({
  hasMore,
  loading,
  onLoadMore,
  enabled = true,
  scrollRootId = "main-content",
  triggerDistancePx = INFINITE_SCROLL_CONFIG.triggerDistancePx,
  cooldownMs = INFINITE_SCROLL_CONFIG.cooldownMs,
} = {}) {
  const hasMoreRef = useRef(hasMore);
  const loadingRef = useRef(loading);
  const onLoadMoreRef = useRef(onLoadMore);
  const lastScrollTopRef = useRef(0);
  const lastLoadTriggerAtRef = useRef(0);
  const userScrolledDownRef = useRef(false);
  const lastActiveRootRef = useRef(null);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const getScrollRoots = useCallback(() => {
    if (typeof document === "undefined") return [];

    const candidates = [
      document.getElementById(scrollRootId),
      document.scrollingElement,
      document.documentElement,
      document.body,
    ].filter(Boolean);

    // Remover duplicados manteniendo orden.
    return [...new Set(candidates)];
  }, [scrollRootId]);

  const pickScrollableRoot = useCallback(() => {
    const roots = getScrollRoots();
    if (roots.length === 0) return null;

    if (lastActiveRootRef.current && roots.includes(lastActiveRootRef.current)) {
      return lastActiveRootRef.current;
    }

    return roots.find((root) => root.scrollHeight > root.clientHeight + 1) || roots[0];
  }, [getScrollRoots]);

  const getScrollMetrics = useCallback((source) => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return null;
    }

    // Scroll del viewport (caso común en mobile browsers).
    if (source === window || source === document) {
      const currentTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;
      const scrollHeight = Math.max(
        document.documentElement.scrollHeight || 0,
        document.body.scrollHeight || 0,
      );
      const clientHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      return { currentTop, scrollHeight, clientHeight };
    }

    if (!source) return null;
    return {
      currentTop: source.scrollTop || 0,
      scrollHeight: source.scrollHeight || 0,
      clientHeight: source.clientHeight || 0,
    };
  }, []);

  const triggerLoadMoreIfNeeded = useCallback(() => {
    const now = Date.now();
    if (now - lastLoadTriggerAtRef.current < cooldownMs) return;
    if (!hasMoreRef.current || loadingRef.current) return;

    lastLoadTriggerAtRef.current = now;
    onLoadMoreRef.current?.();
  }, [cooldownMs]);

  useEffect(() => {
    if (!enabled || !hasMore) return;

    const scrollRoots = getScrollRoots();
    const targets = [window, ...scrollRoots];
    let ticking = false;

    const onScroll = (event) => {
      const source = event?.currentTarget;
      const fallbackRoot = pickScrollableRoot();
      const chosenSource = source || fallbackRoot || window;
      lastActiveRootRef.current = chosenSource;
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;

        const metrics = getScrollMetrics(chosenSource);
        if (!metrics) return;
        const { currentTop, scrollHeight, clientHeight } = metrics;
        const isScrollingDown = currentTop > lastScrollTopRef.current + 1;
        lastScrollTopRef.current = currentTop;
        if (!isScrollingDown) return;
        userScrolledDownRef.current = true;

        const distanceToBottom = scrollHeight - currentTop - clientHeight;

        if (distanceToBottom <= triggerDistancePx) {
          triggerLoadMoreIfNeeded();
        }
      });
    };

    targets.forEach((target) =>
      target.addEventListener("scroll", onScroll, { passive: true }),
    );

    return () => {
      targets.forEach((target) => target.removeEventListener("scroll", onScroll));
    };
  }, [enabled, hasMore, getScrollRoots, getScrollMetrics, pickScrollableRoot, triggerDistancePx, triggerLoadMoreIfNeeded]);

  useEffect(() => {
    if (!enabled || !hasMore || loading) return;
    if (!userScrolledDownRef.current) return;

    const activeSource = lastActiveRootRef.current || pickScrollableRoot() || window;
    const metrics = getScrollMetrics(activeSource);
    if (!metrics) return;
    const distanceToBottom =
      metrics.scrollHeight - metrics.currentTop - metrics.clientHeight;

    // Si sigue pegado al fondo después de renderizar la página anterior,
    // continuar la carga para mantener el scroll fluido.
    if (distanceToBottom <= triggerDistancePx) {
      const id = window.requestAnimationFrame(() => {
        triggerLoadMoreIfNeeded();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [enabled, hasMore, loading, getScrollMetrics, pickScrollableRoot, triggerDistancePx, triggerLoadMoreIfNeeded]);
}

export default useInfiniteScrollTrigger;
