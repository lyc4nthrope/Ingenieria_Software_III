/**
 * AdminDashboard.jsx
 *
 * Panel de control total del Admin de NØSEE.
 * Gestión de usuarios, cambio de roles, estadísticas del sistema.
 *
 * UBICACIÓN: src/features/dashboard/admin/AdminDashboard.jsx
 * 
 * CAMBIOS (26-02-2026):
 * ✅ Conectado a API real (getAllUsers, changeUserRole)
 * ✅ Carga usuarios desde BD en useEffect
 * ✅ Estados para loading y error
 * ✅ Manejo de errores amigable
 */
import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import {
  changeUserRole,
  getAdminOverviewStats,
  getAdminReports,
  getAllUsers,
  updateReportReview,
  updateUserStatus,
} from '@/services/api/users.api';
import { UserRoleEnum } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

const INITIAL_STATS = {
  totalUsers: '—',
  publicationsToday: '—',
  validationsToday: '—',
  pendingReports: '—',
};

const ALL_ROLES = [UserRoleEnum.USUARIO, UserRoleEnum.MODERADOR, UserRoleEnum.ADMIN, UserRoleEnum.REPARTIDOR];
const REPORT_STATUS_OPTIONS = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

const REPORT_REASON_LABELS = {
  fake_price: 'Precio falso',
  wrong_photo: 'Foto incorrecta',
  spam: 'Spam',
  offensive: 'Ofensivo',
  other: 'Otro',
};

