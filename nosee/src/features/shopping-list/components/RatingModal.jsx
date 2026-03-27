/**
 * RatingModal.jsx
 *
 * Modal de calificación del repartidor. Se muestra automáticamente en PedidosTab
 * cuando el pedido llega a estado "entregado" y el usuario aún no ha calificado.
 *
 * Props:
 *   dealerId  — UUID del repartidor a calificar
 *   orderId   — id INTEGER del pedido (supabaseId)
 *   onDone    — callback al cerrar o enviar la calificación
 */

import { useState } from 'react';
import { submitRating } from '@/services/api/dealerRatings.api';

const STARS = [1, 2, 3, 4, 5];

export function RatingModal({ dealerId, orderId, onDone }) {
  const [stars,     setStars]     = useState(0);
  const [hover,     setHover]     = useState(0);
  const [comment,   setComment]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (stars === 0) { setError('Seleccioná al menos una estrella.'); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await submitRating({
      orderId:  Number(orderId),
      dealerId,
      stars,
      comment: comment.trim() || null,
    });
    setLoading(false);
    if (err) {
      setError('No se pudo guardar la calificación. Intentá de nuevo.');
      return;
    }
    setSubmitted(true);
    setTimeout(() => onDone?.(), 1800);
  };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {submitted ? (
          <div style={s.successBox}>
            <span style={{ fontSize: 40 }}>⭐</span>
            <p style={s.successTitle}>¡Gracias por calificar!</p>
            <p style={s.successSub}>Tu opinión ayuda a mejorar el servicio.</p>
          </div>
        ) : (
          <>
            <div style={s.header}>
              <span style={{ fontSize: 28 }}>🛵</span>
              <div>
                <p style={s.title}>¿Cómo estuvo el servicio?</p>
                <p style={s.sub}>Calificá al repartidor que te entregó el pedido</p>
              </div>
            </div>

            {/* Estrellas */}
            <div style={s.starsRow}>
              {STARS.map((n) => (
                <button
                  key={n}
                  type="button"
                  style={{ ...s.star, color: n <= (hover || stars) ? '#f59e0b' : 'var(--border)' }}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setStars(n)}
                >
                  ★
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p style={s.starLabel}>
                {['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'][stars]}
              </p>
            )}

            {/* Comentario opcional */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="¿Algún comentario? (opcional)"
              style={s.textarea}
            />

            {error && <p style={s.error}>{error}</p>}

            <div style={s.actions}>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{ ...s.submitBtn, ...(loading ? s.submitBtnDisabled : {}) }}
              >
                {loading ? 'Enviando...' : '⭐ Enviar calificación'}
              </button>
              <button type="button" onClick={() => onDone?.()} style={s.skipBtn}>
                Omitir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1100, padding: '16px',
  },
  modal: {
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-xl)',
    padding: '28px 24px',
    width: '100%', maxWidth: '380px',
    display: 'flex', flexDirection: 'column', gap: '16px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  },
  header: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  title: { margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' },
  sub: { margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' },
  starsRow: { display: 'flex', gap: '4px', justifyContent: 'center' },
  star: {
    fontSize: '42px', background: 'none', border: 'none',
    cursor: 'pointer', lineHeight: 1, padding: '0 2px',
    transition: 'color 0.1s',
  },
  starLabel: {
    margin: 0, textAlign: 'center',
    fontSize: '13px', fontWeight: 700, color: '#f59e0b',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box',
    padding: '10px 12px', minHeight: '72px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-primary)',
    fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none',
  },
  error: {
    margin: 0, padding: '8px 12px',
    background: 'var(--error-soft, #fee2e2)',
    border: '1px solid var(--error, #dc2626)',
    borderRadius: 6, fontSize: '12px', color: 'var(--error, #dc2626)',
  },
  actions: { display: 'flex', flexDirection: 'column', gap: '8px' },
  submitBtn: {
    padding: '12px', borderRadius: 'var(--radius-md)',
    border: 'none', background: '#f59e0b', color: '#fff',
    fontSize: '14px', fontWeight: 800, cursor: 'pointer', width: '100%',
  },
  submitBtnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  skipBtn: {
    padding: '8px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--text-muted)', fontSize: '13px', cursor: 'pointer',
    width: '100%',
  },
  successBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '10px', padding: '16px 0', textAlign: 'center',
  },
  successTitle: { margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' },
  successSub: { margin: 0, fontSize: '13px', color: 'var(--text-secondary)' },
};
