import { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
import { TrashIcon, ChevronDownIcon } from '../utils/shoppingListUtils';
import { sidebar } from '../styles/shoppingListStyles';

// ─── Sidebar de listas guardadas ──────────────────────────────────────────────
export function SavedListsSidebar({ savedLists, onLoad, onDelete, flash }) {
  const isMobile = useIsMobile(680);
  const [isOpen, setIsOpen] = useState(true);

  // Colapsado por defecto en móvil, expandido en desktop
  useEffect(() => {
    setIsOpen(!isMobile);
  }, [isMobile]);

  return (
    <aside style={sidebar.root}>
      {/* Header — clickeable en móvil para toggle */}
      <div
        style={{
          ...sidebar.header,
          ...(isMobile ? { cursor: 'pointer', userSelect: 'none' } : {}),
        }}
        onClick={isMobile ? () => setIsOpen((v) => !v) : undefined}
        role={isMobile ? 'button' : undefined}
        tabIndex={isMobile ? 0 : undefined}
        onKeyDown={isMobile ? (e) => { if (e.key === 'Enter' || e.key === ' ') setIsOpen((v) => !v); } : undefined}
        aria-expanded={isMobile ? isOpen : undefined}
      >
        <span style={{
          ...sidebar.title,
          ...(flash ? { animation: 'savedFlash 0.8s ease' } : {}),
        }}>
          Listas guardadas
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {savedLists.length > 0 && (
            <span style={sidebar.count}>{savedLists.length}</span>
          )}
          {isMobile && <ChevronDownIcon open={isOpen} />}
        </div>
      </div>

      {/* Contenido colapsable */}
      {isOpen && (
        savedLists.length === 0 ? (
          <div style={sidebar.empty}>
            <span style={sidebar.emptyIcon}>📋</span>
            <p style={sidebar.emptyText}>Sin listas guardadas</p>
            <p style={sidebar.emptyHint}>Guarda tu lista actual con un nombre para encontrarla aquí.</p>
          </div>
        ) : (
          <ul style={sidebar.list}>
            {savedLists.map((sl) => {
              const date = new Date(sl.savedAt).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short',
              });
              return (
                <li key={sl.id} style={sidebar.item}>
                  <button
                    type="button"
                    onClick={() => onLoad(sl.id)}
                    style={sidebar.itemBtn}
                    title={`Cargar "${sl.name}"`}
                  >
                    <span style={sidebar.itemName}>{sl.name}</span>
                    <span style={sidebar.itemMeta}>
                      {sl.items.length} {sl.items.length === 1 ? 'producto' : 'productos'} · {date}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(sl.id)}
                    style={sidebar.deleteBtn}
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
