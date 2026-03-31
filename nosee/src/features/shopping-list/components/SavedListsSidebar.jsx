import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { useIsMobile } from '@/hooks/useIsMobile';
import { TrashIcon, ChevronDownIcon } from '../utils/shoppingListUtils';

// ─── Sidebar de listas guardadas ──────────────────────────────────────────────
export function SavedListsSidebar({ savedLists, onLoad, onDelete, flash }) {
  const isMobile = useIsMobile(680);
  const [isOpen, setIsOpen] = useState(true);

  // Colapsado por defecto en móvil, expandido en desktop
  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  return (
    <aside className="flex flex-col gap-2 bg-bg-surface border border-[var(--border)] rounded-md p-3 sticky top-20">
      {/* Header — clickeable en móvil para toggle */}
      <div
        className={cn(
          'flex items-center justify-between pb-2 border-b border-[var(--border)]',
          isMobile && 'cursor-pointer select-none',
        )}
        onClick={isMobile ? () => setIsOpen((v) => !v) : undefined}
        role={isMobile ? 'button' : undefined}
        tabIndex={isMobile ? 0 : undefined}
        onKeyDown={isMobile ? (e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen((v) => !v); } : undefined}
        aria-expanded={isMobile ? isOpen : undefined}
      >
        <span className={cn(
          'text-xs font-bold text-text-secondary uppercase tracking-[0.05em]',
          flash && '[animation:savedFlash_0.8s_ease]',
        )}>
          Listas guardadas
        </span>
        <div className="flex items-center gap-1.5">
          {savedLists.length > 0 && (
            <span className="px-[7px] py-px rounded-full bg-bg-accent-soft text-text-accent text-[11px] font-bold border border-[var(--accent)]">
              {savedLists.length}
            </span>
          )}
          {isMobile && <ChevronDownIcon open={isOpen} />}
        </div>
      </div>

      {/* Contenido colapsable */}
      {isOpen && (
        savedLists.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-4 px-2 text-center">
            <span className="text-2xl">📋</span>
            <p className="text-xs font-semibold text-text-primary m-0">Sin listas guardadas</p>
            <p className="text-[11px] text-text-muted m-0 leading-[1.4]">Guarda tu lista actual con un nombre para encontrarla aquí.</p>
          </div>
        ) : (
          <ul className="list-none m-0 p-0 flex flex-col gap-1">
            {savedLists.map((sl) => {
              const date = new Date(sl.savedAt).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short',
              });
              return (
                <li key={sl.id} className="flex items-center gap-1 bg-bg-elevated border border-[var(--border)] rounded-sm overflow-hidden transition-colors duration-150 hover:border-[var(--accent)]">
                  <button
                    type="button"
                    onClick={() => onLoad(sl.id)}
                    className="flex-1 px-2.5 py-2 bg-transparent border-none cursor-pointer text-left flex flex-col gap-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-h-[44px] md:min-h-0"
                    title={`Cargar "${sl.name}"`}
                  >
                    <span className="text-xs font-bold text-text-primary leading-[1.2]">{sl.name}</span>
                    <span className="text-[10px] text-text-muted">
                      {sl.items.length} {sl.items.length === 1 ? 'producto' : 'productos'} · {date}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(sl.id)}
                    className="bg-transparent border-none text-text-muted cursor-pointer p-1.5 flex items-center shrink-0 min-h-[44px] min-w-[44px] justify-center md:min-h-0 md:min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    aria-label={`Eliminar lista "${sl.name}"`}
                  >
                    <TrashIcon />
                  </button>
                </li>
              );
            })}
          </ul>
        )
      )}
    </aside>
  );
}
