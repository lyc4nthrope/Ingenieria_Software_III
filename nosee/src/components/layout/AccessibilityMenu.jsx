import { useEffect, useRef, useState } from "react";
import { useLanguage, LANG_OPTIONS } from "@/contexts/LanguageContext";

const STORAGE_KEY = "nosee-accessibility-settings";
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
  lightMode: false,
};

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
  root.classList.toggle("a11y-light-mode", settings.lightMode);
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
      <circle cx="32" cy="32" r="30" fill="#2668d8" />
      <circle cx="32" cy="32" r="26" fill="none" stroke="#fff" strokeWidth="2.5" />
      <circle cx="32" cy="20" r="4" fill="#fff" />
      <line x1="18" y1="30" x2="46" y2="30" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="32" y1="30" x2="32" y2="40" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="32" y1="40" x2="23" y2="50" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="32" y1="40" x2="41" y2="50" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function AccessibilityMenu() {
  const { lang, setLang, t } = useLanguage();
  const ta = t.a11y;

  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(() => readStoredSettings());
  const [langOpen, setLangOpen] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const langRef = useRef(null);

  // Persistir ajustes y aplicarlos al DOM
  useEffect(() => {
    applyAccessibilitySettings(settings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

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

  const fontPercent = `${Math.round(settings.fontScale * 100)}%`;

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
    stopReading(ta.announces);
    setSettings(defaultSettings);
    announce(ta.announces.reset);
  };

  const selectLang = (code) => {
    setLang(code);
    setLangOpen(false);
  };

  const featureItems = [
    {
      key: "readPage",
      label: ta.features.readPage,
      icon: "🔊",
      onClick: () => readPage(ta.speechLang, ta.announces),
    },
    {
      key: "highContrast",
      label: ta.features.highContrast,
      icon: "◐",
      active: settings.highContrast,
      onClick: () => toggleSetting("highContrast"),
    },
    {
      key: "smartContrast",
      label: ta.features.smartContrast,
      icon: "◑",
      active: settings.smartContrast,
      onClick: () => toggleSetting("smartContrast"),
    },
    {
      key: "highlightLinks",
      label: ta.features.highlightLinks,
      icon: "🔗",
      active: settings.highlightLinks,
      onClick: () => toggleSetting("highlightLinks"),
    },
    {
      key: "biggerText",
      label: ta.features.biggerText,
      icon: "Tt",
      onClick: () => adjustFontSize(1),
    },
    {
      key: "textSpacing",
      label: ta.features.textSpacing,
      icon: "↔",
      active: settings.textSpacing,
      onClick: () => toggleSetting("textSpacing"),
    },
    {
      key: "pauseAnimations",
      label: ta.features.pauseAnimations,
      icon: "◌",
      active: settings.pauseAnimations,
      onClick: () => toggleSetting("pauseAnimations"),
    },
    {
      key: "hideImages",
      label: ta.features.hideImages,
      icon: "🖼",
      active: settings.hideImages,
      onClick: () => toggleSetting("hideImages"),
    },
    {
      key: "readableFont",
      label: ta.features.readableFont,
      icon: "Df",
      active: settings.readableFont,
      onClick: () => toggleSetting("readableFont"),
    },
    {
      key: "biggerCursor",
      label: ta.features.cursor,
      icon: "🖱",
      active: settings.biggerCursor,
      onClick: () => toggleSetting("biggerCursor"),
    },
    {
      key: "lightMode",
      label: settings.lightMode ? ta.features.nightMode : ta.features.lightMode,
      icon: settings.lightMode ? "🌙" : "☀️",
      active: settings.lightMode,
      onClick: () => toggleSetting("lightMode"),
    },
    {
      key: "info",
      label: ta.features.info,
      icon: "i",
      active: infoVisible,
      onClick: () => setInfoVisible((prev) => !prev),
    },
    {
      key: "pageStructure",
      label: ta.features.pageStructure,
      icon: "☰",
      active: settings.pageStructure,
      onClick: () => toggleSetting("pageStructure"),
    },
    {
      key: "lineHeightBoost",
      label: ta.features.lineHeight,
      icon: "↕",
      active: settings.lineHeightBoost,
      onClick: () => toggleSetting("lineHeightBoost"),
    },
    {
      key: "textAlignLeft",
      label: ta.features.textAlignLeft,
      icon: "≣",
      active: settings.textAlignLeft,
      onClick: () => toggleSetting("textAlignLeft"),
    },
  ];

  return (
    <div className="a11y-widget" role="complementary" aria-label={ta.panelLabel}>
      <button
        type="button"
        className="a11y-logo-trigger"
        aria-expanded={isOpen}
        aria-controls="a11y-panel"
        onClick={() => setIsOpen((prev) => !prev)}
        title={ta.triggerTitle}
      >
        <AccessibilityIcon />
        <span className="sr-only">{ta.triggerLabel}</span>
      </button>

      {isOpen && (
        <section id="a11y-panel" className="a11y-panel" aria-label={ta.panelLabel}>
          <header className="a11y-panel-header">
            <h2>{ta.title}</h2>
            <button type="button" onClick={() => setIsOpen(false)} aria-label={ta.closeLabel}>
              ✕
            </button>
          </header>

          <div className="a11y-toolbar-row" aria-label={ta.prefsLabel}>
            {/* Selector de idioma */}
            <div className="a11y-lang-wrapper" ref={langRef}>
              <button
                type="button"
                aria-expanded={langOpen}
                aria-haspopup="listbox"
                onClick={() => setLangOpen((prev) => !prev)}
              >
                {ta.langButtonLabel}
              </button>
              {langOpen && (
                <div className="a11y-lang-menu" role="listbox" aria-label={ta.panelLabel}>
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

            {/* Widget de tamaño */}
            <div className="a11y-size-widget">
              <span>{ta.widgetLabel}</span>
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

          <p className="a11y-font-indicator">{ta.fontSizeLabel(fontPercent)}</p>

          <div className="a11y-grid" role="group" aria-label={ta.toolsLabel}>
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

          {infoVisible && (
            <div className="a11y-info-panel" role="region" aria-label={ta.infoPanel.title}>
              <div className="a11y-info-header">
                <strong>{ta.infoPanel.title}</strong>
                <button
                  type="button"
                  className="a11y-info-close"
                  onClick={() => setInfoVisible(false)}
                  aria-label={ta.infoPanel.closeInfo}
                >
                  ✕
                </button>
              </div>
              <p className="a11y-info-desc">{ta.infoPanel.description}</p>

              <p className="a11y-info-section-title">{ta.infoPanel.shortcutsTitle}</p>
              <ul className="a11y-info-shortcuts">
                {ta.infoPanel.shortcuts.map((s) => (
                  <li key={s.keys}>
                    <kbd>{s.keys}</kbd>
                    <span>{s.action}</span>
                  </li>
                ))}
              </ul>

              <p className="a11y-info-section-title">{ta.infoPanel.featuresTitle}</p>
              <ul className="a11y-info-features">
                {ta.infoPanel.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="a11y-actions-row">
            <button type="button" onClick={() => adjustFontSize(-1)}>
              {ta.decreaseText}
            </button>
            <button type="button" onClick={() => stopReading(ta.announces)}>
              {ta.stopReadingLabel}
            </button>
            <button type="button" className="a11y-reset" onClick={resetSettings}>
              {ta.resetLabel}
            </button>
          </div>
        </section>
      )}

      <p id="a11y-live-region" className="sr-only" aria-live="polite" />
    </div>
  );
}
