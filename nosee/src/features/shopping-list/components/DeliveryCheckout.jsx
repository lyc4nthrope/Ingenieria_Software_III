/**
 * DeliveryCheckout.jsx
 *
 * Pantalla de confirmación de pedido con domicilio.
 * Recopila dirección de entrega y método de pago, muestra resumen
 * del carrito y totales, y crea el pedido al confirmar.
 *
 * Se monta en ShoppingListPage cuando el usuario hace clic en
 * "Confirmar pedido" desde Mi Lista con modo Domicilio.
 * Al confirmar, va directamente a la pestaña Mis Pedidos.
 */

import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { createOrder } from '@/services/api/orders.api';
import { getStoreEmoji, DELIVERY_FEE } from '../utils/shoppingListUtils';

// ─── Detalles de entrega ───────────────────────────────────────────────────────
function DeliveryDetailsStep({ result, onConfirm, onCancel, saving, saveError }) {
  const [address,       setAddress]       = useState('');
  const [paymentMethod, setPaymentMethod] = useState(null); // 'transferencia' | 'efectivo'
  const [error,         setError]         = useState(null);
  const [cartOpen,      setCartOpen]      = useState(false);

  const total = result.totalCost + DELIVERY_FEE;

  const handleConfirm = () => {
    if (!address.trim()) {
      setError('Ingresá tu dirección de entrega.');
      return;
    }
    if (!paymentMethod) {
      setError('Elegí un método de pago.');
      return;
    }
    setError(null);
    onConfirm({ address: address.trim(), paymentMethod });
  };

  return (
    <div style={s.stepWrap}>
      <h2 style={s.stepTitle}>Detalles de entrega</h2>

      {/* Resumen colapsable del carrito */}
      <div style={s.cartSummary}>
        <div style={s.cartHeader} onClick={() => setCartOpen((o) => !o)}>
          <div style={s.cartHeaderLeft}>
            <span>🛒 Ver tu pedido</span>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
              · {result.stores?.reduce((acc, st) => acc + st.products.length, 0) ?? 0} productos · {result.stores?.length ?? 0} tiendas
            </span>
            {result.savingsPct > 0 && (
              <span style={s.cartSavingsBadge}>Ahorrás {result.savingsPct}%</span>
            )}
          </div>
          <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{cartOpen ? '▴' : '▾'}</span>
        </div>
        {cartOpen && (
          <div style={s.cartBody}>
            {result.stores?.map((s_item, si) => {
              const emoji    = getStoreEmoji(s_item.store?.store_type_id);
              const subtotal = s_item.products.reduce((a, p) => a + p.price * (p.item?.quantity || 1), 0);
              return (
                <div key={si} style={s.cartStoreCard}>
                  <div style={s.cartStoreHeader}>
                    <span>{emoji} {s_item.store?.name ?? 'Tienda'}</span>
                    <span style={{ color: 'var(--accent)' }}>${subtotal.toLocaleString('es-CO')}</span>
                  </div>
                  {s_item.products.map((p, pi) => (
                    <div key={pi} style={s.cartProdItem}>
                      <span>{p.item?.productName ?? '?'} ×{p.item?.quantity || 1}</span>
                      <span>${(p.price * (p.item?.quantity || 1)).toLocaleString('es-CO')}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
        <p style={s.fieldHint}>
          Tu ubicación GPS ya fue registrada. La dirección es para que el repartidor la identifique fácilmente.
        </p>
      </div>

      {/* Método de pago */}
      <div style={s.fieldGroup}>
        <label style={s.fieldLabel}>Método de pago</label>
        <div style={s.methodRow}>
          <button
            type="button"
            onClick={() => { setPaymentMethod('transferencia'); setError(null); }}
            style={{ ...s.methodBtn, ...(paymentMethod === 'transferencia' ? s.methodBtnActive : {}) }}
          >
            🏦 Transferencia
          </button>
          <button
            type="button"
            onClick={() => { setPaymentMethod('efectivo'); setError(null); }}
            style={{ ...s.methodBtn, ...(paymentMethod === 'efectivo' ? s.methodBtnActive : {}) }}
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
        {result.savings > 0 && (
          <span style={s.savingsBadge}>
            💚 Ahorrás ${result.savings.toLocaleString('es-CO')} ({result.savingsPct}%) vs una sola tienda
          </span>
        )}
      </div>

      {error    && <p style={s.errorMsg}>{error}</p>}
      {saveError && <p style={s.errorMsg}>{saveError}</p>}

      <div style={s.btnRow}>
        <button type="button" onClick={onCancel} style={s.backBtn} disabled={saving}>
          ← Volver
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          style={{ ...s.nextBtn, opacity: saving ? 0.7 : 1 }}
          disabled={saving}
        >
          {saving ? 'Guardando...' : '🛵 Confirmar pedido'}
        </button>
      </div>
    </div>
  );
}

// ─── Contenedor principal del checkout ───────────────────────────────────────
export function DeliveryCheckout({ pendingCheckout, addOrder, onConfirmed, onCancel }) {
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);

  const currentUserId = useAuthStore((s) => s.user?.id);
  const { result, items, userCoords } = pendingCheckout;

  const handleConfirm = async ({ address, paymentMethod }) => {
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
      paymentMethod,
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
      paymentMethod,
      driverLocation:      null,
      cancellationCharged: false,
    });

    setSaving(false);
    onConfirmed();
  };

  return (
    <DeliveryDetailsStep
      result={result}
      onConfirm={handleConfirm}
      onCancel={onCancel}
      saving={saving}
      saveError={saveError}
    />
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  stepWrap: {
    maxWidth: 560,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    padding: '24px 0',
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
  fieldHint: {
    margin: 0,
    fontSize: 11,
    color: 'var(--text-muted)',
    lineHeight: 1.4,
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
  savingsBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--success, #16a34a)',
    background: 'var(--success-soft, #dcfce7)',
    padding: '4px 8px',
    borderRadius: 'var(--radius-sm)',
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
  // Resumen colapsable del carrito
  cartSummary: {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  cartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  cartHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  cartSavingsBadge: {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--success, #16a34a)',
    background: 'var(--success-soft, #dcfce7)',
    padding: '2px 7px',
    borderRadius: 10,
  },
  cartBody: {
    padding: '0 14px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cartStoreCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    padding: '8px 10px',
  },
  cartStoreHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: 4,
  },
  cartProdItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: 'var(--text-secondary)',
  },
};
