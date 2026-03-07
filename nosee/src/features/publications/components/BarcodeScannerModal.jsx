import { useEffect, useRef, useState } from "react";

export default function BarcodeScannerModal({ open, onClose, onDetected }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const detectorRef = useRef(null);
  const detectionLockRef = useRef(false);

  const [isStarting, setIsStarting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const stopScanner = () => {
      if (scanTimerRef.current) {
        clearInterval(scanTimerRef.current);
        scanTimerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      detectorRef.current = null;
      detectionLockRef.current = false;
    };

    const startScanner = async () => {
      setIsStarting(true);
      setError("");
      setSupported(true);

      if (!navigator?.mediaDevices?.getUserMedia) {
        setSupported(false);
        setError("Tu navegador no permite cámara. Ingresa el código manualmente.");
        setIsStarting(false);
        return;
      }

      if (typeof window?.BarcodeDetector !== "function") {
        setSupported(false);
        setError("Tu navegador no soporta escaneo automático. Ingresa el código manualmente.");
        setIsStarting(false);
        return;
      }

      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
        });
      } catch {
        setSupported(false);
        setError("No se pudo iniciar el detector de códigos. Usa ingreso manual.");
        setIsStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        scanTimerRef.current = setInterval(async () => {
          if (!videoRef.current || !detectorRef.current || detectionLockRef.current) return;

          try {
            const codes = await detectorRef.current.detect(videoRef.current);
            const rawValue = codes?.[0]?.rawValue?.trim();
            if (!rawValue) return;

            detectionLockRef.current = true;
            await onDetected?.(rawValue);
            onClose?.();
          } catch {
            // Ignorar errores intermitentes del detector
          }
        }, 450);
      } catch (cameraError) {
        setSupported(false);
        setError(cameraError?.message || "No se pudo acceder a la cámara.");
      } finally {
        setIsStarting(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onClose, onDetected, open]);

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    const code = manualCode.trim();
    if (code.length < 4) {
      setError("Ingresa un código válido (mínimo 4 caracteres).");
      return;
    }

    setError("");
    await onDetected?.(code);
    onClose?.();
  };

  if (!open) return null;

  return (
    <div style={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label="Escanear código de barras">
        <div style={styles.header}>
          <h3 style={styles.title}>Escanear código de barras</h3>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Cerrar">
            Cerrar
          </button>
        </div>

        {supported && (
          <video
            ref={videoRef}
            style={styles.video}
            muted
            autoPlay
            playsInline
            aria-label="Vista de cámara para escaneo"
          />
        )}

        {isStarting && <p style={styles.helper}>Iniciando cámara...</p>}
        {error && <p style={styles.error}>{error}</p>}

        <form style={styles.manualForm} onSubmit={handleManualSubmit}>
          <label htmlFor="manual-barcode" style={styles.label}>
            Ingresar código manualmente
          </label>
          <input
            id="manual-barcode"
            type="text"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            style={styles.input}
            placeholder="Ej: 7702001043509"
            autoComplete="off"
          />
          <button type="submit" style={styles.submitBtn}>
            Usar código
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(5, 8, 15, 0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1200,
    padding: "16px",
  },
  modal: {
    width: "min(560px, 100%)",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  title: {
    margin: 0,
    fontSize: "17px",
    color: "var(--text-primary)",
  },
  closeBtn: {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "transparent",
    color: "var(--text-secondary)",
    padding: "6px 10px",
    cursor: "pointer",
  },
  video: {
    width: "100%",
    maxHeight: "290px",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "#0c111c",
  },
  helper: {
    margin: 0,
    fontSize: "12px",
    color: "var(--text-secondary)",
  },
  error: {
    margin: 0,
    color: "var(--error)",
    fontSize: "12px",
  },
  manualForm: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  label: {
    fontSize: "12px",
    color: "var(--text-secondary)",
    fontWeight: 600,
  },
  input: {
    border: "1px solid var(--border)",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
  },
  submitBtn: {
    border: "1px solid var(--accent)",
    background: "var(--accent)",
    color: "#080c14",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
