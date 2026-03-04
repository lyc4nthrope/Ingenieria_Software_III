/**
 * ModeradorDashboard.jsx
 *
 * Dashboard del moderador de NØSEE.
 *  Vista de usuario + controles de moderación de reportes.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { getAdminReports, updateReportReview } from '@/services/api/users.api';

const REPORT_STATUS_OPTIONS = ['PENDING', 'IN_REVIEW', 'RESOLVED', 'REJECTED'];

const REPORT_REASON_LABELS = {
  fake_price: 'Precio falso',
  wrong_photo: 'Foto incorrecta',
  spam: 'Spam',
  offensive: 'Contenido ofensivo',
  other: 'Otro',
};

const isReportLocked = (status) => ['REJECTED', 'RESOLVED'].includes((status || '').toUpperCase());

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

export default function ModeratorDashboard() {
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.user);

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('reportes');
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [savingReport, setSavingReport] = useState(false);
  const [filters, setFilters] = useState({
    order: 'recent',
    status: 'all',
    reason: 'all',
  });
  const [reportForm, setReportForm] = useState({
    status: 'PENDING',
    actionTaken: '',
    modNotes: '',
  });

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    if (!selectedReport) return;
    setReportForm({
      status: selectedReport.status || 'PENDING',
      actionTaken: selectedReport.action_taken || '',
      modNotes: selectedReport.mod_notes || '',
    });
  }, [selectedReport]);

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminReports();
      if (result.success && result.data) {
        setReports(result.data);
      } else {
        setError(result.error || 'No se pudieron cargar los reportes');
      }
    } catch (err) {
      console.error('Error cargando reportes:', err);
      setError('Error al conectar con reportes');
    } finally {
      setLoading(false);
    }
  };
  const reasonOptions = useMemo(
    () => Array.from(new Set(reports.map((r) => r.reason).filter(Boolean))),
    [reports],
  );

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
      const statusMatch = filters.status === 'all' || (report.status || '').toUpperCase() === filters.status;
      const reasonMatch = filters.reason === 'all' || report.reason === filters.reason;
      return statusMatch && reasonMatch;
    });

    return base.sort((a, b) => {
      const firstDate = new Date(a.created_at).getTime();
      const secondDate = new Date(b.created_at).getTime();
      return filters.order === 'recent' ? secondDate - firstDate : firstDate - secondDate;
    });
  }, [reports, filters]);

  const pendingReportsCount = useMemo(
    () => reports.filter((report) => (report.status || 'PENDING').toUpperCase() === 'PENDING').length,
    [reports],
  );


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
  const selectedPublication = formatPublicationSummary(selectedReport?.publication);
  const selectedReportLocked = isReportLocked(selectedReport?.status);

  return (
    <div style={st.root}>
      <aside style={st.sidebar}>
        <nav style={st.nav}>
          {[
            { key: 'reportes', icon: '⚑', label: 'Reportes', badge: pendingReportsCount },
            { key: 'feed', icon: '◈', label: 'Feed' },
            { key: 'historial', icon: '◎', label: 'Historial' },
          ].map((item) => (
            <button
              key={item.key}
              style={{ ...st.navItem, ...(activeTab === item.key ? st.navActive : {}) }}
              onClick={() => setActiveTab(item.key)}
            >
              <span style={st.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {!!item.badge && <span style={st.navBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>

        <button style={st.logoutBtn} onClick={logout}>⏻ Salir</button>
      </aside>

      <main style={st.main}>
        {error && (
          <div style={st.errorBox}>
            ⚠️ {error}
            <button style={st.linkBtn} onClick={fetchReports}>Reintentar</button>
          </div>
        )}

        {activeTab === 'reportes' && (
          <>
            <header style={st.header}>
              <h1 style={st.headerTitle}>Moderación de reportes</h1>
              <p style={st.headerSub}>Resumen por tipo/estado, filtros y detalle editable</p>
            </header>

            <div style={st.statsGrid}>
              {Object.entries(reportStats.byType).map(([reason, count]) => (
                <div key={`type-${reason}`} style={st.statCard}>
                  <div style={st.statLabel}>{REPORT_REASON_LABELS[reason] || reason}</div>
                  <div style={st.statValue}>{count}</div>
                </div>
              ))}
              {Object.entries(reportStats.byStatus).map(([status, count]) => (
                <div key={`status-${status}`} style={st.statCard}>
                  <div style={st.statLabel}>Estado: {status}</div>
                  <div style={st.statValue}>{count}</div>
                </div>
              ))}
            </div>

            <div style={st.filtersRow}>
              <select style={st.select} value={filters.order} onChange={(e) => setFilters((prev) => ({ ...prev, order: e.target.value }))}>
                <option value="recent">Más reciente</option>
                <option value="oldest">Más antiguo</option>
              </select>
              <select style={st.select} value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="all">Todos los estados</option>
                {REPORT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <select style={st.select} value={filters.reason} onChange={(e) => setFilters((prev) => ({ ...prev, reason: e.target.value }))}>
                <option value="all">Todos los tipos</option>
                {reasonOptions.map((reason) => (
                  <option key={reason} value={reason}>{REPORT_REASON_LABELS[reason] || reason}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div style={st.loadingWrap}><Spinner size={30} /></div>
            ) : (
              <div style={st.layout}>
                <div style={st.table}>
                  <div style={st.tableHead}>
                    {['Fecha', 'Tipo', 'Estado', 'Reportado', 'Detalle'].map((h) => (
                      <div key={h} style={st.th}>{h}</div>
                    ))}
                  </div>
                  {filteredReports.length === 0 ? (
                    <div style={st.empty}>No hay reportes con esos filtros.</div>
                  ) : filteredReports.map((report) => (
                    <div key={report.id} style={st.tableRow}>
                      <div>{new Date(report.created_at).toLocaleString('es-CO')}</div>
                      <div>{REPORT_REASON_LABELS[report.reason] || report.reason}</div>
                      <div><span style={st.badge}>{report.status || 'PENDING'}</span></div>
                      <div>{report.reported?.full_name || report.reported_user_id || 'N/A'}</div>
                      <button style={st.actionBtn} onClick={() => setSelectedReport(report)}>
                          {isReportLocked(report.status) ? 'Ver' : 'Ver / editar'}
                        </button>
                    </div>
                  ))}
                </div>

                <div style={st.detailPanel}>
                  {!selectedReport ? (
                    <div style={st.empty}>Selecciona un reporte para revisar.</div>
                  ) : (
                    <>
                      <h3 style={st.detailTitle}>Reporte #{selectedReport.id.slice(0, 8)}</h3>
                      <p style={st.detailText}><strong>Razón:</strong> {REPORT_REASON_LABELS[selectedReport.reason] || selectedReport.reason}</p>
                      <p style={st.detailText}><strong>Descripción:</strong> {selectedReport.description || 'Sin descripción'}</p>
                      <p style={st.detailText}><strong>Reportante:</strong> {selectedReport.reporter?.full_name || selectedReport.reporter_user_id}</p>
                      <p style={st.detailText}><strong>Usuario reportado:</strong> {selectedReport.reported?.full_name || selectedReport.reported_user_id || 'N/A'}</p>
                      <p style={st.detailText}><strong>Producto:</strong> {selectedPublication?.productName || 'N/A'}</p>
                      <p style={st.detailText}><strong>Unidad:</strong> {selectedPublication?.unit || 'N/A'}</p>
                      <p style={st.detailText}><strong>Marca:</strong> {selectedPublication?.brand || 'N/A'}</p>
                      <p style={st.detailText}><strong>Tienda:</strong> {selectedPublication?.store || 'N/A'}</p>
                      <p style={st.detailText}><strong>Precio:</strong> {selectedPublication?.price || 'N/A'}</p>

                      {selectedReportLocked && (
                        <p style={st.detailText}><strong>Estado:</strong> Este reporte está cerrado y no permite edición.</p>
                      )}

                      {selectedReport.evidence_url && (
                        <a href={selectedReport.evidence_url} target="_blank" rel="noreferrer" style={st.linkBtn}>
                          Ver evidencia
                        </a>
                      )}

                      <div style={st.formBlock}>
                        <label style={st.formLabel}>Estado</label>
                        <select
                          style={st.select}
                          value={reportForm.status}
                          onChange={(e) => setReportForm((prev) => ({ ...prev, status: e.target.value }))}
                          disabled={selectedReportLocked}
                        >
                          {REPORT_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>

                        <label style={st.formLabel}>Acción tomada</label>
                        <input
                          style={st.input}
                          value={reportForm.actionTaken}
                          onChange={(e) => setReportForm((prev) => ({ ...prev, actionTaken: e.target.value }))}
                          placeholder="Ej: Advertencia y retiro de publicación"
                          disabled={selectedReportLocked}
                        />

                        <label style={st.formLabel}>Notas de moderación</label>
                        <textarea
                          style={st.textarea}
                          value={reportForm.modNotes}
                          onChange={(e) => setReportForm((prev) => ({ ...prev, modNotes: e.target.value }))}
                          placeholder="Detalles internos de la resolución"
                          disabled={selectedReportLocked}
                        />

                        <button style={st.saveBtn} onClick={handleSaveReportReview} disabled={savingReport}>
                          {selectedReportLocked ? 'Reporte cerrado' : savingReport ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'feed' && <Placeholder icon="◈" title="Feed con moderación" sub="Próximamente" />}
        {activeTab === 'historial' && <Placeholder icon="◎" title="Historial de acciones" sub="Próximamente" />}
      </main>
    </div>
  );
}

function Placeholder({ icon, title, sub }) {
  return (
    <div style={st.placeholder}>
      <span style={st.placeholderIcon}>{icon}</span>
      <h2 style={st.placeholderTitle}>{title}</h2>
      <p style={st.placeholderSub}>{sub}</p>
    </div>
  );
}

const ACCENT = '#A78BFA';
const BG = '#080C14';
const SURFACE = '#0F1724';
const BORDER = '#1E2D4A';
const TEXT = '#E8EDF8';
const MUTED = '#7B90BD';

const st = {
  root: { display: 'flex', minHeight: '100vh', background: BG, color: TEXT, fontFamily: "'DM Sans', 'Inter', sans-serif" },
  sidebar: { width: 220, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', position: 'sticky', top: 0, height: '100vh' },
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: MUTED, fontSize: 14, fontWeight: 500, textAlign: 'left' },
  navActive: { background: `${ACCENT}18`, color: ACCENT },
  navIcon: { fontSize: 16 },
  navBadge: { marginLeft: 'auto', background: '#F87171', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  logoutBtn: { background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, textAlign: 'left' },
  main: { flex: 1, padding: '32px 40px' },
  errorBox: { padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(248,113,113,0.25)', background: 'var(--error-soft)', color: 'var(--error)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 },
  linkBtn: { background: 'none', border: 'none', color: ACCENT, cursor: 'pointer', fontSize: 13, textDecoration: 'underline' },
  header: { marginBottom: 18 },
  headerTitle: { fontSize: 26, fontWeight: 700, margin: 0 },
  headerSub: { color: MUTED, fontSize: 14, marginTop: 4 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))', gap: 10, marginBottom: 14 },
  statCard: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 10, padding: '10px 12px' },
  statLabel: { color: MUTED, fontSize: 12 },
  statValue: { fontSize: 22, fontWeight: 700 },
  filtersRow: { display: 'flex', gap: 10, marginBottom: 16 },
  select: { background: '#1C1C20', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: '6px 10px', fontSize: 13 },
  loadingWrap: { display: 'flex', justifyContent: 'center', padding: 50 },
  layout: { display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 16, alignItems: 'start' },
  table: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' },
  tableHead: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.4fr 1fr', padding: '12px 20px', borderBottom: `1px solid ${BORDER}`, background: '#0A1020' },
  th: { fontSize: 12, color: MUTED, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' },
  tableRow: { display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1.4fr 1fr', padding: '14px 20px', alignItems: 'center', borderBottom: `1px solid ${BORDER}`, fontSize: 13 },
  badge: { fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '3px 10px', border: `1px solid ${BORDER}` },
  actionBtn: { background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer' },
  detailPanel: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16 },
  detailTitle: { margin: '0 0 10px 0' },
  detailText: { margin: '6px 0', fontSize: 13 },
  formBlock: { display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 },
  formLabel: { fontSize: 12, color: MUTED },
  input: { background: '#1C1C20', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: '8px 10px', fontSize: 13 },
  textarea: { minHeight: 90, resize: 'vertical', background: '#1C1C20', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit' },
  saveBtn: { border: `1px solid ${ACCENT}`, color: ACCENT, background: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', alignSelf: 'flex-start' },
  empty: { padding: 22, color: MUTED, textAlign: 'center', fontSize: 14 },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, color: MUTED },
  placeholderIcon: { fontSize: 48 },
  placeholderTitle: { fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 },
  placeholderSub: { fontSize: 14, margin: 0 },
};