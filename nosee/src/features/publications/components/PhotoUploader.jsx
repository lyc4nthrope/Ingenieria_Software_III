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

import { useState, useRef } from 'react';
import { usePhotoUpload } from '@/features/publications/hooks';

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

  const { photoUrl, uploading, progress, error, upload, reset, clearError } =
    usePhotoUpload();

  // ─── Estados ───────────────────────────────────────────────────────────────

  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleFile = async (file) => {
    if (!file) return;

    const result = await upload(file);

    if (result.success && onUpload) {
      onUpload(result.photoUrl);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    reset();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // Si ya tiene foto
  if (photoUrl && !uploading) {
    return (
      <div style={styles.container}>
        <div style={styles.successContainer}>
          <div style={styles.previewSection}>
            <img src={photoUrl} alt="Preview" style={styles.previewImage} />
          </div>

          <div style={styles.successMessage}>
            <span style={styles.checkmark}>✓</span>
            <div>
              <div style={styles.successTitle}>Foto subida correctamente</div>
              <div style={styles.successUrl}>{photoUrl.substring(0, 50)}...</div>
            </div>
          </div>

          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={handleReset}
            disabled={disabled}
          >
            Cambiar foto
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
          <div style={styles.uploadingText}>Subiendo foto...</div>

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
          <div style={styles.errorTitle}>⚠ Error al subir foto</div>
          <div style={styles.errorMessage}>{error}</div>

          <button
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={clearError}
          >
            Descartar error
          </button>

          <button
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={handleClick}
            disabled={disabled}
          >
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }

  // Zona de drop
  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.dropZone,
          ...(dragActive ? styles.dropZoneActive : {}),
        }}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          disabled={disabled}
          style={styles.fileInput}
        />

        <div style={styles.dropContent}>
          <div style={styles.dropIcon}>📷</div>
          <div style={styles.dropTitle}>Sube una foto</div>
          <div style={styles.dropSubtitle}>
            Arrastra aquí o haz click para seleccionar
          </div>
          <div style={styles.dropHint}>JPG, PNG o WEBP (máx 5MB)</div>
        </div>
      </div>

      <div style={styles.hints}>
        <div style={styles.hint}>✓ Foto clara del producto</div>
        <div style={styles.hint}>✓ Precio visible en la etiqueta</div>
        <div style={styles.hint}>✓ Buena iluminación</div>
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = {
  container: {
    width: '100%',
  },

  // Drop zone
  dropZone: {
    border: '2px dashed #ddd',
    borderRadius: '8px',
    padding: '40px 20px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s',
    background: '#fafafa',
    marginBottom: '12px',
  },

  dropZoneActive: {
    borderColor: '#ff6b35',
    background: '#fff5f0',
    transform: 'scale(1.01)',
  },

  fileInput: {
    display: 'none',
  },

  dropContent: {
    pointerEvents: 'none',
  },

  dropIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },

  dropTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px',
  },

  dropSubtitle: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '8px',
  },

  dropHint: {
    fontSize: '12px',
    color: '#999',
  },

  // Uploading
  uploadingContainer: {
    padding: '32px 20px',
    textAlign: 'center',
    background: '#f0f0f0',
    borderRadius: '8px',
  },

  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f0f0f0',
    borderTop: '3px solid #ff6b35',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 12px',
  },

  uploadingText: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '16px',
  },

  progressContainer: {
    marginTop: '12px',
  },

  progressBar: {
    height: '6px',
    background: '#e0e0e0',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '8px',
  },

  progressFill: {
    height: '100%',
    background: '#ff6b35',
    transition: 'width 0.3s',
  },

  progressText: {
    fontSize: '12px',
    color: '#666',
    fontWeight: 600,
  },

  // Success
  successContainer: {
    padding: '20px',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
  },

  previewSection: {
    marginBottom: '16px',
    borderRadius: '6px',
    overflow: 'hidden',
    background: '#fff',
  },

  previewImage: {
    width: '100%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'cover',
    display: 'block',
  },

  successMessage: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    alignItems: 'flex-start',
  },

  checkmark: {
    fontSize: '20px',
    color: '#22c55e',
    fontWeight: 'bold',
    marginTop: '2px',
  },

  successTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#166534',
  },

  successUrl: {
    fontSize: '12px',
    color: '#15803d',
    marginTop: '2px',
    wordBreak: 'break-all',
  },

  // Error
  errorContainer: {
    padding: '20px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
  },

  errorTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#991b1b',
    marginBottom: '8px',
  },

  errorMessage: {
    fontSize: '13px',
    color: '#7f1d1d',
    marginBottom: '16px',
    lineHeight: '1.4',
  },

  // Hints
  hints: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontSize: '12px',
    color: '#666',
  },

  hint: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },

  // Buttons
  button: {
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginRight: '8px',
    marginBottom: '8px',
  },

  buttonPrimary: {
    background: '#ff6b35',
    color: '#fff',
  },

  buttonSecondary: {
    background: '#e0e0e0',
    color: '#333',
  },
};

// Agregar animación CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

export default PhotoUploader;