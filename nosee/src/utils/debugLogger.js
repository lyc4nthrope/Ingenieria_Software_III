const DEBUG_FLAG_KEY = "nosee:debug:publications";

const canUseBrowserApis = () => typeof window !== "undefined";

export const isPublicationsDebugEnabled = () => {
  if (!canUseBrowserApis()) return false;

  const fromWindow = Boolean(window.__NOSEE_DEBUG_PUBLICATIONS__);
  const fromStorage = window.localStorage?.getItem(DEBUG_FLAG_KEY) === "1";

  return fromWindow || fromStorage;
};

export const debugPublications = (...args) => {
  if (!isPublicationsDebugEnabled()) return;
  console.info("[NØSEE:publications]", ...args);
};

export const PUBLICATIONS_DEBUG_FLAG_KEY = DEBUG_FLAG_KEY;
