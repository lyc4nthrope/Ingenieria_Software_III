import { useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "nosee-accessibility-settings";
const LANG_KEY = "nosee-accessibility-lang";
const FONT_STEP = 0.1;
const MIN_FONT_SCALE = 0.9;
const MAX_FONT_SCALE = 1.6;

const defaultSettings = {
  fontScale: 1,
  highContrast: false,
  smartContrast: false,
  pauseAnimations: false,
  highlightLinks: false,
  readableFont: false,
  hideImages: false,
  textSpacing: false,
  biggerCursor: false,
  lineHeightBoost: false,
  textAlignLeft: false,
  pageStructure: false,
};

// ── Traducciones ─────────────────────────────────────────────────────────────
const STRINGS = {
  "es-MX": {
    speechLang: "es-MX",
    triggerTitle: "Abrir menú de accesibilidad (Ctrl+U)",
    triggerLabel: "Abrir menú de accesibilidad",
    panelLabel: "Menú de accesibilidad",
    title: "Menú De Accesibilidad (CTRL+U)",
    closeLabel: "Cerrar menú",
    langButtonLabel: "🇨🇴 Español (Colombia) ▸",
    widgetLabel: "XL Widget de gran tamaño",
    fontSizeLabel: (pct) => `Tamaño actual de texto: ${pct}`,
    toolsLabel: "Herramientas de accesibilidad",
    prefsLabel: "Preferencias principales",
    decreaseText: "Reducir texto",
    stopReadingLabel: "Detener lectura",
    resetLabel: "Restablecer ajustes",
    features: {
      readPage: "Leer página",
      highContrast: "Contraste +",
      smartContrast: "Contraste inteligente",
      highlightLinks: "Resaltar enlaces",
      biggerText: "Agrandar texto",
      textSpacing: "Espaciado de texto",
      pauseAnimations: "Detener animaciones",
      hideImages: "Ocultar imágenes",
      readableFont: "Apto para dislexia",
      cursor: "Cursor",
      info: "Información",
      pageStructure: "Estructura de la página",
      lineHeight: "Altura de la línea",
      textAlignLeft: "Texto alineado",
    },
    announces: {
      notAvailable: "La lectura en voz no está disponible en este navegador.",
      noContent: "No hay contenido disponible para leer.",
      reading: "Leyendo contenido de la página.",
      stopped: "Lectura detenida.",
      reset: "Ajustes de accesibilidad restablecidos.",
      info: "Este menú incluye controles de texto, contraste, enlaces, imágenes y movimiento.",
    },
  },
  "en-US": {
    speechLang: "en-US",
    triggerTitle: "Open accessibility menu (Ctrl+U)",
    triggerLabel: "Open accessibility menu",
    panelLabel: "Accessibility menu",
    title: "Accessibility Menu (CTRL+U)",
    closeLabel: "Close menu",
    langButtonLabel: "🇺🇸 English (USA) ▸",
    widgetLabel: "XL Large widget",
    fontSizeLabel: (pct) => `Current text size: ${pct}`,
    toolsLabel: "Accessibility tools",
    prefsLabel: "Main preferences",
    decreaseText: "Decrease text",
    stopReadingLabel: "Stop reading",
    resetLabel: "Reset settings",
    features: {
      readPage: "Read page",
      highContrast: "High contrast",
      smartContrast: "Smart contrast",
      highlightLinks: "Highlight links",
      biggerText: "Bigger text",
      textSpacing: "Text spacing",
      pauseAnimations: "Pause animations",
      hideImages: "Hide images",
      readableFont: "Dyslexia friendly",
      cursor: "Cursor",
      info: "Information",
      pageStructure: "Page structure",
      lineHeight: "Line height",
      textAlignLeft: "Align text left",
    },
    announces: {
      notAvailable: "Text-to-speech is not available in this browser.",
      noContent: "No content available to read.",
      reading: "Reading page content.",
      stopped: "Reading stopped.",
      reset: "Accessibility settings reset.",
      info: "This menu includes controls for text, contrast, links, images, and motion.",
    },
  },
};

const LANG_OPTIONS = [
  { code: "es-MX", label: "🇨🇴 Español (Colombia)" },
  { code: "en-US", label: "🇺🇸 English (USA)" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function applyAccessibilitySettings(settings) {
  const root = document.documentElement;
  root.style.setProperty("--user-font-scale", String(settings.fontScale));
  root.classList.toggle("a11y-high-contrast", settings.highContrast);
  root.classList.toggle("a11y-smart-contrast", settings.smartContrast);
  root.classList.toggle("a11y-pause-animations", settings.pauseAnimations);
  root.classList.toggle("a11y-highlight-links", settings.highlightLinks);
  root.classList.toggle("a11y-readable-font", settings.readableFont);
  root.classList.toggle("a11y-hide-images", settings.hideImages);
  root.classList.toggle("a11y-text-spacing", settings.textSpacing);
  root.classList.toggle("a11y-bigger-cursor", settings.biggerCursor);
  root.classList.toggle("a11y-line-height", settings.lineHeightBoost);
  root.classList.toggle("a11y-text-align-left", settings.textAlignLeft);
  root.classList.toggle("a11y-page-structure", settings.pageStructure);
}

function readStoredSettings() {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      ...defaultSettings,
      ...parsed,
      fontScale: Math.min(
        MAX_FONT_SCALE,
        Math.max(MIN_FONT_SCALE, Number(parsed.fontScale) || 1),
      ),
    };
  } catch {
    return defaultSettings;
  }
}

function readStoredLang() {
  try {
    const raw = window.localStorage.getItem(LANG_KEY);
    return raw && STRINGS[raw] ? raw : "es-MX";
  } catch {
    return "es-MX";
  }
}

function announce(text) {
  if (typeof window === "undefined") return;
  const live = document.getElementById("a11y-live-region");
  if (!live) return;
  live.textContent = "";
  window.setTimeout(() => {
    live.textContent = text;
  }, 80);
}

function readPage(speechLang, strings) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    announce(strings.notAvailable);
    return;
  }
  const selectedText = window.getSelection?.()?.toString()?.trim();
  const mainText = document.querySelector("main")?.innerText?.trim();
  const text = selectedText || mainText || document.body.innerText.slice(0, 1200);
  if (!text) {
    announce(strings.noContent);
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechLang;
  window.speechSynthesis.speak(utterance);
  announce(strings.reading);
}

