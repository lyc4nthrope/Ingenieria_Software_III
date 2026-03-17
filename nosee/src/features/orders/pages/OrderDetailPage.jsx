/**
 * OrderDetailPage.jsx — Proceso 3, Paso 6-7
 *
 * Muestra el resumen del pedido confirmado:
 * ID, estado, tiendas y productos, costo total, ahorro.
 * Punto de salida hacia Proceso 4 (domicilio).
 */

import { useLocation, useParams, Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function OrderDetailPage() {
  const { t } = useLanguage();
  const to = t.orders;
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const { result, orderId } = location.state ?? {};

  // Si se llegó directo sin state (p.ej. link externo), mostramos solo el ID
  if (!result) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <h1 style={styles.title}>Pedido {id}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {to.orderStatus}
          </p>
          <Link to="/lista" style={styles.backLink}>{to.goToList}</Link>
        </div>
      </div>
    );
  }

  const { stores, totalCost, savings, savingsPct, noResultItems } = result;

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Estado del pedido */}
        <div style={styles.statusBanner}>
          <span style={styles.statusDot} />
          <span style={styles.statusText}>{to.orderStatus}</span>
        </div>

        {/* ID */}
        <div style={styles.idCard}>
          <span style={styles.idLabel}>{to.orderId}</span>
          <span style={styles.idValue}>{orderId ?? id}</span>
        </div>

        {/* Ahorro */}
        {savings > 0 && (
          <div style={styles.savingsCard}>
            <span style={{ fontSize: '24px' }}>💰</span>
            <span style={styles.savingsText}>
              {to.savingsCard(savings, savingsPct)}
            </span>
          </div>
        )}

        {/* Total */}
        <div style={styles.totalRow}>
          <span style={styles.totalLabel}>{to.totalCost}</span>
          <span style={styles.totalValue}>
            ${totalCost.toLocaleString('es-CO')} COP
          </span>
        </div>

        {/* Ítems sin resultados */}
        {noResultItems?.length > 0 && (
          <div style={styles.warningCard}>
            <p style={{ margin: 0, fontWeight: 600, fontSize: '13px' }}>Sin datos de precio:</p>
            {noResultItems.map((item) => (
              <p key={item.id} style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                • {item.productName}
              </p>
            ))}
          </div>
        )}

        {/* Desglose por tienda */}
        <h2 style={styles.sectionTitle}>{to.byStore}</h2>
        {stores.map((s, i) => {
          const storeName = s.store?.name ?? 'Tienda desconocida';
          const storeEmoji = Number(s.store?.store_type_id) === 2 ? '🌐' : '🏪';
          const subtotal = s.products.reduce(
            (sum, p) => sum + (p.price || 0) * p.item.quantity,
            0
          );
          return (
            <div key={i} style={styles.storeCard}>
              <div style={styles.storeHeader}>
                <span style={styles.storeName}>{storeEmoji} {storeName}</span>
                <span style={styles.storeSubtotal}>
                  ${subtotal.toLocaleString('es-CO')} COP
                </span>
              </div>
              <ul style={styles.productList}>
                {s.products.map((p, pi) => (
                  <li key={pi} style={styles.productItem}>
                    <div>
                      <div style={styles.productItemName}>
                        {p.item.productName} ×{p.item.quantity}
                      </div>
                      <div style={styles.productItemMeta}>
                        ${p.price.toLocaleString('es-CO')} c/u
                      </div>
                    </div>
                    <span style={styles.productItemTotal}>
                      ${(p.price * p.item.quantity).toLocaleString('es-CO')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

        {/* Acción: ir él mismo vs solicitar domicilio */}
        <div style={styles.actionSection}>
          <p style={styles.actionTitle}>¿Cómo vas a comprar?</p>
          <div style={styles.actionRow}>
            <button
              type="button"
              style={styles.actionBtnSecondary}
              onClick={() => navigate('/lista')}
            >
              🗺️ Ver ruta
            </button>
            <button
              type="button"
              style={styles.actionBtnPrimary}
              onClick={() => alert('Proceso 4: solicitud de repartidor (próximamente)')}
            >
              🛵 Solicitar domicilio
            </button>
          </div>
        </div>

        <Link to="/lista" style={styles.backLink}>{to.goToList}</Link>
      </div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    flex: 1,
    padding: '24px 16px',
    maxWidth: '640px',
    margin: '0 auto',
    width: '100%',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  statusBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    background: 'var(--warning, #ca8a04)',
    flexShrink: 0,
  },
  statusText: { fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' },
  idCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  idLabel: { fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  idValue: { fontSize: '15px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' },
  title: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
    margin: 0,
  },
  savingsCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'var(--success-soft)',
    border: '1px solid var(--success)',
    borderRadius: 'var(--radius-md)',
    padding: '14px',
  },
  savingsText: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  totalLabel: { fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 },
  totalValue: { fontSize: '18px', fontWeight: 800, color: 'var(--accent)' },
  warningCard: {
    background: 'var(--warning-soft, #fef9c3)',
    border: '1px solid var(--warning, #ca8a04)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  storeCard: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  storeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
  },
  storeName: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' },
  storeSubtotal: { fontSize: '14px', fontWeight: 700, color: 'var(--accent)' },
  productList: { listStyle: 'none', margin: 0, padding: '8px 0' },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 16px',
    borderBottom: '1px solid var(--border)',
  },
  productItemName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' },
  productItemMeta: { fontSize: '11px', color: 'var(--text-muted)' },
  productItemTotal: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' },
  actionSection: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  actionTitle: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 },
  actionRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  actionBtnPrimary: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  actionBtnSecondary: {
    flex: 1,
    padding: '12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
    fontWeight: 700,
    fontSize: '13px',
    cursor: 'pointer',
    textDecoration: 'none',
    textAlign: 'center',
  },
  backLink: {
    fontSize: '13px',
    color: 'var(--accent)',
    textDecoration: 'none',
    alignSelf: 'flex-start',
  },
};
