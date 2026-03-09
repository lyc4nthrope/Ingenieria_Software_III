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

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  const getScrollRoot = useCallback(() => {
    if (typeof document === "undefined") return null;
    return (
      document.getElementById(scrollRootId) ||
      document.scrollingElement ||
      document.documentElement
    );
  }, [scrollRootId]);

  const triggerLoadMoreIfNeeded = useCallback(() => {
    const now = Date.now();
    if (now - lastLoadTriggerAtRef.current < cooldownMs) return;
    if (!hasMoreRef.current || loadingRef.current) return;

    lastLoadTriggerAtRef.current = now;
    onLoadMoreRef.current?.();
  }, [cooldownMs]);

  useEffect(() => {
    if (!enabled || !hasMore) return;

    const scrollRoot = getScrollRoot();

    if (!scrollRoot) return;

    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        ticking = false;

        const currentTop = scrollRoot.scrollTop;
        const isScrollingDown = currentTop > lastScrollTopRef.current + 1;
        lastScrollTopRef.current = currentTop;
        if (!isScrollingDown) return;
        userScrolledDownRef.current = true;

        const distanceToBottom =
          scrollRoot.scrollHeight - currentTop - scrollRoot.clientHeight;

        if (distanceToBottom <= triggerDistancePx) {
          triggerLoadMoreIfNeeded();
        }
      });
    };

    scrollRoot.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollRoot.removeEventListener("scroll", onScroll);
  }, [enabled, hasMore, getScrollRoot, triggerDistancePx, triggerLoadMoreIfNeeded]);

  useEffect(() => {
    if (!enabled || !hasMore || loading) return;
    if (!userScrolledDownRef.current) return;

    const scrollRoot = getScrollRoot();
    if (!scrollRoot) return;

    const distanceToBottom =
      scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;

    // Si sigue pegado al fondo después de renderizar la página anterior,
    // continuar la carga para mantener el scroll fluido.
    if (distanceToBottom <= triggerDistancePx) {
      const id = window.requestAnimationFrame(() => {
        triggerLoadMoreIfNeeded();
      });
      return () => window.cancelAnimationFrame(id);
    }
  }, [enabled, hasMore, loading, getScrollRoot, triggerDistancePx, triggerLoadMoreIfNeeded]);
}

export default useInfiniteScrollTrigger;
