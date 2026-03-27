/**
 * DeliveryCheckout.jsx
 *
 * Flujo de 2 pasos para confirmar un pedido con domicilio:
 *   Paso 1 — Delivery Details: dirección de entrega + método de pago
 *   Paso 2 — Confirmación: lista de productos (read-only) + mapa full-screen
 *
 * Se monta en ShoppingListPage cuando el usuario hace clic en
 * "Confirmar pedido" desde Mi Lista con modo Domicilio.
 */

import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import OrderRouteMap from '@/features/orders/components/OrderRouteMap';
import { createOrder } from '@/services/api/orders.api';
import { getStoreEmoji, DELIVERY_FEE } from '../utils/shoppingListUtils';

// ─── Paso 1: Detalles de entrega ──────────────────────────────────────────────
function DeliveryDetailsStep({ result, onNext, onCancel }) {
  const [address,       setAddress]       = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null); // 'transferencia' | 'efectivo'
  const [error,         setError]         = useState(null);

  const total = result.totalCost + DELIVERY_FEE;

  const handleNext = () => {
    if (!address.trim()) {
      setError('Ingresá tu dirección de entrega.');
      return;
    }
    if (!paymentMethod) {
      setError('Elegí un método de pago.');
      return;
    }
    setError(null);
    onNext({ address: address.trim(), paymentMethod });
  };

  return (
    <div style={s.stepWrap}>
      {/* Indicador de paso */}
      <div style={s.stepIndicator}>
        <span style={s.stepDot}>1</span>
        <div style={{ ...s.stepLine, background: 'var(--border)' }} />
        <span style={{ ...s.stepDot, background: 'var(--border)', color: 'var(--text-muted)' }}>2</span>
      </div>

      <h2 style={s.stepTitle}>Detalles de entrega</h2>

      {/* Dirección */}
      <div style={s.fieldGroup}>
        <label style={s.fieldLabel}>Dirección de entrega</label>
        <input
          type="text"
          value={address}
          onChange={(e) => { setAddress(e.target.value); setError(null); }}
          placeholder="Ej: Calle 10 # 5-30, Quibdó"
          style={s.input}
        />
      </div>

      {/* Método de pago */}
      <div style={s.fieldGroup}>
        <label style={s.fieldLabel}>Método de pago</label>
        <div style={s.methodRow}>
          <button
            type="button"
            onClick={() => { setPaymentMethod('transferencia'); setError(null); }}
            style={{
              ...s.methodBtn,
              ...(paymentMethod === 'transferencia' ? s.methodBtnActive : {}),
            }}
          >
            🏦 Transferencia
          </button>
          <button
            type="button"
            onClick={() => { setPaymentMethod('efectivo'); setError(null); }}
            style={{
              ...s.methodBtn,
              ...(paymentMethod === 'efectivo' ? s.methodBtnActive : {}),
            }}
          >
            💵 Efectivo
          </button>
        </div>
      </div>

      {/* Total */}
      <div style={s.totalCard}>
        <span style={s.totalLabel}>Total estimado</span>
        <div style={s.totalBreakdown}>
          <span style={s.totalSub}>Productos: ${result.totalCost.toLocaleString('es-CO')}</span>
          <span style={s.totalSub}>Domicilio: ${DELIVERY_FEE.toLocaleString('es-CO')}</span>
        </div>
        <span style={s.totalValue}>${total.toLocaleString('es-CO')} COP</span>
      </div>

      {error && <p style={s.errorMsg}>{error}</p>}

      <div style={s.btnRow}>
        <button type="button" onClick={onCancel} style={s.backBtn}>← Volver</button>
        <button type="button" onClick={handleNext} style={s.nextBtn}>
          Siguiente paso →
        </button>
      </div>
    </div>
  );
}

