import { useState, useEffect } from 'react';
import { cn } from '@/lib/cn';
import { DELIVERY_FEE } from '../utils/shoppingListUtils';
import { PaymentView } from './PaymentView';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getDealerBankAccounts } from '@/services/api/bankAccounts.api';

// STATUS_CONFIGS — keeps bg/border/color as CSS-var arbitrary values for Tailwind
const STATUS_CONFIGS = {
  searching: {
    icon: '🛵',
    bgClass: 'bg-warning-soft',
    borderClass: 'border-warning',
    colorClass: 'text-[#92400e]',
    title: 'Buscando repartidor...',
    desc: 'Tu pedido está en cola de asignación.',
    showCancel: true, cancelFree: true,
    step: 1,
  },
  found: {
    icon: '✓',
    bgClass: 'bg-elevated',
    borderClass: 'border-accent',
    colorClass: 'text-accent',
    title: 'Repartidor asignado',
    desc: 'Sigue su ubicación en tiempo real en el mapa →',
    showCancel: true, cancelFree: false,
    step: 1,
  },
  comprando: {
    icon: '🛒',
    bgClass: 'bg-elevated',
    borderClass: 'border-accent',
    colorClass: 'text-accent',
    title: 'Comprando tus productos',
    desc: 'El repartidor está comprando en las tiendas indicadas.',
    showCancel: false,
    step: 1,
  },
  en_camino: {
    icon: '🛵',
    bgClass: 'bg-success-soft',
    borderClass: 'border-success',
    colorClass: 'text-success',
    title: 'En camino a tu ubicación',
    desc: 'Sigue su posición en tiempo real en el mapa →',
    showCancel: false, showFee: true,
    step: 2,
  },
  llegando: {
    icon: '🔔',
    bgClass: 'bg-accent-soft',
    borderClass: 'border-accent',
    colorClass: 'text-accent',
    title: '¡El repartidor llegó!',
    desc: 'Realizá el pago para completar el domicilio.',
    showCancel: false, showPayment: true,
    step: 2,
  },
  comprobante_subido: {
    icon: '⏳',
    bgClass: 'bg-elevated',
    borderClass: 'border-success',
    colorClass: 'text-success',
    title: 'Comprobante enviado',
    desc: 'El repartidor está verificando tu pago.',
    showCancel: false,
    step: 2,
  },
  entregado: {
    icon: '✅',
    bgClass: 'bg-success-soft',
    borderClass: 'border-success',
    colorClass: 'text-success',
    title: '¡Pedido entregado!',
    desc: 'Pago confirmado. Gracias por usar NØSEE.',
    showCancel: false,
    step: 3,
  },
  cancelled: {
    icon: '✗',
    bgClass: 'bg-error-soft',
    borderClass: 'border-error',
    colorClass: 'text-error',
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
  const { deliveryStatus, cancellationCharged, dealerId } = order;
  const [showPayment, setShowPayment] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);

  if (!deliveryStatus) return null;

  const cfg = STATUS_CONFIGS[deliveryStatus];
  if (!cfg) return null;

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

  const currentStep = cfg.step;

  // Cancelled state — simple error banner
  if (deliveryStatus === 'cancelled') {
    return (
      <div className={cn(
        'flex items-center gap-[10px]',
        'px-4 py-[14px] rounded-md border',
        cfg.bgClass,
        cfg.borderClass,
      )}>
        <span className="text-[20px]">{cfg.icon}</span>
        <div>
          <div className={cn('text-[14px] font-extrabold', cfg.colorClass)}>{cfg.title}</div>
          <div className="text-[12px] text-muted mt-[2px]">{desc}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Progress tracker ── */}
      <div className="flex flex-col gap-4 p-4 bg-surface border border-line rounded-md">

        {/* 3-step indicator */}
        <div className="flex items-start gap-0">
          {STEPS.map((s, i) => {
            const isActive = currentStep >= s.step;
            const isLast = i === STEPS.length - 1;
            return (
              <div
                key={s.step}
                className={cn(
                  'flex items-start',
                  isLast ? 'flex-none' : 'flex-1',
                )}
              >
                {/* Step circle + label */}
                <div className="flex flex-col items-center gap-[6px] shrink-0">
                  <div className={cn(
                    'w-[38px] h-[38px] rounded-full',
                    'flex items-center justify-center',
                    'text-[16px]',
                    'border-2 transition-all duration-200',
                    isActive
                      ? 'bg-accent border-accent shadow-[0_0_0_3px_var(--accent-soft)]'
                      : 'bg-elevated border-line',
                  )}>
                    {isActive
                      ? s.icon
                      : <span className="text-[12px] font-extrabold text-muted">{i + 1}</span>
                    }
                  </div>
                  <span className={cn(
                    'text-[10px] whitespace-nowrap',
                    isActive ? 'font-bold text-accent' : 'font-medium text-muted',
                  )}>
                    {s.label}
                  </span>
                </div>
                {/* Connector line (not after last step) */}
                {!isLast && (
                  <div className={cn(
                    'flex-1 h-[2px] mt-[19px] transition-[background] duration-200',
                    currentStep > s.step ? 'bg-accent' : 'bg-line',
                  )} />
                )}
              </div>
            );
          })}
        </div>

        {/* Current status text */}
        <div className={cn(
          'px-[14px] py-[10px] rounded-sm border',
          cfg.bgClass,
          cfg.borderClass,
        )}>
          <div className={cn('text-[13px] font-bold', cfg.colorClass)}>{cfg.title}</div>
          {desc && <div className="text-[11px] text-muted mt-[3px]">{desc}</div>}
          {cfg.showFee && (
            <div className="text-[11px] font-bold text-success mt-1">
              Costo domicilio: ${DELIVERY_FEE.toLocaleString('es-CO')} COP
            </div>
          )}
        </div>

        {/* Dealer info (when assigned) */}
        {dealerId && deliveryStatus !== 'searching' && (
          <div className="flex items-center gap-[10px] px-[14px] py-[10px] bg-elevated border border-line rounded-sm">
            <div className="w-9 h-9 shrink-0 rounded-full bg-accent-soft border-2 border-accent flex items-center justify-center text-[18px]">
              🛵
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-primary">Repartidor asignado</div>
              <div className="text-[11px] text-muted">Seguí su ubicación en el mapa</div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {(cfg.showCancel || cfg.showPayment) && (
          <div className="flex gap-2">
            {cfg.showCancel && (
              <button
                type="button"
                onClick={onCancel}
                className={cn(
                  'flex-1 min-h-[44px] px-[14px] py-[10px]',
                  'rounded-sm border bg-transparent',
                  'text-[12px] font-bold cursor-pointer',
                  'transition-opacity duration-150',
                  cfg.borderClass,
                  cfg.colorClass,
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
              >
                {cfg.cancelFree ? '✕ Cancelar envío' : '✕ Cancelar (se cobra domicilio)'}
              </button>
            )}
            {cfg.showPayment && (
              <button
                type="button"
                onClick={() => setShowPayment((v) => !v)}
                disabled={loadingBank}
                className={cn(
                  'flex-1 min-h-[44px] px-[14px] py-[10px]',
                  'rounded-sm border-none bg-accent text-white',
                  'text-[12px] font-extrabold cursor-pointer',
                  'transition-opacity duration-150',
                  loadingBank && 'opacity-60',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                )}
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
