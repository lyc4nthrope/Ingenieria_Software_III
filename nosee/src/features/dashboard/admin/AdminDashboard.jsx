/**
 * AdminDashboard.jsx
 *
 * Panel de control total del Admin de NØSEE.
 * Gestión de usuarios, cambio de roles, estadísticas del sistema.
 *
 * UBICACIÓN: src/features/dashboard/admin/AdminDashboard.jsx
 */
import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { changeUserRole, getAllUsers } from '@/services/api/users.api';
import { UserRoleEnum } from '@/types';

// ─── Mock data ────────────────────────────────────────────────────────────────
const MOCK_USERS = [
  { id: 1, name: 'María García',   email: 'maria@ex.co',   role: 'Usuario',    status: 'activo',   rep: 230, joined: '10 ene 2025' },
  { id: 2, name: 'Carlos Ruiz',    email: 'carlos@ex.co',  role: 'Moderador',  status: 'activo',   rep: 890, joined: '05 dic 2024' },
  { id: 3, name: 'Ana Pereira',    email: 'ana@ex.co',     role: 'Repartidor', status: 'activo',   rep: 120, joined: '22 feb 2025' },
  { id: 4, name: 'Luis Tobón',     email: 'luis@ex.co',    role: 'Usuario',    status: 'baneado',  rep: 0,   joined: '01 mar 2025' },
  { id: 5, name: 'Sofía Morales',  email: 'sofia@ex.co',   role: 'Moderador',  status: 'activo',   rep: 450, joined: '14 ene 2025' },
];

const STATS = [
  { label: 'Usuarios totales',   value: '1,284', delta: '+12%', icon: '◉' },
  { label: 'Publicaciones hoy',  value: '342',   delta: '+8%',  icon: '◈' },
  { label: 'Validaciones hoy',   value: '1,109', delta: '+21%', icon: '✓' },
  { label: 'Reportes pendientes',value: '7',     delta: '-3',   icon: '⚠' },
];

