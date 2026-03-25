import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function BarcodeScannerModal({ open, onClose, onDetected }) {
  const { t } = useLanguage();
  const tb = t.barcode;
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const detectorRef = useRef(null);
  const detectionLockRef = useRef(false);

  const [isStarting, setIsStarting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [errorType, setErrorType] = useState(null);
  const [supported, setSupported] = useState(true);
  const [retryKey, setRetryKey] = useState(0);

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
      setErrorType(null);
      setSupported(true);

      if (!navigator?.mediaDevices?.getUserMedia) {
        const isInsecure =
          typeof location !== "undefined" &&
          location.protocol === "http:" &&
          location.hostname !== "localhost";
        setSupported(false);
        setErrorType("noApi");
        setError(isInsecure ? tb.errorHttpsRequired : tb.noCameraPermission);
        setIsStarting(false);
        return;
      }

      if (typeof window?.BarcodeDetector !== "function") {
        setSupported(false);
        setErrorType("noSupport");
        setError(tb.noScanSupport);
        setIsStarting(false);
        return;
      }

      try {
        detectorRef.current = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
        });
      } catch {
        setSupported(false);
        setErrorType("detector");
        setError(tb.errorDetector);
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
        const name = cameraError?.name;
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setErrorType("permission");
          setError(tb.errorPermissionDenied);
        } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
          setErrorType("notFound");
          setError(tb.errorCameraNotFound);
        } else if (name === "NotReadableError" || name === "TrackStartError") {
          setErrorType("inUse");
          setError(tb.errorCameraInUse);
        } else {
          setErrorType("hardware");
          setError(tb.errorCamera);
        }
      } finally {
        setIsStarting(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, retryKey]);

  const handleRetry = () => setRetryKey((k) => k + 1);

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    const code = manualCode.trim();
    if (code.length < 4) {
      setError(tb.invalidCode);
      return;
    }

    setError("");
    await onDetected?.(code);
    onClose?.();
  };

  if (!open) return null;

  const canRetry = errorType === "permission" || errorType === "inUse";

  return (
    <div style={styles.overlay} onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div style={styles.modal} role="dialog" aria-modal="true" aria-label={tb.title}>
        <div style={styles.header}>
          <h3 style={styles.title}>{tb.title}</h3>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label={tb.close}>
            {tb.close}
          </button>
        </div>

        {supported && (
          <video
            ref={videoRef}
            style={styles.video}
            muted
            autoPlay
            playsInline
            aria-label={tb.cameraAria}
          />
        )}

        {isStarting && <p style={styles.helper}>{tb.startingCamera}</p>}

        {error && (
          <div style={styles.errorBox}>
            <p style={styles.errorText}>{error}</p>
            {errorType === "permission" && (
              <p style={styles.hintText}>{tb.permissionBrowserHint}</p>
            )}
            {canRetry && (
              <button type="button" onClick={handleRetry} style={styles.retryBtn}>
                {tb.retry}
              </button>
            )}
          </div>
        )}

        <form style={styles.manualForm} onSubmit={handleManualSubmit}>
          <label htmlFor="manual-barcode" style={styles.label}>
            {tb.manualInput}
          </label>
          <input
            id="manual-barcode"
            type="text"
            value={manualCode}
            onChange={(event) => setManualCode(event.target.value)}
            style={styles.input}
            placeholder={tb.placeholder}
            autoComplete="off"
          />
          <button type="submit" style={styles.submitBtn}>
            {tb.useCode}
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
    maxHeight: "calc(100dvh - 32px)",
    overflowY: "auto",
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
    flexShrink: 0,
  },
  video: {
    width: "100%",
    maxHeight: "min(290px, 40vh)",
    borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border)",
    background: "#0c111c",
  },
  helper: {
    margin: 0,
    fontSize: "12px",
    color: "var(--text-secondary)",
  },
  errorBox: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    padding: "10px 12px",
    background: "color-mix(in srgb, var(--error) 10%, transparent)",
    border: "1px solid color-mix(in srgb, var(--error) 35%, transparent)",
    borderRadius: "var(--radius-sm)",
  },
  errorText: {
    margin: 0,
    color: "var(--error)",
    fontSize: "13px",
    fontWeight: 600,
  },
  hintText: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "12px",
  },
  retryBtn: {
    alignSelf: "flex-start",
    marginTop: "2px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
    padding: "6px 14px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
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
