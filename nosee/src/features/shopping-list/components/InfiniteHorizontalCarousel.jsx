import { useState, useEffect } from 'react';
import { CarouselCard } from './CarouselCard';
import PublicationDetailModal from '@/features/publications/components/PublicationDetailModal';

const PAGE_SIZE = 3;

// ─── Paginador vertical de tarjetas de publicaciones ─────────────────────────
// Muestra máximo 3 tarjetas a la vez con flechas ▲ / ▼ para navegar.
// Reemplaza el carrusel horizontal anterior.
export function InfiniteHorizontalCarousel({ publications, selectedId, onSelect }) {
  const [page, setPage] = useState(0);
  const [detailPub, setDetailPub] = useState(null);

  const total   = publications?.length ?? 0;
  const maxPage = Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);
  const start   = page * PAGE_SIZE;
  const visible = (publications ?? []).slice(start, start + PAGE_SIZE);

  // Reiniciar página cuando cambia la lista de publicaciones
  useEffect(() => { setPage(0); }, [publications]);

  // Si la selección actual NO está en la página visible, ir a su página
  useEffect(() => {
    if (!selectedId) return;
    const idx = (publications ?? []).findIndex((p) => p.id === selectedId);
    if (idx < 0) return;
    const targetPage = Math.floor(idx / PAGE_SIZE);
    setPage(targetPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  if (total === 0) {
    return (
      <p style={s.empty}>Sin coincidencias encontradas para este producto.</p>
    );
  }

  const canUp   = page > 0;
  const canDown = page < maxPage;

  return (
    <>
      <div style={s.root}>
        {/* ── Flecha arriba ── */}
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={!canUp}
          style={{ ...s.arrowBtn, opacity: canUp ? 1 : 0.25, cursor: canUp ? 'pointer' : 'default' }}
          aria-label="Ver opciones anteriores"
        >
          ▲
        </button>

        {/* ── Tarjetas ── */}
        <div style={s.cards}>
          {visible.map((pub, idx) => (
            <CarouselCard
              key={pub.id ?? (start + idx)}
              pub={pub}
              globalIdx={start + idx}
              isSelected={(pub.id ?? (start + idx)) === selectedId}
              onSelect={onSelect}
              onDetail={setDetailPub}
            />
          ))}
        </div>

        {/* ── Flecha abajo ── */}
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
          disabled={!canDown}
          style={{ ...s.arrowBtn, opacity: canDown ? 1 : 0.25, cursor: canDown ? 'pointer' : 'default' }}
          aria-label="Ver más opciones"
        >
          ▼
        </button>

        {/* ── Indicador de página ── */}
        {total > PAGE_SIZE && (
          <p style={s.pageInfo}>
            {start + 1}–{Math.min(start + PAGE_SIZE, total)} de {total} opciones
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
