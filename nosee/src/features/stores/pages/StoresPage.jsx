import { useEffect, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { listStores } from '@/services/api/stores.api';
import StoreCard from '@/features/stores/components/StoreCard';
import StoreDetailModal from '@/features/stores/components/StoreDetailModal';
import { INFINITE_SCROLL_CONFIG } from '@/config/infiniteScroll';
import { useInfiniteScrollTrigger } from '@/hooks/useInfiniteScrollTrigger';

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const MapPinIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const DEBOUNCE_MS = 350;

export default function StoresPage() {
  const { t } = useLanguage();
  const ts = t.storesPage;

  const [search, setSearch] = useState('');
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);

  const debounceRef = useRef(null);
  const pageRef = useRef(page);
  const searchRef = useRef(search);

  const fetchStores = useCallback(async ({ query, pageToLoad, append }) => {
    if (pageToLoad === 1) setLoading(true);
    else setLoadingMore(true);
    setError(null);
    const result = await listStores(query, { limit: INFINITE_SCROLL_CONFIG.storesPageSize, page: pageToLoad });
    if (result.success) {
      const incoming = result.data || [];
      setStores((prev) => {
        if (!append) return incoming;
        const seen = new Set(prev.map((item) => item.id));
        const merged = incoming.filter((item) => !seen.has(item.id));
        return [...prev, ...merged];
      });
      setPage(pageToLoad);
      setHasMore(Boolean(result.hasMore));
    } else {
      setError(result.error);
    }
    if (pageToLoad === 1) setLoading(false);
    else setLoadingMore(false);
  }, []);

  // Carga inicial
  useEffect(() => {
    fetchStores({ query: '', pageToLoad: 1, append: false });
  }, [fetchStores]);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const loadNextPage = useCallback(() => {
    fetchStores({
      query: searchRef.current,
      pageToLoad: pageRef.current + 1,
      append: true,
    });
  }, [fetchStores]);

  useInfiniteScrollTrigger({
    hasMore,
    loading: loading || loadingMore,
    onLoadMore: loadNextPage,
    triggerDistancePx: INFINITE_SCROLL_CONFIG.triggerDistancePx,
    cooldownMs: INFINITE_SCROLL_CONFIG.cooldownMs,
  });

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchStores({ query: value, pageToLoad: 1, append: false });
    }, DEBOUNCE_MS);
  };

  const handleStoreUpdated = useCallback((updatedStore) => {
    if (!updatedStore?.id) return;
    setStores((prev) =>
      prev.map((store) => (store.id === updatedStore.id ? { ...store, ...updatedStore } : store))
    );
    setSelectedStore((prev) => (prev?.id === updatedStore.id ? { ...prev, ...updatedStore } : prev));
  }, []);

  return (
    <section style={styles.page} aria-labelledby="stores-heading">
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <h1 id="stores-heading" style={styles.title}>{ts.title}</h1>
            <p style={styles.subtitle}>{ts.subtitle}</p>
          </div>
          <div style={styles.headerActions}>
            <Link
              to="/tiendas/cercanas"
              aria-label="Ver tiendas cercanas en mapa"
              style={styles.nearbyBtn}
            >
              <MapPinIcon />
              Cercanas
            </Link>
            <Link
              to="/tiendas/nueva"
              aria-label={ts.createBtnLabel}
              style={styles.createBtn}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {ts.createBtn}
            </Link>
          </div>
        </div>
      </header>

      {/* Buscador */}
      <div style={styles.searchWrapper}>
        <span style={styles.searchIcon} aria-hidden="true"><SearchIcon /></span>
        <input
          type="search"
          value={search}
          onChange={handleSearchChange}
          placeholder={ts.searchPlaceholder}
          aria-label={ts.searchPlaceholder}
          style={styles.searchInput}
        />
      </div>

      {/* Estados */}
      {loading && (
        <div role="status" aria-live="polite" style={styles.center}>
          <p style={styles.muted}>{ts.loading}</p>
        </div>
      )}

      {!loading && error && (
        <div role="alert" style={styles.center}>
          <p style={styles.errorText}>{ts.errorLoading}: {error}</p>
        </div>
      )}

      {!loading && !error && stores.length === 0 && (
        <div role="status" aria-live="polite" style={styles.center}>
          <p style={styles.muted}>{ts.empty}</p>
        </div>
      )}

      {!loading && !error && stores.length > 0 && (
        <>
          <ul style={styles.list} aria-label={ts.title}>
            {stores.map((store) => (
              <li key={store.id} style={styles.listItem}>
                <StoreCard
                  store={store}
                  onViewDetail={setSelectedStore}
                />
              </li>
            ))}
          </ul>

          <div aria-hidden="true" style={styles.paginationHint}>
            {loadingMore && <p style={styles.muted}>{ts.loading}</p>}
            {!hasMore && !loadingMore && <p style={styles.muted}>•</p>}
          </div>
        </>
      )}

      {/* Modal de detalle */}
      {selectedStore && (
        <StoreDetailModal
          store={selectedStore}
          onClose={() => setSelectedStore(null)}
          onStoreUpdated={handleStoreUpdated}
        />
      )}
    </section>
  );
}

const styles = {
  page: {
    width: '100%',
    maxWidth: '760px',
    margin: '0 auto',
    padding: '24px 16px 48px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  subtitle: {
    margin: 0,
    color: 'var(--text-secondary)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  nearbyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '7px 14px',
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  createBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    padding: '7px 14px',
    background: 'var(--accent)',
    color: 'var(--text-primary)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  searchWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute',
    left: '12px',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-muted)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px 10px 38px',
    fontSize: '14px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-surface)',
    color: 'var(--text-primary)',
    outline: 'none',
  },
  center: {
    textAlign: 'center',
    padding: '40px 0',
  },
  muted: {
    margin: 0,
    color: 'var(--text-muted)',
    fontSize: '15px',
  },
  errorText: {
    margin: 0,
    color: 'var(--error)',
    fontSize: '15px',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  listItem: {
    margin: 0,
    padding: 0,
  },
  paginationHint: {
    textAlign: 'center',
    minHeight: '32px',
    paddingTop: '8px',
  },
};
