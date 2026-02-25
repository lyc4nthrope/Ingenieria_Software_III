/**
 * ModeradorDashboard.jsx
 *
 * Dashboard del moderador de NØSEE.
 * Vista de usuario + controles de moderación: revisar reportes,
 * eliminar publicaciones, gestionar contenido.
 *
 * UBICACIÓN: src/features/dashboard/moderador/ModeradorDashboard.jsx
 */
import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';

const MOCK_REPORTS = [
  {
    id: 1,
    type: 'Precio falso',
    reporter: 'Juan M.',
    reported: 'Carlos V.',
    post: 'Pollo x kg — $2.000',
    time: 'hace 5 min',
    severity: 'alta',
  },
  {
    id: 2,
    type: 'Spam',
    reporter: 'Laura C.',
    reported: 'Unknown',
    post: 'Ganhe dinheiro rápido…',
    time: 'hace 18 min',
    severity: 'media',
  },
  {
    id: 3,
    type: 'Contenido ofensivo',
    reporter: 'Pedro A.',
    reported: 'Roberto G.',
    post: 'Comentario inapropiado en hilo',
    time: 'hace 42 min',
    severity: 'alta',
  },
  {
    id: 4,
    type: 'Precio duplicado',
    reporter: 'Sofía R.',
    reported: 'María T.',
    post: 'Aceite 3L — $18.900',
    time: 'hace 1h',
    severity: 'baja',
  },
];

const SEVERITY_COLORS = {
  alta:  { bg: '#F8717118', text: '#F87171' },
  media: { bg: '#FCD34D18', text: '#FCD34D' },
  baja:  { bg: '#60A5FA18', text: '#60A5FA' },
};

