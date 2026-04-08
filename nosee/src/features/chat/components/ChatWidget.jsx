/**
 * ChatWidget.jsx
 *
 * Componente flotante de chat con IA para usuarios logueados.
 * Integra con el webhook de n8n para procesar mensajes con OpenRouter.
 *
 * UBICACIÓN: src/features/chat/components/ChatWidget.jsx
 */

import { useState, useRef, useEffect } from 'react';
import useChat from '@/features/chat/hooks/useChat';
import styles from '@/features/chat/styles/chatStyles';
import { ChatIcon, CloseIcon, SendIcon } from './chatIcons';

// ─── Componente ─────────────────────────────────────────────────────────────

export default function ChatWidget({ userId }) {
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);

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
      setTimeout(() => {
        if (buttonRef.current) {
          buttonRef.current.focus();
        }
      }, 0);
    }
  };

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

  // ─── Botón flotante ─────────────────────────────────────────────────────
  if (!isOpen) {
    return (
      <button
        ref={buttonRef}
        type="button"
        aria-label="Abrir chat de asistencia"
        onClick={openChat}
        className="chat-widget-button"
        style={styles.floatingButton}
      >
        <ChatIcon />
      </button>
    );
  }

  // ─── Panel del chat ─────────────────────────────────────────────────────
  return (
    <div
      className="chat-widget-panel"
      style={styles.panel}
      data-chat-panel
      role="dialog"
      aria-label="Chat de asistencia"
    >
      {/* Header */}
      <div style={styles.header} role="banner" aria-label="Cabecera del chat">
        <div>
          <h3 style={styles.headerTitle} aria-level="2">Asistente Nosee</h3>
          <p style={styles.headerSubtitle}>Consultá sobre productos y precios</p>
        </div>
        <button
          type="button"
          aria-label="Cerrar chat"
          onClick={closeChat}
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
  );
}
