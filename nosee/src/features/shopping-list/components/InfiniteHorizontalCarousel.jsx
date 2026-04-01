import { useState, useEffect, useRef, useCallback } from 'react';
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
    return <p style={s.empty}>Sin coincidencias encontradas para este producto.</p>;
  }

  const scrollUp   = () => scrollRef.current?.scrollBy({ top: -SCROLL_STEP, behavior: 'smooth' });
  const scrollDown = () => scrollRef.current?.scrollBy({ top:  SCROLL_STEP, behavior: 'smooth' });

  return (
    <>
      <div style={s.root}>
        {/* ── Flecha arriba ── */}
        <button
          type="button"
          onClick={scrollUp}
          disabled={!canUp}
          style={{ ...s.arrowBtn, opacity: canUp ? 1 : 0.2, cursor: canUp ? 'pointer' : 'default' }}
          aria-label="Ver opciones anteriores"
        >
          ▲
        </button>

        {/* ── Lista scrolleable ── */}
        <div
          ref={scrollRef}
          onScroll={updateArrows}
          style={s.cards}
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
          style={{ ...s.arrowBtn, opacity: canDown ? 1 : 0.2, cursor: canDown ? 'pointer' : 'default' }}
          aria-label="Ver más opciones"
        >
          ▼
        </button>

        {/* ── Contador ── */}
        {total > 1 && (
          <p style={s.pageInfo}>{total} opciones disponibles</p>
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

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: '4px',
  },
  arrowBtn: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 800,
    padding: '4px',
    lineHeight: 1,
    width: '100%',
    transition: 'opacity 0.15s',
  },
  cards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: `${MAX_HEIGHT}px`,
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    scrollbarColor: 'var(--border) transparent',
  },
  pageInfo: {
    margin: 0,
    textAlign: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  empty: {
    margin: 0,
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '4px 0',
  },
};
