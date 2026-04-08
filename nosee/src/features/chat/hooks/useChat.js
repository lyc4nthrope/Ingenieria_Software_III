/**
 * useChat.js
 *
 * Hook personalizado para manejar el estado y la lógica del chat.
 *
 * RESPONSABILIDADES:
 * - Mantener la lista de mensajes de la conversación actual
 * - Enviar mensajes al webhook de n8n
 * - Manejar estados: loading, error, vacío
 * - Generar y persistir el sessionId
 *
 * UBICACIÓN: src/features/chat/hooks/useChat.js
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { sendChatMessage } from '@/services/api/chat.api';

/**
 * Genera un UUID v4 simple para el sessionId.
 * @returns {string}
 */
function generateSessionId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const STORAGE_KEY = 'nosee-chat-session-id';

/**
 * @param {Object} params
 * @param {string} params.userId - ID del usuario logueado
 */
export default function useChat({ userId }) {
  const [messages, setMessages] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return stored;
    } catch (_) {
      // localStorage no disponible
    }
    return generateSessionId();
  });

  const messagesEndRef = useRef(null);

  // Persistir sessionId
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, sessionId);
    } catch (_) {
      // noop
    }
  }, [sessionId]);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      // Agregar mensaje del usuario
      const userMsg = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setError(null);

      const result = await sendChatMessage({
        message: trimmed,
        sessionId,
        userId,
      });

      setIsLoading(false);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Agregar respuesta del asistente
      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    },
    [sessionId, userId, isLoading]
  );

  const closeChat = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(generateSessionId());
    setError(null);
  }, []);

  return {
    messages,
    isOpen,
    isLoading,
    error,
    sessionId,
    messagesEndRef,
    sendMessage,
    openChat,
    closeChat,
    clearMessages,
    setError,
  };
}
