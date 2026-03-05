/**
 * CelebrationOverlay.jsx
 * Muestra una animación de celebración con mensaje de reputación.
 * Se auto-cierra después de 3 segundos.
 * Respeta a11y-pause-animations: sin animación si está activo.
 */
import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const STYLE = `
@keyframes celebrationBounce {
  0%   { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
  60%  { transform: translate(-50%, -50%) scale(1.15); opacity: 1; }
  80%  { transform: translate(-50%, -50%) scale(0.95); }
  100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
}
@keyframes celebrationFadeOut {
  0%   { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes confettiFall {
  0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(80px) rotate(360deg); opacity: 0; }
}
`;

const CONFETTI_COLORS = ["#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6"];
const CONFETTI_COUNT = 12;

export default function CelebrationOverlay({ visible, message, onDone }) {
  const { t } = useLanguage();
  const timerRef = useRef(null);
  const pauseAnimations = document.documentElement.classList.contains("a11y-pause-animations");

  useEffect(() => {
    if (!visible) return;
    const delay = pauseAnimations ? 1500 : 3000;
    timerRef.current = setTimeout(() => {
      onDone?.();
    }, delay);
    return () => clearTimeout(timerRef.current);
  }, [visible, pauseAnimations, onDone]);

  if (!visible) return null;

  return (
    <>
      <style>{STYLE}</style>
      {/* Backdrop */}
      <div
        role="alertdialog"
        aria-live="assertive"
        aria-label={t.celebration?.congrats || "¡Felicitaciones!"}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0,0,0,0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => onDone?.()}
      >
        {/* Card */}
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            background: "var(--surface, #1e1e2e)",
            border: "2px solid var(--accent, #7c3aed)",
            borderRadius: "20px",
            padding: "36px 48px",
            textAlign: "center",
            maxWidth: "340px",
            width: "90vw",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            animation: pauseAnimations
              ? "none"
              : "celebrationBounce 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: "56px", lineHeight: 1, marginBottom: "12px" }}>
            🏆
          </div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "800",
              color: "var(--accent, #7c3aed)",
              margin: "0 0 8px",
              fontFamily: "inherit",
            }}
          >
            {t.celebration?.congrats || "¡Felicitaciones!"}
          </h2>
          <p
            style={{
              fontSize: "15px",
              color: "var(--text-primary, #e2e8f0)",
              margin: "0 0 20px",
              lineHeight: 1.5,
            }}
          >
            {message}
          </p>
          <button
            onClick={() => onDone?.()}
            style={{
              padding: "8px 24px",
              background: "var(--accent, #7c3aed)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t.celebration?.close || "Cerrar"}
          </button>
        </div>

        {/* Confetti */}
        {!pauseAnimations &&
          Array.from({ length: CONFETTI_COUNT }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                position: "fixed",
                top: `${30 + Math.random() * 20}%`,
                left: `${10 + (i / CONFETTI_COUNT) * 80}%`,
                width: "10px",
                height: "10px",
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                animation: `confettiFall ${0.8 + Math.random() * 1.2}s ease-in ${Math.random() * 0.5}s forwards`,
                pointerEvents: "none",
              }}
            />
          ))}
      </div>
    </>
  );
}
