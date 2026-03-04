/**
 * ModeradorDashboard.jsx
 *
 * Dashboard del moderador de NØSEE.
 * Vista de usuario + controles de moderación: revisar reportes,
 * eliminar publicaciones, gestionar contenido.
 *
 * UBICACIÓN: src/features/dashboard/moderador/ModeradorDashboard.jsx
 */
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/services/supabase.client';

const REPORT_TYPE_LABELS = {
  fake_price:  'Precio falso',
  wrong_photo: 'Foto incorrecta',
  spam:        'Spam',
  offensive:   'Contenido ofensivo',
};

const REPORT_SEVERITY = {
  offensive:   'alta',
  spam:        'media',
  fake_price:  'media',
  wrong_photo: 'baja',
};

const SEVERITY_COLORS = {
  alta:  { bg: '#F8717118', text: '#F87171' },
  media: { bg: '#FCD34D18', text: '#FCD34D' },
  baja:  { bg: '#60A5FA18', text: '#60A5FA' },
};

export default function ModeradorDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reportes');
  const [resolved, setResolved] = useState([]);

  useEffect(() => { fetchReports(); }, []);

  const fetchReports = async () => {
    setLoading(true);

    // 1. Reportes pendientes
    const { data: rawReports, error } = await supabase
      .from('price_reports')
      .select('id, report_type, description, created_at, publication_id, reporter_id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error || !rawReports?.length) {
      setLoading(false);
      return;
    }

    // 2. Detalles de las publicaciones reportadas (producto + autor)
    const pubIds = [...new Set(rawReports.map((r) => r.publication_id).filter(Boolean))];
    const { data: publications } = await supabase
      .from('price_publications')
      .select('id, user_id, products(name), author:users!price_publications_user_id_fkey(full_name)')
      .in('id', pubIds);

    // 3. Nombres de los reportadores
    const reporterIds = [...new Set(rawReports.map((r) => r.reporter_id).filter(Boolean))];
    const { data: reporters } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', reporterIds);

    const pubMap      = Object.fromEntries((publications || []).map((p) => [p.id, p]));
    const reporterMap = Object.fromEntries((reporters    || []).map((u) => [u.id, u]));

    const mapped = rawReports.map((r) => {
      const pub      = pubMap[r.publication_id];
      const reporter = reporterMap[r.reporter_id];
      return {
        id:             r.id,
        type:           REPORT_TYPE_LABELS[r.report_type] || r.report_type,
        severity:       REPORT_SEVERITY[r.report_type]    || 'baja',
        time:           new Date(r.created_at).toLocaleDateString('es-CO'),
        post:           pub?.products?.name               || 'Publicación eliminada',
        reporter:       reporter?.full_name               || 'Anónimo',
        reported:       pub?.author?.full_name            || 'Desconocido',
        publicationId:  r.publication_id,
        reportedUserId: pub?.user_id,
      };
    });

    setReports(mapped);
    setLoading(false);
  };

  const handleResolve = async (id, action, report) => {
    // Marcar el reporte como resuelto
    await supabase
      .from('price_reports')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (action === 'eliminado' && report.publicationId) {
      await supabase
        .from('price_publications')
        .delete()
        .eq('id', report.publicationId);
    }

    if (action === 'baneado' && report.reportedUserId) {
      await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', report.reportedUserId);
    }

    setResolved((prev) => [...prev, { id, action }]);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const pendingCount = reports.length;

  return (
    <div style={st.root}>
      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside style={st.sidebar}>
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

            {loading ? (
              <div style={st.emptyState}>
                <span style={{ fontSize: 32 }}>⟳</span>
                <p style={{ color: MUTED, marginTop: 8 }}>Cargando reportes...</p>
              </div>
            ) : reports.length === 0 ? (
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
          onClick={() => onResolve(report.id, 'eliminado', report)}
        >
          🗑 Eliminar publicación
        </button>
        <button
          style={st.btnBan}
          onClick={() => onResolve(report.id, 'baneado', report)}
        >
          ⊗ Banear usuario
        </button>
        <button
          style={st.btnDismiss}
          onClick={() => onResolve(report.id, 'descartado', report)}
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
const BG      = '#080C14';
const SURFACE = '#0F1724';
const BORDER  = '#1E2D4A';
const TEXT    = '#E8EDF8';
const MUTED   = '#7B90BD';

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