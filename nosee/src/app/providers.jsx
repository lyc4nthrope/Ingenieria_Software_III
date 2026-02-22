/**
 * Providers Component
 * 
 * Centraliza todos los Context y Providers globales de la aplicación
 * Envuelve la app con providers de autenticación, estado global, etc.
 */

import React from 'react';

/**
 * Componente raíz que proporciona todos los providers necesarios
 * 
 * @param {Object} props - Props del componente
 * @param {React.ReactNode} props.children - Componentes hijos a envolver
 * @returns {JSX.Element} Providers envolviendo los hijos
 */
export const Providers = ({ children }) => {
  return (
    <>
      {/* Aquí irán los providers globales */}
      {/* Ejemplo: <AuthProvider>, <ThemeProvider>, <QueryClientProvider>, etc. */}
      {children}
    </>
  );
};

export default Providers;
