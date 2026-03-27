import { useState, useEffect } from 'react';
import { DELIVERY_FEE } from '../utils/shoppingListUtils';
import { PaymentView } from './PaymentView';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getDealerBankAccounts } from '@/services/api/bankAccounts.api';

// ─── Configuración visual de cada estado ─────────────────────────────────────
const STATUS_CONFIGS = {
  searching: {
    icon: '🛵', bg: 'var(--warning-soft, #fef9c3)', border: 'var(--warning, #ca8a04)',
    color: '#92400e',
    title: 'Buscando repartidor...',
    desc: 'Tu pedido está en cola de asignación.',
    showCancel: true, cancelFree: true,
  },
  found: {
    icon: '✓', bg: 'var(--bg-elevated)', border: 'var(--accent)',
    color: 'var(--accent)',
    title: 'Repartidor asignado',
    desc: 'Sigue su ubicación en tiempo real en el mapa →',
    showCancel: true, cancelFree: false,
  },
  comprando: {
    icon: '🛒', bg: 'var(--bg-elevated)', border: 'var(--accent)',
    color: 'var(--accent)',
    title: 'Comprando tus productos',
    desc: 'El repartidor está comprando en las tiendas indicadas.',
    showCancel: false,
  },
  en_camino: {
    icon: '🛵', bg: 'var(--success-soft, #dcfce7)', border: 'var(--success, #16a34a)',
    color: 'var(--success, #16a34a)',
    title: 'En camino a tu ubicación',
    desc: 'Sigue su posición en tiempo real en el mapa →',
    showCancel: false, showFee: true,
  },
  llegando: {
    icon: '🔔', bg: 'var(--accent-soft)', border: 'var(--accent)',
    color: 'var(--accent)',
    title: '¡El repartidor llegó!',
    desc: 'Realizá el pago para completar el domicilio.',
    showCancel: false, showPayment: true,
  },
  comprobante_subido: {
    icon: '⏳', bg: 'var(--bg-elevated)', border: 'var(--success, #16a34a)',
    color: 'var(--success, #16a34a)',
    title: 'Comprobante enviado',
    desc: 'El repartidor está verificando tu pago.',
    showCancel: false,
  },
  entregado: {
    icon: '✅', bg: 'var(--success-soft, #dcfce7)', border: 'var(--success, #16a34a)',
    color: 'var(--success, #16a34a)',
    title: '¡Pedido entregado!',
    desc: 'Pago confirmado. Gracias por usar NØSEE.',
    showCancel: false,
  },
  cancelled: {
    icon: '✗', bg: 'var(--error-soft, #fee2e2)', border: 'var(--error, #dc2626)',
    color: 'var(--error, #dc2626)',
    title: 'Envío cancelado',
    desc: null,
    showCancel: false,
  },
};

// ─── Componente ───────────────────────────────────────────────────────────────
export function DeliveryCard({ order, onCancel, onPaymentSubmitted, cancelling, cancelError }) {
  const { deliveryStatus, cancellationCharged, dealerId } = order;
  const [showPayment,  setShowPayment]  = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBank,  setLoadingBank]  = useState(false);
  const userId = useAuthStore((s) => s.user?.id);

  if (!deliveryStatus) return null;

  const cfg = STATUS_CONFIGS[deliveryStatus];
  if (!cfg) return null;

  // ── Cargar cuentas bancarias del repartidor cuando llega ──────────────────
  // Solo cuando el estado es 'llegando' y hay dealerId
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (deliveryStatus !== 'llegando' || !dealerId) return;
    setLoadingBank(true);
    getDealerBankAccounts(dealerId).then(({ data }) => {
      setBankAccounts(data ?? []);
      setLoadingBank(false);
    });
  }, [deliveryStatus, dealerId]);

  const desc = deliveryStatus === 'cancelled'
    ? (cancellationCharged
        ? 'Se cobrará el costo del domicilio — el pedido no fue comprado.'
        : 'Cancelado sin costo adicional.')
    : cfg.desc;

  const handlePaymentSubmitted = (result) => {
    setShowPayment(false);
    onPaymentSubmitted?.(result);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* ── Badge de estado ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '4px',
        padding: '10px 14px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 'var(--radius-md)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <span style={{ fontSize: '16px', fontWeight: 800, color: cfg.color }}>{cfg.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>{cfg.title}</span>
          </div>

          {/* Cancelar */}
          {cfg.showCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={cancelling}
              style={{
                flexShrink: 0, padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${cfg.border}`,
                background: 'transparent', color: cfg.color,
                fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                opacity: cancelling ? 0.6 : 1,
              }}
            >
              {cancelling ? 'Cancelando...' : cfg.cancelFree ? 'Cancelar envío' : 'Cancelar (se cobra domicilio)'}
            </button>
          )}

          {/* Botón de pago — solo en estado 'llegando' */}
          {cfg.showPayment && (
            <button
              type="button"
              onClick={() => setShowPayment((v) => !v)}
              disabled={loadingBank}
              style={{
                flexShrink: 0, padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: 'var(--accent)', color: '#fff',
                fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                opacity: loadingBank ? 0.6 : 1,
              }}
            >
              {loadingBank ? '...' : showPayment ? 'Cerrar' : '💳 Pagar ahora'}
            </button>
          )}
        </div>

        <span style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '23px' }}>
          {desc}
        </span>

        {/* Tarifa de domicilio en 'en_camino' */}
        {cfg.showFee && (
          <span style={{ fontSize: '11px', fontWeight: 700, paddingLeft: '23px', color: 'var(--success, #16a34a)' }}>
            Costo domicilio: ${DELIVERY_FEE.toLocaleString('es-CO')} COP
          </span>
        )}
      </div>

      {/* Error al cancelar */}
      {cancelError && (
        <p style={{ margin: 0, fontSize: 12, color: '#dc2626', background: '#fee2e2', padding: '6px 10px', borderRadius: 6 }}>
          {cancelError}
        </p>
      )}

      {/* ── Vista de pago (expandible al pulsar "Pagar ahora") ── */}
      {showPayment && deliveryStatus === 'llegando' && (
        <PaymentView
          order={order}
          userId={userId}
          bankAccounts={bankAccounts}
          onPaymentSubmitted={handlePaymentSubmitted}
          initialMode={order.paymentMethod ?? undefined}
        />
      )}
    </div>
  );
}
