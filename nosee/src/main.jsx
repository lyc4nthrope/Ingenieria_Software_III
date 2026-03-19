import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initAnalytics } from './services/analytics.js'

// Inicializar Google Analytics 4 al arrancar la app
initAnalytics()

window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (import.meta.env.PROD) {
      // Producción: registrar SW para cache-first en assets y offline fallback
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW no disponible (navegador restringido) — funciona sin caché offline
      });
    } else {
      // Desarrollo: limpiar SWs y caché para evitar problemas de caché obsoleta
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((r) => r.unregister());
      });
      if ('caches' in window) {
        caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
      }
    }
  });
}