export default function ModeradorDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [reports, setReports] = useState(MOCK_REPORTS);
  const [activeTab, setActiveTab] = useState('reportes');
  const [resolved, setResolved] = useState([]);

  const handleResolve = (id, action) => {
    setResolved((prev) => [...prev, { id, action }]);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const pendingCount = reports.length;

  return (
    <div style={st.root}>
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside style={st.sidebar}>
        <div style={st.logo}>
          <span style={st.logoText}>NØSEE</span>
          <span style={st.logoBadge}>MOD</span>
        </div>

        <nav style={st.nav}>
          {[
            { key: 'reportes', icon: '⚑', label: 'Reportes', badge: pendingCount },
            { key: 'feed',     icon: '◈', label: 'Feed' },
            { key: 'historial',icon: '◎', label: 'Historial' },
          ].map((item) => (
            <button
              key={item.key}
              style={{ ...st.navItem, ...(activeTab === item.key ? st.navActive : {}) }}
              onClick={() => setActiveTab(item.key)}
            >
              <span style={st.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge > 0 && <span style={st.navBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={st.userBlock}>
          <div style={st.userAvatar}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'M'}
          </div>
          <div>
            <div style={st.userName}>{user?.fullName || 'Moderador'}</div>
            <div style={st.userRole}>Moderador</div>
          </div>
        </div>
        <button style={st.logoutBtn} onClick={logout}>⏻ Salir</button>
      </aside>

      {/* ── Main ─────────────────────────────────────────────────── */}
      <main style={st.main}>

        {/* Reportes pendientes */}
        {activeTab === 'reportes' && (
          <>
            <header style={st.header}>
              <div>
                <h1 style={st.headerTitle}>Reportes pendientes</h1>
                <p style={st.headerSub}>
                  {pendingCount > 0
                    ? `${pendingCount} reportes esperan revisión`
                    : 'Todo al día ✓'}
                </p>
              </div>
              <div style={st.resolvedCount}>
                {resolved.length} resueltos hoy
              </div>
            </header>

            {reports.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={st.reportList}>
                {reports.map((r) => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    onResolve={handleResolve}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'feed' && (
          <div style={st.placeholder}>
            <span style={st.placeholderIcon}>◈</span>
            <h2 style={st.placeholderTitle}>Feed con controles de moderación</h2>
            <p style={st.placeholderSub}>Ver todas las publicaciones con opciones para eliminar o banear contenido</p>
            <div style={st.tag}>Próximamente</div>
          </div>
        )}

        {activeTab === 'historial' && (
          <div style={st.placeholder}>
            <span style={st.placeholderIcon}>◎</span>
            <h2 style={st.placeholderTitle}>Historial de acciones</h2>
            <p style={st.placeholderSub}>Registro de todas las moderaciones realizadas por este moderador</p>
            <div style={st.tag}>Próximamente</div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({ report, onResolve }) {
  const sev = SEVERITY_COLORS[report.severity];

  return (
    <article style={st.reportCard}>
      <div style={st.reportTop}>
        <span style={{ ...st.severityBadge, background: sev.bg, color: sev.text }}>
          {report.severity.toUpperCase()}
        </span>
        <span style={st.reportType}>{report.type}</span>
        <span style={st.reportTime}>{report.time}</span>
      </div>

      <div style={st.reportBody}>
        <div style={st.reportRow}>
          <span style={st.reportLabel}>Publicación</span>
          <span style={st.reportValue}>"{report.post}"</span>
        </div>
        <div style={st.reportRow}>
          <span style={st.reportLabel}>Reportado por</span>
          <span style={st.reportValue}>{report.reporter}</span>
        </div>
        <div style={st.reportRow}>
          <span style={st.reportLabel}>Usuario denunciado</span>
          <span style={st.reportValue}>{report.reported}</span>
        </div>
      </div>

      <div style={st.reportActions}>
        <button
          style={st.btnDelete}
          onClick={() => onResolve(report.id, 'eliminado')}
        >
          🗑 Eliminar publicación
        </button>
        <button
          style={st.btnBan}
          onClick={() => onResolve(report.id, 'baneado')}
        >
          ⊗ Banear usuario
        </button>
        <button
          style={st.btnDismiss}
          onClick={() => onResolve(report.id, 'descartado')}
        >
          ↩ Descartar
        </button>
      </div>
    </article>
  );
}

function EmptyState() {
  return (
    <div style={st.emptyState}>
      <span style={{ fontSize: 48 }}>✓</span>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: '12px 0 6px', color: ACCENT }}>
        Sin reportes pendientes
      </h2>
      <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>
        La plataforma está limpia. Buen trabajo.
      </p>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const ACCENT  = '#A78BFA';   // violeta moderador — autoridad sutil
const BG      = '#0B0B0E';
const SURFACE = '#111116';
const BORDER  = '#1A1A22';
const TEXT    = '#E8EAED';
const MUTED   = '#6B7080';

const st = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Inter', sans-serif",
  },
  sidebar: {
    width: 220,
    background: SURFACE,
    borderRight: `1px solid ${BORDER}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  logo: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 36, paddingLeft: 8 },
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
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
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
  navIcon: { fontSize: 16 },
  navBadge: {
    marginLeft: 'auto',
    background: '#F87171',
    color: '#fff',
    borderRadius: 10,
    padding: '1px 7px',
    fontSize: 11,
    fontWeight: 700,
  },
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

  main: { flex: 1, padding: '32px 40px', maxWidth: 760 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 },
  headerTitle: { fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' },
  headerSub: { color: MUTED, fontSize: 14, margin: '4px 0 0' },
  resolvedCount: {
    background: `${ACCENT}15`,
    color: ACCENT,
    borderRadius: 8,
    padding: '8px 16px',
    fontSize: 14,
    fontWeight: 600,
  },

  reportList: { display: 'flex', flexDirection: 'column', gap: 14 },
  reportCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '18px 20px',
  },
  reportTop: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  severityBadge: {
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 4,
    padding: '3px 8px',
    letterSpacing: '0.5px',
  },
  reportType: { fontSize: 15, fontWeight: 600 },
  reportTime: { marginLeft: 'auto', fontSize: 12, color: MUTED },

  reportBody: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 },
  reportRow: { display: 'flex', gap: 12, fontSize: 14 },
  reportLabel: { color: MUTED, width: 140, flexShrink: 0 },
  reportValue: { color: TEXT },

  reportActions: { display: 'flex', gap: 10, flexWrap: 'wrap' },
  btnDelete: {
    background: '#F8717115',
    border: '1px solid #F87171',
    color: '#F87171',
    borderRadius: 7,
    padding: '7px 14px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  btnBan: {
    background: '#FCD34D15',
    border: '1px solid #FCD34D',
    color: '#FCD34D',
    borderRadius: 7,
    padding: '7px 14px',
    fontSize: 13,
    cursor: 'pointer',
    fontWeight: 500,
  },
  btnDismiss: {
    background: 'none',
    border: `1px solid ${BORDER}`,
    color: MUTED,
    borderRadius: 7,
    padding: '7px 14px',
    fontSize: 13,
    cursor: 'pointer',
  },

  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
    color: MUTED,
    gap: 4,
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
  placeholderIcon: { fontSize: 48 },
  placeholderTitle: { fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 },
  placeholderSub: { fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 360 },
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