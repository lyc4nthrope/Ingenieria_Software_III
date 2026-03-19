import { DELIVERY_FEE } from '../utils/shoppingListUtils';

// ─── Tarjeta de estado de domicilio ───────────────────────────────────────────
export function DeliveryCard({ order, onCancel }) {
  const { deliveryStatus, cancellationCharged } = order;
  if (!deliveryStatus || deliveryStatus === null) return null;

  const configs = {
    searching: {
      icon: '🛵', bg: 'var(--warning-soft, #fef9c3)', border: 'var(--warning, #ca8a04)',
      color: '#92400e',
      title: 'Buscando repartidor...',
      desc: 'Tu pedido está en cola de asignación',
      showCancel: true, cancelFree: true,
    },
    found: {
      icon: '✓', bg: 'var(--bg-elevated)', border: 'var(--accent)',
      color: 'var(--accent)',
      title: 'Repartidor asignado',
      desc: 'Sigue su ubicación en tiempo real en el mapa →',
      showCancel: true, cancelFree: false,
    },
    en_camino: {
      icon: '🛵', bg: 'var(--success-soft, #dcfce7)', border: 'var(--success, #16a34a)',
      color: 'var(--success, #16a34a)',
      title: 'En camino a tu ubicación',
      desc: 'Sigue su posición en tiempo real en el mapa →',
      showCancel: false, cancelFree: false, showFee: true,
    },
    cancelled: {
      icon: '✗', bg: 'var(--error-soft, #fee2e2)', border: 'var(--error, #dc2626)',
      color: 'var(--error, #dc2626)',
      title: 'Envío cancelado',
      desc: cancellationCharged
        ? 'Se cobrará el costo del domicilio — el pedido no fue comprado'
        : 'Cancelado sin costo adicional',
      showCancel: false, cancelFree: false,
    },
  };

  const cfg = configs[deliveryStatus];
  if (!cfg) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '10px 14px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 'var(--radius-md)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: cfg.color }}>{cfg.icon}</span>
          <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>{cfg.title}</span>
        </div>
        {cfg.showCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              flexShrink: 0, padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              border: `1px solid ${cfg.border}`,
              background: 'transparent', color: cfg.color,
              fontSize: '11px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            {cfg.cancelFree ? 'Cancelar envío' : 'Cancelar (se cobra domicilio)'}
          </button>
        )}
      </div>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '23px' }}>
        {cfg.desc}
      </span>
      {cfg.showFee && (
        <span style={{ fontSize: '11px', fontWeight: 700, paddingLeft: '23px', color: 'var(--success, #16a34a)' }}>
          Costo domicilio estimado: ${DELIVERY_FEE.toLocaleString('es-CO')} COP
          <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> · tarifa Proceso 4</span>
        </span>
      )}
    </div>
  );
}
