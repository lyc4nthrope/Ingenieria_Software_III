import { useState, useEffect } from 'react';
import { calculateDeliveryFee } from '../utils/shoppingListUtils';
import { PaymentView } from './PaymentView';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getDealerBankAccounts } from '@/services/api/bankAccounts.api';
import { useDeliveryTimer } from '@/features/orders/hooks/useDeliveryTimer';
import { confirmOrderPayment, submitUpfrontReceipt } from '@/services/api/orders.api';
import { CardPayment } from '@mercadopago/sdk-react';
import { supabase } from '@/services/supabase.client';

const STATUS_CONFIGS = {
  pendiente_pago: {
    icon: '💳', bg: 'var(--warning-soft, #fef9c3)', border: 'var(--warning, #ca8a04)',
    color: '#92400e',
    title: 'Esperando confirmación de pago',
    desc: 'Confirmá tu pedido para que los repartidores puedan verlo.',
    showConfirmPayment: true,
    step: 0,
  },
  searching: {
    icon: '🛵', bg: 'var(--warning-soft, #fef9c3)', border: 'var(--warning, #ca8a04)',
    color: '#92400e',
    title: 'Buscando repartidor...',
    desc: 'Tu pedido está en cola de asignación.',
    showCancel: true, cancelFree: true,
    step: 1,
  },
  found: {
    icon: '✓', bg: 'var(--bg-elevated)', border: 'var(--accent)',
    color: 'var(--accent)',
    title: 'Repartidor asignado',
    desc: 'Sigue su ubicación en tiempo real en el mapa →',
    showCancel: true, cancelFree: false,
    step: 1,
  },
  comprando: {
    icon: '🛒', bg: 'var(--bg-elevated)', border: 'var(--accent)',
    color: 'var(--accent)',
    title: 'Comprando tus productos',
    desc: 'El repartidor está comprando en las tiendas indicadas.',
    showCancel: false,
    step: 1,
  },
  en_camino: {
    icon: '🛵', bg: 'var(--success-soft, #dcfce7)', border: 'var(--success, #16a34a)',
    color: 'var(--success, #16a34a)',
    title: 'En camino a tu ubicación',
    desc: 'Sigue su posición en tiempo real en el mapa →',
    showCancel: false, showFee: true,
    step: 2,
  },
  llegando: {
    icon: '🔔', bg: 'var(--accent-soft)', border: 'var(--accent)',
    color: 'var(--accent)',
    title: '¡El repartidor llegó!',
    desc: 'Mostrá el PIN al repartidor y realizá el pago.',
    showCancel: false, showPayment: true, showPin: true,
    step: 2,
  },
  comprobante_subido: {
    icon: '⏳', bg: 'var(--bg-elevated)', border: 'var(--success, #16a34a)',
    color: 'var(--success, #16a34a)',
    title: 'Comprobante enviado',
    desc: 'El repartidor está verificando tu pago.',
    showCancel: false,
    step: 2,
  },
  entregado: {
    icon: '✅', bg: 'var(--success-soft, #dcfce7)', border: 'var(--success, #16a34a)',
    color: 'var(--success, #16a34a)',
    title: '¡Pedido entregado!',
    desc: 'Pago confirmado. Gracias por usar NØSEE.',
    showCancel: false,
    step: 3,
  },
  cancelled: {
    icon: '✗', bg: 'var(--error-soft, #fee2e2)', border: 'var(--error, #dc2626)',
    color: 'var(--error, #dc2626)',
    title: 'Envío cancelado',
    desc: null,
    showCancel: false,
    step: 0,
  },
};

const STEPS = [
  { label: 'Preparando', icon: '🛒', step: 1 },
  { label: 'En camino', icon: '🛵', step: 2 },
  { label: 'Entregado', icon: '✅', step: 3 },
];

