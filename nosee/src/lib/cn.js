import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina clases de Tailwind resolviendo conflictos.
 * Usa clsx para condicionales y twMerge para que la última clase gane.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-accent text-white', className)
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
