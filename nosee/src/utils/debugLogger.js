const DEBUG_FLAG_KEY = "nosee:debug:publications";

const canUseBrowserApis = () => typeof window !== "undefined";

export const isPublicationsDebugEnabled = () => {
  if (!canUseBrowserApis()) return false;

  const fromWindow = Boolean(window.__NOSEE_DEBUG_PUBLICATIONS__);
  const fromStorage = window.localStorage?.getItem(DEBUG_FLAG_KEY) === "1";

  return fromWindow || fromStorage;
};

/**
 * Factory que crea un logger con namespace.
 * Solo emite en DEV o cuando el flag de debug está activo.
 *
 * @param {string} namespace - Nombre del módulo (ej. 'publications', 'ranking')
 * @returns {Function} Logger taggeado con el namespace
 */
export const createDebugger = (namespace) => (...args) => {
  const devMode = typeof import.meta !== "undefined" && import.meta.env?.DEV;
  const debugEnabled = canUseBrowserApis()
    ? Boolean(window.__NOSEE_DEBUG_PUBLICATIONS__) ||
      window.localStorage?.getItem(DEBUG_FLAG_KEY) === "1"
    : false;

  if (!devMode && !debugEnabled) return;
  console.debug(`[NØSEE:${namespace}]`, ...args);
};

export const debugPublications = createDebugger("publications");

export const PUBLICATIONS_DEBUG_FLAG_KEY = DEBUG_FLAG_KEY;
