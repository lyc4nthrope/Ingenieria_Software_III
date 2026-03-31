import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { CarouselCard } from './CarouselCard';
import PublicationDetailModal from '@/features/publications/components/PublicationDetailModal';

const MAX_HEIGHT  = 280; // px — altura máxima del contenedor scrolleable
const SCROLL_STEP = 90;  // px — cuánto mueve cada flecha

// ─── Lista scrolleable de tarjetas de publicaciones ──────────────────────────
// El contenedor tiene scroll libre + flechas ▲/▼ como atajo de scroll.
// Las flechas se muestran solo cuando hay contenido arriba/abajo.
// La tarjeta seleccionada hace scrollIntoView automáticamente.
export function InfiniteHorizontalCarousel({ publications, selectedId, onSelect }) {
  const [detailPub, setDetailPub] = useState(null);
  const [canUp,     setCanUp]     = useState(false);
  const [canDown,   setCanDown]   = useState(false);
  const scrollRef  = useRef(null);
  const selectedRef = useRef(null);

  const total = publications?.length ?? 0;

  // Actualizar visibilidad de flechas según posición de scroll
  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanUp(el.scrollTop > 4);
    setCanDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
  }, []);

  // Recalcular flechas al montar y cuando cambia la lista
  useEffect(() => {
    updateArrows();
  }, [publications, updateArrows]);

  // Scroll automático al ítem seleccionado cuando cambia
  useEffect(() => {
    if (!selectedRef.current) return;
    selectedRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  if (total === 0) {
    return (
      <p className="m-0 text-[12px] text-muted italic py-1">
        Sin coincidencias encontradas para este producto.
      </p>
    );
  }

  const scrollUp   = () => scrollRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: 'smooth' });
  const scrollDown = () => scrollRef.current?.scrollBy({ top:  SCROLL_STEP, behavior: 'smooth' });

  return (
    <>
      <div className="flex flex-col items-stretch gap-1">
        {/* ── Flecha arriba ── */}
        <button
          type="button"
          onClick={scrollUp}
          disabled={!canUp}
          aria-label="Ver opciones anteriores"
          className={cn(
            'w-full min-h-[44px]',
            'bg-surface border border-line rounded-sm',
            'text-accent text-[13px] font-extrabold leading-none',
            'p-1 transition-opacity duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            canUp ? 'opacity-100 cursor-pointer' : 'opacity-20 cursor-default',
          )}
        >
          ▲
        </button>

        {/* ── Lista scrolleable ── */}
        <div
          ref={scrollRef}
          onScroll={updateArrows}
          className="flex flex-col gap-[6px] overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent]"
          style={{ maxHeight: `${MAX_HEIGHT}px` }}
        >
          {(publications ?? []).map((pub, idx) => {
            const isSelected = (pub.id ?? idx) === selectedId;
            return (
              <div key={pub.id ?? idx} ref={isSelected ? selectedRef : null}>
                <CarouselCard
                  pub={pub}
                  globalIdx={idx}
                  isSelected={isSelected}
                  onSelect={onSelect}
                  onDetail={setDetailPub}
                />
              </div>
            );
          })}
        </div>

        {/* ── Flecha abajo ── */}
        <button
          type="button"
          onClick={scrollDown}
          disabled={!canDown}
          aria-label="Ver más opciones"
          className={cn(
            'w-full min-h-[44px]',
            'bg-surface border border-line rounded-sm',
            'text-accent text-[13px] font-extrabold leading-none',
            'p-1 transition-opacity duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            canDown ? 'opacity-100 cursor-pointer' : 'opacity-20 cursor-default',
          )}
        >
          ▼
        </button>

        {/* ── Contador ── */}
        {total > 1 && (
          <p className="m-0 text-center text-[11px] text-muted font-semibold">
            {total} opciones disponibles
          </p>
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
