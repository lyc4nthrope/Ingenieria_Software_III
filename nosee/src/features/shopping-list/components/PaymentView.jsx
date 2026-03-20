/**
 * PaymentView.jsx
 *
 * Vista de pago por transferencia manual (Nu / Nequi).
 * Se muestra cuando el repartidor llega a la puerta (status 'llegando').
 *
 * FLUJO:
 *   1. Usuario elige Nu o Nequi
 *   2. Ve los datos de la cuenta y (en Nequi) el QR
 *   3. Hace la transferencia desde su app bancaria
 *   4. Sube la foto del comprobante
 *   5. Confirma el pago → se guarda en Supabase
 */

import { useState, useRef } from 'react';
import { uploadReceipt, createPayment } from '@/services/api/payments.api';
import qrNequi from '@/assets/qr-nequi.png';

// ─── Logos SVG de las pasarelas ───────────────────────────────────────────────

// Logo Nu: fondo morado + wordmark "nu" recreado con paths SVG (arco n + arco u)
function NuLogo({ size = 22 }) {
  // Trazo grueso + patas clipeadas en los bordes del badge, igual al wordmark real.
  return (
    <svg
      width={Math.round(size * 1.45)}
      height={size}
      viewBox="0 0 52 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Nu"
    >
      <rect width="52" height="36" rx="6" fill="#820AD1"/>
      {/* 'n': patas bajan y se clipean en el borde inferior */}
      <path d="M7 39 L7 15 C7 2 23 2 23 15 L23 39"
        stroke="white" strokeWidth="8" strokeLinecap="butt" fill="none"/>
      {/* 'u': patas suben y se clipean en el borde superior */}
      <path d="M29 -3 L29 21 C29 34 45 34 45 21 L45 -3"
        stroke="white" strokeWidth="8" strokeLinecap="butt" fill="none"/>
    </svg>
  );
}

// Logo Nequi: punto magenta arriba-izquierda + "N" en morado oscuro sobre fondo transparente
function NequiLogo({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Nequi">
      {/* Punto magenta */}
      <rect x="2" y="4" width="9" height="9" rx="2" fill="#FF0080"/>
      {/* N en morado oscuro */}
      <text
        x="22" y="36"
        textAnchor="middle"
        fill="#1a002e"
        fontFamily="'Arial Black', 'Arial Bold', sans-serif"
        fontSize="34"
        fontWeight="900"
        fontStyle="italic"
      >
        N
      </text>
    </svg>
  );
}

