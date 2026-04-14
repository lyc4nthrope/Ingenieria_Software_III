/**
 * chatStyles.js
 *
 * Estilos para el ChatWidget.
 * Sigue el patrón de estilos inline del proyecto (como Button.jsx, Input.jsx).
 *
 * UBICACIÓN: src/features/chat/styles/chatStyles.js
 */

const styles = {
  // ─── Botón flotante ─────────────────────────────────────────────────────
  floatingButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: 'var(--bg-base)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    zIndex: 9998,
  },

  floatingButtonHover: {
    transform: 'scale(1.08)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.2)',
  },

  // ─── Panel del chat ─────────────────────────────────────────────────────
  panel: {
    width: '420px',
    maxWidth: 'calc(100vw - 16px)',
    height: '520px',
    maxHeight: 'calc(100vh - 120px)',
    background: 'var(--bg-surface)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 9999,
    border: '1px solid var(--border-soft)',
  },

  // ─── Header ─────────────────────────────────────────────────────────────
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'var(--accent)',
    color: 'var(--bg-base)',
    borderBottom: '1px solid var(--border-soft)',
    flexShrink: 0,
  },

  headerTitle: {
    fontSize: '15px',
    fontWeight: '700',
    margin: 0,
  },

  headerSubtitle: {
    fontSize: '11px',
    opacity: 0.85,
    margin: 0,
    fontWeight: '400',
  },

  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--bg-base)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s ease',
  },

  // ─── Área de mensajes ───────────────────────────────────────────────────
  messagesArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: 'var(--bg-base)',
  },

  // ─── Burbujas de mensaje ────────────────────────────────────────────────
  messageBubble: {
    maxWidth: '80%',
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '13.5px',
    lineHeight: '1.5',
    wordBreak: 'break-word',
  },

  userMessage: {
    alignSelf: 'flex-end',
    background: 'var(--accent)',
    color: 'var(--bg-base)',
    borderBottomRightRadius: '4px',
  },

  assistantMessage: {
    alignSelf: 'flex-start',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    borderBottomLeftRadius: '4px',
    border: '1px solid var(--border-soft)',
  },

  // ─── Estado vacío ───────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '24px',
    textAlign: 'center',
  },

  emptyIcon: {
    fontSize: '40px',
    opacity: 0.5,
  },

  emptyTitle: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },

  emptySubtitle: {
    fontSize: '12.5px',
    color: 'var(--text-secondary)',
    margin: 0,
  },

  // ─── Error ──────────────────────────────────────────────────────────────
  errorBanner: {
    margin: '0 16px 8px',
    padding: '8px 12px',
    background: 'var(--error-soft)',
    color: 'var(--error)',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  // ─── Input area ─────────────────────────────────────────────────────────
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid var(--border-soft)',
    background: 'var(--bg-surface)',
    flexShrink: 0,
  },

  input: {
    flex: 1,
    height: '40px',
    padding: '0 14px',
    fontSize: '13.5px',
    color: 'var(--text-primary)',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
  },

  inputFocus: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 3px var(--accent-glow)',
  },

  sendBtn: {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    background: 'var(--accent)',
    color: 'var(--bg-base)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.18s ease',
    flexShrink: 0,
  },

  sendBtnDisabled: {
    opacity: '0.45',
    cursor: 'not-allowed',
  },

  // ─── Loading indicator ──────────────────────────────────────────────────
  loadingDots: {
    display: 'flex',
    gap: '4px',
    padding: '10px 14px',
    alignSelf: 'flex-start',
  },

  loadingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--text-secondary)',
    animation: 'chatPulse 1.4s ease-in-out infinite',
  },
};

export default styles;
