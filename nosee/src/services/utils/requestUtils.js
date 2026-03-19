import { supabase } from "@/services/supabase.client";

export const REQUEST_TIMEOUT_MS = 12000;
export const BACKGROUND_REQUEST_TIMEOUT_MS = 20000;
export const EXTENDED_RETRY_TIMEOUT_MS = 30000;
export const HYDRATION_TIMEOUT_MS = 3500;
export const FOREGROUND_GRACE_PERIOD_MS = 4000;

export const canUseBrowserApis = () =>
  typeof window !== "undefined" && typeof document !== "undefined";

export const getRuntimeNetworkState = () => {
  if (!canUseBrowserApis()) {
    return { visibilityState: "server", online: null };
  }

  return {
    visibilityState: document.visibilityState,
    online: typeof navigator !== "undefined" ? navigator.onLine : null,
  };
};

export const getAdaptiveRequestTimeout = () => {
  if (!canUseBrowserApis()) return REQUEST_TIMEOUT_MS;

  const isHidden = document.visibilityState === "hidden";
  const resumedRecently = Number(window.__NOSEE_LAST_TAB_VISIBLE_AT__ || 0);
  const elapsedSinceResume = Date.now() - resumedRecently;
  const isInResumeGracePeriod = elapsedSinceResume >= 0 && elapsedSinceResume < FOREGROUND_GRACE_PERIOD_MS;

  return isHidden || isInResumeGracePeriod ? BACKGROUND_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
};

export const withTimeout = async (promise, timeoutMs = REQUEST_TIMEOUT_MS, timeoutMessage = "Tiempo de espera agotado") => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
};

export const isTimeoutMessage = (message = "") => {
  const normalizedMessage = String(message || "").toLowerCase();
  return normalizedMessage.includes("tardó demasiado") || normalizedMessage.includes("tiempo de espera agotado");
};

export const isAuthSessionError = (error) => {
  const msg = String(error?.message || error || "").toLowerCase();
  return (
    msg.includes("jwt") ||
    msg.includes("token") ||
    msg.includes("session") ||
    msg.includes("refresh") ||
    msg.includes("expired") ||
    msg.includes("invalid claim")
  );
};

export const runWithSessionRetry = async (operation, timeoutMs = getAdaptiveRequestTimeout()) => {
  const firstAttempt = await withTimeout(
    operation(),
    timeoutMs,
    "La sesión tardó demasiado en responder",
  );

  if (!firstAttempt?.error || !isAuthSessionError(firstAttempt.error)) {
    return firstAttempt;
  }

  const { data: refreshData, error: refreshError } = await withTimeout(
    supabase.auth.refreshSession(),
    timeoutMs,
    "No se pudo refrescar la sesión a tiempo",
  );
  if (refreshError || !refreshData?.session) {
    return firstAttempt;
  }

  return withTimeout(
    operation(),
    timeoutMs,
    "La sesión no se recuperó a tiempo",
  );
};
