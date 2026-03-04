/**
 * dateUtils.js - Funciones de utilidad para manejo de fechas
 *
 * Proporciona funciones básicas de fecha sin dependencias externas
 */

/**
 * Retorna una descripción de tiempo relativo usando las traducciones del contexto de idioma.
 *
 * @param {Date|string} date - La fecha a comparar
 * @param {Object} tTimeAgo - Objeto de traducciones t.timeAgo del LanguageContext
 * @returns {string} Descripción del tiempo relativo
 */
export function formatDistanceToNow(date, tTimeAgo) {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return tTimeAgo.justNow;
  if (diffMinutes < 60) return tTimeAgo.minutes(diffMinutes);
  if (diffHours < 24) return tTimeAgo.hours(diffHours);
  if (diffDays < 7) return tTimeAgo.days(diffDays);
  if (diffWeeks < 4) return tTimeAgo.weeks(diffWeeks);
  if (diffMonths < 12) return tTimeAgo.months(diffMonths);
  return tTimeAgo.years(diffYears);
}

/**
 * @deprecated Usa formatDistanceToNow(date, t.timeAgo) con el contexto de idioma.
 */
export function formatDistanceToNowInSpanish(date) {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSeconds < 60) return 'hace unos segundos';
  if (diffMinutes < 60) return `hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}`;
  if (diffHours < 24) return `hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}`;
  if (diffDays < 7) return `hace ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
  if (diffWeeks < 4) return `hace ${diffWeeks} semana${diffWeeks !== 1 ? 's' : ''}`;
  if (diffMonths < 12) return `hace ${diffMonths} mes${diffMonths !== 1 ? 'es' : ''}`;
  return `hace ${diffYears} año${diffYears !== 1 ? 's' : ''}`;
}

/**
 * Formatea una fecha a formato legible
 * Ejemplo: "26 Feb 2024"
 *
 * @param {Date} date - La fecha a formatear
 * @returns {string} Fecha formateada
 */
export function formatDate(date) {
  const d = new Date(date);
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