const ALL_ROLES = [UserRoleEnum.USUARIO, UserRoleEnum.MODERADOR, UserRoleEnum.ADMIN, UserRoleEnum.REPARTIDOR];

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [users, setUsers] = useState(MOCK_USERS);
  const [activeSection, setActiveSection] = useState('overview');

  const handleRoleChange = async (userId, newRole) => {
    const roleMap = {
      'Usuario': 1,
      'Moderador': 2,
      'Admin': 3,
      'Repartidor': 4,
    };

    const { success, error } = await changeUserRole(userId, roleMap[newRole]);

    if (success) {
      // Refetch para actualizar la tabla
      const { data: updatedUsers } = await getAllUsers();
      if (updatedUsers) {
        setUsers(updatedUsers);
      }
    } else {
      console.error('Error al cambiar rol:', error);
      alert(`Error: ${error}`);
    }
  };

  const handleBanToggle = (userId) => {
    setUsers(users.map(u => 
      u.id === userId 
        ? { ...u, status: u.status === 'baneado' ? 'activo' : 'baneado' }
        : u
    ));
  };

  return (
    <div style={s.root}>
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={s.sidebar}>
        <div style={s.logo}>
          <span style={s.logoText}>NØSEE</span>
          <span style={s.logoBadge}>Admin</span>
        </div>

        <nav style={s.nav}>
          {[
            { key: 'overview', icon: '▦', label: 'Resumen' },
            { key: 'users',    icon: '◉', label: 'Usuarios' },
            { key: 'content',  icon: '◈', label: 'Contenido' },
            { key: 'reports',  icon: '⚠', label: 'Reportes', badge: 7 },
            { key: 'config',   icon: '⚙', label: 'Config' },
          ].map((item) => (
            <button
              key={item.key}
              style={{ ...s.navItem, ...(activeSection === item.key ? s.navActive : {}) }}
              onClick={() => setActiveSection(item.key)}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && <span style={s.navBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div style={s.userBlock}>
          <div style={s.userAvatar}>
            {user?.fullName?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div>
            <div style={s.userName}>{user?.fullName || 'Admin'}</div>
            <div style={s.userRole}>Administrador</div>
          </div>
        </div>
        <button style={s.logoutBtn} onClick={logout}>⏻ Salir</button>
      </aside>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main style={s.main}>

        {/* Overview */}
        {activeSection === 'overview' && (
          <>
            <SectionHeader
              title="Panel de control"
              sub="Vista general de la plataforma NØSEE"
            />

            {/* Stats */}
            <div style={s.statsGrid}>
              {STATS.map((stat) => (
                <div key={stat.label} style={s.statCard}>
                  <div style={s.statTop}>
                    <span style={s.statIcon}>{stat.icon}</span>
                    <span style={{
                      ...s.statDelta,
                      color: stat.delta.startsWith('+') ? ACCENT : '#F87171',
                    }}>
                      {stat.delta}
                    </span>
                  </div>
                  <div style={s.statValue}>{stat.value}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Recent users preview */}
            <div style={s.section}>
              <div style={s.sectionHead}>
                <span style={s.sectionTitle}>Usuarios recientes</span>
                <button style={s.linkBtn} onClick={() => setActiveSection('users')}>
                  Ver todos →
                </button>
              </div>
              <UsersTable
                users={users.slice(0, 3)}
                onRoleChange={handleRoleChange}
                onBanToggle={handleBanToggle}
              />
            </div>
          </>
        )}

        {/* Users section */}
        {activeSection === 'users' && (
          <>
            <SectionHeader
              title="Gestión de usuarios"
              sub={`${users.length} usuarios registrados`}
            />
            <UsersTable
              users={users}
              onRoleChange={handleRoleChange}
              onBanToggle={handleBanToggle}
            />
          </>
        )}

        {/* Other sections placeholder */}
        {['content', 'reports', 'config'].includes(activeSection) && (
          <PlaceholderSection section={activeSection} />
        )}
      </main>
    </div>
  );
}

// ─── UsersTable ───────────────────────────────────────────────────────────────
function UsersTable({ users, onRoleChange, onBanToggle }) {
  return (
    <div style={s.table}>
      <div style={s.tableHead}>
        {['Usuario', 'Rol', 'Rep.', 'Estado', 'Acciones'].map((h) => (
          <div key={h} style={s.th}>{h}</div>
        ))}
      </div>
      {users.map((u) => (
        <div key={u.id} style={s.tableRow}>
          {/* Usuario */}
          <div style={s.td}>
            <div style={s.rowAvatar}>{u.name.charAt(0)}</div>
            <div>
              <div style={s.rowName}>{u.name}</div>
              <div style={s.rowEmail}>{u.email}</div>
            </div>
          </div>

          {/* Rol selector */}
          <div style={s.td}>
            <select
              style={s.roleSelect}
              value={u.role}
              onChange={(e) => onRoleChange(u.id, e.target.value)}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Reputación */}
          <div style={{ ...s.td, ...s.tdNum }}>{u.rep}</div>

          {/* Estado */}
          <div style={s.td}>
            <span style={{
              ...s.badge,
              background: u.status === 'activo' ? `${ACCENT}18` : '#F8717120',
              color: u.status === 'activo' ? ACCENT : '#F87171',
            }}>
              {u.status}
            </span>
          </div>

          {/* Acciones */}
          <div style={s.td}>
            <button
              style={{
                ...s.actionBtn,
                ...(u.status === 'baneado' ? s.actionBtnDanger : {}),
              }}
              onClick={() => onBanToggle(u.id)}
            >
              {u.status === 'baneado' ? 'Desbanear' : 'Banear'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <header style={s.header}>
      <h1 style={s.headerTitle}>{title}</h1>
      <p style={s.headerSub}>{sub}</p>
    </header>
  );
}

function PlaceholderSection({ section }) {
  const labels = {
    content: { icon: '◈', title: 'Gestión de contenido', sub: 'Moderación de publicaciones y reportes activos' },
    reports: { icon: '⚠', title: 'Reportes pendientes', sub: '7 reportes esperan revisión' },
    config: { icon: '⚙', title: 'Configuración del sistema', sub: 'Parámetros globales de la plataforma' },
  };
  const info = labels[section];
  return (
    <div style={s.placeholder}>
      <span style={s.placeholderIcon}>{info.icon}</span>
      <h2 style={s.placeholderTitle}>{info.title}</h2>
      <p style={s.placeholderSub}>{info.sub}</p>
      <div style={s.placeholderTag}>Próximamente</div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const ACCENT   = '#FF6B35';   // naranja admin — poder, control
const BG       = '#0A0A0C';
const SURFACE  = '#111114';
const BORDER   = '#1C1C20';
const TEXT     = '#E8EAED';
const MUTED    = '#666870';

const s = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Inter', sans-serif",
  },
  sidebar: {
    width: 224,
    background: SURFACE,
    borderRight: `1px solid ${BORDER}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 36,
    paddingLeft: 8,
  },
  logoText: { fontSize: 22, fontWeight: 800, color: ACCENT, letterSpacing: '-1px' },
  logoBadge: {
    fontSize: 10,
    background: `${ACCENT}25`,
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
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
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
    background: `${ACCENT}25`,
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

  main: { flex: 1, padding: '32px 40px' },
  header: { marginBottom: 28 },
  headerTitle: { fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' },
  headerSub: { color: MUTED, fontSize: 14, margin: '4px 0 0' },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 14,
    marginBottom: 32,
  },
  statCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '18px 20px',
  },
  statTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statIcon: { fontSize: 18, color: MUTED },
  statDelta: { fontSize: 12, fontWeight: 600 },
  statValue: { fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: TEXT },
  statLabel: { fontSize: 12, color: MUTED, marginTop: 4 },

  section: { marginTop: 32 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 600 },
  linkBtn: { background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: 13, fontWeight: 600 },

  table: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tableHead: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 0.5fr 0.8fr 1fr',
    padding: '12px 20px',
    borderBottom: `1px solid ${BORDER}`,
    background: '#0D0D10',
  },
  th: { fontSize: 12, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr 0.5fr 0.8fr 1fr',
    padding: '14px 20px',
    alignItems: 'center',
    borderBottom: `1px solid ${BORDER}`,
  },
  td: { display: 'flex', alignItems: 'center', gap: 10 },
  tdNum: { fontSize: 14, fontWeight: 600, color: ACCENT },
  rowAvatar: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: '#1C1C20',
    color: MUTED,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  rowName: { fontSize: 14, fontWeight: 500 },
  rowEmail: { fontSize: 12, color: MUTED },
  roleSelect: {
    background: '#1C1C20',
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: 6,
    padding: '5px 10px',
    fontSize: 13,
    cursor: 'pointer',
  },
  badge: {
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 6,
    padding: '3px 10px',
    textTransform: 'capitalize',
  },
  actionBtn: {
    background: 'none',
    border: `1px solid ${BORDER}`,
    color: MUTED,
    borderRadius: 6,
    padding: '5px 12px',
    fontSize: 13,
    cursor: 'pointer',
  },
  actionBtnDanger: { borderColor: '#F87171', color: '#F87171' },

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
  placeholderSub: { fontSize: 14, margin: 0 },
  placeholderTag: {
    background: `${ACCENT}15`,
    color: ACCENT,
    borderRadius: 6,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    marginTop: 8,
  },
};