export function DeliveryCard({ order, onCancel, onPaymentSubmitted }) {
  const { deliveryStatus, cancellationCharged, dealerId, deliveryFee: storedFee, result, userCoords, deliveryPin, llegandoAt } = order;
  const displayFee = storedFee ?? calculateDeliveryFee(result?.stores, userCoords);
  const [showPayment, setShowPayment] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [receiptError, setReceiptError] = useState(null);
  const [mpError, setMpError]         = useState(null);
  const [mpCustomerId, setMpCustomerId] = useState(null);
  const userId = useAuthStore((s) => s.user?.id);

  // Timer de 10 min para el Caso D (cliente ausente) — solo activo en estado 'llegando'
  const timerStart = deliveryStatus === 'llegando' ? (llegandoAt ?? null) : null;
  const { formattedTime, isExpired } = useDeliveryTimer(timerStart);

  if (!deliveryStatus) return null;

  const cfg = STATUS_CONFIGS[deliveryStatus];
  if (!cfg) return null;

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (deliveryStatus !== 'pendiente_pago' || !userId) return;
    supabase
      .from('users')
      .select('mp_customer_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => { if (data?.mp_customer_id) setMpCustomerId(data.mp_customer_id); });
  }, [deliveryStatus, userId]);

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (deliveryStatus !== 'llegando' || !dealerId) return;
    setLoadingBank(true);
    getDealerBankAccounts(dealerId).then(({ data }) => {
      setBankAccounts(data ?? []);
      setLoadingBank(false);
    });
  }, [deliveryStatus, dealerId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    setReceiptError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setReceiptPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // Pago de la tarifa de servicio con MercadoPago (estado pendiente_pago)
  const handleMPSubmit = async (formData) => {
    if (!order.supabaseId) return;
    setConfirmingPayment(true);
    setMpError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('process-mp-payment', {
        body: {
          orderId:              order.supabaseId,
          token:                formData.token,
          paymentMethodId:      formData.payment_method_id,
          issuerId:             formData.issuer_id,
          installments:         formData.installments,
          email:                formData.payer?.email,
          identificationType:   formData.payer?.identification?.type,
          identificationNumber: formData.payer?.identification?.number,
        },
      });
      if (fnErr || !data?.success) {
        setMpError(`Pago rechazado: ${data?.detail ?? data?.error ?? 'intentá de nuevo'}`);
      } else if (data?.customerId) {
        setMpCustomerId(data.customerId);
      }
      // El estado en Supabase cambia a 'pendiente_repartidor' vía RPC.
      // El Realtime en PedidosTab lo recibe y actualiza el deliveryStatus automáticamente.
    } catch (err) {
      setMpError('Error inesperado. Verificá tu conexión e intentá de nuevo.');
      console.error('[DeliveryCard] MP payment error:', err);
    } finally {
      setConfirmingPayment(false);
    }
  };

  const desc = deliveryStatus === 'cancelled'
    ? (cancellationCharged
        ? 'Se cobrará el costo del domicilio — el pedido no fue comprado.'
        : 'Cancelado sin costo adicional.')
    : cfg.desc;

  const handlePaymentSubmitted = (result) => {
    setShowPayment(false);
    onPaymentSubmitted?.(result);
  };

  const currentStep = cfg.step;

  // Cancelled state — simple error banner
  if (deliveryStatus === 'cancelled') {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 'var(--radius-md)',
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        display: 'flex', alignItems: 'center', gap: '10px',
      }}>
        <span style={{ fontSize: '20px' }}>{cfg.icon}</span>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 800, color: cfg.color }}>{cfg.title}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{desc}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* ── Progress tracker ── */}
      <div style={{
        padding: '16px',
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        {/* 3-step indicator */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0 }}>
          {STEPS.map((s, i) => {
            const isActive = currentStep >= s.step;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={s.step} style={{ display: 'flex', alignItems: 'flex-start', flex: isLast ? 0 : 1 }}>
                {/* Step circle + label */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: isActive ? 'var(--accent)' : 'var(--bg-elevated)',
                    border: `2px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '16px',
                    boxShadow: isActive ? '0 0 0 3px var(--accent-soft)' : 'none',
                    transition: 'all 0.2s',
                  }}>
                    {isActive ? s.icon : <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)' }}>{i + 1}</span>}
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                  }}>{s.label}</span>
                </div>
                {/* Connector line (not after last step) */}
                {!isLast && (
                  <div style={{
                    flex: 1, height: '2px', marginTop: '19px',
                    background: currentStep > s.step ? 'var(--accent)' : 'var(--border)',
                    transition: 'background 0.2s',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Current status text */}
        <div style={{
          padding: '10px 14px',
          background: cfg.bg, border: `1px solid ${cfg.border}`,
          borderRadius: 'var(--radius-sm)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>{cfg.title}</div>
          {desc && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{desc}</div>}
          {cfg.showFee && (
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--success, #16a34a)', marginTop: '4px' }}>
              Costo domicilio: ${displayFee.toLocaleString('es-CO')} COP
            </div>
          )}
        </div>

        {/* Dealer info (when assigned) */}
        {dealerId && deliveryStatus !== 'searching' && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 14px',
            background: 'var(--bg-elevated)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--accent-soft)', border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', flexShrink: 0,
            }}>🛵</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Repartidor asignado</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Seguí su ubicación en el mapa</div>
            </div>
          </div>
        )}

        {/* PIN de verificación (visible al cliente cuando el repartidor llega) */}
        {cfg.showPin && deliveryPin && (
          <div style={{
            padding: '14px 16px',
            background: 'var(--bg-elevated)', border: '2px solid var(--accent)',
            borderRadius: 'var(--radius-sm)', textAlign: 'center',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tu PIN de entrega
            </div>
            <div style={{ fontSize: '36px', fontWeight: 900, letterSpacing: '0.25em', color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
              {deliveryPin}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Dictáselo al repartidor para confirmar la entrega
            </div>
          </div>
        )}

        {/* Timer de espera (Caso D) */}
        {deliveryStatus === 'llegando' && timerStart && (
          <div style={{
            padding: '10px 14px',
            background: isExpired ? 'var(--error-soft, #fee2e2)' : 'var(--bg-elevated)',
            border: `1px solid ${isExpired ? 'var(--error, #dc2626)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ fontSize: '16px' }}>{isExpired ? '⚠️' : '⏱'}</span>
            <span style={{ fontSize: '12px', color: isExpired ? 'var(--error, #dc2626)' : 'var(--text-muted)', fontWeight: isExpired ? 700 : 500 }}>
              {isExpired
                ? 'El tiempo de espera venció. El repartidor puede marcar entrega fallida.'
                : `El repartidor tiene ${formattedTime} de espera`}
            </span>
          </div>
        )}

        {/* Action buttons */}
        {(cfg.showCancel || cfg.showPayment || cfg.showConfirmPayment) && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {cfg.showCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  flex: 1, padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${cfg.border}`,
                  background: 'transparent', color: cfg.color,
                  fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {cfg.cancelFree ? '✕ Cancelar envío' : '✕ Cancelar (se cobra domicilio)'}
              </button>
            )}
            {cfg.showConfirmPayment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                {/* Resumen del cobro */}
                <div style={{
                  padding: '12px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', flexDirection: 'column', gap: '6px',
                }}>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    💳 ¿Por qué se cobra esto?
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    La <strong>tarifa de servicio</strong> cubre la asignación del repartidor.
                    Se cobra una vez por pedido, antes de que un repartidor lo acepte.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tarifa de servicio</span>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent)' }}>
                      ${displayFee.toLocaleString('es-CO')} COP
                    </span>
                  </div>
                </div>
                <CardPayment
                  initialization={{
                    amount: displayFee,
                    ...(mpCustomerId ? { payer: { customerId: mpCustomerId } } : {}),
                  }}
                  onSubmit={handleMPSubmit}
                  onError={(err) => setMpError(err.message)}
                  customization={{
                    paymentMethods: { minInstallments: 1, maxInstallments: 1 },
                  }}
                />
                {confirmingPayment && (
                  <div style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 700, textAlign: 'center' }}>
                    ⏳ Procesando pago...
                  </div>
                )}
                {mpError && (
                  <span style={{ fontSize: '11px', color: 'var(--error, #dc2626)', fontWeight: 600 }}>{mpError}</span>
                )}
              </div>
            )}
            {cfg.showPayment && (
              <button
                type="button"
                onClick={() => setShowPayment((v) => !v)}
                disabled={loadingBank}
                style={{
                  flex: 1, padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)', border: 'none',
                  background: 'var(--accent)', color: '#fff',
                  fontSize: '12px', fontWeight: 800, cursor: 'pointer',
                  opacity: loadingBank ? 0.6 : 1,
                }}
              >
                {loadingBank ? '...' : showPayment ? 'Cerrar pago' : '💳 Pagar ahora'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Payment view (expandible) */}
      {showPayment && deliveryStatus === 'llegando' && (
        <PaymentView
          order={order}
          userId={userId}
          bankAccounts={bankAccounts}
          onPaymentSubmitted={handlePaymentSubmitted}
        />
      )}
    </div>
  );
}
