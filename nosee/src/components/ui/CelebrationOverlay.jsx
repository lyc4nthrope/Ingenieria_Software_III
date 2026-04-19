/**
 * CelebrationOverlay.jsx
 * Toast de celebración en esquina superior derecha.
 * Se auto-cierra después de 3 segundos.
 * Respeta a11y-pause-animations y el tema día/noche.
 */
import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const STYLE = `
@keyframes celebrationSlideIn {
  0%   { transform: translateX(calc(100% + 24px)); opacity: 0; }
  60%  { transform: translateX(-6px); opacity: 1; }
  100% { transform: translateX(0); opacity: 1; }
}
@keyframes celebrationSlideOut {
  0%   { transform: translateX(0); opacity: 1; }
  100% { transform: translateX(calc(100% + 24px)); opacity: 0; }
}
`;

export default function CelebrationOverlay({ visible, message, onDone }) {
  const { t } = useLanguage();
  const timerRef = useRef(null);
  const pauseAnimations = document.documentElement.classList.contains("a11y-pause-animations");

  useEffect(() => {
    if (!visible) return;
    const delay = pauseAnimations ? 1000 : 2000;
    timerRef.current = setTimeout(() => {
      onDone?.();
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [visible, pauseAnimations, onDone]);

  if (!visible) return null;

  return (
    <>
      <style>{STYLE}</style>
      <div
        role="status"
        aria-live="polite"
        aria-label={t.celebration?.congrats || "¡Felicitaciones!"}
        style={{
          position: "fixed",
          top: "16px",
          right: "16px",
          zIndex: 9999,
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          maxWidth: "300px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          animation: pauseAnimations
            ? "none"
            : "celebrationSlideIn 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards",
          cursor: "pointer",
        }}
        onClick={() => onDone?.()}
        onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') onDone?.(); }}
        tabIndex={0}
      >
        <span style={{ fontSize: "28px", lineHeight: 1, flexShrink: 0 }}>🏆</span>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: "700",
              color: "var(--accent)",
              lineHeight: 1.2,
              marginBottom: "2px",
            }}
          >
            {t.celebration?.congrats || "¡Felicitaciones!"}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              color: "var(--text-secondary)",
              lineHeight: 1.4,
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {message}
          </p>
        </div>
        <button
          aria-label="Cerrar"
          onClick={(e) => { e.stopPropagation(); onDone?.(); }}
          style={{
            flexShrink: 0,
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            padding: "2px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "4px",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </>
  );
}
