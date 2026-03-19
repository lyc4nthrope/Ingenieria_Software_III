import { useState } from 'react';
import { OPTIM_PREFS_KEY, DEFAULT_PREFS } from '../utils/shoppingListUtils';

export function useOptimPrefs() {
  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = localStorage.getItem(OPTIM_PREFS_KEY);
      return stored ? { ...DEFAULT_PREFS, ...JSON.parse(stored) } : { ...DEFAULT_PREFS };
    } catch { return { ...DEFAULT_PREFS }; }
  });

  const savePrefs = (updated) => {
    const next = { ...prefs, ...updated };
    setPrefs(next);
    try { localStorage.setItem(OPTIM_PREFS_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  return [prefs, savePrefs];
}
