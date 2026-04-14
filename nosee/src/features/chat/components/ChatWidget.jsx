/**
 * ChatWidget.jsx
 *
 * Componente flotante de chat con IA para usuarios logueados.
 * Integra con el webhook de n8n para procesar mensajes con OpenRouter.
 *
 * UBICACIÓN: src/features/chat/components/ChatWidget.jsx
 */

import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import useChat from '@/features/chat/hooks/useChat';
import styles from '@/features/chat/styles/chatStyles';
import useDraggable from '@/hooks/useDraggable';

// ─── Íconos SVG inline ──────────────────────────────────────────────────────

const ChatIcon = () => (
  <svg
    aria-hidden="true"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ─── Componente ─────────────────────────────────────────────────────────────

export default function ChatWidget({ userId }) {
  const { t } = useLanguage();
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const inputRef = useRef(null);

  const { pos, wasDragged, elementRef, dragHandleProps, wrapperStyle } = useDraggable({
    storageKey: 'nosee-chat-widget-pos',
    defaultPos: (w, h) => ({ x: 24, y: h - 12 - 40 }),
  });

  const {
    messages,
    isOpen,
    isLoading,
    error,
    messagesEndRef,
    sendMessage,
    openChat,
    closeChat,
  } = useChat({ userId });

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;
    sendMessage(trimmed);
    setInputValue('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Dirección del panel (igual que AccessibilityMenu) ──────────────────
  const panelGoesUp = pos.y > window.innerHeight / 2;
  const panelGoesLeft = pos.x > window.innerWidth / 2;

  // ─── Wrapper arrastrable ─────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop — cierra el panel al hacer clic afuera */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={closeChat}
          style={{ position: 'fixed', inset: 0, zIndex: 9996 }}
        />
      )}

      <div
        ref={elementRef}
        style={{ ...wrapperStyle, zIndex: 9999 }}
        aria-label="Widget de chat (arrastrable)"
      >
        {/* Botón flotante */}
        {!isOpen && (
          <button
            {...dragHandleProps}
            type="button"
            aria-label="Abrir chat de asistencia — arrastrá para mover"
            aria-grabbed={false}
            onClick={() => { if (!wasDragged()) openChat(); }}
            onMouseEnter={() => setBtnHover(true)}
            onMouseLeave={() => setBtnHover(false)}
            className="chat-widget-button"
            style={{
              ...styles.floatingButton,
              ...(btnHover ? styles.floatingButtonHover : {}),
              touchAction: 'none',
            }}
          >
            <ChatIcon />
          </button>
        )}

      {/* Panel del chat */}
      {isOpen && (
    <div
      className="chat-widget-panel"
      style={{
        ...styles.panel,
        position: 'absolute',
        bottom: panelGoesUp ? 'calc(100% + 10px)' : 'auto',
        top: panelGoesUp ? 'auto' : 'calc(100% + 10px)',
        left: panelGoesLeft ? 'auto' : 0,
        right: panelGoesLeft ? 0 : 'auto',
        zIndex: 9998,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header — drag handle cuando el panel está abierto */}
      <div
        {...dragHandleProps}
        style={{ ...styles.header, cursor: 'grab', touchAction: 'none' }}
        aria-label="Arrastrá para mover el chat"
        title="Arrastrá para mover"
      >
        <div>
          <h3 style={styles.headerTitle}>Asistente Nosee</h3>
          <p style={styles.headerSubtitle}>Consultá sobre productos y precios</p>
        </div>
        <button
          type="button"
          aria-label="Cerrar chat"
          onClick={closeChat}
          onMouseDown={(e) => e.stopPropagation()}
          style={styles.closeBtn}
        >
          <CloseIcon />
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner} role="alert">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Messages area */}
      <div style={styles.messagesArea}>
        {messages.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon} aria-hidden="true">💬</span>
            <h4 style={styles.emptyTitle}>¡Hola! ¿En qué te ayudo?</h4>
            <p style={styles.emptySubtitle}>
              Podés consultarme sobre productos, precios y ofertas.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageBubble,
                ...(msg.role === 'user' ? styles.userMessage : styles.assistantMessage),
              }}
            >
              {msg.content}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div style={styles.loadingDots} aria-label="Cargando respuesta">
            <span style={{ ...styles.loadingDot, animationDelay: '0s' }} />
            <span style={{ ...styles.loadingDot, animationDelay: '0.2s' }} />
            <span style={{ ...styles.loadingDot, animationDelay: '0.4s' }} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={styles.inputArea}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="Escribí tu mensaje..."
          disabled={isLoading}
          style={{
            ...styles.input,
            ...(inputFocused ? styles.inputFocus : {}),
          }}
        />
        <button
          type="button"
          aria-label="Enviar mensaje"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading}
          style={{
            ...styles.sendBtn,
            ...(!inputValue.trim() || isLoading ? styles.sendBtnDisabled : {}),
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
      )}
      </div>
    </>
  );
}