function stopReading(strings) {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  announce(strings.stopped);
}

// ── Icono ────────────────────────────────────────────────────────────────────
function AccessibilityIcon() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <circle cx="32" cy="32" r="30" fill="#2668d8" stroke="#b8cffd" strokeWidth="4" />
      <circle cx="32" cy="18" r="5" fill="#fff" />
      <path
        d="M19 24h26M32 24v22M23 31l9 6 9-6M25 46h14"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(() => readStoredSettings());
  const [lang, setLang] = useState(() => readStoredLang());
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef(null);

  const t = STRINGS[lang];

  // Persistir ajustes y aplicarlos al DOM
  useEffect(() => {
    applyAccessibilitySettings(settings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Persistir idioma y actualizar el atributo lang del documento
  useEffect(() => {
    window.localStorage.setItem(LANG_KEY, lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Cerrar dropdown de idioma al hacer clic fuera
  useEffect(() => {
    if (!langOpen) return;
    function handleClickOutside(e) {
      if (langRef.current && !langRef.current.contains(e.target)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langOpen]);

  // Atajos de teclado globales
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (event.key === "Escape") {
        setIsOpen(false);
        setLangOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const fontPercent = useMemo(
    () => `${Math.round(settings.fontScale * 100)}%`,
    [settings.fontScale],
  );

  const toggleSetting = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const adjustFontSize = (direction) => {
    setSettings((prev) => ({
      ...prev,
      fontScale: Math.min(
        MAX_FONT_SCALE,
        Math.max(MIN_FONT_SCALE, prev.fontScale + direction * FONT_STEP),
      ),
    }));
  };

  const resetSettings = () => {
    stopReading(t.announces);
    setSettings(defaultSettings);
    announce(t.announces.reset);
  };

  const selectLang = (code) => {
    setLang(code);
    setLangOpen(false);
  };

  const featureItems = [
    {
      key: "readPage",
      label: t.features.readPage,
      icon: "🔊",
      onClick: () => readPage(t.speechLang, t.announces),
    },
    {
      key: "highContrast",
      label: t.features.highContrast,
      icon: "◐",
      active: settings.highContrast,
      onClick: () => toggleSetting("highContrast"),
    },
    {
      key: "smartContrast",
      label: t.features.smartContrast,
      icon: "◑",
      active: settings.smartContrast,
      onClick: () => toggleSetting("smartContrast"),
    },
    {
      key: "highlightLinks",
      label: t.features.highlightLinks,
      icon: "🔗",
      active: settings.highlightLinks,
      onClick: () => toggleSetting("highlightLinks"),
    },
    {
      key: "biggerText",
      label: t.features.biggerText,
      icon: "Tt",
      onClick: () => adjustFontSize(1),
    },
    {
      key: "textSpacing",
      label: t.features.textSpacing,
      icon: "↔",
      active: settings.textSpacing,
      onClick: () => toggleSetting("textSpacing"),
    },
    {
      key: "pauseAnimations",
      label: t.features.pauseAnimations,
      icon: "◌",
      active: settings.pauseAnimations,
      onClick: () => toggleSetting("pauseAnimations"),
    },
    {
      key: "hideImages",
      label: t.features.hideImages,
      icon: "🖼",
      active: settings.hideImages,
      onClick: () => toggleSetting("hideImages"),
    },
    {
      key: "readableFont",
      label: t.features.readableFont,
      icon: "Df",
      active: settings.readableFont,
      onClick: () => toggleSetting("readableFont"),
    },
    {
      key: "biggerCursor",
      label: t.features.cursor,
      icon: "🖱",
      active: settings.biggerCursor,
      onClick: () => toggleSetting("biggerCursor"),
    },
    {
      key: "info",
      label: t.features.info,
      icon: "i",
      onClick: () => announce(t.announces.info),
    },
    {
      key: "pageStructure",
      label: t.features.pageStructure,
      icon: "☰",
      active: settings.pageStructure,
      onClick: () => toggleSetting("pageStructure"),
    },
    {
      key: "lineHeightBoost",
      label: t.features.lineHeight,
      icon: "↕",
      active: settings.lineHeightBoost,
      onClick: () => toggleSetting("lineHeightBoost"),
    },
    {
      key: "textAlignLeft",
      label: t.features.textAlignLeft,
      icon: "≣",
      active: settings.textAlignLeft,
      onClick: () => toggleSetting("textAlignLeft"),
    },
  ];

  return (
    <div className="a11y-widget" role="complementary" aria-label={t.panelLabel}>
      <button
        type="button"
        className="a11y-logo-trigger"
        aria-expanded={isOpen}
        aria-controls="a11y-panel"
        onClick={() => setIsOpen((prev) => !prev)}
        title={t.triggerTitle}
      >
        <AccessibilityIcon />
        <span className="sr-only">{t.triggerLabel}</span>
      </button>

      {isOpen && (
        <section id="a11y-panel" className="a11y-panel" aria-label={t.panelLabel}>
          <header className="a11y-panel-header">
            <h2>{t.title}</h2>
            <button type="button" onClick={() => setIsOpen(false)} aria-label={t.closeLabel}>
              ✕
            </button>
          </header>

          <div className="a11y-toolbar-row" aria-label={t.prefsLabel}>
            {/* Selector de idioma */}
            <div className="a11y-lang-wrapper" ref={langRef}>
              <button
                type="button"
                aria-expanded={langOpen}
                aria-haspopup="listbox"
                onClick={() => setLangOpen((prev) => !prev)}
              >
                {t.langButtonLabel}
              </button>
              {langOpen && (
                <div className="a11y-lang-menu" role="listbox" aria-label={t.panelLabel}>
                  {LANG_OPTIONS.map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      role="option"
                      aria-selected={lang === opt.code}
                      onClick={() => selectLang(opt.code)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Widget de tamaño — sin cambios funcionales */}
            <div className="a11y-size-widget">
              <span>{t.widgetLabel}</span>
              <button
                type="button"
                className={settings.fontScale >= 1.2 ? "is-on" : ""}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    fontScale: prev.fontScale >= 1.2 ? 1 : 1.2,
                  }))
                }
              >
                ⨂
              </button>
            </div>
          </div>

          <p className="a11y-font-indicator">{t.fontSizeLabel(fontPercent)}</p>

          <div className="a11y-grid" role="group" aria-label={t.toolsLabel}>
            {featureItems.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`a11y-tile ${item.active ? "is-active" : ""}`}
                aria-pressed={item.active !== undefined ? item.active : undefined}
                onClick={item.onClick}
              >
                <span className="a11y-tile-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="a11y-actions-row">
            <button type="button" onClick={() => adjustFontSize(-1)}>
              {t.decreaseText}
            </button>
            <button type="button" onClick={() => stopReading(t.announces)}>
              {t.stopReadingLabel}
            </button>
            <button type="button" className="a11y-reset" onClick={resetSettings}>
              {t.resetLabel}
            </button>
          </div>
        </section>
      )}

      <p id="a11y-live-region" className="sr-only" aria-live="polite" />
    </div>
  );
}