// ─── Paso 2: Confirmación con mapa full-screen ────────────────────────────────
function DeliveryMapStep({ result, userCoords, address, paymentMethod, onConfirm, onBack, saving, saveError }) {
  const total = result.totalCost + DELIVERY_FEE;

  return (
    <>
      <style>{`
        .delivery-map-layout {
          position: fixed;
          top: 60px;
          left: 0;
          right: 0;
          bottom: 0;
          display: grid;
          grid-template-columns: 300px 1fr;
          z-index: 50;
          background: var(--bg-base);
        }
        @media (max-width: 680px) {
          .delivery-map-layout {
            grid-template-columns: 1fr;
            grid-template-rows: 1fr 240px;
          }
        }
      `}</style>

      <div className="delivery-map-layout">
        {/* Panel izquierdo: resumen + confirmar */}
        <div style={s.mapListPanel}>
          {/* Indicador de paso */}
          <div style={{ ...s.stepIndicator, marginBottom: 12 }}>
            <span style={{ ...s.stepDot, background: 'var(--border)', color: 'var(--text-muted)' }}>1</span>
            <div style={{ ...s.stepLine, background: 'var(--accent)' }} />
            <span style={s.stepDot}>2</span>
          </div>

          <h2 style={{ ...s.stepTitle, fontSize: 15, marginBottom: 12 }}>Confirmar pedido</h2>

          {/* Dirección y método */}
          <div style={s.summaryCard}>
            <p style={s.summaryRow}><strong>Entrega:</strong> {address}</p>
            <p style={s.summaryRow}>
              <strong>Pago:</strong>{' '}
              {paymentMethod === 'efectivo' ? '💵 Efectivo' : '🏦 Transferencia'}
            </p>
          </div>

          {/* Tiendas y productos (read-only) */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.stores.map((s_item, si) => {
              const emoji    = getStoreEmoji(s_item.store?.store_type_id);
              const subtotal = s_item.products.reduce((a, p) => a + p.price * (p.item?.quantity || 1), 0);
              return (
                <div key={si} style={s.storeCard}>
                  <div style={s.storeHeader}>
                    <span style={s.storeName}>{emoji} {s_item.store?.name ?? 'Tienda'}</span>
                    <span style={s.storeSubtotal}>${subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  <ul style={s.prodList}>
                    {s_item.products.map((p, pi) => (
                      <li key={pi} style={s.prodItem}>
                        <span>{p.item?.productName ?? '?'} ×{p.item?.quantity || 1}</span>
                        <span style={s.prodPrice}>${(p.price * (p.item?.quantity || 1)).toLocaleString('es-CO')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Total + botón confirmar */}
          <div style={s.mapFooter}>
            <div style={s.mapTotal}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent)' }}>
                ${total.toLocaleString('es-CO')} <span style={{ fontSize: 11, fontWeight: 500 }}>COP</span>
              </span>
            </div>
            {saveError && <p style={s.errorMsg}>{saveError}</p>}
            <div style={s.btnRow}>
              <button type="button" onClick={onBack} style={s.backBtn} disabled={saving}>← Atrás</button>
              <button type="button" onClick={onConfirm} style={{ ...s.nextBtn, opacity: saving ? 0.7 : 1 }} disabled={saving}>
                {saving ? 'Guardando...' : `🛵 Confirmar pedido`}
              </button>
            </div>
          </div>
        </div>

        {/* Mapa — ocupa el resto */}
        <div style={{ height: '100%', overflow: 'hidden' }}>
          <OrderRouteMap
            stores={result.stores}
            userCoords={userCoords}
            driverLocation={null}
            mapHeight="100%"
          />
        </div>
      </div>
    </>
  );
}

// ─── Contenedor principal del checkout ───────────────────────────────────────
export function DeliveryCheckout({ pendingCheckout, addOrder, onConfirmed, onCancel }) {
  const [step,      setStep]      = useState(1);
  const [address,   setAddress]   = useState('');
  const [method,    setMethod]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const { result, items, userCoords } = pendingCheckout;

  const handleNext = ({ address: addr, paymentMethod }) => {
    setAddress(addr);
    setMethod(paymentMethod);
    setStep(2);
  };

  const handleConfirmOrder = async () => {
    setSaving(true);
    setSaveError(null);

    const localId = `NSE-${Date.now().toString(36).toUpperCase()}`;

    const { data: saved, error } = await createOrder({
      userId:          currentUserId,
      localId,
      deliveryMode:    true,
      deliveryAddress: address,
      deliveryCoords:  userCoords,
      stores:          result.stores,
      items,
      totalCost:       result.totalCost,
      savings:         result.savings    ?? 0,
      savingsPct:      result.savingsPct ?? 0,
      deliveryFee:     DELIVERY_FEE,
      strategy:        'balanced',
      paymentMethod:   method,
    });

    if (error) {
      setSaveError(`No se pudo guardar el pedido: ${error.message}. Revisá tu conexión e intentá de nuevo.`);
      setSaving(false);
      return;
    }

    addOrder({
      id:                  localId,
      supabaseId:          saved?.id ?? null,
      result,
      userCoords,
      createdAt:           new Date().toISOString(),
      deliveryMode:        true,
      deliveryStatus:      'searching',
      paymentMethod:       method,
      driverLocation:      null,
      cancellationCharged: false,
    });

    setSaving(false);
    onConfirmed();
  };

  if (step === 2) {
    return (
      <DeliveryMapStep
        result={result}
        userCoords={userCoords}
        address={address}
        paymentMethod={method}
        onConfirm={handleConfirmOrder}
        onBack={() => setStep(1)}
        saving={saving}
        saveError={saveError}
      />
    );
  }

  return (
    <DeliveryDetailsStep
      result={result}
      onNext={handleNext}
      onCancel={onCancel}
    />
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  stepWrap: {
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '24px 0',
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  stepDot: {
    width: 28, height: 28,
    borderRadius: '50%',
    background: 'var(--accent)',
    color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 800,
    flexShrink: 0,
  },
  stepLine: {
    flex: 1, height: 2,
    background: 'var(--accent)',
    borderRadius: 2,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    fontSize: 14,
    background: 'var(--bg-base)',
    color: 'var(--text-primary)',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  methodRow: {
    display: 'flex',
    gap: 10,
  },
  methodBtn: {
    flex: 1,
    padding: '12px 8px',
    borderRadius: 'var(--radius-md)',
    border: '2px solid var(--border)',
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  methodBtnActive: {
    border: '2px solid var(--accent)',
    background: 'var(--accent-soft, #e0f2fe)',
    color: 'var(--accent)',
  },
  totalCard: {
    padding: '14px 16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  totalBreakdown: {
    display: 'flex',
    gap: 16,
  },
  totalSub: {
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 800,
    color: 'var(--accent)',
  },
  errorMsg: {
    margin: 0,
    fontSize: 13,
    color: 'var(--error, #dc2626)',
    background: 'var(--error-soft, #fee2e2)',
    padding: '8px 12px',
    borderRadius: 'var(--radius-sm)',
  },
  btnRow: {
    display: 'flex',
    gap: 10,
    marginTop: 4,
  },
  backBtn: {
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  nextBtn: {
    flex: 1,
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
  },
  // Paso 2 — panel izquierdo
  mapListPanel: {
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: '16px',
    borderRight: '1px solid var(--border)',
    background: 'var(--bg-base)',
  },
  summaryCard: {
    padding: '10px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  summaryRow: {
    margin: 0,
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  storeCard: {
    padding: '10px 12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
  },
  storeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  storeName: {
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  storeSubtotal: {
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--accent)',
  },
  prodList: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  prodItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  prodPrice: {
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  mapFooter: {
    borderTop: '1px solid var(--border)',
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    flexShrink: 0,
  },
  mapTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
};
