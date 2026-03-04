/**
 * AdminDashboard.jsx
 *
 * Panel de control total del Admin de NØSEE.
 * Gestión de usuarios, cambio de roles, estadísticas del sistema,
 * moderación de publicaciones, revisión de reportes y configuración.
 *
 * UBICACIÓN: src/features/dashboard/admin/AdminDashboard.jsx
 */
import { useState, useEffect } from 'react';
import { changeUserRole, getAdminReports, getAllUsers, updateReportReview, updateUserStatus } from '@/services/api/users.api';
import { getPublications, deletePublication } from '@/services/api/publications.api';
import { supabase } from '@/services/supabase.client';
import { UserRoleEnum } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Modal de confirmación de baneo ──────────────────────────────────────────
function BanModal({ user, onConfirm, onCancel }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const isBanning = user.status === 'activo';
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#0F1724', border: '1px solid #1E2D4A', borderRadius: 14,
        padding: '28px 32px', width: 420, maxWidth: '90vw',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#E8EDF8' }}>
          {isBanning ? td.banTitle : td.unbanTitle}
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: '#7B90BD' }}>
          {isBanning
            ? <>{td.banDesc1} <strong style={{ color: '#E8EDF8' }}>{user.name}</strong>{td.banDesc2} <strong style={{ color: '#F87171' }}>{td.banDescStrong}</strong>{td.banDesc3}</>
            : <>{td.unbanDesc1} <strong style={{ color: '#E8EDF8' }}>{user.name}</strong>{td.unbanDesc2}</>
          }
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: '1px solid #1E2D4A', color: '#7B90BD', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}
          >
            {td.cancelBtn}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: isBanning ? '#F8717118' : '#34D39918',
              border: `1px solid ${isBanning ? '#F87171' : '#34D399'}`,
              color: isBanning ? '#F87171' : '#34D399',
              borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 600,
            }}
          >
            {isBanning ? td.confirmBanBtn : td.confirmUnbanBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Constantes de reportes ───────────────────────────────────────────────────
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

// ─── Parámetros de reputación — valores por defecto del proyecto ─────────────
const DEFAULT_REPUTATION_PARAMS = [
  { param: 'Puntos por upvote recibido',       value: '+5',  note: 'Cuando otro usuario valida tu publicación' },
  { param: 'Puntos por downvote recibido',      value: '-3',  note: 'Cuando otro usuario rechaza tu publicación' },
  { param: 'Puntos por publicar precio',        value: '+2',  note: 'Al crear una nueva publicación de precio' },
  { param: 'Umbral Usuario Verificado',         value: '10',  note: 'Mínimo de puntos para publicar sin restricciones' },
  { param: 'Umbral para rol Moderador',         value: '500', note: 'Puntos mínimos para asignación automática' },
  { param: 'Penalización por reporte aceptado', value: '-10', note: 'Cuando un reporte contra el usuario es validado' },
];
const LS_KEY = 'nosee_reputation_params';

const ALL_ROLES = [UserRoleEnum.USUARIO, UserRoleEnum.MODERADOR, UserRoleEnum.ADMIN, UserRoleEnum.REPARTIDOR];
const REPORT_STATUS_OPTIONS = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

const REPORT_REASON_LABELS = {
  fake_price: 'Precio falso',
  wrong_photo: 'Foto incorrecta',
  spam: 'Spam',
  offensive: 'Ofensivo',
  other: 'Otro',
};

const formatPublicationSummary = (publication) => {
  if (!publication) return null;

  const productName = publication.product?.name || 'N/A';
  const quantity = publication.product?.base_quantity;
  const unit = publication.product?.unit_type?.abbreviation || publication.product?.unit_type?.name;
  const brand = publication.product?.brand?.name || 'N/A';
  const store = publication.store?.name || 'N/A';
  const price = publication.price;

  return {
    productName,
    unit: quantity && unit ? `${quantity} ${unit}` : 'N/A',
    brand,
    store,
    price: typeof price === 'number' ? price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' }) : 'N/A',
  };
};

const normalizeReportStatus = (status) => String(status || 'PENDING').toUpperCase();

export default function AdminDashboard() {
  const { t } = useLanguage();
  const td = t.adminDashboard;

  // ─── Estado global ────────────────────────────────────────────────────────
  const [activeSection, setActiveSection]     = useState('overview');

  // Usuarios
  const [users, setUsers]                     = useState([]);
  const [usersLoading, setUsersLoading]       = useState(true);
  const [usersError, setUsersError]           = useState(null);
  const [changingRole, setChangingRole]       = useState(null);
  const [banModal, setBanModal]               = useState(null); // usuario objetivo del baneo

  // Publicaciones
  const [publications, setPublications]       = useState([]);
  const [pubsLoading, setPubsLoading]         = useState(false);
  const [pubsLoaded, setPubsLoaded]           = useState(false);
  const [pubFilter, setPubFilter]             = useState('all');
  const [deletingPub, setDeletingPub]         = useState(null);

  // Reportes
  const [reports, setReports]                 = useState([]);
  const [reportsLoading, setReportsLoading]   = useState(false);
  const [reportsLoaded, setReportsLoaded]     = useState(false);
  const [reportStatusFilter, setReportStatusFilter] = useState('all');
  const [reportTypeFilter, setReportTypeFilter]     = useState('all');
  const [reportSort, setReportSort]                 = useState('recent');
  const [selectedReport, setSelectedReport]         = useState(null);
  const [resolvedCount, setResolvedCount]           = useState(0);

  // Categorías (config)
  const [categories, setCategories]           = useState([]);
  const [catsLoading, setCatsLoading]         = useState(false);
  const [catsLoaded, setCatsLoaded]           = useState(false);

  // Configuración editable de reputación
  const [repParams, setRepParams] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_REPUTATION_PARAMS;
    } catch { return DEFAULT_REPUTATION_PARAMS; }
  });
  const [repEditing, setRepEditing]     = useState(false);
  const [repDraft, setRepDraft]         = useState([]);
  const [newCatName, setNewCatName]     = useState('');
  const [savingCat, setSavingCat]       = useState(false);

  // Stats
  const [stats, setStats]                     = useState({
    users: '—', pubs: '—', validations: '—', reports: '—',
  });

  // ─── Cargar usuarios al montar ────────────────────────────────────────────
  useEffect(() => {
    loadUsers();
    loadStats();
  }, []);

  // Cargar datos de sección cuando se activa (lazy loading)
  useEffect(() => {
    if (activeSection === 'content'  && !pubsLoaded)     loadPublications();
    if (activeSection === 'reports'  && !reportsLoaded)  loadReports();
    if (activeSection === 'config'   && !catsLoaded)     loadCategories();
  }, [activeSection]);

  // ─── Stats reales ─────────────────────────────────────────────────────────
  // Contamos directamente en Supabase para tener números en tiempo real.
  const loadStats = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const [
      { count: totalUsers },
      { count: pubsToday },
      { count: validationsToday },
      { count: pendingReports },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('price_publications').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('publication_votes').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    setStats({
      users:       totalUsers       ?? '—',
      pubs:        pubsToday        ?? '—',
      validations: validationsToday ?? '—',
      reports:     pendingReports   ?? '—',
    });
  };

  // ─── Usuarios ─────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const result = await getAllUsers();
      if (result.success && result.data) {
        setUsers(result.data.map((u) => ({
          id:     u.id,
          name:   u.fullName || '',
          email:  u.email,
          role:   u.role,
          status: u.isActive ? 'activo' : 'baneado',
          rep:    u.reputationPoints || 0,
          joined: new Date(u.createdAt).toLocaleDateString('es-CO', {
            year: 'numeric', month: 'short', day: 'numeric',
          }),
        })));
      } else {
        setUsersError(result.error || td.errorLoadUsers);
      }
    } catch {
      setUsersError(td.errorConnect);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const roleMap = { 'Usuario': 1, 'Moderador': 2, 'Admin': 3, 'Repartidor': 4 };
    setChangingRole(userId);
    try {
      const result = await changeUserRole(userId, roleMap[newRole]);
      if (result.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        alert(td.errorChangeRole(result.error || td.errorChangeRoleGeneric));
      }
    } catch {
      alert(td.errorChangeRoleGeneric);
    } finally {
      setChangingRole(null);
    }
  };

  // Abre el modal de confirmación
  const handleBanToggle = (userId) => {
    const target = users.find(u => u.id === userId);
    if (target) setBanModal(target);
  };

  // Ejecuta el baneo/desbaneo + desactiva publicaciones si es un baneo
  const confirmBan = async () => {
    const target = banModal;
    setBanModal(null);
    const isBanning  = target.status === 'activo';
    const newIsActive = !isBanning;

    try {
      const result = await updateUserStatus(target.id, newIsActive);
      if (!result.success) { alert(`${td.errorStatus} ${result.error}`); return; }

      // Si es un baneo: ocultar todas sus publicaciones activas
      if (isBanning) {
        await supabase
          .from('price_publications')
          .update({ status: 'rejected' })
          .eq('user_id', target.id)
          .eq('status', 'active');

        // Refrescar la lista de publicaciones si ya estaba cargada
        if (pubsLoaded) {
          setPublications(prev =>
            prev.map(p => p.userId === target.id && p.status === 'active'
              ? { ...p, status: 'rejected' }
              : p
            )
          );
        }
      }

      setUsers(prev =>
        prev.map(u => u.id === target.id ? { ...u, status: isBanning ? 'baneado' : 'activo' } : u)
      );
    } catch {
      alert(td.errorStatus);
    }
  };

  // ─── Publicaciones ────────────────────────────────────────────────────────
  // Usamos getPublications() de la API existente. El admin puede eliminar
  // cualquier publicación porque deletePublication() verifica role_id === 3.
  const loadPublications = async () => {
    setPubsLoading(true);
    try {
      const result = await getPublications({ limit: 100 });
      if (result.success) {
        setPublications(result.data || []);
      }
    } catch {
      // silencioso, la tabla queda vacía
    } finally {
      setPubsLoading(false);
      setPubsLoaded(true);
    }
  };

  const handleDeletePublication = async (pubId) => {
    if (!window.confirm(td.confirmDeletePub)) return;
    setDeletingPub(pubId);
    try {
      const result = await deletePublication(pubId);
      if (result.success) {
        setPublications(prev => prev.filter(p => p.id !== pubId));
        // Actualizar stat
        setStats(prev => ({ ...prev, pubs: Math.max(0, (prev.pubs || 1) - 1) }));
      } else {
        alert(td.errorDeletePub(result.error));
      }
    } catch {
      alert(td.errorDeletePubGeneric);
    } finally {
      setDeletingPub(null);
    }
  };

  // ─── Reportes ─────────────────────────────────────────────────────────────
  const loadReports = async () => {
    setReportsLoading(true);
    try {
      const result = await getAdminReports();
      if (!result.success) {
        setReports([]);
        return;
      }

      setReports((result.data || []).map((report) => {
        const publicationSummary = formatPublicationSummary(report.publication);
        return {
          id: report.id,
          status: normalizeReportStatus(report.status),
          rawType: report.reason,
          severity: REPORT_SEVERITY[report.reason] || 'baja',
          createdAt: report.created_at,
          resolvedAt: report.resolved_at,
          time: report.created_at ? new Date(report.created_at).toLocaleDateString('es-CO') : '—',
          description: report.description,
          evidenceUrl: report.evidence_url,
          modNotes: report.mod_notes,
          actionTaken: report.action_taken,
          reviewer: report.reviewer?.full_name || null,
          post: report.publication?.product?.name || null,
          reporter: report.reporter?.full_name || null,
          reported: report.reported?.full_name || null,
          publicationId: report.publication_id,
          reportedUserId: report.reported_user_id,
          publicationSummary,
        };
      }));
    } finally {
      setReportsLoading(false);
      setReportsLoaded(true);
    }
  };

  const updateReportData = async (report, updates = {}) => {
    const { data: authData } = await supabase.auth.getUser();
    const nextStatus = normalizeReportStatus(updates.status || report.status);
    const payload = {
      status: nextStatus,
      mod_notes: updates.modNotes ?? report.modNotes ?? null,
      action_taken: updates.actionTaken ?? report.actionTaken ?? null,
      reviewed_by: authData?.user?.id || null,
      resolved_at: ['RESOLVED', 'REJECTED'].includes(nextStatus) ? new Date().toISOString() : null,
    };

    const result = await updateReportReview(report.id, payload);
    if (!result.success) {
      alert(result.error || td.errorUpdateReport);
      return false;
    }

  setReports((prev) => prev.map((item) => item.id === report.id
      ? {
        ...item,
        status: nextStatus,
        modNotes: payload.mod_notes,
        actionTaken: payload.action_taken,
        resolvedAt: payload.resolved_at,
      }
      : item));

    if (report.status !== 'RESOLVED' && nextStatus === 'RESOLVED') {
      setResolvedCount((n) => n + 1);
      setStats((prev) => ({ ...prev, reports: Math.max(0, (Number(prev.reports) || 1) - 1) }));
    }

    return true;
  };

  const handleQuickAction = async (report, action) => {
    if (action === 'delete' && report.publicationId) {
      await supabase.from('price_publications').delete().eq('id', report.publicationId);
    }
    if (action === 'ban' && report.reportedUserId) {
      await supabase.from('users').update({ is_active: false }).eq('id', report.reportedUserId);
    }

    await updateReportData(report, { status: 'RESOLVED' });
  };

  const reportTypeOptions = [...new Set(reports.map((r) => r.rawType).filter(Boolean))];
  const reportStatusCounts = reports.reduce((acc, report) => {
    const key = normalizeReportStatus(report.status);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const reportTypeCounts = reports.reduce((acc, report) => {
    const key = report.rawType || 'other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filteredReports = reports
    .filter((report) => (reportStatusFilter === 'all' ? true : normalizeReportStatus(report.status) === reportStatusFilter))
    .filter((report) => (reportTypeFilter === 'all' ? true : report.rawType === reportTypeFilter))
    .sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return reportSort === 'oldest' ? timeA - timeB : timeB - timeA;
    });
  // ─── Config: reputación ───────────────────────────────────────────────────
  const startEditRep = () => {
    setRepDraft(repParams.map(p => ({ ...p })));
    setRepEditing(true);
  };
  const cancelEditRep = () => setRepEditing(false);
  const saveRep = () => {
    setRepParams(repDraft);
    localStorage.setItem(LS_KEY, JSON.stringify(repDraft));
    setRepEditing(false);
  };

  // ─── Config: crear categoría ──────────────────────────────────────────────
  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setSavingCat(true);
    try {
      const { data, error } = await supabase
        .from('product_categories')
        .insert({ name })
        .select()
        .single();
      if (!error && data) {
        setCategories(prev => [...prev, data]);
        setNewCatName('');
      } else {
        alert(td.errorCreateCat(error?.message));
      }
    } finally {
      setSavingCat(false);
    }
  };

  // ─── Categorías (Config) ──────────────────────────────────────────────────
  const loadCategories = async () => {
    setCatsLoading(true);
    try {
      const { data } = await supabase
        .from('product_categories')
        .select('id, name, products(count)')
        .order('name');
      setCategories(data || []);
    } finally {
      setCatsLoading(false);
      setCatsLoaded(true);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  const reportsBadge = typeof stats.reports === 'number' && stats.reports > 0
    ? stats.reports
    : reports.filter(r => r.status === 'pending').length || null;

  return (
    <div style={s.root}>
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={s.sidebar}>
        <nav style={s.nav}>
          {[
            { key: 'overview', icon: '▦', label: td.navOverview },
            { key: 'users',    icon: '◉', label: td.navUsers },
            { key: 'content',  icon: '◈', label: td.navContent },
            { key: 'reports',  icon: '⚠', label: td.navReports, badge: reportsBadge },
            { key: 'config',   icon: '⚙', label: td.navConfig },
          ].map((item) => (
            <button
              key={item.key}
              style={{ ...s.navItem, ...(activeSection === item.key ? s.navActive : {}) }}
              onClick={() => setActiveSection(item.key)}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge > 0 && <span style={s.navBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Contenido principal ───────────────────────────────────── */}
      <main style={s.main}>

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {activeSection === 'overview' && (
          <>
            <SectionHeader title={td.overviewTitle} sub={td.overviewSub} />

            <div style={s.statsGrid}>
              {[
                { label: td.statUsers,       value: stats.users,       icon: '◉' },
                { label: td.statPubs,        value: stats.pubs,        icon: '◈' },
                { label: td.statValidations, value: stats.validations, icon: '✓' },
                { label: td.statReports,     value: stats.reports,     icon: '⚠' },
              ].map((stat) => (
                <div key={stat.label} style={s.statCard}>
                  <div style={s.statTop}>
                    <span style={s.statIcon}>{stat.icon}</span>
                  </div>
                  <div style={s.statValue}>{stat.value}</div>
                  <div style={s.statLabel}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Preview de usuarios recientes */}
            <div style={s.section}>
              <div style={s.sectionHead}>
                <span style={s.sectionTitle}>
                  {td.recentUsers(users.length)}
                </span>
                <button style={s.linkBtn} onClick={() => setActiveSection('users')}>
                  {td.viewAll}
                </button>
              </div>
              {usersLoading ? (
                <LoadingState />
              ) : users.length > 0 ? (
                <UsersTable
                  users={users.slice(0, 3)}
                  onRoleChange={handleRoleChange}
                  onBanToggle={handleBanToggle}
                  changingRole={changingRole}
                />
              ) : (
                <EmptyMsg text={td.noUsers} />
              )}
            </div>
          </>
        )}

        {/* ── USUARIOS ─────────────────────────────────────────── */}
        {activeSection === 'users' && (
          <>
            <SectionHeader
              title={td.usersTitle}
              sub={usersLoading ? td.loadingDots : td.usersCount(users.length)}
            />
            {usersError && <ErrorBar msg={usersError} onRetry={loadUsers} />}
            {usersLoading ? (
              <LoadingState label={td.loadingUsers} />
            ) : users.length > 0 ? (
              <UsersTable
                users={users}
                onRoleChange={handleRoleChange}
                onBanToggle={handleBanToggle}
                changingRole={changingRole}
              />
            ) : (
              <EmptyMsg text={td.noUsers} />
            )}
          </>
        )}

        {/* ── CONTENIDO ────────────────────────────────────────── */}
        {activeSection === 'content' && (
          <>
            <SectionHeader
              title={td.contentTitle}
              sub={td.contentSub}
            />

            {/* Filtro por estado */}
            <div style={s.filterRow}>
              {[
                { key: 'all',      label: td.filterAll },
                { key: 'active',   label: td.filterActive },
                { key: 'pending',  label: td.filterPending },
                { key: 'expired',  label: td.filterExpired },
              ].map(f => (
                <button
                  key={f.key}
                  style={{ ...s.filterBtn, ...(pubFilter === f.key ? s.filterBtnActive : {}) }}
                  onClick={() => setPubFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {pubsLoading ? (
              <LoadingState label={td.loadingPubs} />
            ) : (
              <PublicationsTable
                publications={publications.filter(p =>
                  pubFilter === 'all' ? true : p.status === pubFilter
                )}
                onDelete={handleDeletePublication}
                deletingId={deletingPub}
              />
            )}
          </>
        )}

        {/* ── REPORTES ─────────────────────────────────────────── */}
        {activeSection === 'reports' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h1 style={s.headerTitle}>{td.reportsTitle}</h1>
                <p style={s.headerSub}>
                  {filteredReports.length > 0
                    ? td.reportsSub(filteredReports.length, resolvedCount)
                    : resolvedCount > 0
                      ? td.reportsAllDone(resolvedCount)
                      : td.reportsNone}
                </p>
              </div>
            </div>

            {!reportsLoading && reports.length > 0 && (
              <>
                <div style={s.summaryGrid}>
                  <SummaryCard title={td.summaryByStatus} counts={reportStatusCounts} labels={td.statusLabels} />
                  <SummaryCard title={td.summaryByType} counts={reportTypeCounts} labels={td.reportTypes} />
                </div>

                <div style={s.reportFiltersGrid}>
                  <label style={s.filterLabelWrap}>
                    <span style={s.filterLabel}>{td.filterStatusLabel}</span>
                    <select value={reportStatusFilter} onChange={(e) => setReportStatusFilter(e.target.value)} style={s.filterSelect}>
                      <option value="all">{td.filterAllReports}</option>
                      {REPORT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{td.statusLabels?.[status] || status}</option>
                      ))}
                    </select>
                  </label>

                  <label style={s.filterLabelWrap}>
                    <span style={s.filterLabel}>{td.filterTypeLabel}</span>
                    <select value={reportTypeFilter} onChange={(e) => setReportTypeFilter(e.target.value)} style={s.filterSelect}>
                      <option value="all">{td.filterAll}</option>
                      {reportTypeOptions.map((type) => (
                        <option key={type} value={type}>{td.reportTypes?.[type] || type}</option>
                      ))}
                    </select>
                  </label>

                  <label style={s.filterLabelWrap}>
                    <span style={s.filterLabel}>{td.filterSortLabel}</span>
                    <select value={reportSort} onChange={(e) => setReportSort(e.target.value)} style={s.filterSelect}>
                      <option value="recent">{td.sortRecent}</option>
                      <option value="oldest">{td.sortOldest}</option>
                    </select>
                  </label>
                </div>
              </>
            )}

            {reportsLoading ? (
              <LoadingState label={td.loadingReports} />
            ) : filteredReports.length === 0 ? (
              <EmptyMsg text={reports.length === 0 ? td.noReportsPending : td.reportsNone} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {filteredReports.map(r => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    showActions={r.status === 'PENDING' || r.status === 'IN_REVIEW'}
                    onResolve={handleQuickAction}
                    onOpenDetails={() => setSelectedReport(r)}
                  />
                ))}
              </div>
            )}

            {selectedReport && (
              <ReportDetailsModal
                report={selectedReport}
                onClose={() => setSelectedReport(null)}
                onSave={async (updates) => {
                  const ok = await updateReportData(selectedReport, updates);
                  if (ok) {
                    setSelectedReport((prev) => prev ? { ...prev, ...updates, status: normalizeReportStatus(updates.status || prev.status) } : null);
                  }
                }}
              />
            )}
          </>
        )}

        {/* ── CONFIG ───────────────────────────────────────────── */}
        {activeSection === 'config' && (
          <>
            <SectionHeader
              title={td.configTitle}
              sub={td.configSub}
            />

            {/* Parámetros de reputación (editables) */}
            <div style={s.section}>
              <div style={s.sectionHead}>
                <span style={s.sectionTitle}>{td.repTitle}</span>
                {repEditing ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={cancelEditRep} style={s.btnDismiss}>{td.cancel}</button>
                    <button onClick={saveRep} style={{ ...s.filterBtn, ...s.filterBtnActive }}>{td.save}</button>
                  </div>
                ) : (
                  <button onClick={startEditRep} style={s.filterBtn}>{td.editBtn}</button>
                )}
              </div>
              <div style={s.configCard}>
                {(repEditing ? repDraft : repParams).map(({ param, value, note }, i) => (
                  <div key={param} style={s.configRow}>
                    <div>
                      <div style={s.configParam}>{param}</div>
                      <div style={s.configNote}>{note}</div>
                    </div>
                    {repEditing ? (
                      <input
                        type="text"
                        value={repDraft[i].value}
                        onChange={e => {
                          const next = [...repDraft];
                          next[i] = { ...next[i], value: e.target.value };
                          setRepDraft(next);
                        }}
                        style={{
                          background: '#1C1C20', border: `1px solid ${BORDER}`,
                          color: TEXT, borderRadius: 6, padding: '5px 10px',
                          fontSize: 15, fontWeight: 700, width: 80, textAlign: 'right',
                        }}
                      />
                    ) : (
                      <span style={{
                        ...s.configValue,
                        color: value.startsWith('+') ? '#34D399' : value.startsWith('-') ? '#F87171' : ACCENT,
                      }}>
                        {value}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Categorías de productos */}
            <div style={s.section}>
              <div style={s.sectionHead}>
                <span style={s.sectionTitle}>{td.catsTitle}</span>
                {catsLoading
                  ? <Spinner size={16} />
                  : <span style={{ fontSize: 13, color: MUTED }}>{td.catsCount(categories.length)}</span>
                }
              </div>

              {/* Formulario para crear categoría */}
              <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                <input
                  type="text"
                  placeholder={td.newCatPlaceholder}
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  style={{
                    flex: 1, background: '#1C1C20', border: `1px solid ${BORDER}`,
                    color: TEXT, borderRadius: 8, padding: '8px 14px', fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  disabled={savingCat || !newCatName.trim()}
                  style={{ ...s.filterBtn, ...s.filterBtnActive, opacity: savingCat || !newCatName.trim() ? 0.5 : 1 }}
                >
                  {savingCat ? '...' : td.createBtn}
                </button>
              </form>

              {catsLoading ? (
                <LoadingState label={td.loadingCats} />
              ) : categories.length === 0 ? (
                <EmptyMsg text={td.noCats} />
              ) : (
                <div style={s.configCard}>
                  {categories.map(cat => (
                    <div key={cat.id} style={s.configRow}>
                      <div style={s.configParam}>{cat.name}</div>
                      <span style={{ ...s.configValue, color: MUTED, fontSize: 13 }}>
                        {td.productsCount(cat.products?.[0]?.count ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {banModal && (
        <BanModal
          user={banModal}
          onConfirm={confirmBan}
          onCancel={() => setBanModal(null)}
        />
      )}
    </div>
  );
}

// ─── UsersTable ───────────────────────────────────────────────────────────────
function UsersTable({ users, onRoleChange, onBanToggle, changingRole }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  return (
    <div style={s.table}>
      <div style={s.tableHead}>
        {[td.colUser, td.colRole, td.colRep, td.colStatus, td.colActions].map((h) => (
          <div key={h} style={s.th}>{h}</div>
        ))}
      </div>
      {users.map((u) => (
        <div key={u.id} style={s.tableRow}>
          <div style={s.td}>
            <div style={s.rowAvatar}>{(u.name || td.noName).charAt(0)}</div>
            <div>
              <div style={s.rowName}>{u.name || td.noName}</div>
              <div style={s.rowEmail}>{u.email}</div>
            </div>
          </div>
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
              <span style={{ marginLeft: 8, fontSize: 12, color: ACCENT }}>{td.savingRole}</span>
            )}
          </div>
          <div style={{ ...s.td, ...s.tdNum }}>{u.rep}</div>
          <div style={s.td}>
            <span style={{
              ...s.badge,
              background: u.status === 'activo' ? `${ACCENT}18` : '#F8717120',
              color:      u.status === 'activo' ? ACCENT : '#F87171',
            }}>
              {u.status === 'activo' ? td.statusActive : td.statusBanned}
            </span>
          </div>
          <div style={s.td}>
            <button
              style={{ ...s.actionBtn, ...(u.status === 'baneado' ? s.actionBtnDanger : {}) }}
              onClick={() => onBanToggle(u.id)}
              disabled={changingRole === u.id}
            >
              {u.status === 'baneado' ? td.unbanBtn : td.banBtn}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PublicationsTable ────────────────────────────────────────────────────────
function PublicationsTable({ publications, onDelete, deletingId }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  if (publications.length === 0) {
    return <EmptyMsg text={td.noPubsView} />;
  }
  return (
    <div style={s.table}>
      <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 0.7fr' }}>
        {[td.colProduct, td.colStore, td.colPrice, td.colAuthor, td.colDate, td.colAction].map(h => (
          <div key={h} style={s.th}>{h}</div>
        ))}
      </div>
      {publications.map(p => (
        <div key={p.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 0.7fr' }}>
          <div style={s.td}>
            <div>
              <div style={s.rowName}>{p.productName || p.product?.name || '—'}</div>
              <StatusBadge status={p.status} />
            </div>
          </div>
          <div style={{ ...s.td, fontSize: 13, color: MUTED }}>{p.storeName || p.store?.name || '—'}</div>
          <div style={{ ...s.td, ...s.tdNum }}>
            ${typeof p.price === 'number' ? p.price.toLocaleString('es-CO') : p.price || '—'}
          </div>
          <div style={{ ...s.td, fontSize: 13, color: MUTED }}>{p.authorName || p.user?.fullName || '—'}</div>
          <div style={{ ...s.td, fontSize: 12, color: MUTED }}>
            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO') : '—'}
          </div>
          <div style={s.td}>
            <button
              style={s.btnDelete}
              onClick={() => onDelete(p.id)}
              disabled={deletingId === p.id}
            >
              {deletingId === p.id ? '...' : '🗑'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────
function SummaryCard({ title, counts, labels = {} }) {
  return (
    <div style={s.summaryCard}>
      <h3 style={s.summaryTitle}>{title}</h3>
      {Object.keys(counts).length === 0 ? (
        <p style={s.summaryEmpty}>—</p>
      ) : (
        Object.entries(counts).map(([key, value]) => (
          <div key={key} style={s.summaryRow}>
            <span>{labels?.[key] || key}</span>
            <strong>{value}</strong>
          </div>
        ))
      )}
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({ report, showActions, onResolve, onOpenDetails }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const sev = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.baja;
  const typeLabel = td.reportTypes?.[report.rawType] || report.rawType;
  const severityLabel = td.severityLabels?.[report.severity] || report.severity?.toUpperCase();
   const statusLabel = td.statusLabels?.[normalizeReportStatus(report.status)] || report.status;
  return (
    <article style={s.reportCard}>
      <div style={s.reportTop}>
        <span style={{ ...s.severityBadge, background: sev.bg, color: sev.text }}>
          {severityLabel}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{typeLabel}</span>
        <span style={s.statusPill}>{statusLabel}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>{report.time}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[
          [td.labelPublication,   `"${report.post ?? td.deletedPub}"`],
          [td.labelReportedBy,    report.reporter ?? td.anonymous],
          [td.labelReportedUser,  report.reported ?? td.unknown],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: 12, fontSize: 14 }}>
            <span style={{ color: MUTED, width: 150, flexShrink: 0 }}>{label}</span>
            <span style={{ color: TEXT }}>{value}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button style={s.filterBtn} onClick={onOpenDetails}>{td.viewReportDetailBtn}</button>
        {showActions && (
          <>
            <button style={s.btnDelete} onClick={() => onResolve(report, 'delete')}>
              {td.deletePublicationBtn}
            </button>
            <button style={s.btnBan} onClick={() => onResolve(report, 'ban')}>
              {td.banUserBtn}
            </button>
            <button style={s.btnDismiss} onClick={() => onResolve(report, 'dismiss')}>
              {td.dismissBtn}
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function ReportDetailsModal({ report, onClose, onSave }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [status, setStatus] = useState(normalizeReportStatus(report.status));
  const [actionTaken, setActionTaken] = useState(report.actionTaken || '');
  const [modNotes, setModNotes] = useState(report.modNotes || '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await onSave({ status, actionTaken, modNotes });
    setSaving(false);
  };

  return (
    <div style={s.modalOverlay}>
      <div style={s.modalCard}>
        <h2 style={{ marginTop: 0 }}>{td.reportDetailTitle}</h2>
        <p style={s.headerSub}>{td.reportDetailSubtitle(report.id)}</p>

        <div style={s.detailGrid}>
          <DetailRow label={td.labelPublication} value={report.post || td.deletedPub} />
          <DetailRow label={td.labelReportedBy} value={report.reporter || td.anonymous} />
          <DetailRow label={td.labelReportedUser} value={report.reported || td.unknown} />
          <DetailRow label={td.labelDescription} value={report.description || '—'} />
          <DetailRow label={td.labelEvidence} value={report.evidenceUrl || '—'} />
        </div>

        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>{td.filterStatusLabel}</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={s.filterSelect}>
            {REPORT_STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>{td.statusLabels?.[item] || item}</option>
            ))}
          </select>
        </label>

        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>{td.labelActionTaken}</span>
          <textarea value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} style={s.modalTextarea} rows={3} />
        </label>

        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>{td.labelModNotes}</span>
          <textarea value={modNotes} onChange={(e) => setModNotes(e.target.value)} style={s.modalTextarea} rows={3} />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={s.btnDismiss}>{td.cancel}</button>
          <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving}>
            {saving ? '...' : td.saveReportBtn}
          </button>
        </div>
        </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  const isUrl = typeof value === 'string' && value.startsWith('http');
  return (
    <div style={s.detailRow}>
      <span style={s.detailLabel}>{label}</span>
      {isUrl ? <a href={value} target="_blank" rel="noreferrer" style={s.linkBtn}>{value}</a> : <span>{value}</span>}
    </div>
  );
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  return (
    <header style={s.header}>
      <h1 style={s.headerTitle}>{title}</h1>
      <p style={s.headerSub}>{sub}</p>
    </header>
  );
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const map = {
    active:   { bg: '#34D39918', color: '#34D399', label: td.pubStatusActive },
    pending:  { bg: '#FCD34D18', color: '#FCD34D', label: td.pubStatusPending },
    rejected: { bg: '#F8717118', color: '#F87171', label: td.pubStatusRejected },
    expired:  { bg: '#64748B18', color: '#64748B', label: td.pubStatusExpired },
  };
  const c = map[status] || map.pending;
  return (
    <span style={{ ...s.badge, background: c.bg, color: c.color, fontSize: 10, marginTop: 2 }}>
      {c.label}
    </span>
  );
}

function LoadingState({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 12 }}>
      <Spinner size={28} />
      {label && <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>{label}</p>}
    </div>
  );
}

function EmptyMsg({ text }) {
  return (
    <div style={{ padding: '48px 20px', textAlign: 'center', color: MUTED, fontSize: 14 }}>
      {text}
    </div>
  );
}

function ErrorBar({ msg, onRetry }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: 'var(--radius-md, 8px)',
      background: 'rgba(248,113,113,0.08)',
      border: '1px solid rgba(248,113,113,0.25)',
      color: '#F87171',
      fontSize: 13,
      marginBottom: 20,
    }}>
      ⚠️ {msg}
      <button onClick={onRetry} style={{ background: 'none', border: 'none', color: '#F87171', cursor: 'pointer', textDecoration: 'underline', marginLeft: 12, fontWeight: 600 }}>
        {td.retry}
      </button>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const ACCENT  = '#FF6B35';
const BG      = 'var(--bg-base)';
const SURFACE = 'var(--bg-surface)';
const BORDER  = 'var(--border)';
const TEXT    = 'var(--text-primary)';
const MUTED   = 'var(--text-secondary)';

const s = {
  root:    { display: 'flex', height: '100vh', overflow: 'hidden', background: BG, color: TEXT, fontFamily: "'DM Sans', 'Inter', sans-serif" },
  sidebar: { width: 224, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', height: '100%', flexShrink: 0 },
  nav:     { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 14, fontWeight: 500, textAlign: 'left', transition: 'all 0.15s' },
  navActive:  { background: `${ACCENT}18`, color: ACCENT },
  navIcon:    { fontSize: 16, width: 20, textAlign: 'center' },
  navBadge:   { marginLeft: 'auto', background: '#F87171', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },

  main:       { flex: 1, padding: '32px 40px', overflowY: 'auto', height: '100%' },
  header:     { marginBottom: 28 },
  headerTitle:{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' },
  headerSub:  { color: MUTED, fontSize: 14, margin: '4px 0 0' },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 },
  statCard:  { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' },
  statTop:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statIcon:  { fontSize: 18, color: MUTED },
  statValue: { fontSize: 28, fontWeight: 800, letterSpacing: '-1px', color: TEXT },
  statLabel: { fontSize: 12, color: MUTED, marginTop: 4 },

  section:     { marginTop: 32 },
  sectionHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle:{ fontSize: 16, fontWeight: 600 },
  linkBtn:     { background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: 13, fontWeight: 600 },

  filterRow: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  filterBtn:  { background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 7, padding: '6px 14px', fontSize: 13, cursor: 'pointer' },
  filterBtnActive: { background: `${ACCENT}18`, borderColor: ACCENT, color: ACCENT },

  table:     { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' },
  tableHead: { display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 0.8fr 1fr', padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: 'var(--bg-elevated)' },
  th:        { fontSize: 12, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow:  { display: 'grid', gridTemplateColumns: '2fr 1fr 0.5fr 0.8fr 1fr', padding: '14px 20px', alignItems: 'center', borderBottom: `1px solid ${BORDER}` },
  td:        { display: 'flex', alignItems: 'center', gap: 10 },
  tdNum:     { fontSize: 14, fontWeight: 600, color: ACCENT },
  rowAvatar: { width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-elevated)', color: MUTED, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 },
  rowName:   { fontSize: 14, fontWeight: 500 },
  rowEmail:  { fontSize: 12, color: MUTED },
  roleSelect:{ background: 'var(--bg-elevated)', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: '5px 10px', fontSize: 13, cursor: 'pointer' },
  badge:     { fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '3px 10px', textTransform: 'capitalize' },
  actionBtn: { background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer' },
  actionBtnDanger: { borderColor: '#F87171', color: '#F87171' },

  reportCard:    { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '18px 20px' },
  reportTop:     { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 },
  severityBadge: { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '3px 8px', letterSpacing: '0.5px' },
  statusPill:    { fontSize: 11, padding: '3px 8px', borderRadius: 999, background: 'var(--bg-elevated)', color: MUTED, fontWeight: 700 },

  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginBottom: 16 },
  summaryCard: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '12px 14px' },
  summaryTitle: { margin: '0 0 8px', fontSize: 14 },
  summaryRow: { display: 'flex', justifyContent: 'space-between', fontSize: 13, color: MUTED, marginBottom: 6 },
  summaryEmpty: { margin: 0, color: MUTED, fontSize: 13 },
  reportFiltersGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10, marginBottom: 18 },
  filterLabelWrap: { display: 'flex', flexDirection: 'column', gap: 6 },
  filterLabel: { fontSize: 12, color: MUTED, fontWeight: 600 },
  filterSelect: { background: 'var(--bg-elevated)', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 7, padding: '8px 10px', fontSize: 13 },

  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16 },
  modalCard: { width: 720, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 },
  detailGrid: { display: 'grid', gap: 10, marginBottom: 14 },
  detailRow: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, fontSize: 13 },
  detailLabel: { color: MUTED },
  modalTextarea: { width: '100%', background: 'var(--bg-elevated)', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical' },


  btnDelete:  { background: '#F8717115', border: '1px solid #F87171', color: '#F87171', borderRadius: 7, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  btnBan:     { background: '#FCD34D15', border: '1px solid #FCD34D', color: '#FCD34D', borderRadius: 7, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  btnDismiss: { background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 7, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },

  configCard: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' },
  configRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${BORDER}` },
  configParam:{ fontSize: 14, fontWeight: 500, color: TEXT },
  configNote: { fontSize: 12, color: MUTED, marginTop: 2 },
  configValue:{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' },
};
