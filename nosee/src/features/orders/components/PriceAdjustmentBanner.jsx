/**
 * PriceAdjustmentBanner.jsx
 *
 * Banner de aprobación para el Caso B del spec:
 * El repartidor reportó un precio real > 5% más alto que el estimado.
 * El cliente debe aprobar el ajuste o rechazarlo (lo que cancela el pedido).
 *
 * Props:
 *   adjustment  — objeto { id, product_name, original_price, requested_price, created_at }
 *   onApprove   — async (adjustment) => void
 *   onReject    — async (adjustment) => void
 */

import { useState } from 'react';

export function PriceAdjustmentBanner({ adjustment, onApprove, onReject }) {
  const [loading, setLoading] = useState(false);

  const diff    = adjustment.requested_price - adjustment.original_price;
  const diffPct = ((diff / adjustment.original_price) * 100).toFixed(1);

  const handleApprove = async () => {
    setLoading(true);
    await onApprove(adjustment);
    setLoading(false);
  };

  const handleReject = async () => {
    setLoading(true);
    await onReject(adjustment);
    setLoading(false);
  };

  return (
    <div style={{
      padding: '14px 16px',
      background: 'var(--warning-soft, #fef9c3)',
      border: '2px solid var(--warning, #ca8a04)',
      borderRadius: 'var(--radius-md)',
      display: 'flex', flexDirection: 'column', gap: '10px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#92400e' }}>
            El repartidor solicita ajuste de precio
          </div>
          <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>
            El precio en tienda es {diffPct}% más alto que el estimado
          </div>
        </div>
      </div>

      {/* Detalle del producto */}
      <div style={{
        padding: '10px 12px',
        background: 'rgba(255,255,255,0.6)',
        borderRadius: 6,
        display: 'flex', flexDirection: 'column', gap: '4px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {adjustment.product_name ?? 'Producto'}
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text-muted)' }}>
            Estimado: <strong>${Number(adjustment.original_price).toLocaleString('es-CO')}</strong>
          </span>
          <span style={{ color: '#dc2626', fontWeight: 700 }}>
            Real: <strong>${Number(adjustment.requested_price).toLocaleString('es-CO')}</strong>
          </span>
          <span style={{ color: '#92400e', fontWeight: 700 }}>
            +${Number(diff).toLocaleString('es-CO')} ({diffPct}%)
          </span>
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={handleReject}
          disabled={loading}
          style={{
            flex: 1, padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--error, #dc2626)',
            background: 'transparent', color: 'var(--error, #dc2626)',
            fontSize: '12px', fontWeight: 700, cursor: 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          ✕ Rechazar (cancela el pedido)
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={loading}
          style={{
            flex: 1, padding: '10px 14px',
            borderRadius: 'var(--radius-sm)', border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontSize: '12px', fontWeight: 800, cursor: 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          ✓ Aprobar ajuste
        </button>
      </div>
    </div>
  );
}
