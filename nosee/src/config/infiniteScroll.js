const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const INFINITE_SCROLL_CONFIG = {
  triggerDistancePx: parsePositiveInt(
    import.meta.env.VITE_INFINITE_SCROLL_TRIGGER_DISTANCE_PX,
    260,
  ),
  cooldownMs: parsePositiveInt(
    import.meta.env.VITE_INFINITE_SCROLL_COOLDOWN_MS,
    500,
  ),
  homePageSize: parsePositiveInt(
    import.meta.env.VITE_HOME_PUBLICATIONS_PAGE_SIZE,
    12,
  ),
  publicationsPageSize: parsePositiveInt(
    import.meta.env.VITE_PUBLICATIONS_PAGE_SIZE,
    20,
  ),
  storesPageSize: parsePositiveInt(
    import.meta.env.VITE_STORES_PAGE_SIZE,
    20,
  ),
};

