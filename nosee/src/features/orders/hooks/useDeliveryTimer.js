import { useState, useEffect } from 'react';

/**
 * Hook para el timer de espera del Caso D (cliente ausente).
 * Cuenta regresiva desde que el repartidor marcó "llegando".
 *
 * @param {string|null} startTimestamp - ISO timestamp de cuando empezó el timer
 * @param {number}      timeoutMs      - duración del timer en ms (default: 10 min)
 * @returns {{ timeLeft: number, isExpired: boolean, formattedTime: string }}
 */
export function useDeliveryTimer(startTimestamp, timeoutMs = 600_000) {
  const [timeLeft, setTimeLeft] = useState(() => calcRemaining(startTimestamp, timeoutMs));

  useEffect(() => {
    if (!startTimestamp) {
      setTimeLeft(timeoutMs);
      return;
    }

    // Calcular inmediatamente para evitar el primer tick de delay
    setTimeLeft(calcRemaining(startTimestamp, timeoutMs));

    const id = setInterval(() => {
      const remaining = calcRemaining(startTimestamp, timeoutMs);
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [startTimestamp, timeoutMs]);

  const minutes = Math.floor(timeLeft / 60_000);
  const seconds = Math.floor((timeLeft % 60_000) / 1000);

  return {
    timeLeft,
    isExpired: timeLeft === 0,
    formattedTime: `${minutes}:${String(seconds).padStart(2, '0')}`,
  };
}

function calcRemaining(start, timeout) {
  if (!start) return timeout;
  return Math.max(0, timeout - (Date.now() - new Date(start).getTime()));
}
