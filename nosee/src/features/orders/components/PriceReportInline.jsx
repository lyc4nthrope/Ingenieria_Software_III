/**
 * PriceReportInline.jsx
 *
 * Botón/formulario inline para reportar que el precio de un producto
 * está incorrecto y proponer el precio real.
 *
 * Se usa tanto en PedidosTab (usuario) como en DealerDashboard (repartidor).
 *
 * Uso:
 *   <PriceReportInline
 *     currentPrice={p.price}
 *     onConfirm={async (newPrice) => { ... }}
 *   />
 *
 * onConfirm recibe el nuevo precio (number) y debe devolver { error }.
 * El componente maneja loading/error internamente.
 */

import { useState } from 'react';

export function PriceReportInline({ currentPrice, onConfirm }) {
  const [open,    setOpen]    = useState(false);
  const [value,   setValue]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [done,    setDone]    = useState(false);

  const parsed = parseFloat(String(value).replace(/\./g, '').replace(',', '.'));
  const valid  = !isNaN(parsed) && parsed > 0 && parsed !== currentPrice;

  const handleConfirm = async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    const { error: err } = await onConfirm(parsed);
    setLoading(false);
    if (err) {
      setError('No se pudo actualizar. Intentá de nuevo.');
    } else {
      setDone(true);
      setOpen(false);
      setValue('');
      setTimeout(() => setDone(false), 3000);
    }
  };

  if (done) {
    return (
      <span style={s.doneMsg}>✓ Precio actualizado</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setOpen(true); setValue(String(currentPrice)); }}
        style={s.triggerBtn}
        title="Reportar precio incorrecto"
      >
        ⚑ precio
      </button>
    );
  }

  return (
    <div style={s.panel}>
      <span style={s.panelLabel}>Precio correcto:</span>
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(e) => { setValue(e.target.value); setError(null); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && valid) handleConfirm();
          if (e.key === 'Escape') { setOpen(false); setValue(''); }
        }}
        style={s.input}
        autoFocus
        placeholder="Ej: 3500"
      />
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!valid || loading}
        style={{ ...s.confirmBtn, opacity: (!valid || loading) ? 0.5 : 1 }}
      >
        {loading ? '...' : '✓'}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setValue(''); setError(null); }}
        style={s.cancelBtn}
      >
        ✕
      </button>
      {error && <span style={s.errorTxt}>{error}</span>}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  triggerBtn: {
    background: 'none',
    border: '1px solid var(--warning, #ca8a04)',
    borderRadius: '4px',
    color: '#92400e',
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 6px',
    cursor: 'pointer',
    flexShrink: 0,
    lineHeight: 1.4,
  },
  panel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'wrap',
    marginTop: '2px',
  },
  panelLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  input: {
    width: '80px',
    padding: '3px 7px',
    borderRadius: '4px',
    border: '1px solid var(--accent)',
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  },
  confirmBtn: {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 800,
    padding: '3px 8px',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-muted)',
    fontSize: '11px',
    padding: '3px 7px',
    cursor: 'pointer',
  },
  errorTxt: {
    fontSize: '10px',
    color: 'var(--error)',
    flexBasis: '100%',
  },
  doneMsg: {
    fontSize: '11px',
    color: 'var(--success, #16a34a)',
    fontWeight: 700,
  },
};
