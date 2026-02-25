/**
 * RepartidorDashboard.jsx
 *
 * Dashboard operacional del repartidor de NØSEE.
 * Pedidos asignados, estado de entregas, historial, ruta.
 *
 * UBICACIÓN: src/features/dashboard/repartidor/RepartidorDashboard.jsx
 */
import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';

const MOCK_ORDERS = [
  {
    id: 'PD-1042',
    client: 'Isabel Montoya',
    address: 'Cra 45 #32-18, Laureles',
    items: ['Aceite x2', 'Arroz 5kg', 'Leche x6'],
    total: 58600,
    status: 'en_camino',
    distance: '1.2 km',
    time: 'hace 8 min',
  },
  {
    id: 'PD-1041',
    client: 'Roberto Suárez',
    address: 'Cl 33 #80-55, Robledo',
    items: ['Pollo entero'],
    total: 19800,
    status: 'comprando',
    distance: '3.4 km',
    time: 'hace 22 min',
  },
  {
    id: 'PD-1040',
    client: 'Diana López',
    address: 'Av. El Poblado #14-90',
    items: ['Huevos x30', 'Pan tajado', 'Detergente'],
    total: 32400,
    status: 'pendiente',
    distance: '5.1 km',
    time: 'hace 35 min',
  },
];

const HISTORY = [
  { id: 'PD-1038', client: 'Carlos M.', total: 44200, status: 'entregado', date: 'Hoy 09:12' },
  { id: 'PD-1035', client: 'Ana R.',    total: 27800, status: 'entregado', date: 'Hoy 07:55' },
  { id: 'PD-1031', client: 'Luis T.',   total: 61000, status: 'cancelado', date: 'Ayer 18:40' },
];

const STATUS_INFO = {
  pendiente:  { label: 'Pendiente',   color: '#60A5FA', bg: '#60A5FA18' },
  comprando:  { label: 'Comprando',   color: '#FCD34D', bg: '#FCD34D18' },
  en_camino:  { label: 'En camino',   color: '#34D399', bg: '#34D39918' },
  llegando:   { label: 'Llegando',    color: '#C8F135', bg: '#C8F13518' },
  entregado:  { label: 'Entregado',   color: '#34D399', bg: '#34D39918' },
  cancelado:  { label: 'Cancelado',   color: '#F87171', bg: '#F8717118' },
};