export default function AdminDashboard() {
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.user);

  // ─── Estados ──────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [activeSection, setActiveSection] = useState('overview');
  const [changingRole, setChangingRole] = useState(null);
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportFilters, setReportFilters] = useState({
    order: 'recent',
    status: 'all',
    reason: 'all',
  });
  const [reportForm, setReportForm] = useState({ status: 'PENDING', actionTaken: '', modNotes: '' });
  const [savingReport, setSavingReport] = useState(false);

  const statCards = [
    { label: 'Usuarios totales', value: stats.totalUsers, delta: 'Total', icon: '◉' },
    { label: 'Publicaciones hoy', value: stats.publicationsToday, delta: 'Hoy', icon: '◈' },
    { label: 'Validaciones hoy', value: stats.validationsToday, delta: 'Hoy', icon: '✓' },
    { label: 'Reportes pendientes', value: stats.pendingReports, delta: 'Pendientes', icon: '⚠' },
  ];

  // ─── Cargar usuarios al montar ────────────────────────────────────────────
  useEffect(() => {
    loadUsers();
    loadOverviewStats();
  }, []);

  const loadOverviewStats = async () => {
    try {
      const result = await getAdminOverviewStats();

      if (result.success && result.data) {
        setStats(result.data);
      } else {
        setError((prev) => prev || result.error || 'No se pudieron cargar las métricas del resumen');
      }
    } catch (err) {
      console.error('Error cargando resumen admin:', err);
      setError((prev) => prev || 'Error al conectar métricas del resumen');
    }
  };

  useEffect(() => {
    if (activeSection === 'reports') {
      loadReports();
    }
  }, [activeSection]);

  useEffect(() => {
    if (!selectedReport) return;
    setReportForm({
      status: selectedReport.status || 'PENDING',
      actionTaken: selectedReport.action_taken || '',
      modNotes: selectedReport.mod_notes || '',
    });
  }, [selectedReport]);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getAllUsers();
      
      if (result.success && result.data) {
        // Mapear datos de BD a formato de tabla
        const mappedUsers = result.data.map((u) => ({
          id: u.id,
          name: u.fullName || 'Sin nombre',
          email: u.email,
          role: u.role,
          status: u.isActive ? 'activo' : 'baneado',
          rep: u.reputationPoints || 0,
          joined: new Date(u.createdAt).toLocaleDateString('es-CO', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          }),
        }));
        
        setUsers(mappedUsers);
      } else {
        setError(result.error || 'No se pudieron cargar los usuarios');
      }
    } catch (err) {
      console.error('Error cargando usuarios:', err);
      setError('Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    setLoadingReports(true);
    try {
      const result = await getAdminReports();
      if (result.success && result.data) {
        setReports(result.data);
      } else {
        setError((prev) => prev || result.error || 'No se pudieron cargar los reportes');
      }
    } catch (err) {
      console.error('Error cargando reportes:', err);
      setError((prev) => prev || 'Error al conectar reportes');
    } finally {
      setLoadingReports(false);
    }
  };

  const reportReasonOptions = useMemo(() => {
    const keys = Array.from(new Set(reports.map((r) => r.reason).filter(Boolean)));
    return keys;
  }, [reports]);

  const reportStats = useMemo(() => {
    const byType = reports.reduce((acc, report) => {
      const key = report.reason || 'other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byStatus = reports.reduce((acc, report) => {
      const key = (report.status || 'PENDING').toUpperCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return { byType, byStatus };
  }, [reports]);

  const filteredReports = useMemo(() => {
    const base = reports.filter((report) => {
      const statusMatch = reportFilters.status === 'all' || (report.status || '').toUpperCase() === reportFilters.status;
      const reasonMatch = reportFilters.reason === 'all' || report.reason === reportFilters.reason;
      return statusMatch && reasonMatch;
    });

    return base.sort((a, b) => {
      const firstDate = new Date(a.created_at).getTime();
      const secondDate = new Date(b.created_at).getTime();
      return reportFilters.order === 'recent' ? secondDate - firstDate : firstDate - secondDate;
    });
  }, [reports, reportFilters]);

  // ─── Cambiar rol de un usuario ─────────────────────────────────────────────
  const handleRoleChange = async (userId, newRole) => {
    const roleMap = {
      'Usuario': 1,
      'Moderador': 2,
      'Admin': 3,
      'Repartidor': 4,
    };

    setChangingRole(userId);
    
    try {
      const result = await changeUserRole(userId, roleMap[newRole]);

      if (result.success) {
        // Actualizar la tabla localmente
        setUsers(users.map(u => 
          u.id === userId 
            ? { ...u, role: newRole }
            : u
        ));
      } else {
        alert(`Error al cambiar rol: ${result.error || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error al cambiar rol:', err);
      alert('Error al cambiar rol. Intenta de nuevo.');
    } finally {
      setChangingRole(null);
    }
  };

  // ─── Toggle de ban ────────────────────────────────────────────────────────
  const handleBanToggle = async (userId) => {
    const target = users.find(u => u.id === userId);
    if (!target) return;

    const newIsActive = target.status === 'baneado';

    try {
      const result = await updateUserStatus(userId, newIsActive);
      if (result.success) {
        setUsers(users.map(u =>
          u.id === userId
            ? { ...u, status: newIsActive ? 'activo' : 'baneado' }
            : u
        ));
      } else {
        alert(`Error al cambiar estado: ${result.error || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      alert('Error al cambiar estado. Intenta de nuevo.');
    }
  };

  const handleSaveReportReview = async () => {
    if (!selectedReport) return;

    const status = reportForm.status;
    const isResolved = status === 'RESOLVED' || status === 'REJECTED';

    setSavingReport(true);
    try {
      const payload = {
        status,
        action_taken: reportForm.actionTaken || null,
        mod_notes: reportForm.modNotes || null,
        reviewed_by: currentUser?.id || selectedReport.reviewed_by || null,
        resolved_at: isResolved ? new Date().toISOString() : null,
      };

      const result = await updateReportReview(selectedReport.id, payload);
      if (!result.success) {
        alert(`Error al guardar reporte: ${result.error || 'Error desconocido'}`);
        return;
      }

      setReports((prev) => prev.map((report) => (
        report.id === selectedReport.id
          ? { ...report, ...payload }
          : report
      )));

      setSelectedReport((prev) => (prev ? { ...prev, ...payload } : prev));
    } catch (err) {
      console.error('Error actualizando reporte:', err);
      alert('Error al actualizar reporte. Intenta de nuevo.');
    } finally {
      setSavingReport(false);
    }
  };

  return (
    <div style={s.root}>
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={s.sidebar}>
        <nav style={s.nav}>
          {[
            { key: 'overview', icon: '▦', label: 'Resumen' },
            { key: 'users',    icon: '◉', label: 'Usuarios' },
            { key: 'content',  icon: '◈', label: 'Contenido' },
            { key: 'reports',  icon: '⚠', label: 'Reportes' },
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

        <button style={s.logoutBtn} onClick={logout}>⏻ Salir</button>
      </aside>

      {/* ── Content ──────────────────────────────────────────────── */}
      <main style={s.main}>

        {/* Error message */}
        {error && (
          <div style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--error-soft)',
            border: '1px solid rgba(248,113,113,0.25)',
            color: 'var(--error)',
            fontSize: '13px',
            marginBottom: '20px',
          }}>
            ⚠️ {error}
            <button 
              onClick={loadUsers}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--error)',
                cursor: 'pointer',
                textDecoration: 'underline',
                marginLeft: '12px',
                fontWeight: '600',
              }}
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Overview */}
        {activeSection === 'overview' && (
          <>
            <SectionHeader
              title="Panel de control"
              sub="Vista general de la plataforma NØSEE"
            />

            {/* Stats */}
            <div style={s.statsGrid}>
               {statCards.map((stat) => (
                <div key={stat.label} style={s.statCard}>
                  <div style={s.statTop}>
                    <span style={s.statIcon}>{stat.icon}</span>
                    <span style={{
                      ...s.statDelta,
                     color: stat.delta.startsWith('+')
                        ? ACCENT
                        : stat.delta.startsWith('-')
                          ? '#F87171'
                          : MUTED,
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
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                <Spinner size={32} />
              </div>
            ) : (
              <div style={s.section}>
                <div style={s.sectionHead}>
                  <span style={s.sectionTitle}>
                    Usuarios recientes ({users.length})
                  </span>
                  <button style={s.linkBtn} onClick={() => setActiveSection('users')}>
                    Ver todos →
                  </button>
                </div>
                {users.length > 0 ? (
                  <UsersTable
                    users={users.slice(0, 3)}
                    onRoleChange={handleRoleChange}
                    onBanToggle={handleBanToggle}
                    changingRole={changingRole}
                  />
                ) : (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: MUTED,
                    fontSize: '14px',
                  }}>
                    No hay usuarios registrados aún
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Users section */}
        {activeSection === 'users' && (
          <>
            <SectionHeader
              title="Gestión de usuarios"
              sub={loading ? 'Cargando...' : `${users.length} usuarios registrados`}
            />
            
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px' }}>
                <div style={{ textAlign: 'center' }}>
                  <Spinner size={32} />
                  <p style={{ marginTop: '16px', color: MUTED, fontSize: '14px' }}>
                    Cargando usuarios...
                  </p>
                </div>
              </div>
            ) : users.length > 0 ? (
              <UsersTable
                users={users}
                onRoleChange={handleRoleChange}
                onBanToggle={handleBanToggle}
                changingRole={changingRole}
              />
            ) : (
              <div style={{
                padding: '60px 20px',
                textAlign: 'center',
                color: MUTED,
                fontSize: '14px',
              }}>
                No hay usuarios registrados aún
              </div>
            )}
          </>
        )}

        {activeSection === 'reports' && (
          <ReportsSection
            reports={filteredReports}
            stats={reportStats}
            filters={reportFilters}
            onFilterChange={setReportFilters}
            reasonOptions={reportReasonOptions}
            loading={loadingReports}
            selectedReport={selectedReport}
            onSelectReport={setSelectedReport}
            reportForm={reportForm}
            onReportFormChange={setReportForm}
            onSaveReportReview={handleSaveReportReview}
            savingReport={savingReport}
          />
        )}

        {/* Other sections placeholder */}
        {['content', 'config'].includes(activeSection) && (
          <PlaceholderSection section={activeSection} />
        )}
      </main>
    </div>
  );
}

// ─── UsersTable ───────────────────────────────────────────────────────────────
function UsersTable({ users, onRoleChange, onBanToggle, changingRole }) {
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
              disabled={changingRole === u.id}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {changingRole === u.id && (
              <span style={{ marginLeft: '8px', fontSize: '12px', color: ACCENT }}>
                Guardando...
              </span>
            )}
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
              disabled={changingRole === u.id}
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

function ReportsSection({
  reports,
  stats,
  filters,
  onFilterChange,
  reasonOptions,
  loading,
  selectedReport,
  onSelectReport,
  reportForm,
  onReportFormChange,
  onSaveReportReview,
  savingReport,
}) {
  return (
    <>
      <SectionHeader
        title="Gestión de reportes"
        sub="Conteos por tipo, estado, filtros rápidos y revisión de detalle"
      />

      <div style={s.reportsStatsGrid}>
        {Object.entries(stats.byType).map(([reason, count]) => (
          <div key={`type-${reason}`} style={s.reportMiniCard}>
            <div style={s.reportMiniLabel}>{REPORT_REASON_LABELS[reason] || reason}</div>
            <div style={s.reportMiniValue}>{count}</div>
          </div>
        ))}
        {Object.entries(stats.byStatus).map(([status, count]) => (
          <div key={`status-${status}`} style={s.reportMiniCard}>
            <div style={s.reportMiniLabel}>Estado: {status}</div>
            <div style={s.reportMiniValue}>{count}</div>
          </div>
        ))}
      </div>

      <div style={s.reportFilters}>
        <select
          style={s.roleSelect}
          value={filters.order}
          onChange={(e) => onFilterChange((prev) => ({ ...prev, order: e.target.value }))}
        >
          <option value="recent">Más reciente</option>
          <option value="oldest">Más antiguo</option>
        </select>

        <select
          style={s.roleSelect}
          value={filters.status}
          onChange={(e) => onFilterChange((prev) => ({ ...prev, status: e.target.value }))}
        >
          <option value="all">Todos los estados</option>
          {REPORT_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{status}</option>
          ))}
        </select>

        <select
          style={s.roleSelect}
          value={filters.reason}
          onChange={(e) => onFilterChange((prev) => ({ ...prev, reason: e.target.value }))}
        >
          <option value="all">Todos los tipos</option>
          {reasonOptions.map((reason) => (
            <option key={reason} value={reason}>{REPORT_REASON_LABELS[reason] || reason}</option>
          ))}
        </select>
      </div>

      <div style={s.reportsLayout}>
        <div style={s.table}>
          <div style={s.reportsTableHead}>
            {['Fecha', 'Tipo', 'Estado', 'Reportado', 'Detalle'].map((h) => (
              <div key={h} style={s.th}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={s.emptyReports}>Cargando reportes...</div>
          ) : reports.length === 0 ? (
            <div style={s.emptyReports}>No hay reportes con estos filtros.</div>
          ) : reports.map((report) => (
            <div key={report.id} style={s.reportsTableRow}>
              <div style={s.td}>{new Date(report.created_at).toLocaleString('es-CO')}</div>
              <div style={s.td}>{REPORT_REASON_LABELS[report.reason] || report.reason}</div>
              <div style={s.td}>
                <span style={s.badge}>{report.status || 'PENDING'}</span>
              </div>
              <div style={s.td}>{report.reported?.full_name || report.reported_user_id || 'N/A'}</div>
              <div style={s.td}>
                <button style={s.actionBtn} onClick={() => onSelectReport(report)}>Ver / editar</button>
              </div>
            </div>
          ))}
        </div>

        <div style={s.reportDetailPanel}>
          {!selectedReport ? (
            <div style={s.emptyReports}>Selecciona un reporte para ver detalle.</div>
          ) : (
            <>
              <h3 style={s.reportTitle}>Reporte #{selectedReport.id.slice(0, 8)}</h3>
              <p style={s.reportText}><strong>Razón:</strong> {REPORT_REASON_LABELS[selectedReport.reason] || selectedReport.reason}</p>
              <p style={s.reportText}><strong>Descripción:</strong> {selectedReport.description || 'Sin descripción'}</p>
              <p style={s.reportText}><strong>Reportante:</strong> {selectedReport.reporter?.full_name || selectedReport.reporter_user_id}</p>
              <p style={s.reportText}><strong>Usuario reportado:</strong> {selectedReport.reported?.full_name || selectedReport.reported_user_id || 'N/A'}</p>
              <p style={s.reportText}><strong>Publicación:</strong> {selectedReport.publication_id || 'N/A'}</p>
              {selectedReport.evidence_url && (
                <a href={selectedReport.evidence_url} target="_blank" rel="noreferrer" style={s.linkBtn}>
                  Ver evidencia
                </a>
              )}

              <div style={s.reportFormBlock}>
                <label style={s.reportLabel}>Estado</label>
                <select
                  style={s.roleSelect}
                  value={reportForm.status}
                  onChange={(e) => onReportFormChange((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {REPORT_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <label style={s.reportLabel}>Acción tomada</label>
                <input
                  style={s.reportInput}
                  value={reportForm.actionTaken}
                  onChange={(e) => onReportFormChange((prev) => ({ ...prev, actionTaken: e.target.value }))}
                  placeholder="Ej: Se removió la publicación"
                />

                <label style={s.reportLabel}>Notas de moderación</label>
                <textarea
                  style={s.reportTextarea}
                  value={reportForm.modNotes}
                  onChange={(e) => onReportFormChange((prev) => ({ ...prev, modNotes: e.target.value }))}
                  placeholder="Detalles internos de la revisión"
                />

                <button style={{ ...s.actionBtn, ...s.saveReportBtn }} onClick={onSaveReportReview} disabled={savingReport}>
                  {savingReport ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function PlaceholderSection({ section }) {
  const labels = {
    content: { icon: '◈', title: 'Gestión de contenido', sub: 'Moderación de publicaciones y reportes activos' },
    reports: { icon: '⚠', title: 'Reportes pendientes', sub: 'Reportes de la comunidad pendientes de revisión' },
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
const BG       = '#080C14';
const SURFACE  = '#0F1724';
const BORDER   = '#1E2D4A';
const TEXT     = '#E8EDF8';
const MUTED    = '#7B90BD';

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
    background: '#0A1020',
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
reportsStatsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))',
    gap: 10,
    marginBottom: 16,
  },
  reportMiniCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '10px 12px',
  },
  reportMiniLabel: { fontSize: 12, color: MUTED },
  reportMiniValue: { fontSize: 22, fontWeight: 700 },
  reportFilters: { display: 'flex', gap: 10, marginBottom: 16 },
  reportsLayout: {
    display: 'grid',
    gridTemplateColumns: '2fr 1.2fr',
    gap: 16,
    alignItems: 'start',
  },
  reportsTableHead: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr 1.4fr 1fr',
    padding: '12px 20px',
    borderBottom: `1px solid ${BORDER}`,
    background: '#0A1020',
  },
  reportsTableRow: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 1fr 1fr 1.4fr 1fr',
    padding: '14px 20px',
    alignItems: 'center',
    borderBottom: `1px solid ${BORDER}`,
  },
  emptyReports: {
    padding: '22px',
    color: MUTED,
    textAlign: 'center',
    fontSize: 14,
  },
  reportDetailPanel: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: 16,
  },
  reportTitle: { margin: '0 0 10px 0' },
  reportText: { margin: '6px 0', fontSize: 13 },
  reportFormBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    marginTop: 12,
  },
  reportLabel: { fontSize: 12, color: MUTED },
  reportInput: {
    background: '#1C1C20',
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 13,
  },
  reportTextarea: {
    minHeight: 90,
    resize: 'vertical',
    background: '#1C1C20',
    border: `1px solid ${BORDER}`,
    color: TEXT,
    borderRadius: 6,
    padding: '8px 10px',
    fontSize: 13,
    fontFamily: 'inherit',
  },
  saveReportBtn: {
    color: ACCENT,
    borderColor: ACCENT,
    alignSelf: 'flex-start',
  },
};