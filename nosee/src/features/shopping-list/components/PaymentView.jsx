/**
 * PaymentView.jsx
 *
 * Vista de pago por transferencia manual.
 * Muestra las cuentas bancarias reales del repartidor asignado al pedido
 * (cargadas desde dealer_bank_accounts). Si el repartidor no configuró
 * cuentas, muestra un aviso claro.
 *
 * FLUJO:
 *   1. Usuario elige la cuenta del repartidor (tab por cada método)
 *   2. Ve los datos y (si hay) el QR
 *   3. Hace la transferencia desde su app bancaria
 *   4. Sube la foto del comprobante
 *   5. Confirma → se guarda en Supabase (payments)
 */

import { useState, useRef } from 'react';
import { uploadReceipt, createPayment } from '@/services/api/payments.api';
import { submitPaymentReceipt } from '@/services/api/orders.api';

// ─── Emojis / colores por método ─────────────────────────────────────────────
const METHOD_META = {
  nequi:       { emoji: '💜', color: '#6b21a8', colorSoft: '#f3e8ff' },
  nu:          { emoji: '🟣', color: '#7c3aed', colorSoft: '#ede9fe' },
  daviplata:   { emoji: '🔵', color: '#1d4ed8', colorSoft: '#dbeafe' },
  bancolombia: { emoji: '🟡', color: '#d97706', colorSoft: '#fef3c7' },
  otro:        { emoji: '🏦', color: '#374151', colorSoft: '#f3f4f6' },
};

