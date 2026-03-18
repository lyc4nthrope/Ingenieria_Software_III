import { useEffect, useState } from 'react';

/**
 * Devuelve true cuando el ancho de la ventana es menor que `breakpoint` (px).
 * Se actualiza en tiempo real al redimensionar la ventana.
 */
export function useIsMobile(breakpoint = 700) {
  const [mobile, setMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [breakpoint]);
  return mobile;
}