export default function RepartidorDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [activeTab, setActiveTab] = useState('activos');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const STATUS_FLOW = ['pendiente', 'comprando', 'en_camino', 'llegando'];

  const advanceStatus = (orderId) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const currentIdx = STATUS_FLOW.indexOf(o.status);
        const nextStatus = currentIdx < STATUS_FLOW.length - 1
          ? STATUS_FLOW[currentIdx + 1]
          : 'entregado';
        return { ...o, status: nextStatus };
      })
    );
  };

  const activeOrders = orders.filter((o) => o.status !== 'entregado');
  const earnings = HISTORY.filter(h => h.status === 'entregado')
    .reduce((acc, h) => acc + h.total, 0);

  return (
    <div style={r.root}>
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside style={r.sidebar}>
        <div style={r.logo}>
          <span style={r.logoText}>NØSEE</span>
          <span style={r.logoBadge}>REP</span>
        </div>

        {/* Estado online */}
        <div style={r.onlineBox}>
          <span style={r.onlineDot} />
          <span style={r.onlineLabel}>En línea</span>
        </div>

        <nav style={r.nav}>
          {[
            { key: 'activos',   icon: '◉', label: 'Pedidos activos', badge: activeOrders.length },
            { key: 'ruta',      icon: '▸', label: 'Mi ruta' },
            { key: 'historial', icon: '◎', label: 'Historial' },
            { key: 'ganancias', icon: '$', label: 'Ganancias' },
          ].map((item) => (
            <button
              key={item.key}
              style={{ ...r.navItem, ...(activeTab === item.key ? r.navActive : {}) }}
              onClick={() => setActiveTab(item.key)}
            >
              <span style={r.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge > 0 && <span style={r.navBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        {/* Stats rápidas */}
        <div style={r.quickStats}>
          <div style={r.quickStat}>
            <div style={r.qValue}>{activeOrders.length}</div>
            <div style={r.qLabel}>Activos</div>
          </div>
          <div style={r.quickStat}>
            <div style={r.qValue}>{HISTORY.filter(h => h.status === 'entregado').length}</div>
            <div style={r.qLabel}>Hoy</div>
          </div>
          <div style={r.quickStat}>
            <div style={r.qValue}>${(earnings / 1000).toFixed(0)}k</div>
            <div style={r.qLabel}>Ganado</div>
          </div>
        </div>

        <div style={r.userBlock}>
          <div style={r.userAvatar}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'R'}
          </div>
          <div>
            <div style={r.userName}>{user?.fullName || 'Repartidor'}</div>
            <div style={r.userRole}>Repartidor</div>
          </div>
        </div>
        <button style={r.logoutBtn} onClick={logout}>⏻ Salir</button>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main style={r.main}>

        {/* Pedidos activos */}
        {activeTab === 'activos' && (
          <>
            <header style={r.header}>
              <h1 style={r.headerTitle}>Pedidos activos</h1>
              <p style={r.headerSub}>{activeOrders.length} en curso</p>
            </header>

            {activeOrders.length === 0 ? (
              <div style={r.empty}>
                <span style={{ fontSize: 40 }}>◎</span>
                <p>Sin pedidos activos. Espera nuevas asignaciones.</p>
              </div>
            ) : (
              <div style={r.orderList}>
                {activeOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onAdvance={advanceStatus}
                    onSelect={setSelectedOrder}
                    selected={selectedOrder === order.id}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Historial */}
        {activeTab === 'historial' && (
          <>
            <header style={r.header}>
              <h1 style={r.headerTitle}>Historial de pedidos</h1>
              <p style={r.headerSub}>Tus últimas entregas</p>
            </header>
            <div style={r.historyList}>
              {HISTORY.map((h) => {
                const si = STATUS_INFO[h.status];
                return (
                  <div key={h.id} style={r.historyRow}>
                    <div style={r.histId}>{h.id}</div>
                    <div style={r.histClient}>{h.client}</div>
                    <div style={r.histTotal}>${h.total.toLocaleString('es-CO')}</div>
                    <span style={{ ...r.statusBadge, background: si.bg, color: si.color }}>
                      {si.label}
                    </span>
                    <div style={r.histDate}>{h.date}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {['ruta', 'ganancias'].includes(activeTab) && (
          <div style={r.placeholder}>
            <span style={{ fontSize: 44 }}>{activeTab === 'ruta' ? '▸' : '$'}</span>
            <h2 style={r.phTitle}>
              {activeTab === 'ruta' ? 'Mapa de ruta' : 'Panel de ganancias'}
            </h2>
            <p style={r.phSub}>
              {activeTab === 'ruta'
                ? 'Visualización de ruta óptima entre tiendas y destinos'
                : 'Resumen de ganancias diarias, semanales y comisiones'}
            </p>
            <div style={r.tag}>Próximamente</div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── OrderCard ────────────────────────────────────────────────────────────────
function OrderCard({ order, onAdvance, onSelect, selected }) {
  const si = STATUS_INFO[order.status];
  const isDelivered = order.status === 'entregado';

  const NEXT_LABEL = {
    pendiente: 'Iniciar compra →',
    comprando: 'Salir a entregar →',
    en_camino: 'Llegué →',
    llegando:  'Marcar entregado ✓',
  };

  return (
    <article
      style={{
        ...r.orderCard,
        ...(selected ? r.orderCardSelected : {}),
      }}
      onClick={() => onSelect(selected ? null : order.id)}
    >
      <div style={r.orderTop}>
        <div style={r.orderId}>{order.id}</div>
        <span style={{ ...r.statusBadge, background: si.bg, color: si.color }}>
          {si.label}
        </span>
        <div style={r.orderDist}>📍 {order.distance}</div>
        <div style={r.orderTime}>{order.time}</div>
      </div>

      <div style={r.orderClient}>{order.client}</div>
      <div style={r.orderAddress}>{order.address}</div>

      <div style={r.orderItems}>
        {order.items.map((item) => (
          <span key={item} style={r.itemChip}>{item}</span>
        ))}
      </div>

      <div style={r.orderFooter}>
        <div style={r.orderTotal}>${order.total.toLocaleString('es-CO')}</div>
        {!isDelivered && (
          <button
            style={r.advanceBtn}
            onClick={(e) => { e.stopPropagation(); onAdvance(order.id); }}
          >
            {NEXT_LABEL[order.status] || 'Avanzar →'}
          </button>
        )}
      </div>
    </article>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const ACCENT  = '#34D399';   // verde operaciones — movimiento, acción
const BG      = '#090C0A';
const SURFACE = '#0F1410';
const BORDER  = '#1A201B';
const TEXT    = '#E8EAED';
const MUTED   = '#6B7870';

const r = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Inter', sans-serif",
  },
  sidebar: {
    width: 228,
    background: SURFACE,
    borderRight: `1px solid ${BORDER}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, paddingLeft: 8 },
  logoText: { fontSize: 22, fontWeight: 800, color: ACCENT, letterSpacing: '-1px' },
  logoBadge: {
    fontSize: 10,
    background: `${ACCENT}20`,
    color: ACCENT,
    borderRadius: 4,
    padding: '2px 6px',
    fontWeight: 700,
    letterSpacing: '1px',
    textTransform: 'uppercase',
  },
  onlineBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '7px 12px',
    background: `${ACCENT}12`,
    borderRadius: 8,
    marginBottom: 24,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: ACCENT,
    boxShadow: `0 0 0 3px ${ACCENT}30`,
  },
  onlineLabel: { fontSize: 13, fontWeight: 600, color: ACCENT },
  nav: { display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: MUTED,
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  navActive: { background: `${ACCENT}18`, color: ACCENT },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  navBadge: {
    marginLeft: 'auto',
    background: ACCENT,
    color: '#000',
    borderRadius: 10,
    padding: '1px 7px',
    fontSize: 11,
    fontWeight: 700,
  },
  quickStats: {
    display: 'flex',
    gap: 8,
    padding: '16px 8px',
    borderTop: `1px solid ${BORDER}`,
    marginTop: 16,
  },
  quickStat: { flex: 1, textAlign: 'center' },
  qValue: { fontSize: 18, fontWeight: 800, color: ACCENT },
  qLabel: { fontSize: 10, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px' },

  userBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 8px',
    borderTop: `1px solid ${BORDER}`,
    marginTop: 'auto',
    marginBottom: 12,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: `${ACCENT}20`,
    color: ACCENT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  userName: { fontSize: 13, fontWeight: 600, color: TEXT },
  userRole: { fontSize: 11, color: MUTED },
  logoutBtn: {
    background: 'none',
    border: `1px solid ${BORDER}`,
    color: MUTED,
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13,
    textAlign: 'left',
  },

  main: { flex: 1, padding: '32px 40px', maxWidth: 720 },
  header: { marginBottom: 28 },
  headerTitle: { fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' },
  headerSub: { color: MUTED, fontSize: 14, margin: '4px 0 0' },

  orderList: { display: 'flex', flexDirection: 'column', gap: 14 },
  orderCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '18px 20px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
  },
  orderCardSelected: { borderColor: ACCENT },
  orderTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  orderId: { fontSize: 13, fontWeight: 700, color: MUTED, fontFamily: 'monospace' },
  statusBadge: { fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '3px 10px' },
  orderDist: { marginLeft: 'auto', fontSize: 12, color: MUTED },
  orderTime: { fontSize: 12, color: MUTED },

  orderClient: { fontSize: 16, fontWeight: 600, marginBottom: 4 },
  orderAddress: { fontSize: 13, color: MUTED, marginBottom: 12 },

  orderItems: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  itemChip: {
    background: '#1A201B',
    border: `1px solid ${BORDER}`,
    borderRadius: 5,
    padding: '3px 10px',
    fontSize: 12,
    color: MUTED,
  },

  orderFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  orderTotal: { fontSize: 20, fontWeight: 800, color: ACCENT, letterSpacing: '-0.5px' },
  advanceBtn: {
    background: ACCENT,
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '9px 18px',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
  },

  historyList: { display: 'flex', flexDirection: 'column', gap: 0 },
  historyRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    padding: '14px 0',
    borderBottom: `1px solid ${BORDER}`,
    fontSize: 14,
  },
  histId: { fontFamily: 'monospace', color: MUTED, width: 80 },
  histClient: { flex: 1 },
  histTotal: { fontWeight: 700, color: ACCENT },
  histDate: { fontSize: 12, color: MUTED },

  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
    gap: 12,
    color: MUTED,
    fontSize: 14,
  },

  placeholder: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    gap: 12,
    color: MUTED,
  },
  phTitle: { fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 },
  phSub: { fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 360 },
  tag: {
    background: `${ACCENT}15`,
    color: ACCENT,
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    marginTop: 8,
  },
};