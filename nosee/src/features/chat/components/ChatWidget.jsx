/**
 * ChatWidget.jsx
 *
 * Componente flotante de chat con IA para usuarios logueados.
 * Integra con el webhook de n8n para procesar mensajes con OpenRouter.
 *
 * UBICACIÓN: src/features/chat/components/ChatWidget.jsx
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useChat from '@/features/chat/hooks/useChat';
import styles from '@/features/chat/styles/chatStyles';
import useDraggable from '@/hooks/useDraggable';
import { ChatIcon, CloseIcon, SendIcon } from './chatIcons';

// ─── Componente ─────────────────────────────────────────────────────────────

export default function ChatWidget({ userId, isAuthenticated }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [btnHover, setBtnHover] = useState(false);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);

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
    if (e.key === 'Escape' && isOpen) {
      closeChat();
      setTimeout(() => { buttonRef.current?.focus(); }, 0);
    }
  };

  // Focus trap mientras el panel está abierto
  useEffect(() => {
    if (!isOpen) return;
    const handleFocusTrap = (e) => {
      if (e.key !== 'Tab') return;
      const panel = document.querySelector('[data-chat-panel]');
      if (!panel) return;
      const focusable = panel.querySelectorAll('button, input, [tabindex]:not([tabindex="-1"])');
      if (focusable.length === 0) return;
      e.preventDefault();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (document.activeElement === last || !panel.contains(document.activeElement)) {
        first.focus();
      } else {
        last.focus();
      }
    };
    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, [isOpen]);

  // ─── Dirección del panel según posición del widget ───────────────────────
  const panelGoesUp = pos.y > window.innerHeight / 2;
  const panelGoesLeft = pos.x > window.innerWidth / 2;
  const availableH = panelGoesUp
    ? pos.y - 18
    : window.innerHeight - pos.y - 40 - 18;

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
        style={{ ...wrapperStyle, zIndex: 9999, width: 40, height: 40 }}
        aria-label="Widget de chat (arrastrable)"
      >
        {/* Botón flotante */}
        {!isOpen && (
          <button
            ref={buttonRef}
            {...dragHandleProps}
            type="button"
            aria-label="Abrir chat de asistencia — arrastrá para mover"
            aria-grabbed={false}
            onClick={() => {
              if (wasDragged()) return;
              if (!isAuthenticated) {
                navigate('/login', { state: { from: location.pathname } });
                return;
              }
              openChat();
            }}
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
            data-chat-panel
            role="dialog"
            aria-label="Chat de asistencia"
            style={{
              ...styles.panel,
              position: 'absolute',
              bottom: panelGoesUp ? 'calc(100% + 10px)' : 'auto',
              top: panelGoesUp ? 'auto' : 'calc(100% + 10px)',
              left: panelGoesLeft ? 'auto' : 0,
              right: panelGoesLeft ? 0 : 'auto',
              maxHeight: Math.max(200, availableH),
              zIndex: 9998,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header — drag handle cuando el panel está abierto */}
            <div
              {...dragHandleProps}
              style={{ ...styles.header, cursor: 'grab', touchAction: 'none' }}
              role="banner"
              aria-label="Arrastrá para mover el chat"
              title="Arrastrá para mover"
            >
              <div>
                <h3 style={styles.headerTitle} aria-level="2">Asistente Nosee</h3>
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
            <div
              style={styles.messagesArea}
              role="log"
              aria-live="polite"
              aria-label="Historial de mensajes"
            >
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
                    role="article"
                    aria-label={`Mensaje de ${msg.role}`}
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
              <label htmlFor="chat-input" style={styles.srOnly}>
                Escribí tu mensaje
              </label>
              <input
                ref={inputRef}
                id="chat-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="Escribí tu mensaje..."
                disabled={isLoading}
                aria-describedby="chat-input-desc"
                style={{
                  ...styles.input,
                  ...(inputFocused ? styles.inputFocus : {}),
                }}
              />
              <span id="chat-input-desc" style={styles.srOnly}>
                Presioná Enter para enviar tu mensaje
              </span>
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
