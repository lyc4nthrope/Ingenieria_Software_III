/**
 * PhotoUploader.jsx
 *
 * Componente para upload de fotos a Cloudinary
 * Incluye: drag-drop, file input, preview, barra de progreso
 *
 * UBICACIÓN: src/features/publications/components/PhotoUploader.jsx
 * FECHA: 26-02-2026
 * STATUS: Paso 3b de Proceso 2
 *
 * PROPS:
 * - onUpload: {Function} Callback cuando se sube foto exitosamente
 * - disabled: {Boolean} Deshabilitar upload
 *
 * FEATURES:
 * - Drag & drop
 * - File input
 * - Preview de foto
 * - Barra de progreso
 * - Validación de archivo
 * - Error handling
 */

import { useRef } from "react";
import { usePhotoUpload } from "@/features/publications/hooks";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Componente: PhotoUploader
 * Interfaz para subir fotos a Cloudinary
 *
 * @param {Function} onUpload - Callback: (photoUrl) => void
 * @param {Boolean} disabled - Deshabilitar upload
 *
 * @example
 * <PhotoUploader
 *   onUpload={(url) => setPhotoUrl(url)}
 *   disabled={isSubmitting}
 * />
 */
export function PhotoUploader({ onUpload, disabled = false }) {
  // ─── Hooks ────────────────────────────────────────────────────────────────

  const { t } = useLanguage();
  const tu = t.photoUploader;

  const { photoUrl, uploading, progress, error, upload, reset, clearError } =
    usePhotoUpload();

  // ─── Estados ───────────────────────────────────────────────────────────────

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleFile = async (file) => {
    if (!file) return;

    const result = await upload(file);

    if (result.success && onUpload) {
      onUpload(result.photoUrl);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleReset = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    clearError();
    fileInputRef.current?.click();
  };

  const handleCameraClick = () => {
    clearError();
    cameraInputRef.current?.click();
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // Si ya tiene foto
  if (photoUrl && !uploading) {
    return (
      <div style={styles.container}>
        <div style={styles.successContainer}>
          <div style={styles.previewSection}>
            <img src={photoUrl} alt={tu.success} style={styles.previewImage} />
          </div>

          <div style={styles.successMessage}>
            <span style={styles.checkmark} aria-hidden="true">✓</span>
            <div>
              <div style={styles.successTitle}>{tu.success}</div>
              <div style={styles.successUrl}>
                {photoUrl.substring(0, 50)}...
              </div>
            </div>
          </div>

          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={handleReset}
            disabled={disabled}
          >
            {tu.changePhoto}
          </button>
        </div>
      </div>
    );
  }

  // Mientras sube
  if (uploading) {
    return (
      <div style={styles.container}>
        <div style={styles.uploadingContainer}>
          <div style={styles.spinner}></div>
          <div style={styles.uploadingText} role="status" aria-live="polite">{tu.uploading}</div>

          {progress > 0 && (
            <div style={styles.progressContainer}>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progress}%`,
                  }}
                ></div>
              </div>
              <div style={styles.progressText}>{progress}%</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <div style={styles.errorTitle} role="alert"><span aria-hidden="true">⚠ </span>{tu.errorTitle}</div>
          <div style={styles.errorMessage}>{error}</div>

          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={clearError}
          >
            {tu.dismissError}
          </button>

          <button
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={handleClick}
            disabled={disabled}
          >
            {tu.retry}
          </button>
        </div>
      </div>
    );
  }

  // Zona de selección simple
  return (
    <div style={styles.container}>
      {/* Input para galería */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleInputChange}
        disabled={disabled}
        style={{ display: "none" }}
      />
      {/* Input para cámara del dispositivo */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        disabled={disabled}
        style={{ display: "none" }}
      />
      <div style={styles.buttonGroup} role="group" aria-label={tu.groupLabel}>
        <button
          type="button"
          style={{ ...styles.button, ...styles.buttonPrimary }}
          onClick={handleClick}
          disabled={disabled}
          aria-label={tu.galleryLabel}
        >
          <span aria-hidden="true">📁 </span>{tu.galleryButton}
        </button>
        <button
          type="button"
          style={{ ...styles.button, ...styles.buttonSecondary }}
          onClick={handleCameraClick}
          disabled={disabled}
          aria-label={tu.cameraLabel}
        >
          <span aria-hidden="true">📷 </span>{tu.cameraButton}
        </button>
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    width: "100%",
  },

  // Drop zone
  dropZone: {
    border: "2px dashed var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "40px 20px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.3s",
    background: "var(--bg-elevated)",
    marginBottom: "12px",
  },

  dropZoneActive: {
    borderColor: "var(--accent)",
    background: "var(--accent-soft)",
    transform: "scale(1.01)",
  },

  fileInput: {
    display: "none",
  },

  dropContent: {
    pointerEvents: "none",
  },

  dropIcon: {
    fontSize: "48px",
    marginBottom: "12px",
  },

  dropTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "4px",
  },

  dropSubtitle: {
    fontSize: "13px",
    color: "var(--text-secondary)",
    marginBottom: "8px",
  },

  dropHint: {
    fontSize: "12px",
    color: "var(--text-muted)",
  },

  // Uploading
  uploadingContainer: {
    padding: "32px 20px",
    textAlign: "center",
    background: "var(--bg-elevated)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
  },

  spinner: {
    width: "40px",
    height: "40px",
    border: "3px solid var(--border)",
    borderTop: "3px solid var(--accent)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    margin: "0 auto 12px",
  },

  uploadingText: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--text-primary)",
    marginBottom: "16px",
  },

  progressContainer: {
    marginTop: "12px",
  },

  progressBar: {
    height: "6px",
    background: "var(--border)",
    borderRadius: "3px",
    overflow: "hidden",
    marginBottom: "8px",
  },

  progressFill: {
    height: "100%",
    background: "var(--accent)",
    transition: "width 0.3s",
  },

  progressText: {
    fontSize: "12px",
    color: "var(--text-muted)",
    fontWeight: 600,
  },

  // Success
  successContainer: {
    padding: "20px",
    background: "var(--success-soft)",
    border: "1px solid rgba(74,222,128,0.3)",
    borderRadius: "var(--radius-sm)",
  },

  previewSection: {
    marginBottom: "16px",
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
    background: "var(--bg-elevated)",
  },

  previewImage: {
    width: "100%",
    height: "auto",
    maxHeight: "300px",
    objectFit: "cover",
    display: "block",
  },

  successMessage: {
    display: "flex",
    gap: "12px",
    marginBottom: "16px",
    alignItems: "flex-start",
  },

  checkmark: {
    fontSize: "20px",
    color: "var(--success)",
    fontWeight: "bold",
    marginTop: "2px",
  },

  successTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--success)",
  },

  successUrl: {
    fontSize: "12px",
    color: "var(--success)",
    marginTop: "2px",
    wordBreak: "break-all",
    opacity: 0.8,
  },

  // Error
  errorContainer: {
    padding: "20px",
    background: "var(--error-soft)",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: "var(--radius-sm)",
  },

  errorTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--error)",
    marginBottom: "8px",
  },

  errorMessage: {
    fontSize: "13px",
    color: "var(--error)",
    marginBottom: "16px",
    lineHeight: "1.4",
    opacity: 0.85,
  },

  // Hints
  hints: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "12px",
    color: "var(--text-muted)",
  },

  hint: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  // Button group
  buttonGroup: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },

  // Buttons
  button: {
    padding: "10px 16px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid transparent",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    marginRight: "8px",
    marginBottom: "8px",
    minHeight: "44px",
    minWidth: "44px",
  },

  buttonPrimary: {
    background: "var(--accent-soft)",
    color: "var(--accent)",
    borderColor: "var(--accent)",
  },

  buttonSecondary: {
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    borderColor: "var(--border-soft)",
  },
};

// Agregar animación CSS
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default PhotoUploader;