function meta(method) {
  return METHOD_META[method] ?? METHOD_META.otro;
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function PaymentView({ order, userId, bankAccounts = [], onPaymentSubmitted }) {
  const [mode,      setMode]      = useState('transferencia'); // 'transferencia' | 'efectivo'
  const [tabIdx,    setTabIdx]    = useState(0);
  const [file,      setFile]      = useState(null);
  const [preview,   setPreview]   = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);
  const [copied,    setCopied]    = useState(null);
  const fileInputRef = useRef(null);

  const totalAmount = (order.result?.totalCost ?? 0) + (order.result?.deliveryFee ?? 8000);
  const orderId     = order.supabaseId ?? order.id;

  // account y m solo son válidos en modo transferencia con cuentas disponibles
  const account = bankAccounts[tabIdx] ?? bankAccounts[0] ?? null;
  const m       = account ? meta(account.method) : meta('otro');

  // ── Seleccionar archivo ────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  // ── Copiar al portapapeles ─────────────────────────────────────────────────
  const handleCopy = (value, key) => {
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  // ── Confirmar pago en efectivo ─────────────────────────────────────────────
  const handleCashConfirm = async () => {
    setUploading(true);
    setError(null);
    const { error: err } = await submitPaymentReceipt(orderId, 'efectivo', null);
    setUploading(false);
    if (err) { setError('Error al registrar el pago en efectivo. Intentá de nuevo.'); return; }
    onPaymentSubmitted({ receiptUrl: null, method: 'efectivo' });
  };

  // ── Confirmar pago por transferencia ───────────────────────────────────────
  const handleConfirm = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    const { url, path, error: uploadErr } = await uploadReceipt(userId, orderId, file);

    if (uploadErr) {
      setError('No se pudo subir el comprobante. Verificá tu conexión e intentá de nuevo.');
      setUploading(false);
      return;
    }

    const { error: payErr } = await createPayment({
      orderId:     orderId,
      userId,
      amount:      totalAmount,
      method:      account.method,
      receiptUrl:  url,
      receiptPath: path,
    });

    if (payErr) {
      setError('Comprobante subido, pero hubo un error al registrar el pago. Mostrá el comprobante al repartidor.');
    }

    // Cambiar el status del pedido a pendiente_pago para notificar al repartidor
    await submitPaymentReceipt(orderId, 'transferencia', path);

    setUploading(false);
    onPaymentSubmitted({ receiptUrl: url, method: account.method });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* ── Encabezado ── */}
      <div style={s.header}>
        <span style={s.headerIcon}>💳</span>
        <div>
          <p style={s.headerTitle}>Realizar pago al repartidor</p>
          <p style={s.headerAmount}>
            Total a pagar:{' '}
            <strong style={{ color: 'var(--accent)' }}>
              ${totalAmount.toLocaleString('es-CO')} COP
            </strong>
          </p>
          <p style={s.headerSub}>productos + tarifa de domicilio</p>
        </div>
      </div>

      {/* ── Selector de modo: transferencia o efectivo ── */}
      <div style={s.modeTabs}>
        <button
          type="button"
          onClick={() => setMode('transferencia')}
          style={{ ...s.modeTab, ...(mode === 'transferencia' ? s.modeTabActive : {}) }}
        >
          🏦 Transferencia
        </button>
        <button
          type="button"
          onClick={() => setMode('efectivo')}
          style={{ ...s.modeTab, ...(mode === 'efectivo' ? s.modeTabActive : {}) }}
        >
          💵 Efectivo
        </button>
      </div>

      {/* ── Modo EFECTIVO ── */}
      {mode === 'efectivo' && (
        <div style={s.cashBox}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
            💵 Pago en efectivo
          </p>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Prepará el efectivo por el monto indicado arriba. Al confirmar le avisamos al repartidor que pagarás en efectivo y él verificará el monto al entregarte el pedido.
          </p>
          {error && <p style={s.errorMsg}>{error}</p>}
          <button
            type="button"
            onClick={handleCashConfirm}
            disabled={uploading}
            style={{ ...s.confirmBtn, ...(uploading ? s.confirmBtnDisabled : {}) }}
          >
            {uploading ? 'Enviando...' : '✓ Confirmar pago en efectivo'}
          </button>
        </div>
      )}

      {/* ── Modo TRANSFERENCIA ── */}
      {mode === 'transferencia' && bankAccounts.length === 0 && (
        <div style={s.emptyAccounts}>
          <span style={{ fontSize: 32 }}>🏦</span>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
            El repartidor no ha configurado métodos de pago
          </p>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Usá la opción de efectivo o pedile que configure sus datos bancarios en su perfil.
          </p>
        </div>
      )}

      {/* ── Tabs por cada cuenta del repartidor (solo en modo transferencia) ── */}
      {mode === 'transferencia' && bankAccounts.length > 1 && (
        <div style={s.tabs}>
          {bankAccounts.map((acc, i) => {
            const mm = meta(acc.method);
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setTabIdx(i)}
                style={{
                  ...s.tab,
                  ...(tabIdx === i
                    ? { ...s.tabActive, borderColor: mm.color, color: mm.color, background: mm.colorSoft }
                    : {}),
                }}
              >
                {mm.emoji} {acc.label || acc.method}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Contenido de transferencia ── */}
      {mode === 'transferencia' && bankAccounts.length > 0 && (
        <>
          {/* Datos de la cuenta */}
          <div style={{ ...s.accountCard, borderColor: m.color + '55' }}>
            <div style={s.accountHeader}>
              <span style={{ ...s.methodBadge, background: m.colorSoft, color: m.color }}>
                {m.emoji} {account.label || account.method}
              </span>
            </div>

            {account.account_number && (
              <div style={s.fieldRow}>
                <div>
                  <p style={s.fieldLabel}>Número de cuenta / celular</p>
                  <p style={s.fieldValue}>{account.account_number}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(account.account_number, 'number')}
                  style={{ ...s.copyBtn, borderColor: m.color, color: m.color }}
                >
                  {copied === 'number' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            )}

            {account.alias && (
              <div style={s.fieldRow}>
                <div>
                  <p style={s.fieldLabel}>Alias / Llave Bre</p>
                  <p style={s.fieldValue}>{account.alias}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(account.alias, 'alias')}
                  style={{ ...s.copyBtn, borderColor: m.color, color: m.color }}
                >
                  {copied === 'alias' ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            )}

            {account.qr_url && (
              <div style={s.qrWrap}>
                <img src={account.qr_url} alt={`QR ${account.method}`} style={s.qrImg} />
                <p style={s.qrHint}>Escaneá desde tu app bancaria</p>
              </div>
            )}
          </div>

          {/* Subir comprobante */}
          <div style={s.uploadSection}>
            <p style={s.uploadLabel}>📎 Subí la foto del comprobante de pago</p>
            <p style={s.uploadHint}>El pago se confirma solo cuando el comprobante esté subido.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />

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

          {error && <p style={s.errorMsg}>{error}</p>}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!file || uploading}
            style={{ ...s.confirmBtn, ...(!file || uploading ? s.confirmBtnDisabled : {}) }}
          >
            {uploading ? 'Subiendo comprobante...' : !file ? 'Primero subí el comprobante' : '✓ Confirmar pago'}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  root: {
    display: 'flex', flexDirection: 'column', gap: '14px',
    padding: '16px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  emptyAccounts: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 10, padding: '20px 0', textAlign: 'center',
  },
  modeTabs: { display: 'flex', gap: '8px' },
  modeTab: {
    flex: 1, padding: '9px 14px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'var(--bg-base)',
    color: 'var(--text-muted)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
  modeTabActive: {
    background: 'var(--accent-soft, #e0e7ff)', color: 'var(--accent)',
    border: '1px solid var(--accent)', fontWeight: 800,
  },
  cashBox: {
    display: 'flex', flexDirection: 'column', gap: '10px',
    padding: '16px', background: 'var(--bg-elevated)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  header: { display: 'flex', gap: '12px', alignItems: 'flex-start' },
  headerIcon: { fontSize: '28px', flexShrink: 0 },
  headerTitle: { margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' },
  headerAmount: { margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' },
  headerSub: { margin: '1px 0 0', fontSize: '11px', color: 'var(--text-muted)' },
  tabs: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tab: {
    flex: 1, minWidth: 80,
    padding: '9px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-base)', color: 'var(--text-muted)',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer',
  },
  tabActive: { fontWeight: 800 },
  accountCard: {
    display: 'flex', flexDirection: 'column', gap: '10px',
    padding: '14px',
    background: 'var(--bg-base)',
    border: '1px solid',
    borderRadius: 'var(--radius-md)',
  },
  accountHeader: { display: 'flex', alignItems: 'center' },
  methodBadge: {
    fontSize: '13px', fontWeight: 700,
    padding: '4px 12px', borderRadius: 6,
  },
  fieldRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', gap: '8px',
  },
  fieldLabel: {
    margin: 0, fontSize: '11px', color: 'var(--text-muted)',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  fieldValue: {
    margin: '2px 0 0', fontSize: '14px', fontWeight: 700,
    color: 'var(--text-primary)', letterSpacing: '0.02em',
  },
  copyBtn: {
    flexShrink: 0, padding: '5px 10px', borderRadius: 'var(--radius-sm)',
    border: '1px solid', background: 'transparent',
    fontSize: '11px', fontWeight: 700, cursor: 'pointer',
  },
  qrWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--border)',
  },
  qrImg: {
    width: '180px', height: '180px',
    borderRadius: '8px', objectFit: 'contain',
  },
  qrHint: { margin: 0, fontSize: '11px', color: 'var(--text-muted)' },
  uploadSection: {
    display: 'flex', flexDirection: 'column', gap: '6px',
    padding: '12px 14px',
    background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  uploadLabel: { margin: 0, fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' },
  uploadHint: { margin: 0, fontSize: '11px', color: 'var(--text-muted)' },
  uploadBtn: {
    marginTop: '4px', padding: '10px 14px',
    borderRadius: 'var(--radius-sm)', border: '2px dashed var(--border)',
    background: 'var(--bg-surface)', color: 'var(--accent)',
    fontSize: '13px', fontWeight: 700, cursor: 'pointer', textAlign: 'center',
  },
  previewWrap: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '8px', marginTop: '4px',
  },
  previewImg: {
    width: '100%', maxWidth: '260px', maxHeight: '200px',
    objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)',
  },
  changeBtn: {
    padding: '5px 12px', borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)', background: 'transparent',
    color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer',
  },
  errorMsg: {
    margin: 0, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
    background: 'var(--error-soft, #fee2e2)',
    border: '1px solid var(--error, #dc2626)',
    color: 'var(--error, #dc2626)', fontSize: '12px',
  },
  confirmBtn: {
    padding: '13px', borderRadius: 'var(--radius-md)',
    border: 'none', background: 'var(--accent)',
    color: '#fff', fontSize: '14px', fontWeight: 800,
    cursor: 'pointer', width: '100%',
  },
  confirmBtnDisabled: {
    background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'not-allowed',
  },
};
