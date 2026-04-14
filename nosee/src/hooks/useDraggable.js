/**
 * useDraggable.js
 *
 * Hook reutilizable para hacer widgets flotantes arrastrables.
 * - Mouse (left-click drag) + Touch
 * - Distingue click de drag (umbral 5px)
 * - Persiste posición en localStorage
 * - Clampea dentro del viewport
 * - Keyboard: foco en el handle + flechas mueven 10px
 * - Re-clampea al redimensionar la ventana
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const DRAG_THRESHOLD = 5;
const KEYBOARD_STEP = 10;
const EDGE_MARGIN = 8;

/**
 * @param {object} opts
 * @param {string} opts.storageKey - clave localStorage para persistir posición
 * @param {(w: number, h: number) => {x: number, y: number}} opts.defaultPos
 *   Función que recibe (viewportW, viewportH) y devuelve posición por defecto.
 */
export default function useDraggable({ storageKey, defaultPos }) {
  const wasDraggedRef = useRef(false);
  const dragState = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const elementRef = useRef(null);

  const clamp = useCallback((x, y) => {
    const el = elementRef.current;
    const w = el ? el.getBoundingClientRect().width || el.offsetWidth : 60;
    const h = el ? el.getBoundingClientRect().height || el.offsetHeight : 60;
    return {
      x: Math.max(EDGE_MARGIN, Math.min(window.innerWidth - w - EDGE_MARGIN, x)),
      y: Math.max(EDGE_MARGIN, Math.min(window.innerHeight - h - EDGE_MARGIN, y)),
    };
  }, []);

  const getInitialPos = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          // No clampamos aquí porque elementRef es null — se re-clampea en resize
          return parsed;
        }
      }
    } catch { /* ignore */ }
    return defaultPos(window.innerWidth, window.innerHeight);
  }, [storageKey, defaultPos]);

  const [pos, setPos] = useState(getInitialPos);

  const savePos = useCallback((p) => {
    try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch { /* ignore */ }
  }, [storageKey]);

  // Re-clampear al redimensionar la ventana
  useEffect(() => {
    const onResize = () => {
      setPos((prev) => {
        const next = clamp(prev.x, prev.y);
        savePos(next);
        return next;
      });
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [clamp, savePos]);

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    wasDraggedRef.current = false;
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };

    const onMove = (ev) => {
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      if (!wasDraggedRef.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        wasDraggedRef.current = true;
      }
      if (!wasDraggedRef.current) return;
      setPos(clamp(dragState.current.startPosX + dx, dragState.current.startPosY + dy));
    };

    const onUp = (ev) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if (wasDraggedRef.current) {
        const dx = ev.clientX - dragState.current.startX;
        const dy = ev.clientY - dragState.current.startY;
        const next = clamp(dragState.current.startPosX + dx, dragState.current.startPosY + dy);
        setPos(next);
        savePos(next);
      }
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [pos, clamp, savePos]);

  // ── Touch drag ───────────────────────────────────────────────────────────
  const onTouchStart = useCallback((e) => {
    const t = e.touches[0];
    wasDraggedRef.current = false;
    dragState.current = {
      startX: t.clientX,
      startY: t.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
    };

    const onMove = (ev) => {
      ev.preventDefault();
      const touch = ev.touches[0];
      const dx = touch.clientX - dragState.current.startX;
      const dy = touch.clientY - dragState.current.startY;
      if (!wasDraggedRef.current && (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD)) {
        wasDraggedRef.current = true;
      }
      if (!wasDraggedRef.current) return;
      setPos(clamp(dragState.current.startPosX + dx, dragState.current.startPosY + dy));
    };

    const onEnd = (ev) => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
      if (wasDraggedRef.current) {
        const touch = ev.changedTouches[0];
        const dx = touch.clientX - dragState.current.startX;
        const dy = touch.clientY - dragState.current.startY;
        const next = clamp(dragState.current.startPosX + dx, dragState.current.startPosY + dy);
        setPos(next);
        savePos(next);
      }
    };

    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, [pos, clamp, savePos]);

  // ── Keyboard nudge ────────────────────────────────────────────────────────
  const onKeyDown = useCallback((e) => {
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft')  dx = -KEYBOARD_STEP;
    else if (e.key === 'ArrowRight') dx = KEYBOARD_STEP;
    else if (e.key === 'ArrowUp')    dy = -KEYBOARD_STEP;
    else if (e.key === 'ArrowDown')  dy = KEYBOARD_STEP;
    else return;
    e.preventDefault();
    setPos((prev) => {
      const next = clamp(prev.x + dx, prev.y + dy);
      savePos(next);
      return next;
    });
  }, [clamp, savePos]);

  return {
    pos,
    /** true durante el arrastre activo */
    isDragging: false, // kept for API compatibility; use wasDragged() for click guards
    /** Llama esto en onClick para saber si fue drag (en ese caso, ignorar el click) */
    wasDragged: () => wasDraggedRef.current,
    /** Ref para el elemento contenedor (necesario para clamping correcto) */
    elementRef,
    /** Props para poner en el elemento que actúa como drag handle */
    dragHandleProps: {
      onMouseDown,
      onTouchStart,
      onKeyDown,
      style: { cursor: 'grab', touchAction: 'none' },
    },
    /** Estilo para el div wrapper fijo */
    wrapperStyle: {
      position: 'fixed',
      left: pos.x,
      top: pos.y,
      zIndex: 9998,
      userSelect: 'none',
    },
  };
}
