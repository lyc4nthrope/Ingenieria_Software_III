/**
 * DealerBankSection.jsx
 *
 * Sección del perfil del repartidor para gestionar sus métodos de pago.
 * Permite agregar cuentas (Nequi, Nu, Daviplata, Bancolombia, Otro)
 * con número de cuenta, alias/Llave Bre y QR opcional.
 *
 * Solo se renderiza cuando user.role === 'Repartidor'.
 */

import { useState, useEffect, useRef } from 'react';
import {
  getDealerBankAccounts,
  addDealerBankAccount,
  deleteDealerBankAccount,
  uploadQrImage,
} from '@/services/api/bankAccounts.api';

// ─── Config de métodos ────────────────────────────────────────────────────────
const METHODS = [
  { value: 'nequi',      label: 'Nequi',       emoji: '💜', color: '#6b21a8' },
  { value: 'nu',         label: 'Nu',           emoji: '🟣', color: '#7c3aed' },
  { value: 'daviplata',  label: 'Daviplata',    emoji: '🔵', color: '#1d4ed8' },
  { value: 'bancolombia',label: 'Bancolombia',  emoji: '🟡', color: '#d97706' },
  { value: 'otro',       label: 'Otro',         emoji: '🏦', color: '#374151' },
];

function methodInfo(method) {
  return METHODS.find((m) => m.value === method) ?? METHODS[4];
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function DealerBankSection({ dealerId }) {
  const [accounts,  setAccounts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [deleting,  setDeleting]  = useState(null); // id del que se está eliminando

  // Form state
  const [form, setForm]       = useState({ method: 'nequi', label: '', accountNumber: '', alias: '' });
  const [qrFile, setQrFile]   = useState(null);
  const [qrPreview, setQrPreview] = useState(null);
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);

  // ── Carga inicial ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dealerId) return;
    getDealerBankAccounts(dealerId).then(({ data }) => {
      setAccounts(data);
      setLoading(false);
    });
  }, [dealerId]);

  // ── QR preview ────────────────────────────────────────────────────────────
  const handleQrFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setQrFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setQrPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  // ── Guardar cuenta ────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.accountNumber.trim() && !form.alias.trim()) {
      setFormError('Ingresá al menos el número de cuenta o el alias.');
      return;
    }

    setSaving(true);
    setFormError(null);

    // Subir QR si hay imagen
    let qrUrl = null;
    if (qrFile) {
      const { url, error: qrErr } = await uploadQrImage(qrFile);
      if (qrErr) {
        setFormError('No se pudo subir el QR. El resto de los datos se guardará igual.');
      } else {
        qrUrl = url;
      }
    }

    const { data, error } = await addDealerBankAccount({
      dealerId,
      method:        form.method,
      label:         form.label.trim() || null,
      accountNumber: form.accountNumber.trim() || null,
      alias:         form.alias.trim() || null,
      qrUrl,
    });

    setSaving(false);

    if (error) {
      setFormError('No se pudo guardar la cuenta. Intentá de nuevo.');
      return;
    }

    setAccounts((prev) => [...prev, data]);
    setShowForm(false);
    setForm({ method: 'nequi', label: '', accountNumber: '', alias: '' });
    setQrFile(null);
    setQrPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Eliminar cuenta ───────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(id);
    const { error } = await deleteDealerBankAccount(id);
    setDeleting(null);
    if (!error) setAccounts((prev) => prev.filter((a) => a.id !== id));
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      <div style={s.sectionHeader}>
        <div>
          <h2 style={s.title}>Métodos de cobro</h2>
          <p style={s.subtitle}>
            Los clientes verán estos datos cuando sea momento de pagar.
          </p>
        </div>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)} style={s.addBtn}>
            + Agregar
          </button>
        )}
      </div>

      {/* ── Lista de cuentas ── */}
      {loading ? (
        <p style={s.muted}>Cargando...</p>
      ) : accounts.length === 0 && !showForm ? (
        <div style={s.empty}>
          <span style={{ fontSize: 28 }}>🏦</span>
          <p style={s.emptyText}>
            Aún no tenés métodos de cobro.<br />
            Agregá uno para poder aceptar pedidos.
          </p>
        </div>
      ) : (
        <div style={s.accountList}>
          {accounts.map((acc) => {
            const m = methodInfo(acc.method);
            return (
              <div key={acc.id} style={{ ...s.accountCard, borderColor: m.color + '55' }}>
                {/* Encabezado */}
                <div style={s.accountTop}>
                  <span style={{ ...s.methodBadge, background: m.color + '18', color: m.color }}>
                    {m.emoji} {m.label}
                  </span>
                  {acc.label && <span style={s.accountLabel}>{acc.label}</span>}
                  <button
                    type="button"
                    onClick={() => handleDelete(acc.id)}
                    disabled={deleting === acc.id}
                    style={s.deleteBtn}
                    title="Eliminar cuenta"
                  >
                    {deleting === acc.id ? '...' : '✕'}
                  </button>
                </div>

                {/* Datos */}
                <div style={s.accountFields}>
                  {acc.account_number && (
                    <div style={s.fieldRow}>
                      <span style={s.fieldLabel}>Número</span>
                      <span style={s.fieldValue}>{acc.account_number}</span>
                    </div>
                  )}
                  {acc.alias && (
                    <div style={s.fieldRow}>
                      <span style={s.fieldLabel}>Alias / Llave Bre</span>
                      <span style={s.fieldValue}>{acc.alias}</span>
                    </div>
                  )}
                </div>

                {/* QR */}
                {acc.qr_url && (
                  <div style={s.qrWrap}>
                    <img src={acc.qr_url} alt={`QR ${m.label}`} style={s.qrImg} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Formulario de nueva cuenta ── */}
      {showForm && (
        <div style={s.form}>
          <p style={s.formTitle}>Nueva cuenta de cobro</p>

          {/* Método */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Entidad</label>
            <div style={s.methodGrid}>
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, method: m.value }))}
                  style={{
                    ...s.methodOption,
                    ...(form.method === m.value
                      ? { borderColor: m.color, background: m.color + '15', color: m.color, fontWeight: 800 }
                      : {}),
                  }}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Etiqueta opcional */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Nombre descriptivo (opcional)</label>
            <input
              type="text"
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="Ej: Nequi personal"
              style={s.input}
            />
          </div>

          {/* Número de cuenta */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Número de cuenta / celular</label>
            <input
              type="text"
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
              placeholder="Ej: 3001234567 o 4532000011112222"
              style={s.input}
            />
          </div>

          {/* Alias / Llave Bre */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Alias / Llave Bre (opcional)</label>
            <input
              type="text"
              value={form.alias}
              onChange={(e) => setForm((p) => ({ ...p, alias: e.target.value }))}
              placeholder="Ej: @mialiasaqui"
              style={s.input}
            />
          </div>

          {/* QR */}
          <div style={s.fieldGroup}>
            <label style={s.label}>Código QR (opcional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleQrFile}
              style={{ display: 'none' }}
            />
            {qrPreview ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                <img src={qrPreview} alt="QR preview" style={s.qrImg} />
                <button
                  type="button"
                  onClick={() => { setQrFile(null); setQrPreview(null); fileInputRef.current.value = ''; }}
                  style={s.ghostBtn}
                >
                  Cambiar QR
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={s.uploadBtn}
              >
                📷 Seleccionar imagen del QR
              </button>
            )}
          </div>

          {/* Error */}
          {formError && <p style={s.errorMsg}>{formError}</p>}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }}
            >
              {saving ? 'Guardando...' : '✓ Guardar cuenta'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm({ method: 'nequi', label: '', accountNumber: '', alias: '' });
                setQrFile(null);
                setQrPreview(null);
                setFormError(null);
              }}
              style={s.ghostBtn}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  root: {
    marginTop: '20px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '20px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  title: { fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  subtitle: { fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' },
  muted: { fontSize: '13px', color: 'var(--text-muted)', margin: 0 },
  addBtn: {
    flexShrink: 0,
    padding: '7px 14px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '20px 0',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  emptyText: { fontSize: '13px', lineHeight: 1.6, margin: 0 },
  accountList: { display: 'flex', flexDirection: 'column', gap: 12 },
  accountCard: {
    padding: '14px 16px',
    border: '1px solid',
    borderRadius: 'var(--radius-md)',
    background: 'var(--bg-elevated)',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  accountTop: { display: 'flex', alignItems: 'center', gap: 8 },
  methodBadge: {
    fontSize: '12px',
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 6,
  },
  accountLabel: { fontSize: '12px', color: 'var(--text-muted)', flex: 1 },
  deleteBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-muted)',
    fontSize: '11px',
    padding: '2px 8px',
    cursor: 'pointer',
  },
  accountFields: { display: 'flex', flexDirection: 'column', gap: 6 },
  fieldRow: { display: 'flex', gap: 10, alignItems: 'center' },
  fieldLabel: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, minWidth: 110, textTransform: 'uppercase', letterSpacing: '0.04em' },
  fieldValue: { fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em' },
  qrWrap: { paddingTop: 8, borderTop: '1px solid var(--border)' },
  qrImg: { width: 140, height: 140, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--border)' },
  // Form
  form: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  formTitle: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' },
  methodGrid: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  methodOption: {
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-muted)',
    fontSize: '12px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  input: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    outline: 'none',
  },
  uploadBtn: {
    padding: '9px 14px',
    borderRadius: 'var(--radius-sm)',
    border: '2px dashed var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
  },
  saveBtn: {
    padding: '9px 18px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghostBtn: {
    padding: '9px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '13px',
    cursor: 'pointer',
  },
  errorMsg: {
    margin: 0,
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--error-soft, #fee2e2)',
    border: '1px solid var(--error, #dc2626)',
    color: 'var(--error, #dc2626)',
    fontSize: '12px',
  },
};
