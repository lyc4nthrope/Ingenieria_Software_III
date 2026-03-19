import { createContext, useContext, useEffect, useState } from "react";
import { TRANSLATIONS } from "@/locales";

const LANG_KEY = "nosee-accessibility-lang";

const SUPPORTED_LANGS = ["es-MX", "en-US"];

function readStoredLang() {
  try {
    const raw = window.localStorage.getItem(LANG_KEY);
    return raw && SUPPORTED_LANGS.includes(raw) ? raw : "es-MX";
  } catch {
    return "es-MX";
  }
}

// ── Helper para traducir valores de BD ────────────────────────────────────────
// Uso: translateDbValue(t, "categories", categoria.name)
// Devuelve la traducción si existe, o el valor original como fallback.
export function translateDbValue(t, namespace, value) {
  return t?.dbValues?.[namespace]?.[value] ?? value;
}

// ── Contexto ──────────────────────────────────────────────────────────────────
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => readStoredLang());

  const setLang = (code) => {
    if (!SUPPORTED_LANGS.includes(code)) return;
    setLangState(code);
  };

  // Persist and apply lang to DOM
  useEffect(() => {
    try {
      window.localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore
    }
    document.documentElement.lang = lang;
  }, [lang]);

  const t = TRANSLATIONS[lang];

  /**
   * tbi — Devuelve la versión bilingüe (ES + EN) de cualquier string de traducción.
   * @param {function} getFn - Función que recibe el objeto de traducciones y devuelve el string.
   * @returns {string} "Mensaje ES\nMessage EN"
   * @example tbi(tr => tr.publications.errorDetail)
   */
  const tbi = (getFn) => {
    const es = getFn(TRANSLATIONS['es-MX']) ?? '';
    const en = getFn(TRANSLATIONS['en-US']) ?? '';
    return es === en ? es : `${es}\n${en}`;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tbi }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}

export const LANG_OPTIONS = [
  { code: "es-MX", label: "🇨🇴 Español (Colombia)" },
  { code: "en-US", label: "🇺🇸 English (USA)" },
];

// Re-exportar TRANSLATIONS para compatibilidad con código que lo importa directamente
export { TRANSLATIONS };