// ─── Datos de las cuentas ─────────────────────────────────────────────────────
const ACCOUNTS = {
  nequi: {
    label: 'Nequi',
    color: '#1a002e',
    colorSoft: '#f5e6ff',
    Logo: NequiLogo,
    fields: [
      { label: 'Número de celular', value: '314 380 8044' },
      { label: 'Llave Bre (alias)', value: '@3143808044' },
    ],
    showQr: true,
  },
  nu: {
    label: 'Nu',
    color: '#820AD1',
    colorSoft: '#f3e8ff',
    Logo: NuLogo,
    fields: [
      { label: 'Número de cuenta', value: '5288 9218 6535 5829' },
      { label: 'Llave Bre (alias)', value: '@OSO782' },
    ],
    showQr: false,
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export function PaymentView({ order, userId, onPaymentSubmitted }) {
  const [tab, setTab]               = useState('nequi');
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [error, setError]           = useState(null);
  const [copied, setCopied]         = useState(null); // clave copiada
  const fileInputRef                = useRef(null);

  const account = ACCOUNTS[tab];

  // Monto total: productos + tarifa de domicilio
  const totalAmount = (order.result?.totalCost ?? 0) + (order.result?.deliveryFee ?? 8000);

  // ── Seleccionar archivo ──────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    // Preview local inmediata — no necesita subir para mostrar
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  // ── Copiar al portapapeles ─────────────────────────────────────────────
  const handleCopy = (value, key) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── Confirmar pago ────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    // 1. Subir comprobante a Storage
    const { url, path, error: uploadErr } = await uploadReceipt(
      userId,
      order.supabaseId ?? order.id,
      file
    );

    if (uploadErr) {
      setError('No se pudo subir el comprobante. Verificá tu conexión e intentá de nuevo.');
      setUploading(false);
      return;
    }

    // 2. Registrar el pago en la tabla payments
    const { error: payErr } = await createPayment({
      orderId:     order.supabaseId,
      userId,
      amount:      totalAmount,
      method:      tab,
      receiptUrl:  url,
      receiptPath: path,
    });

    if (payErr) {
      setError('Comprobante subido, pero hubo un error al registrar el pago. Mostrá el comprobante al repartidor.');
      // No bloqueamos — el comprobante YA está en Storage
    }

    setUploading(false);
    // Notificar al padre para que actualice el deliveryStatus
    onPaymentSubmitted({ receiptUrl: url, method: tab });
  };

  return (
    <div style={s.root}>
      {/* ── Encabezado ── */}
      <div style={s.header}>
        <span style={s.headerIcon}>💳</span>
        <div>
          <p style={s.headerTitle}>Realizar pago</p>
          <p style={s.headerAmount}>
            Total a transferir:{' '}
            <strong style={{ color: 'var(--accent)' }}>
              ${totalAmount.toLocaleString('es-CO')} COP
            </strong>
          </p>
          <p style={s.headerSub}>productos + tarifa de domicilio</p>
        </div>
      </div>

      {/* ── Tabs Nu / Nequi ── */}
      <div style={s.tabs}>
        {Object.entries(ACCOUNTS).map(([key, acc]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            style={{
              ...s.tab,
              ...(tab === key ? { ...s.tabActive, borderColor: acc.color, color: acc.color, background: acc.colorSoft } : {}),
            }}
          >
            <acc.Logo size={20} />
            {acc.label}
          </button>
        ))}
      </div>

      {/* ── Datos de la cuenta ── */}
      <div style={{ ...s.accountCard, borderColor: account.color + '55' }}>
        {account.fields.map((f) => (
          <div key={f.label} style={s.fieldRow}>
            <div>
              <p style={s.fieldLabel}>{f.label}</p>
              <p style={s.fieldValue}>{f.value}</p>
            </div>
            <button
              type="button"
              onClick={() => handleCopy(f.value.replace(/\s/g, ''), f.label)}
              style={{ ...s.copyBtn, borderColor: account.color, color: account.color }}
            >
              {copied === f.label ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        ))}

        {/* QR solo para Nequi */}
        {account.showQr && (
          <div style={s.qrWrap}>
            <img
              src={qrNequi}
              alt="QR Nequi"
              style={s.qrImg}
            />
            <p style={s.qrHint}>Escaneá desde tu app de Nequi</p>
          </div>
        )}
      </div>

      {/* ── Subir comprobante ── */}
      <div style={s.uploadSection}>
        <p style={s.uploadLabel}>
          📎 Sube la foto del comprobante de pago
        </p>
        <p style={s.uploadHint}>
          El pago se confirma solo cuando el comprobante esté subido.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"   // en móvil abre directamente la cámara
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {/* Preview del comprobante */}
        {preview ? (
          <div style={s.previewWrap}>
            <img src={preview} alt="Comprobante" style={s.previewImg} />
            <button
              type="button"
              onClick={() => { setFile(null); setPreview(null); fileInputRef.current.value = ''; }}
              style={s.changeBtn}
            >
              Cambiar foto
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={s.uploadBtn}
          >
            📷 Tomar foto / Seleccionar comprobante
          </button>
        )}
      </div>

      {/* ── Error ── */}
      {error && <p style={s.errorMsg}>{error}</p>}

      {/* ── Confirmar ── */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!file || uploading}
        style={{
          ...s.confirmBtn,
          ...(!file || uploading ? s.confirmBtnDisabled : {}),
        }}
      >
        {uploading
          ? 'Subiendo comprobante...'
          : !file
            ? 'Primero sube el comprobante'
            : '✓ Confirmar pago'}
      </button>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    padding: '16px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  header: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  headerIcon: { fontSize: '28px', flexShrink: 0 },
  headerTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  headerAmount: {
    margin: '2px 0 0',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  headerSub: {
    margin: '1px 0 0',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
  },
  tab: {
    flex: 1,
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '7px',
  },
  tabActive: {
    fontWeight: 800,
  },
  accountCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    padding: '14px',
    background: 'var(--bg-base)',
    border: '1px solid',
    borderRadius: 'var(--radius-md)',
  },
  fieldRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  fieldLabel: {
    margin: 0,
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  fieldValue: {
    margin: '2px 0 0',
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '0.02em',
  },
  copyBtn: {
    flexShrink: 0,
    padding: '5px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid',
    background: 'transparent',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  qrWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    paddingTop: '6px',
    borderTop: '1px solid var(--border)',
  },
  qrImg: {
    width: '180px',
    height: '180px',
    borderRadius: '8px',
    objectFit: 'contain',
  },
  qrHint: {
    margin: 0,
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  uploadSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '12px 14px',
    background: 'var(--bg-elevated)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  uploadLabel: {
    margin: 0,
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  uploadHint: {
    margin: 0,
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  uploadBtn: {
    marginTop: '4px',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '2px dashed var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center',
  },
  previewWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  previewImg: {
    width: '100%',
    maxWidth: '260px',
    maxHeight: '200px',
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid var(--border)',
  },
  changeBtn: {
    padding: '5px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    cursor: 'pointer',
  },
  errorMsg: {
    margin: 0,
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--error-soft, #fee2e2)',
    border: '1px solid var(--error, #dc2626)',
    color: 'var(--error, #dc2626)',
    fontSize: '12px',
  },
  confirmBtn: {
    padding: '13px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 800,
    cursor: 'pointer',
    width: '100%',
  },
  confirmBtnDisabled: {
    background: 'var(--bg-elevated)',
    color: 'var(--text-muted)',
    cursor: 'not-allowed',
  },
};
