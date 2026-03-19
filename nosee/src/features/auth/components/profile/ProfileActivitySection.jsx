import { useState, useEffect, useCallback } from 'react';
import { getUserProfileActivity } from '@/services/api/users.api';
import PublicationMiniCard from './PublicationMiniCard';
import EditPublicationModal from './EditPublicationModal';
import ReportCard from './ReportCard';
import { PAGE_SIZE } from './profileUtils';

// ─── Sección de actividad del perfil ─────────────────────────────────────────
function ProfileActivitySection({ user }) {
  const [activity, setActivity] = useState({ publications: [], products: [], stores: [], reports: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('publications');
  const [editingPub, setEditingPub] = useState(null);
  const [pubVisible, setPubVisible] = useState(PAGE_SIZE);
  const [reportVisible, setReportVisible] = useState(PAGE_SIZE);

  const loadActivity = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const result = await getUserProfileActivity(user.id);
    if (!result.success) {
      setError(result.error || 'No se pudo cargar tu actividad');
    } else {
      setActivity(result.data);
      setPubVisible(PAGE_SIZE);
      setReportVisible(PAGE_SIZE);
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { loadActivity(); }, [loadActivity]);

  const publications = activity.publications || [];
  const reports = activity.reports || [];

  const tabStyle = (active) => ({
    padding: '8px 16px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#fff' : 'var(--text-secondary)',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
  });

  return (
    <div style={{
      marginTop: '20px',
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      padding: '20px 24px',
    }}>
      <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
        Mi actividad
      </h2>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Tus publicaciones y los reportes que has enviado.
      </p>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '16px',
        background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '4px', width: 'fit-content',
      }}>
        <button style={tabStyle(activeTab === 'publications')} onClick={() => setActiveTab('publications')}>
          Publicaciones ({publications.length})
        </button>
        <button style={tabStyle(activeTab === 'reports')} onClick={() => setActiveTab('reports')}>
          Reportes ({reports.length})
        </button>
      </div>

      {loading && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cargando...</p>}
      {error && <p style={{ fontSize: '13px', color: 'var(--error)' }}>⚠️ {error}</p>}

      {!loading && !error && (
        <>
          {/* ── Tab: Publicaciones ── */}
          {activeTab === 'publications' && (
            <div>
              {publications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>📋</div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                    Aún no has publicado ningún precio.
                  </p>
                </div>
              ) : (
                <>
                  {publications.slice(0, pubVisible).map((pub) => (
                    <PublicationMiniCard
                      key={pub.id}
                      publication={pub}
                      onEdit={(p) => setEditingPub(p)}
                      saving={false}
                    />
                  ))}
                  {pubVisible < publications.length && (
                    <button
                      onClick={() => setPubVisible((v) => v + PAGE_SIZE)}
                      style={{
                        display: 'block',
                        width: '100%',
                        marginTop: '10px',
                        padding: '8px 0',
                        background: 'transparent',
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--accent)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Ver más ({publications.length - pubVisible} restantes)
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Tab: Reportes ── */}
          {activeTab === 'reports' && (
            <div>
              {reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: '40px', marginBottom: '8px' }}>🚩</div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>
                    No has enviado ningún reporte.
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Los reportes pendientes pueden modificarse antes de ser revisados.
                  </p>
                  {reports.slice(0, reportVisible).map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      userId={user.id}
                      onRefresh={loadActivity}
                    />
                  ))}
                  {reportVisible < reports.length && (
                    <button
                      onClick={() => setReportVisible((v) => v + PAGE_SIZE)}
                      style={{
                        display: 'block',
                        width: '100%',
                        marginTop: '10px',
                        padding: '8px 0',
                        background: 'transparent',
                        border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--accent)',
                        fontSize: '13px',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                    >
                      Ver más ({reports.length - reportVisible} restantes)
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal para editar publicación */}
      {editingPub && (
        <EditPublicationModal
          publication={editingPub}
          onClose={() => setEditingPub(null)}
          onSave={() => { setEditingPub(null); loadActivity(); }}
        />
      )}
    </div>
  );
}

export default ProfileActivitySection;
