import { useEffect, useMemo, useState } from "react";

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
};

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

function announce(text) {
  if (typeof window === "undefined") return;

  const live = document.getElementById("a11y-live-region");
  if (!live) return;
  live.textContent = "";
  window.setTimeout(() => {
    live.textContent = text;
  }, 80);
}

function readPage() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    announce("La lectura en voz no está disponible en este navegador.");
    return;
  }

  const selectedText = window.getSelection?.()?.toString()?.trim();
  const mainText = document.querySelector("main")?.innerText?.trim();
  const text = selectedText || mainText || document.body.innerText.slice(0, 1200);

  if (!text) {
    announce("No hay contenido disponible para leer.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  window.speechSynthesis.speak(utterance);
  announce("Leyendo contenido de la página.");
}

function stopReading() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  announce("Lectura detenida.");
}

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

export default function AccessibilityMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState(() => readStoredSettings());

  useEffect(() => {
    applyAccessibilitySettings(settings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "u") {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }

      if (event.key === "Escape") {
        setIsOpen(false);
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
    stopReading();
    setSettings(defaultSettings);
    announce("Ajustes de accesibilidad restablecidos.");
  };

  const featureItems = [
    {
      label: "Leer página",
      icon: "🔊",
      onClick: readPage,
    },
    {
      label: "Contraste +",
      icon: "◐",
      active: settings.highContrast,
      onClick: () => toggleSetting("highContrast"),
    },
    {
      label: "Contraste inteligente",
      icon: "◑",
      active: settings.smartContrast,
      onClick: () => toggleSetting("smartContrast"),
    },
    {
      label: "Resaltar enlaces",
      icon: "🔗",
      active: settings.highlightLinks,
      onClick: () => toggleSetting("highlightLinks"),
    },
    {
      label: "Agrandar texto",
      icon: "Tt",
      onClick: () => adjustFontSize(1),
    },
    {
      label: "Espaciado de texto",
      icon: "↔",
      active: settings.textSpacing,
      onClick: () => toggleSetting("textSpacing"),
    },
    {
      label: "Detener animaciones",
      icon: "◌",
      active: settings.pauseAnimations,
      onClick: () => toggleSetting("pauseAnimations"),
    },
    {
      label: "Ocultar imágenes",
      icon: "🖼",
      active: settings.hideImages,
      onClick: () => toggleSetting("hideImages"),
    },
    {
      label: "Apto para dislexia",
      icon: "Df",
      active: settings.readableFont,
      onClick: () => toggleSetting("readableFont"),
    },
    {
      label: "Cursor",
      icon: "🖱",
      active: settings.biggerCursor,
      onClick: () => toggleSetting("biggerCursor"),
    },
    {
      label: "Información",
      icon: "i",
      onClick: () =>
        announce(
          "Este menú incluye controles de texto, contraste, enlaces, imágenes y movimiento.",
        ),
    },
    {
      label: "Estructura de la página",
      icon: "☰",
      active: settings.pageStructure,
      onClick: () => toggleSetting("pageStructure"),
    },
    {
      label: "Altura de la línea",
      icon: "↕",
      active: settings.lineHeightBoost,
      onClick: () => toggleSetting("lineHeightBoost"),
    },
    {
      label: "Texto alineado",
      icon: "≣",
      active: settings.textAlignLeft,
      onClick: () => toggleSetting("textAlignLeft"),
    },
  ];

  return (
    <div className="a11y-widget" role="complementary" aria-label="Accesibilidad">
      <button
        type="button"
        className="a11y-logo-trigger"
        aria-expanded={isOpen}
        aria-controls="a11y-panel"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Abrir menú de accesibilidad (Ctrl+U)"
      >
        <AccessibilityIcon />
        <span className="sr-only">Abrir menú de accesibilidad</span>
      </button>

      {isOpen && (
        <section id="a11y-panel" className="a11y-panel" aria-label="Menú de accesibilidad">
          <header className="a11y-panel-header">
            <h2>Menú De Accesibilidad (CTRL+U)</h2>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Cerrar menú">
              ✕
            </button>
          </header>

          <div className="a11y-toolbar-row" aria-label="Preferencias principales">
            <button type="button">🇲🇽 Español (Mexico) ▸</button>
            <button type="button">♿ Perfiles de accesibilidad ▸</button>
            <div className="a11y-size-widget">
              <span>XL Widget de gran tamaño</span>
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

          <p className="a11y-font-indicator">Tamaño actual de texto: {fontPercent}</p>

          <div className="a11y-grid" role="group" aria-label="Herramientas de accesibilidad">
            {featureItems.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`a11y-tile ${item.active ? "is-active" : ""}`}
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
              Reducir texto
            </button>
            <button type="button" onClick={stopReading}>
              Detener lectura
            </button>
            <button type="button" className="a11y-reset" onClick={resetSettings}>
              Restablecer ajustes
            </button>
          </div>
        </section>
      )}

      <p id="a11y-live-region" className="sr-only" aria-live="polite" />
    </div>
  );
}
