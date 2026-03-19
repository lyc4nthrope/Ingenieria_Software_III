import { useState, useEffect, useRef } from 'react';
import { CarouselCard } from './CarouselCard';
import PublicationDetailModal from '@/features/publications/components/PublicationDetailModal';
import { carousel } from '../styles/shoppingListStyles';

// ─── Carrusel horizontal con carga infinita ───────────────────────────────────
export function InfiniteHorizontalCarousel({ publications, selectedId, onSelect }) {
  const [visibleCount, setVisibleCount] = useState(10);
  const [detailPub, setDetailPub] = useState(null);
  const scrollRef = useRef(null);

  const total = publications?.length ?? 0;
  const hasMore = visibleCount < total;
  const visible = (publications ?? []).slice(0, visibleCount);

  // Resetear al cambiar publicaciones
  useEffect(() => { setVisibleCount(10); }, [publications]);

  // Scroll infinito: detectar cuando el usuario llega cerca del borde derecho
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !hasMore) return;
    const handleScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      if (scrollWidth - scrollLeft - clientWidth < 120) {
        setVisibleCount((v) => Math.min(v + 10, total));
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [hasMore, total]);

  if (total === 0) {
    return <div style={carousel.empty}>Sin coincidencias encontradas para este producto.</div>;
  }

  return (
    <>
      <style>{`
        .nosee-hscroll::-webkit-scrollbar { height: 3px; }
        .nosee-hscroll::-webkit-scrollbar-track { background: var(--border); border-radius: 2px; }
        .nosee-hscroll::-webkit-scrollbar-thumb { background: var(--accent); border-radius: 2px; }
      `}</style>
      <div ref={scrollRef} className="nosee-hscroll" style={carousel.infiniteTrack}>
        {visible.map((pub, idx) => (
          <CarouselCard
            key={pub.id ?? idx}
            pub={pub}
            globalIdx={idx}
            isSelected={(pub.id ?? idx) === selectedId}
            onSelect={onSelect}
            onDetail={setDetailPub}
          />
        ))}
        {hasMore && (
          <div style={carousel.loadMoreSentinel}>
            <span style={{ fontSize: '20px', color: 'var(--text-muted)', letterSpacing: '4px', lineHeight: 1 }}>···</span>
          </div>
        )}
      </div>
      {detailPub && (
        <PublicationDetailModal
          publication={detailPub}
          onClose={() => setDetailPub(null)}
        />
      )}
    </>
  );
}
