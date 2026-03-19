/**
 * bi — Genera un mensaje bilingüe (español + inglés) separado por salto de línea.
 * Para mostrarlo correctamente se necesita `white-space: pre-line` en el contenedor.
 *
 * @param {string} es - Texto en español
 * @param {string} en - Texto en inglés
 * @returns {string}
 */
export const bi = (es, en) => `${es}\n${en}`;
