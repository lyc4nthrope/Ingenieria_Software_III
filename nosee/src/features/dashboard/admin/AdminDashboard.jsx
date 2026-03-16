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
import { insertActionLog, getActionLogs, getLoginLogs, getUserActivityLogs } from '@/services/api/audit.api';
import { getActionLabel as _getActionLabel, getObjectType as _getObjectType, getObjectInfo as _getObjectInfo, getDescription as _getDescription, parseBrowser, getActionCategory } from '@/features/dashboard/admin/logHelpers';
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
      position: 'fixed', inset: 0, background: 'var(--overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid #1E2D4A', borderRadius: 14,
        padding: '28px 32px', width: 420, maxWidth: '90vw',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
          {isBanning ? td.banTitle : td.unbanTitle}
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
          {isBanning
            ? <>{td.banDesc1} <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>{td.banDesc2} <strong style={{ color: 'var(--error)' }}>{td.banDescStrong}</strong>{td.banDesc3}</>
            : <>{td.unbanDesc1} <strong style={{ color: 'var(--text-primary)' }}>{user.name}</strong>{td.unbanDesc2}</>
          }
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: '1px solid #1E2D4A', color: 'var(--text-secondary)', borderRadius: 8, padding: '8px 18px', fontSize: 13, cursor: 'pointer' }}
          >
            {td.cancelBtn}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: isBanning ? 'var(--error-soft)' : 'var(--success-soft)',
              border: `1px solid ${isBanning ? 'var(--error)' : 'var(--success)'}`,
              color: isBanning ? 'var(--error)' : 'var(--success)',
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
  alta:  { bg: 'var(--error-soft)', text: 'var(--error)' },
  media: { bg: 'var(--warning-soft)', text: 'var(--warning)' },
  baja:  { bg: 'var(--info-soft)', text: 'var(--info)' },
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

const getReportTargetTypeLabel = (type, td) => {
  const map = td?.reportTargetTypes || {};
  return map[String(type || '').toLowerCase()] || td?.reportTargetTypes?.other || 'Other';
};

const getReportTargetDisplay = (report) => {
  const type = String(report?.reported_type || '').toLowerCase();
  const target = report?.target;
  if (!target) return `ID: ${report?.reported_id || 'N/A'}`;

  if (type === 'publication') {
    const product = target?.product?.name || 'Publicación';
    const store = target?.store?.name ? ` • ${target.store.name}` : '';
    return `${product}${store}`;
  }
  if (type === 'user') return target?.full_name || report?.reported?.full_name || `Usuario ${report?.reported_id || ''}`;
  if (type === 'store') return target?.name || `Tienda ${report?.reported_id || ''}`;
  if (type === 'product') return target?.name || `Producto ${report?.reported_id || ''}`;
  if (type === 'brand') return target?.name || `Marca ${report?.reported_id || ''}`;
  if (type === 'comment') return target?.content ? `“${target.content}”` : `Comentario ${report?.reported_id || ''}`;

  return `ID: ${report?.reported_id || 'N/A'}`;
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

const normalizePublicationForAdmin = (publication) => ({
  ...publication,
  authorName: publication?.user?.full_name || null,
  userName: publication?.user?.full_name || null,
  userId: publication?.user?.id || publication?.user_id || null,
  productName: publication?.product?.name || null,
  productId: publication?.product?.id || publication?.product_id || null,
  productBarcode: publication?.product?.barcode || null,
  brandId: publication?.product?.brand?.id || null,
  brandName: publication?.product?.brand?.name || null,
  storeName: publication?.store?.name || null,
  storeId: publication?.store?.id || publication?.store_id || null,
  createdAt: publication?.created_at || null,
  photoUrl: publication?.photo_url || null,
  confidenceScore: publication?.confidence_score ?? null,
  status: publication?.is_active ? 'active' : 'hidden',
});

const isPublicationVisible = (publication) => publication?.is_active === true;
const isPublicationHidden = (publication) => !isPublicationVisible(publication);

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
  const [selectedPub, setSelectedPub]         = useState(null); // pub abierta en modal
  const [deletingStoreId, setDeletingStoreId] = useState(null);
  const [deletingBrandId, setDeletingBrandId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [selectedStore, setSelectedStore]     = useState(null);
  const [selectedBrand, setSelectedBrand]     = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [unpublishedLoading, setUnpublishedLoading] = useState(false);
  const [unpublishedLoaded, setUnpublishedLoaded] = useState(false);
  const [unpublishedResources, setUnpublishedResources] = useState({ stores: [], products: [] });

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

  // Logs de auditoría
  const [actionLogs, setActionLogs]           = useState([]);
  const [loginLogs, setLoginLogs]             = useState([]);
  const [logsLoading, setLogsLoading]         = useState(false);
  const [logsLoaded, setLogsLoaded]           = useState(false);
  const [activityLogs, setActivityLogs]       = useState([]);
  const [usersMap, setUsersMap]               = useState({});
  const [logFilter, setLogFilter]             = useState('');
  const [logCatFilter, setLogCatFilter]       = useState('all');
  const [logSourceFilter, setLogSourceFilter] = useState('all');
  const [logDateFrom, setLogDateFrom] = useState('');
  const [logDateTo, setLogDateTo]     = useState('');

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
  // Carga inicial una sola vez al montar.
  useEffect(() => {
    loadUsers();
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar datos de sección cuando se activa (lazy loading)
  useEffect(() => {
    if (activeSection === 'content'  && !pubsLoaded)     loadPublications();
    if (activeSection === 'content'  && pubFilter === 'unpublished' && !unpublishedLoaded) loadUnpublishedResources();
    if (activeSection === 'reports'  && !reportsLoaded)  loadReports();
    if (activeSection === 'config'   && !catsLoaded)     loadCategories();
    if (activeSection === 'logs'     && !logsLoaded)     loadLogs();
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Suscripción en tiempo real para logs ────────────────────────────────
  useEffect(() => {
    if (activeSection !== 'logs') return;

    const fetchUserName = async (userId) => {
      if (!userId) return;
      const { data } = await supabase.from('users').select('id, full_name, email').eq('id', userId).single();
      if (data) setUsersMap(prev => ({ ...prev, [data.id]: data.full_name || data.email || `${data.id.slice(0, 8)}…` }));
    };

    const channel = supabase
      .channel('realtime-audit-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_activity_logs' }, async (payload) => {
        setActivityLogs(prev => [payload.new, ...prev]);
        fetchUserName(payload.new.user_id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'login_audit_logs' }, async (payload) => {
        setLoginLogs(prev => [payload.new, ...prev]);
        fetchUserName(payload.new.user_id);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_content_audit_log' }, (payload) => {
        const log = payload.new;
        setActionLogs(prev => [{ ...log, details: { resource_id: log.resource_id, resource_type: log.resource_type, ...(log.metadata || {}) } }, ...prev]);
        fetchUserName(log.actor_user_id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeSection]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeSection !== 'content') return;
    if (pubFilter !== 'unpublished') return;
    if (unpublishedLoaded || unpublishedLoading) return;
    loadUnpublishedResources();
  }, [activeSection, pubFilter, unpublishedLoaded, unpublishedLoading]);

  // ─── Logs de auditoría ────────────────────────────────────────────────────
  const loadLogs = async () => {
    setLogsLoading(true);
    const [{ data: aLogs }, { data: lLogs }, { data: uLogs }] = await Promise.all([
      getActionLogs({ limit: 100 }),
      getLoginLogs({ limit: 200 }),
      getUserActivityLogs({ limit: 200 }),
    ]);
    setActionLogs(aLogs || []);
    setLoginLogs(lLogs || []);
    setActivityLogs(uLogs || []);

    // Construir mapa userId → nombre usando getAllUsers (acceso admin)
    const { data: allUsersData } = await getAllUsers();
    if (allUsersData?.length) {
      const map = {};
      allUsersData.forEach(u => {
        map[u.id] = u.fullName || u.full_name || u.email || `${u.id.slice(0, 8)}…`;
      });
      setUsersMap(map);
    }

    setLogsLoading(false);
    setLogsLoaded(true);
  };

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
      supabase.from('publication_votes').select('*', { count: 'exact', head: true }).eq('vote_type', 1).gte('created_at', todayISO),
      supabase.from('reports').select('*', { count: 'exact', head: true }).in('status', ['PENDING', 'pending']),
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
          email:  u.email || 'No disponible',
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
        const { data: authData } = await supabase.auth.getUser();
        const prevRole = users.find(u => u.id === userId)?.role || null;
        insertActionLog(authData?.user?.id, 'user', userId, 'change_role', null, { newRole, prevRole });
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
    if (!target) return;
    if (target.role === 'Admin') {
      alert(td.errorBanAdmin || 'No puedes desactivar una cuenta de administrador.');
      return;
    }
    setBanModal(target);
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
          .update({ is_active: false })
          .eq('user_id', target.id)
          .eq('is_active', true);

        // Refrescar la lista de publicaciones si ya estaba cargada
        if (pubsLoaded) {
          setPublications(prev =>
            prev.map(p => p.user_id === target.id && p.is_active
              ? { ...p, is_active: false, status: 'hidden' }
              : p
            )
          );
        }
      }

      setUsers(prev =>
        prev.map(u => u.id === target.id ? { ...u, status: isBanning ? 'baneado' : 'activo' } : u)
      );
      const { data: authData } = await supabase.auth.getUser();
      insertActionLog(authData?.user?.id, 'user', target.id, isBanning ? 'ban_user' : 'unban_user', null, { userName: target.name });
    } catch {
      alert(td.errorStatus);
    }
  };

  // ─── Publicaciones ────────────────────────────────────────────────────────
  // El admin ve TODAS las publicaciones (activas e inactivas).
  // Usamos supabase directamente para evitar filtros de la API de usuario.
  const loadPublications = async () => {
    setPubsLoading(true);
    try {
      const { data, error } = await supabase
        .from('price_publications')
        .select(`
          id, price, photo_url, description, confidence_score, is_active, created_at,
          user_id, store_id, product_id,
          user:users!price_publications_user_id_fkey (id, full_name, reputation_points),
          product:products (id, name, barcode, base_quantity, brand:brands(id, name), unit_type:unit_types (id, name, abbreviation)),
          store:stores!price_publications_store_id_fkey (id, name, address)
        `)
        .eq('is_admin_hidden', false)
        .order('created_at', { ascending: false })
        .limit(300);
      if (!error) setPublications((data || []).map(normalizePublicationForAdmin));
    } catch {
      // silencioso
    } finally {
      setPubsLoading(false);
      setPubsLoaded(true);
    }
  };

  const handleDeletePublication = async (publicationInput) => {
    const publication =
      typeof publicationInput === 'object'
        ? publicationInput
        : publications.find((p) => p.id === publicationInput);

    const pubId = publication?.id || publicationInput;
    const isActive = publication?.is_active === true;

    if (!pubId) return;

    let action = 'hide_full';

    if (isActive) {
      const decision = window.prompt(td.promptHidePub);
      if (decision === null) return;
      const normalizedDecision = String(decision).trim().toLowerCase();
      if (normalizedDecision === 'ocultar') action = 'hide';
      else if (normalizedDecision === 'ocultar completo' || normalizedDecision === 'ocultar_completo' || normalizedDecision === 'eliminar') action = 'hide_full';
      else {
        alert(td.alertInvalidOption);
        return;
      }
    } else if (!window.confirm(td.confirmHideFull)) {
      return;
    }

    setDeletingPub(pubId);
    try {
      if (action === 'hide') {
        const { error } = await supabase
          .from('price_publications')
          .update({ is_active: false })
          .eq('id', pubId)
          .eq('is_active', true);

        if (error) {
          alert(td.errorDeletePub(error.message));
          return;
        }

        setPublications((prev) =>
          prev.map((p) => (p.id === pubId ? { ...p, is_active: false, status: 'hidden' } : p)),
        );
        setSelectedPub((prev) => (prev?.id === pubId ? { ...prev, is_active: false, status: 'hidden' } : prev));
        const { data: hideAuthData } = await supabase.auth.getUser();
        insertActionLog(hideAuthData?.user?.id, 'publication', pubId, 'hide');
        alert(td.pubHiddenOk);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const actorId = authData?.user?.id || null;

      const { error } = await supabase
        .from('price_publications')
        .update({
          is_active: false,
          is_admin_hidden: true,
          hidden_admin_at: new Date().toISOString(),
          hidden_admin_by: actorId,
          hidden_admin_reason: 'Ocultada completamente desde panel admin',
        })
        .eq('id', pubId);

      if (error) {
        alert(td.errorDeletePub(error.message || td.errorDeletePubGeneric));
        return;
      }

      // Ocultación completa: sacar de la vista actual del admin
      setPublications((prev) => prev.filter((p) => p.id !== pubId));
      setSelectedPub((prev) => (prev?.id === pubId ? null : prev));
      insertActionLog(actorId, 'publication', pubId, 'hide_full');
    } catch {
      alert(td.errorDeletePubGeneric);
    } finally {
      setDeletingPub(null);
    }
  };

  // dbUpdates: campos a persistir en supabase. uiUpdates: campos extra para estado local (ej. nombres desnormalizados).
  const handleEditPublication = async (pubId, dbUpdates, uiUpdates = {}) => {
    try {
      const { error } = await supabase
        .from('price_publications')
        .update(dbUpdates)
        .eq('id', pubId);
      if (error) {
        alert(td.errorEditPub(error.message));
        return false;
      }
      setPublications(prev => prev.map(p => p.id === pubId ? { ...p, ...dbUpdates, ...uiUpdates } : p));
      return true;
    } catch {
      alert(td.errorEditPubGeneric);
      return false;
    }
  };

  const loadUnpublishedResources = async () => {
    setUnpublishedLoading(true);
    try {
      const [{ data: refs, error: refsError }, { data: storesData, error: storesError }, { data: productsData, error: productsError }] = await Promise.all([
        supabase
          .from('price_publications')
          .select('store_id, product_id')
          .limit(10000),
        supabase
          .from('stores')
          .select('id, name, address, website_url, store_type_id, created_by, created_at')
          .eq('is_admin_hidden', false)
          .order('name', { ascending: true })
          .limit(10000),
        supabase
          .from('products')
          .select('id, name, barcode, base_quantity, created_at, brand:brands(id, name), unit:unit_types(id, name, abbreviation)')
          .eq('is_admin_hidden', false)
          .order('name', { ascending: true })
          .limit(10000),
      ]);

      if (refsError || storesError || productsError) {
        alert(refsError?.message || storesError?.message || productsError?.message || td.errorLoadUnpublished);
        return;
      }

      const usedStoreIds = new Set((refs || []).map((r) => r.store_id).filter(Boolean));
      const usedProductIds = new Set((refs || []).map((r) => r.product_id).filter(Boolean));

      const orphanStores = (storesData || [])
        .filter((store) => !usedStoreIds.has(store.id))
        .map((store) => ({
          ...store,
          typeLabel: Number(store.store_type_id) === 1 ? td.storeTypePhysical : Number(store.store_type_id) === 2 ? td.storeTypeVirtual : 'N/A',
        }));
      const orphanProducts = (productsData || [])
        .filter((product) => !usedProductIds.has(product.id));

      setUnpublishedResources({ stores: orphanStores, products: orphanProducts });
    } finally {
      setUnpublishedLoading(false);
      setUnpublishedLoaded(true);
    }
  };

  const handleViewStore = async (publication) => {
    const storeId = publication?.storeId || publication?.store?.id || publication?.store_id;
    if (!storeId) return;

    const { data, error } = await supabase
      .from('stores')
      .select('id, name, address, website_url, store_type_id, created_by, created_at')
      .eq('id', storeId)
      .maybeSingle();

    if (error || !data) {
      alert(error?.message || td.errorLoadStore);
      return;
    }

    const relatedCount = publications.filter((p) => (p.storeId || p.store?.id || p.store_id) === storeId).length;
    setSelectedStore({
      ...data,
      typeLabel: Number(data.store_type_id) === 1 ? td.storeTypePhysical : Number(data.store_type_id) === 2 ? td.storeTypeVirtual : 'N/A',
      relatedCount,
    });
  };

  const handleDeleteStore = async (publication) => {
    const storeId = publication?.storeId || publication?.store?.id || publication?.store_id || publication?.id;
    const storeName = publication?.storeName || publication?.store?.name || publication?.name || 'esta tienda';
    if (!storeId) return;
    if (!window.confirm(td.confirmHide(storeName))) return;

    setDeletingStoreId(storeId);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const actorId = authData?.user?.id || null;
      const { error } = await supabase
        .from('stores')
        .update({
          is_admin_hidden: true,
          hidden_admin_at: new Date().toISOString(),
          hidden_admin_by: actorId,
          hidden_admin_reason: 'Ocultado desde panel admin',
          is_active: false,
        })
        .eq('id', storeId);

      if (error) {
        alert(td.errorHideStore(error.message));
        return;
      }

      setUnpublishedResources((prev) => ({
        ...prev,
        stores: prev.stores.filter((s) => s.id !== storeId),
      }));
      setSelectedStore((prev) => (prev?.id === storeId ? null : prev));
      insertActionLog(actorId, 'store', storeId, 'hide', null, { storeName });
    } finally {
      setDeletingStoreId(null);
    }
  };

  const handleEditStore = async (storeId, updates) => {
    try {
      const { error } = await supabase.from('stores').update(updates).eq('id', storeId);
      if (error) { alert(`No se pudo actualizar la tienda: ${error.message}`); return false; }
      const typeLabel = Number(updates.store_type_id) === 1 ? 'Física' : Number(updates.store_type_id) === 2 ? 'Virtual' : undefined;
      const merged = typeLabel ? { ...updates, typeLabel } : { ...updates };
      setPublications(prev => prev.map(p => {
        const pStoreId = p.storeId || p.store?.id || p.store_id;
        if (pStoreId !== storeId) return p;
        return { ...p, storeName: updates.name || p.storeName, store: { ...(p.store || {}), ...updates } };
      }));
      setUnpublishedResources(prev => ({
        ...prev,
        stores: prev.stores.map(s => s.id === storeId ? { ...s, ...merged } : s),
      }));
      setSelectedStore(prev => prev?.id === storeId ? { ...prev, ...merged } : prev);
      return true;
    } catch {
      alert('Error al actualizar la tienda');
      return false;
    }
  };

  const handleViewBrand = async (publication) => {
    const brandId = publication?.brandId || publication?.product?.brand?.id;
    if (!brandId) {
      alert(td.errorNoBrand);
      return;
    }

    const { data, error } = await supabase
      .from('brands')
      .select('id, name, created_at')
      .eq('id', brandId)
      .maybeSingle();

    if (error || !data) {
      alert(error?.message || td.errorLoadBrand);
      return;
    }

    const { count: productsCount } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', brandId);

    setSelectedBrand({
      ...data,
      productsCount: productsCount ?? 0,
      productName: publication?.productName || publication?.product?.name || null,
      productBarcode: publication?.productBarcode || publication?.product?.barcode || null,
    });
  };

  const handleDeleteBrand = async (publication) => {
    const brandId = publication?.brandId || publication?.product?.brand?.id || publication?.id;
    const brandName = publication?.brandName || publication?.product?.brand?.name || publication?.name || 'esta marca';
    if (!brandId) {
      alert(td.errorNoBrand);
      return;
    }
    if (!window.confirm(td.confirmHideBrand(brandName))) return;

    setDeletingBrandId(brandId);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const actorId = authData?.user?.id || null;
      const { error } = await supabase
        .from('brands')
        .update({
          is_admin_hidden: true,
          hidden_admin_at: new Date().toISOString(),
          hidden_admin_by: actorId,
          hidden_admin_reason: 'Ocultado desde panel admin',
          is_active: false,
        })
        .eq('id', brandId);

      if (error) {
        alert(td.errorHideBrand(error.message));
        return;
      }

      setPublications((prev) => prev.map((p) => (
        (p.brandId || p.product?.brand?.id) === brandId
          ? { ...p, brandId: null, brandName: null, product: { ...p.product, brand: null } }
          : p
      )));
      setSelectedBrand((prev) => (prev?.id === brandId ? null : prev));
      insertActionLog(actorId, 'brand', brandId, 'hide', null, { brandName });
    } finally {
      setDeletingBrandId(null);
    }
  };

  const handleEditBrand = async (brandId, updates) => {
    try {
      const { error } = await supabase.from('brands').update(updates).eq('id', brandId);
      if (error) { alert(`No se pudo actualizar la marca: ${error.message}`); return false; }
      setPublications(prev => prev.map(p => {
        const pBrandId = p.brandId || p.product?.brand?.id;
        if (pBrandId !== brandId) return p;
        return { ...p, brandName: updates.name || p.brandName, product: { ...(p.product || {}), brand: { ...(p.product?.brand || {}), ...updates } } };
      }));
      setSelectedBrand(prev => prev?.id === brandId ? { ...prev, ...updates } : prev);
      return true;
    } catch {
      alert('Error al actualizar la marca');
      return false;
    }
  };

  const handleViewProduct = (product) => {
    setSelectedProduct(product || null);
  };

  const handleDeleteProduct = async (product) => {
    const productId = product?.productId || product?.id;
    const productName = product?.productName || product?.name || 'este producto';
    if (!productId) return;
    if (!window.confirm(td.confirmHide(productName))) return;

    setDeletingProductId(productId);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const actorId = authData?.user?.id || null;
      const { error } = await supabase
        .from('products')
        .update({
          is_admin_hidden: true,
          hidden_admin_at: new Date().toISOString(),
          hidden_admin_by: actorId,
          hidden_admin_reason: 'Ocultado desde panel admin',
          is_active: false,
        })
        .eq('id', productId);

      if (error) {
        alert(td.errorHideProduct(error.message));
        return;
      }

      setUnpublishedResources((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== productId),
      }));
      setSelectedProduct((prev) => (prev?.id === productId ? null : prev));
      insertActionLog(actorId, 'product', productId, 'hide', null, { productName });
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleEditProduct = async (productId, updates) => {
    try {
      const { error } = await supabase.from('products').update(updates).eq('id', productId);
      if (error) { alert(`No se pudo actualizar el producto: ${error.message}`); return false; }
      setUnpublishedResources(prev => ({
        ...prev,
        products: prev.products.map(p => p.id === productId ? { ...p, ...updates } : p),
      }));
      setSelectedProduct(prev => prev?.id === productId ? { ...prev, ...updates } : prev);
      return true;
    } catch {
      alert('Error al actualizar el producto');
      return false;
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
        const publicationSummary = String(report.reported_type || '').toLowerCase() === 'publication'
          ? formatPublicationSummary(report.target)
          : null;
        const reportedType = String(report.reported_type || '').toLowerCase();
        const parsedPublicationId = reportedType === 'publication' ? Number(report.reported_id) : null;
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
          post: getReportTargetDisplay(report),
          reporter: report.reporter?.full_name || null,
          reported: report.reported?.full_name || null,
          publicationId: Number.isFinite(parsedPublicationId) ? parsedPublicationId : null,
          reportedUserId: report.reported_user_id,
          reportedType,
          reportedId: report.reported_id,
          targetLabel: getReportTargetTypeLabel(report.reported_type, td),
          target: report.target || null,
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
    if (action === 'hide') {
      const type = String(report.reportedType || '').toLowerCase();
      const entityIdRaw = report.reportedId;
      const { data: authData } = await supabase.auth.getUser();
      const actorId = authData?.user?.id || null;

      const hidePayload = {
        is_active: false,
        is_admin_hidden: true,
        hidden_admin_at: new Date().toISOString(),
        hidden_admin_by: actorId,
        hidden_admin_reason: `Ocultado desde Reportes (reporte ${report.id})`,
      };

      let hideError = null;
      if (type === 'publication' && Number.isFinite(Number(entityIdRaw))) {
        const { error } = await supabase.from('price_publications').update(hidePayload).eq('id', Number(entityIdRaw));
        hideError = error;
      } else if (type === 'store') {
        const { error } = await supabase.from('stores').update(hidePayload).eq('id', entityIdRaw);
        hideError = error;
      } else if (type === 'product' && Number.isFinite(Number(entityIdRaw))) {
        const { error } = await supabase.from('products').update(hidePayload).eq('id', Number(entityIdRaw));
        hideError = error;
      } else if (type === 'brand' && Number.isFinite(Number(entityIdRaw))) {
        const { error } = await supabase.from('brands').update(hidePayload).eq('id', Number(entityIdRaw));
        hideError = error;
      } else if (type === 'comment') {
        const { error } = await supabase.from('comments').update({ is_deleted: true }).eq('id', entityIdRaw);
        hideError = error;
      } else {
        alert(`No hay acción de ocultado para el tipo "${type || 'desconocido'}".`);
        return;
      }

      if (hideError) {
        alert(`No se pudo ocultar el contenido reportado: ${hideError.message}`);
        return;
      }
      insertActionLog(actorId, type, entityIdRaw, 'hide_from_report', null, { reportId: report.id });
    }
    if (action === 'ban' && report.reportedUserId) {
      await supabase.from('users').update({ is_active: false }).eq('id', report.reportedUserId);
      const { data: authData } = await supabase.auth.getUser();
      insertActionLog(authData?.user?.id, 'user', report.reportedUserId, 'ban_user', null, { reportId: report.id });
    }

    const nextStatus = action === 'reject' ? 'REJECTED' : 'RESOLVED';
    await updateReportData(report, { status: nextStatus });
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
    <div style={s.root} className="admin-root">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside style={s.sidebar} className="admin-sidebar">
        <nav style={s.nav} className="admin-sidebar-nav">
          {[
            { key: 'overview', icon: '▦', label: td.navOverview },
            { key: 'users',    icon: '◉', label: td.navUsers },
            { key: 'content',  icon: '◈', label: td.navContent },
            { key: 'reports',  icon: '⚠', label: td.navReports, badge: reportsBadge },
            { key: 'config',   icon: '⚙', label: td.navConfig },
            { key: 'logs',     icon: '◎', label: td.navLogs },
          ].map((item) => (
            <button
              key={item.key}
              style={{ ...s.navItem, ...(activeSection === item.key ? s.navActive : {}) }}
              onClick={() => setActiveSection(item.key)}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span className="admin-nav-label">{item.label}</span>
              {item.badge > 0 && <span style={s.navBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Contenido principal ───────────────────────────────────── */}
      <main style={s.main} className="admin-main">

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {activeSection === 'overview' && (
          <>
            <SectionHeader title={td.overviewTitle} sub={td.overviewSub} />

            <div style={s.statsGrid} className="admin-stats-grid">
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

            {/* Stats de publicaciones */}
            {!pubsLoading && pubsLoaded && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                <div style={{ ...s.statCard, flex: '1 1 140px', padding: '14px 18px' }}>
                  <div style={s.statValue}>{publications.length}</div>
                  <div style={s.statLabel}>{td.filterAll}</div>
                </div>
                <div style={{ ...s.statCard, flex: '1 1 140px', padding: '14px 18px' }}>
                  <div style={{ ...s.statValue, color: 'var(--success)' }}>
                    {publications.filter(isPublicationVisible).length}
                  </div>
                  <div style={s.statLabel}>{td.filterVisible}</div>
                </div>
                <div style={{ ...s.statCard, flex: '1 1 140px', padding: '14px 18px' }}>
                  <div style={{ ...s.statValue, color: 'var(--error)' }}>
                    {publications.filter(isPublicationHidden).length}
                  </div>
                  <div style={s.statLabel}>{td.filterHidden}</div>
                </div>
              </div>
            )}

            {/* Filtro por visibilidad */}
            <div style={s.filterRow}>
              {[
                { key: 'all',     label: td.filterAll },
                { key: 'visible', label: td.filterVisible },
                { key: 'hidden',  label: td.filterHidden },
                { key: 'unpublished', label: td.filterUnpublished },
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

            {pubFilter === 'unpublished' ? (
              unpublishedLoading ? (
                <LoadingState label={td.loadingUnpublished} />
              ) : (
                <UnpublishedResourcesTable
                  stores={unpublishedResources.stores}
                  products={unpublishedResources.products}
                  onViewStore={handleViewStore}
                  onDeleteStore={handleDeleteStore}
                  onViewProduct={handleViewProduct}
                  onDeleteProduct={handleDeleteProduct}
                  deletingStoreId={deletingStoreId}
                  deletingProductId={deletingProductId}
                />
              )
            ) : pubsLoading ? (
              <LoadingState label={td.loadingPubs} />
            ) : (
              <PublicationsTable
                publications={publications.filter(p => {
                  if (pubFilter === 'visible') return isPublicationVisible(p);
                  if (pubFilter === 'hidden')  return isPublicationHidden(p);
                  return true;
                })}
                onDelete={handleDeletePublication}
                onView={(p) => setSelectedPub(p)}
                onViewStore={handleViewStore}
                onDeleteStore={handleDeleteStore}
                onViewBrand={handleViewBrand}
                onDeleteBrand={handleDeleteBrand}
                deletingId={deletingPub}
                deletingStoreId={deletingStoreId}
                deletingBrandId={deletingBrandId}
              />
            )}

            {selectedPub && (
              <PublicationDetailModal
                pub={selectedPub}
                onClose={() => setSelectedPub(null)}
                onSave={async (updates) => {
                  const ok = await handleEditPublication(selectedPub.id, updates.db, updates.ui);
                  if (ok) setSelectedPub(prev => prev ? { ...prev, ...updates.db, ...(updates.ui || {}) } : null);
                }}
                onDelete={() => {
                  handleDeletePublication(selectedPub);
                  setSelectedPub(null);
                }}
              />
            )}

            {selectedStore && (
              <StoreDetailModal
                store={selectedStore}
                onClose={() => setSelectedStore(null)}
                onSave={handleEditStore}
                onDelete={() => {
                  handleDeleteStore(selectedStore);
                }}
                isDeleting={deletingStoreId === selectedStore.id}
              />
            )}

            {selectedBrand && (
              <BrandDetailModal
                brand={selectedBrand}
                onClose={() => setSelectedBrand(null)}
                onSave={handleEditBrand}
                onDelete={() => {
                  handleDeleteBrand(selectedBrand);
                }}
                isDeleting={deletingBrandId === selectedBrand.id}
              />
            )}

            {selectedProduct && (
              <ProductDetailModal
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onSave={handleEditProduct}
                onDelete={() => handleDeleteProduct(selectedProduct)}
                isDeleting={deletingProductId === selectedProduct.id}
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

                <div style={s.reportFiltersGrid} className="admin-report-filters">
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
                          background: 'var(--bg-elevated)', border: `1px solid ${BORDER}`,
                          color: TEXT, borderRadius: 6, padding: '5px 10px',
                          fontSize: 15, fontWeight: 700, width: 80, textAlign: 'right',
                        }}
                      />
                    ) : (
                      <span style={{
                        ...s.configValue,
                        color: value.startsWith('+') ? 'var(--success)' : value.startsWith('-') ? 'var(--error)' : ACCENT,
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
                    flex: 1, background: 'var(--bg-elevated)', border: `1px solid ${BORDER}`,
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

        {/* ── LOGS ──────────────────────────────────────────────── */}
        {activeSection === 'logs' && (
          <>
            <SectionHeader title={td.logsTitle} sub={td.logsSub} />

            {logsLoading ? (
              <LoadingState label={td.logsLoading} />
            ) : (() => {
              // ── helpers (módulo logHelpers.js) ───────────────────
              const AL = td.logActionLabels || {};
              const userName    = (id) => usersMap[id] || (id ? `${id.slice(0, 8)}…` : '—');
              const actionLabel = (type) => _getActionLabel(type, AL);
              const objectInfo  = (type, d) => _getObjectInfo(type, d);
              const description = (type, d, ip, ua) => _getDescription(type, d, ip, ua);

              const CAT_COLOR = {
                session:  '#94a3b8',
                create:   'var(--success)',
                edit:     ACCENT,
                delete:   'var(--error, #e53e3e)',
                moderate: '#f59e0b',
                security: '#dc2626',
                other:    '#94a3b8',
              };
              const actionColor = (type) => CAT_COLOR[getActionCategory(type)] || '#94a3b8';

              // Etiquetas de fuente
              const SOURCE_LABEL = { session: 'Sesión', activity: 'Actividad', admin: 'Admin' };
              const SOURCE_COLOR = { session: '#64748b', activity: ACCENT, admin: '#f59e0b' };

              // Normalizar los 3 sources en filas unificadas
              const unifiedRows = [
                ...loginLogs.map(l => ({
                  id: `l-${l.id}`,
                  created_at: l.created_at,
                  userId: l.user_id,
                  type: l.event_type,
                  details: l.metadata || {},
                  ip: l.ip_address,
                  ua: l.user_agent,
                  source: 'session',
                  reason: null,
                })),
                ...activityLogs.map(a => ({
                  id: `a-${a.id}`,
                  created_at: a.created_at,
                  userId: a.user_id,
                  type: a.action,
                  details: a.details || {},
                  ip: null,
                  ua: null,
                  source: 'activity',
                  reason: null,
                })),
                ...actionLogs.map(log => ({
                  id: `ad-${log.id}`,
                  created_at: log.created_at,
                  userId: log.actor_user_id,
                  type: log.action_type,
                  details: { resource_id: log.resource_id, resource_type: log.resource_type, ...(log.metadata || {}) },
                  ip: null,
                  ua: null,
                  source: 'admin',
                  reason: log.reason,
                })),
              ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

              // Filtros
              const filterLower = logFilter.trim().toLowerCase();
              const filterRow = (row) => {
                if (filterLower && !userName(row.userId).toLowerCase().includes(filterLower)) return false;
                if (logCatFilter !== 'all' && getActionCategory(row.type) !== logCatFilter) return false;
                if (logSourceFilter !== 'all' && row.source !== logSourceFilter) return false;
                if (logDateFrom && new Date(row.created_at) < new Date(logDateFrom + 'T00:00:00')) return false;
                if (logDateTo   && new Date(row.created_at) > new Date(logDateTo   + 'T23:59:59')) return false;
                return true;
              };

              const visibleRows = unifiedRows.filter(filterRow);

              // Formato de fecha compacto
              const fmtDate = (iso) => {
                const d = new Date(iso);
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const hh = String(d.getHours()).padStart(2, '0');
                const min = String(d.getMinutes()).padStart(2, '0');
                return `${dd}/${mm} ${hh}:${min}`;
              };

              // Conteo por fuente
              const countSession  = unifiedRows.filter(r => r.source === 'session').length;
              const countActivity = unifiedRows.filter(r => r.source === 'activity').length;
              const countAdmin    = unifiedRows.filter(r => r.source === 'admin').length;

              const COLS = '90px 70px 140px 150px 140px 1fr';
              const headers = [td.logsColDate, 'Fuente', td.logsColUserName, td.logsColActionDone, td.logsColObjectAffected, td.logsColDescriptionDetail];

              return (
                <>
                  {/* Barra de filtros */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
                    <input
                      value={logFilter}
                      onChange={e => setLogFilter(e.target.value)}
                      placeholder="Buscar usuario..."
                      style={{ ...s.filterSelect, width: 200, fontFamily: 'inherit' }}
                    />
                    <select
                      value={logCatFilter}
                      onChange={e => setLogCatFilter(e.target.value)}
                      style={{ ...s.filterSelect, width: 160 }}
                    >
                      <option value="all">Todas las acciones</option>
                      <option value="session">Sesión</option>
                      <option value="create">Creación</option>
                      <option value="edit">Edición</option>
                      <option value="delete">Eliminación/Reporte</option>
                      <option value="moderate">Moderación</option>
                      <option value="security">Seguridad</option>
                    </select>
                    <select
                      value={logSourceFilter}
                      onChange={e => setLogSourceFilter(e.target.value)}
                      style={{ ...s.filterSelect, width: 150 }}
                    >
                      <option value="all">Todas las fuentes</option>
                      <option value="session">Solo sesiones</option>
                      <option value="activity">Solo actividad</option>
                      <option value="admin">Solo admin/mod</option>
                    </select>
                    <input
                      type="date"
                      value={logDateFrom}
                      onChange={e => setLogDateFrom(e.target.value)}
                      title="Desde"
                      style={{ ...s.filterSelect, width: 140, fontFamily: 'inherit' }}
                    />
                    <input
                      type="date"
                      value={logDateTo}
                      onChange={e => setLogDateTo(e.target.value)}
                      title="Hasta"
                      style={{ ...s.filterSelect, width: 140, fontFamily: 'inherit' }}
                    />
                    {(logFilter || logCatFilter !== 'all' || logSourceFilter !== 'all' || logDateFrom || logDateTo) && (
                      <button
                        type="button"
                        onClick={() => { setLogFilter(''); setLogCatFilter('all'); setLogSourceFilter('all'); setLogDateFrom(''); setLogDateTo(''); }}
                        style={{ fontSize: 12, color: MUTED, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
                      >
                        Limpiar filtros
                      </button>
                    )}
                  </div>

                  {/* Resumen de conteos */}
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, color: MUTED }}>
                      <strong style={{ color: TEXT }}>{visibleRows.length}</strong> / {unifiedRows.length} registros
                    </span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Sesión: {countSession}</span>
                    <span style={{ fontSize: 12, color: ACCENT }}>Actividad: {countActivity}</span>
                    <span style={{ fontSize: 12, color: '#f59e0b' }}>Admin/Mod: {countAdmin}</span>
                    {/* Indicador live */}
                    <span style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                      <span style={{ color: MUTED }}>En vivo</span>
                    </span>
                  </div>

                  {/* Tabla unificada */}
                  {visibleRows.length === 0 ? (
                    <EmptyMsg text={td.logsEmpty} />
                  ) : (
                    <div style={{ ...s.configCard, overflowX: 'auto', padding: 0 }}>
                      <div style={{ minWidth: 780 }}>
                        {/* Header pegajoso */}
                        <div style={{ ...s.tableHead, gridTemplateColumns: COLS, position: 'sticky', top: 0, zIndex: 2 }}>
                          {headers.map(h => <div key={h} style={s.th}>{h}</div>)}
                        </div>
                        {visibleRows.map((row, idx) => (
                          <div
                            key={row.id}
                            style={{
                              ...s.tableRow,
                              gridTemplateColumns: COLS,
                              fontSize: 13,
                              background: idx % 2 === 0 ? 'transparent' : 'var(--bg-elevated, rgba(0,0,0,0.02))',
                            }}
                          >
                            {/* Fecha compacta */}
                            <div style={{ ...s.td, color: MUTED, fontSize: 11 }} title={new Date(row.created_at).toLocaleString('es-CO')}>
                              {fmtDate(row.created_at)}
                            </div>
                            {/* Badge de fuente */}
                            <div style={s.td}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 6px',
                                borderRadius: 999, background: `${SOURCE_COLOR[row.source]}18`,
                                color: SOURCE_COLOR[row.source], whiteSpace: 'nowrap',
                              }}>
                                {SOURCE_LABEL[row.source]}
                              </span>
                            </div>
                            {/* Usuario */}
                            <div style={{ ...s.td, fontWeight: 700, color: TEXT, fontSize: 12 }}>{userName(row.userId)}</div>
                            {/* Acción con punto de color */}
                            <div style={{ ...s.td, fontWeight: 600, fontSize: 12 }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: actionColor(row.type), flexShrink: 0 }} />
                                <span style={{ color: actionColor(row.type) }}>{actionLabel(row.type)}</span>
                              </span>
                            </div>
                            {/* Objeto afectado */}
                            <div style={{ ...s.td, fontWeight: 500, fontSize: 12 }}>{objectInfo(row.type, row.details)}</div>
                            {/* Descripción */}
                            <div style={{ ...s.td, color: MUTED, fontSize: 11 }}>
                              {row.reason || description(row.type, row.details, row.ip, row.ua)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
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
    <div style={s.table} className="admin-table">
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
              color:      u.status === 'activo' ? ACCENT : 'var(--error)',
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
function PublicationsTable({
  publications,
  onDelete,
  onView,
  onViewStore,
  onDeleteStore,
  onViewBrand,
  onDeleteBrand,
  deletingId,
  deletingStoreId,
  deletingBrandId,
}) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  if (publications.length === 0) {
    return <EmptyMsg text={td.noPubsView} />;
  }
  return (
    <div style={s.table} className="admin-table admin-table-pubs">
      <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 1.2fr' }}>
        {[td.colProduct, td.colStore, td.colPrice, td.colAuthor, td.colDate, td.colAction].map(h => (
          <div key={h} style={s.th}>{h}</div>
        ))}
      </div>
      {publications.map(p => (
        <div key={p.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 1.2fr' }}>
          <div style={s.td}>
            <div>
              <div style={s.rowName}>{p.productName || p.product?.name || '—'}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {td.colBrand}: {p.brandName || p.product?.brand?.name || td.noBrand}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {td.colBarcode}: {p.productBarcode || p.product?.barcode || td.noCode}
              </div>
              <StatusBadge status={p.is_active ? 'active' : 'hidden'} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  style={{ ...s.filterBtn, padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onViewBrand(p)}
                >
                  {td.viewDetailBtn}
                </button>
                <button
                  style={{ ...s.btnDelete, padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onDeleteBrand(p)}
                  disabled={deletingBrandId === (p.brandId || p.product?.brand?.id)}
                >
                  {deletingBrandId === (p.brandId || p.product?.brand?.id) ? '...' : td.hideBtn}
                </button>
              </div>
            </div>
          </div>
          <div style={s.td}>
            <div>
              <div style={s.rowName}>{p.storeName || p.store?.name || '—'}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  style={{ ...s.filterBtn, padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onViewStore(p)}
                >
                  {td.viewDetailBtn}
                </button>
                <button
                  style={{ ...s.btnDelete, padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onDeleteStore(p)}
                  disabled={deletingStoreId === (p.storeId || p.store?.id || p.store_id)}
                >
                  {deletingStoreId === (p.storeId || p.store?.id || p.store_id) ? '...' : td.hideBtn}
                </button>
              </div>
            </div>
          </div>
          <div style={{ ...s.td, ...s.tdNum }}>
            ${typeof p.price === 'number' ? p.price.toLocaleString('es-CO') : p.price || '—'}
          </div>
          <div style={{ ...s.td, fontSize: 13, color: MUTED }}>{p.authorName || p.userName || p.user?.full_name || '—'}</div>
          <div style={{ ...s.td, fontSize: 12, color: MUTED }}>
            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO') : '—'}
          </div>
          <div style={{ ...s.td, gap: 6 }}>
            <button
              style={{ ...s.filterBtn, padding: '5px 10px', fontSize: 12 }}
              onClick={() => onView(p)}
              title={td.viewPubBtn}
            >
              {td.viewPubBtn}
            </button>
            <button
              style={s.btnDelete}
              onClick={() => onDelete(p)}
              disabled={deletingId === p.id}
              title={td.colAction}
            >
              {deletingId === p.id ? '...' : '🗑'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── PublicationDetailModal ───────────────────────────────────────────────────
function PublicationDetailModal({ pub, onClose, onSave, onDelete }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [isActive, setIsActive]       = useState(pub.is_active !== false);
  const [price, setPrice]             = useState(pub.price ?? '');
  const [description, setDescription] = useState(pub.description || '');
  const [photoUrl, setPhotoUrl]       = useState(pub.photoUrl || pub.photo_url || '');

  // Búsqueda de producto
  const [productQuery, setProductQuery]     = useState(pub.productName || pub.product?.name || '');
  const [productId, setProductId]           = useState(pub.productId || pub.product_id || null);
  const [productResults, setProductResults] = useState([]);
  const [searchingProduct, setSearchingProduct] = useState(false);

  // Búsqueda de tienda
  const [storeQuery, setStoreQuery]         = useState(pub.storeName || pub.store?.name || '');
  const [storeId, setStoreId]               = useState(pub.storeId || pub.store_id || null);
  const [storeResults, setStoreResults]     = useState([]);
  const [searchingStore, setSearchingStore] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const authorName = pub.authorName || pub.userName || pub.user?.full_name || '—';
  const createdAt  = pub.createdAt  ? new Date(pub.createdAt).toLocaleString('es-CO') : '—';
  const confidence = typeof pub.confidenceScore === 'number' ? pub.confidenceScore.toFixed(2) : '—';
  const productBarcode = pub.productBarcode || pub.product?.barcode || 'Sin código';
  const brandName      = pub.brandName || pub.product?.brand?.name || 'Sin marca';

  // Buscar productos al escribir
  useEffect(() => {
    if (productQuery.length < 2) { setProductResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProduct(true);
      const { data } = await supabase.from('products').select('id, name, barcode, brand:brands(name)').ilike('name', `%${productQuery}%`).limit(8);
      setProductResults(data || []);
      setSearchingProduct(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [productQuery]);

  // Buscar tiendas al escribir
  useEffect(() => {
    if (storeQuery.length < 2) { setStoreResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingStore(true);
      const { data } = await supabase.from('stores').select('id, name, address, store_type_id').ilike('name', `%${storeQuery}%`).limit(8);
      setStoreResults(data || []);
      setSearchingStore(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [storeQuery]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const db = { is_active: isActive, description: description?.trim() || null };
    const parsedPrice = Number(price);
    if (!isNaN(parsedPrice) && parsedPrice > 0) db.price = parsedPrice;
    if (productId && productId !== (pub.productId || pub.product_id)) db.product_id = productId;
    if (storeId && storeId !== (pub.storeId || pub.store_id)) db.store_id = storeId;
    if (photoUrl.trim() !== (pub.photoUrl || pub.photo_url || '')) db.photo_url = photoUrl.trim() || null;
    const ui = {};
    if (db.product_id) { ui.productId = productId; ui.productName = productQuery; }
    if (db.store_id)   { ui.storeId = storeId; ui.storeName = storeQuery; }
    if (db.photo_url !== undefined) ui.photoUrl = db.photo_url;
    const ok = await onSave({ db, ui });
    setSaving(false);
    if (ok !== false) setSaved(true);
  };

  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.pubDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>ID: {pub.id}</p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>✕</button>
        </div>

        {/* Detalle */}
        <div style={{ ...s.section, marginBottom: 16, marginTop: 0 }}>
          <div style={{ ...s.sectionHead, marginBottom: 10 }}>
            <span style={s.sectionTitle}>{td.pubDetailTitle}</span>
            <StatusBadge status={pub.is_active ? 'active' : 'hidden'} />
          </div>
          <div style={s.detailGrid}>
            <DetailRow label={td.pubProductLabel} value={productQuery || '—'} />
            <DetailRow label={td.pubBarcodeLabel} value={productBarcode} />
            <DetailRow label={td.pubBrandLabel} value={brandName} />
            <DetailRow label={td.pubStoreLabel}   value={storeQuery || '—'} />
            <DetailRow label={td.pubPriceLabel}   value={`$${typeof pub.price === 'number' ? pub.price.toLocaleString('es-CO') : pub.price || '—'}`} />
            <DetailRow label={td.pubAuthorLabel}  value={authorName} />
            <DetailRow label={td.pubDateLabel}    value={createdAt} />
            <DetailRow label={td.pubConfidenceLabel} value={confidence} />
            <DetailRow label={td.pubDescriptionLabel} value={pub.description || '—'} />
          </div>
        </div>

        {/* Imagen */}
        {pub.photoUrl && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={pub.photoUrl}
              alt={td.pubPhotoAlt}
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '0 0 16px' }} />

        {/* Edición */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>{td.pubVisibilityLabel}</span>
            <select
              value={isActive ? 'visible' : 'hidden'}
              onChange={(e) => setIsActive(e.target.value === 'visible')}
              style={s.filterSelect}
            >
              <option value="visible">{td.pubIsActiveLabel}</option>
              <option value="hidden">{td.pubIsHiddenLabel}</option>
            </select>
          </label>

          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>{td.pubPriceLabel}</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{ ...s.filterSelect, fontFamily: 'inherit' }}
              min={0}
              placeholder={td.pricePlaceholder}
            />
          </label>

          {/* Producto */}
          <div style={s.filterLabelWrap}>
            <span style={s.filterLabel}>Producto</span>
            <div style={{ position: 'relative' }}>
              <input
                value={productQuery}
                onChange={(e) => { setProductQuery(e.target.value); setProductId(null); }}
                style={{ ...s.filterSelect, fontFamily: 'inherit' }}
                placeholder="Buscar producto..."
              />
              {searchingProduct && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: MUTED }}>...</span>}
              {productResults.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  {productResults.map(pr => (
                    <button key={pr.id} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: TEXT, cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${BORDER}` }}
                      onClick={() => { setProductId(pr.id); setProductQuery(pr.name); setProductResults([]); }}>
                      <strong>{pr.name}</strong>
                      {pr.brand?.name && <span style={{ color: MUTED, marginLeft: 6 }}>— {pr.brand.name}</span>}
                      {pr.barcode && <span style={{ color: MUTED, marginLeft: 6, fontSize: 11 }}>{pr.barcode}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {productId && <span style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ ID: {productId}</span>}
          </div>

          {/* Tienda */}
          <div style={s.filterLabelWrap}>
            <span style={s.filterLabel}>Tienda</span>
            <div style={{ position: 'relative' }}>
              <input
                value={storeQuery}
                onChange={(e) => { setStoreQuery(e.target.value); setStoreId(null); }}
                style={{ ...s.filterSelect, fontFamily: 'inherit' }}
                placeholder="Buscar tienda..."
              />
              {searchingStore && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: MUTED }}>...</span>}
              {storeResults.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  {storeResults.map(sr => (
                    <button key={sr.id} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: TEXT, cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${BORDER}` }}
                      onClick={() => { setStoreId(sr.id); setStoreQuery(sr.name); setStoreResults([]); }}>
                      <strong>{sr.name}</strong>
                      {sr.address && <span style={{ color: MUTED, marginLeft: 6, fontSize: 11 }}>{sr.address}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {storeId && <span style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ ID: {storeId}</span>}
          </div>

          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>URL de foto</span>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              style={{ ...s.filterSelect, fontFamily: 'inherit' }}
              placeholder="https://..."
            />
          </label>

          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>{td.pubDescriptionLabel}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ ...s.filterSelect, fontFamily: 'inherit', resize: 'vertical' }}
              placeholder={td.descriptionPlaceholder}
            />
          </label>
        </div>

        {saved && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>
            ✓ {td.pubSavedOk}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 10 }}>
          <button onClick={onDelete} style={s.btnDelete}>{td.deletePublicationBtn}</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={s.btnDismiss}>{td.cancel}</button>
            <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving}>
              {saving ? '...' : td.savePubBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────
const EMPTY_LABELS = {};
function SummaryCard({ title, counts, labels = EMPTY_LABELS }) {
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
  const canHideTarget = ['publication', 'store', 'product', 'brand', 'comment'].includes(String(report.reportedType || '').toLowerCase());
  return (
    <article style={s.reportCard}>
      <div style={s.reportTop} className="admin-report-top">
        <span style={{ ...s.severityBadge, background: sev.bg, color: sev.text }}>
          {severityLabel}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600 }}>{typeLabel}</span>
        <span style={s.statusPill}>{statusLabel}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: MUTED }}>{report.time}</span>
      </div>
      <div className="admin-report-info-rows" style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {[
          [td.labelReportedType, report.targetLabel || getReportTargetTypeLabel(report.reportedType, td)],
          [td.labelReportedItem, `"${report.post ?? td.deletedPub}"`],
          [td.labelReportedBy,    report.reporter ?? td.anonymous],
          [td.labelReportedUser,  report.reported ?? td.unknown],
          [td.labelElementId, report.reportedId || '—'],
        ].map(([label, value]) => (
          <div key={label} style={{ display: 'flex', gap: 12, fontSize: 14 }}>
            <span style={{ color: MUTED, width: 150, flexShrink: 0 }}>{label}</span>
            <span style={{ color: TEXT }}>{value}</span>
          </div>
        ))}

        {report.publicationSummary && (
          <div style={{ marginTop: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-surface)', border: `1px solid ${BORDER}` }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {td.labelReportedPub}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              {[
                [td.colBrand,  report.publicationSummary.brand],
                [td.colStore,  report.publicationSummary.store],
                [td.colUnit,   report.publicationSummary.unit],
                [td.colPrice,  report.publicationSummary.price],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 6, fontSize: 13 }}>
                  <span style={{ color: MUTED, flexShrink: 0 }}>{label}:</span>
                  <span style={{ color: TEXT, fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button style={s.filterBtn} onClick={onOpenDetails} title={td.viewReportDetailBtn}>{td.viewReportDetailBtn}</button>
        {showActions && (
          <>
            {canHideTarget && (
              <button style={s.btnDelete} onClick={() => onResolve(report, 'hide')} title={td.hideContentTitle}>
                {td.hideContentBtn}
              </button>
            )}
            {report.reportedUserId && (
              <button style={s.btnBan} onClick={() => onResolve(report, 'ban')} title={td.banUserBtn}>
                {td.banUserBtn}
              </button>
            )}
            <button style={s.btnDismiss} onClick={() => onResolve(report, 'reject')} title={td.dismissBtn}>
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
  const [status, setStatus] = useState(() => normalizeReportStatus(report.status));
  const [actionTaken, setActionTaken] = useState(report.actionTaken || '');
  const [modNotes, setModNotes] = useState(report.modNotes || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pub, setPub] = useState(report.publicationSummary || null);
  const [pubDeleted, setPubDeleted] = useState(false);

  // Si no hay publicationSummary (publicación oculta/inactiva), intentar fetch directo
  useEffect(() => {
    if (pub || !report.publicationId) return;
    supabase
      .from('price_publications')
      .select('id, price, is_active, products(name, base_quantity, brand:brands(name), unit_type:unit_types(name, abbreviation)), store:stores(name)')
      .eq('id', report.publicationId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const quantity = data.products?.base_quantity;
          const unitAbbr = data.products?.unit_type?.abbreviation || data.products?.unit_type?.name;
          setPub({
            productName: data.products?.name || '—',
            brand: data.products?.brand?.name || '—',
            unit: quantity && unitAbbr ? `${quantity} ${unitAbbr}` : '—',
            store: data.store?.name || '—',
            price: typeof data.price === 'number'
              ? data.price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })
              : '—',
            isActive: data.is_active,
          });
          if (data.is_active === false) setPubDeleted(true);
        } else {
          setPubDeleted(true);
        }
      });
  }, [pub, report.publicationId]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await onSave({ status, actionTaken, modNotes });
    setSaving(false);
    setSaved(true);
  };

  const sev = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.baja;
  const typeLabel = td.reportTypes?.[report.rawType] || report.rawType || '—';
  const severityLabel = td.severityLabels?.[report.severity] || report.severity?.toUpperCase() || '—';

  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.reportDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>{typeof td.reportDetailSubtitle === 'function' ? td.reportDetailSubtitle(report.id) : `ID: ${report.id}`}</p>
          </div>
          <button onClick={onClose} title={td.cancel} aria-label={td.cancel} style={CLOSE_BTN_STYLE}>✕</button>
        </div>

        {/* Badges de tipo, severidad y estado */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <span style={{ ...s.severityBadge, background: sev.bg, color: sev.text }}>{severityLabel}</span>
          <span style={{ ...s.badge, background: 'var(--info-soft)', color: 'var(--text-secondary)' }}>{typeLabel}</span>
          <span style={s.statusPill}>{td.statusLabels?.[normalizeReportStatus(report.status)] || report.status}</span>
        </div>

        {/* Info del reporte */}
        <div style={{ ...s.section, marginBottom: 16 }}>
          <div style={{ ...s.sectionHead, marginBottom: 10 }}>
            <span style={s.sectionTitle}>{td.reportInfoTitle}</span>
          </div>
          <div style={s.detailGrid}>
            <DetailRow label={td.labelReason} value={typeLabel} />
            <DetailRow label={td.labelReportedBy} value={report.reporter || td.anonymous} />
            <DetailRow label={td.labelReportedUser} value={report.reported || td.unknown} />
            <DetailRow label={td.labelReportDate} value={report.createdAt ? new Date(report.createdAt).toLocaleString('es-CO') : '—'} />
            {report.resolvedAt && <DetailRow label={td.labelResolvedDate} value={new Date(report.resolvedAt).toLocaleString('es-CO')} />}
            {report.reviewer && <DetailRow label={td.labelReviewedBy} value={report.reviewer} />}
          </div>
        </div>

        {/* Descripción del reporte */}
        {report.description && (
          <div style={{ ...s.section, marginBottom: 16 }}>
            <div style={{ ...s.sectionHead, marginBottom: 8 }}>
              <span style={s.sectionTitle}>{td.labelDescription}</span>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: TEXT, lineHeight: 1.5, background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 8, border: `1px solid ${BORDER}` }}>
              {report.description}
            </p>
          </div>
        )}

        {/* Publicación relacionada */}
        {(pub || (report.publicationId && pubDeleted)) && (
          <div style={{ ...s.section, marginBottom: 16 }}>
            <div style={{ ...s.sectionHead, marginBottom: 10 }}>
              <span style={s.sectionTitle}>{td.labelReportedPub}</span>
              {pubDeleted && (
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--error-soft)', color: 'var(--error)', borderRadius: 4, padding: '2px 8px' }}>
                  {pub ? td.pubDeactivated : td.pubDeletedLabel}
                </span>
              )}
            </div>
            {pub ? (
              <div style={s.detailGrid}>
                <DetailRow label={td.colProduct} value={pub.productName} />
                <DetailRow label={td.colBrand} value={pub.brand} />
                <DetailRow label={td.colUnit} value={pub.unit} />
                <DetailRow label={td.colStore} value={pub.store} />
                <DetailRow label={td.colPrice} value={pub.price} />
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: MUTED }}>
                {td.pubHiddenCompletely(report.publicationId)}
              </p>
            )}
          </div>
        )}

        {/* Imagen de evidencia */}
        {report.evidenceUrl && (
          <div style={{ ...s.section, marginBottom: 16 }}>
            <div style={{ ...s.sectionHead, marginBottom: 10 }}>
              <span style={s.sectionTitle}>{td.labelEvidence}</span>
            </div>
            <img
              src={report.evidenceUrl}
              alt={td.evidenceAlt}
              style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <a href={report.evidenceUrl} target="_blank" rel="noreferrer" style={{ ...s.linkBtn, display: 'block', marginTop: 6, fontSize: 12 }}>
              {td.viewOriginalImage}
            </a>
          </div>
        )}

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '16px 0' }} />

        {/* Campos editables */}
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
          <textarea
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            placeholder={td.actionTakenPlaceholder}
            style={s.modalTextarea}
            rows={3}
          />
        </label>

        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>{td.labelModNotes}</span>
          <textarea
            value={modNotes}
            onChange={(e) => setModNotes(e.target.value)}
            placeholder={td.modNotesPlaceholder}
            style={s.modalTextarea}
            rows={3}
          />
        </label>

        {saved && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>
            ✓ {td.reportSavedOk}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={s.btnDismiss}>{td.cancel}</button>
          <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving}>
            {saving ? '...' : td.saveReportBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

function StoreDetailModal({ store, onClose, onDelete, isDeleting, onSave }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [name, setName]           = useState(store.name || '');
  const [storeTypeId, setStoreTypeId] = useState(String(store.store_type_id || '1'));
  const [address, setAddress]     = useState(store.address || '');
  const [websiteUrl, setWebsiteUrl] = useState(store.website_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const isPhysical = storeTypeId === '1';

  const save = async () => {
    if (!name.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    setSaved(false);
    const updates = { name: name.trim(), store_type_id: Number(storeTypeId) };
    if (isPhysical) updates.address = address.trim() || null;
    else updates.website_url = websiteUrl.trim() || null;
    const ok = await onSave(store.id, updates);
    setSaving(false);
    if (ok !== false) setSaved(true);
  };
  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.storeDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>ID: {store.id}</p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>✕</button>
        </div>

        <div style={s.detailGrid}>
          <DetailRow label={td.labelName} value={store.name || '—'} />
          <DetailRow label={td.labelType} value={store.typeLabel || '—'} />
          <DetailRow label={td.labelAddress} value={store.address || '—'} />
          <DetailRow label={td.labelWeb} value={store.website_url || '—'} />
          <DetailRow label={td.labelCreatedAt} value={store.created_at ? new Date(store.created_at).toLocaleString('es-CO') : '—'} />
          <DetailRow label={td.labelRelatedPubs} value={store.relatedCount ?? 0} />
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '12px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Nombre de la tienda" />
          </label>

          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>Tipo</span>
            <select value={storeTypeId} onChange={(e) => setStoreTypeId(e.target.value)} style={s.filterSelect}>
              <option value="1">Física</option>
              <option value="2">Virtual</option>
            </select>
          </label>

          {isPhysical ? (
            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Dirección</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Dirección física" />
            </label>
          ) : (
            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Sitio web</span>
              <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="https://..." />
            </label>
          )}
        </div>

        {saved && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>✓ Guardado correctamente</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
          <button onClick={onDelete} style={s.btnDelete} disabled={isDeleting}>
            {isDeleting ? td.hidingBtn : td.hideStoreBtn}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={s.btnDismiss}>Cerrar</button>
            <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving}>
              {saving ? '...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandDetailModal({ brand, onClose, onDelete, isDeleting, onSave }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [name, setName] = useState(brand.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const save = async () => {
    if (!name.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    setSaved(false);
    const ok = await onSave(brand.id, { name: name.trim() });
    setSaving(false);
    if (ok !== false) setSaved(true);
  };
  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.brandDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>ID: {brand.id}</p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>✕</button>
        </div>
        <div style={s.detailGrid}>
          <DetailRow label={td.colProduct} value={brand.productName || '—'} />
          <DetailRow label={td.colBarcode} value={brand.productBarcode || td.noCode} />
          <DetailRow label={td.colBrand} value={brand.name || '—'} />
          <DetailRow label={td.labelAssociatedProducts} value={brand.productsCount ?? 0} />
          <DetailRow label={td.labelCreatedAt} value={brand.created_at ? new Date(brand.created_at).toLocaleString('es-CO') : '—'} />
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '12px 0' }} />

        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>Nombre de la marca</span>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Nombre de la marca" />
        </label>

        {saved && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>✓ Guardado correctamente</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
          <button onClick={onDelete} style={s.btnDelete} disabled={isDeleting}>
            {isDeleting ? td.hidingBtn : td.hideBrandBtn}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={s.btnDismiss}>Cerrar</button>
            <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving}>
              {saving ? '...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetailModal({ product, onClose, onDelete, isDeleting, onSave }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [name, setName]             = useState(product?.name || '');
  const [barcode, setBarcode]       = useState(product?.barcode || '');
  const [baseQuantity, setBaseQuantity] = useState(product?.base_quantity ?? '');
  const [brandId, setBrandId]       = useState(product?.brand?.id ?? '');
  const [unitTypeId, setUnitTypeId] = useState(product?.unit?.id ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '');

  const [categories, setCategories] = useState([]);
  const [unitTypes, setUnitTypes]   = useState([]);
  const [brands, setBrands]         = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('product_categories').select('id, name').order('name'),
      supabase.from('unit_types').select('id, name, abbreviation').order('name'),
      supabase.from('brands').select('id, name').order('name').limit(300),
    ]).then(([cats, units, brnds]) => {
      setCategories(cats.data || []);
      setUnitTypes(units.data || []);
      setBrands(brnds.data || []);
      setLoadingMeta(false);
    });
  }, []);

  const save = async () => {
    if (!name.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    setSaved(false);
    const updates = { name: name.trim(), barcode: barcode.trim() || null };
    if (baseQuantity !== '') updates.base_quantity = Number(baseQuantity);
    if (brandId !== '') updates.brand_id = Number(brandId);
    if (unitTypeId !== '') updates.unit_type_id = Number(unitTypeId);
    if (categoryId !== '') updates.category_id = Number(categoryId);
    const ok = await onSave(product.id, updates);
    setSaving(false);
    if (ok !== false) setSaved(true);
  };

  const quantity = product?.base_quantity != null && product?.unit?.abbreviation
    ? `${product.base_quantity} ${product.unit.abbreviation}`
    : product?.base_quantity != null && product?.unit?.name
      ? `${product.base_quantity} ${product.unit.name}`
      : product?.base_quantity ?? '—';

  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.productDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>ID: {product.id}</p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>✕</button>
        </div>

        <div style={s.detailGrid}>
          <DetailRow label={td.colProduct} value={product?.name || '—'} />
          <DetailRow label={td.colBrand} value={product?.brand?.name || td.noBrand} />
          <DetailRow label={td.colBarcode} value={product?.barcode || td.noCode} />
          <DetailRow label={td.labelBaseQuantity} value={quantity} />
          <DetailRow label={td.labelCreatedAtProduct} value={product?.created_at ? new Date(product.created_at).toLocaleString('es-CO') : '—'} />
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '12px 0' }} />

        {loadingMeta ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: MUTED, fontSize: 13 }}>Cargando opciones...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Nombre del producto</span>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Nombre del producto" />
            </label>

            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Código de barras</span>
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Código de barras (opcional)" />
            </label>

            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Marca</span>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={s.filterSelect}>
                <option value="">Sin marca</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>

            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Categoría</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={s.filterSelect}>
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ ...s.filterLabelWrap, flex: 1 }}>
                <span style={s.filterLabel}>Cantidad base</span>
                <input type="number" value={baseQuantity} onChange={(e) => setBaseQuantity(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} min={0} placeholder="Ej: 500" />
              </label>
              <label style={{ ...s.filterLabelWrap, flex: 1 }}>
                <span style={s.filterLabel}>Unidad</span>
                <select value={unitTypeId} onChange={(e) => setUnitTypeId(e.target.value)} style={s.filterSelect}>
                  <option value="">Sin unidad</option>
                  {unitTypes.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                </select>
              </label>
            </div>
          </div>
        )}

        {saved && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>✓ Guardado correctamente</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
          <button onClick={onDelete} style={s.btnDelete} disabled={isDeleting}>
            {isDeleting ? td.hidingBtn : td.hideProductBtn}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={s.btnDismiss}>Cerrar</button>
            <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving || loadingMeta}>
              {saving ? '...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnpublishedResourcesTable({
  stores,
  products,
  onViewStore,
  onDeleteStore,
  onViewProduct,
  onDeleteProduct,
  deletingStoreId,
  deletingProductId,
}) {
  const { t } = useLanguage();
  const td = t.adminDashboard;

  if ((!stores || stores.length === 0) && (!products || products.length === 0)) {
    return <EmptyMsg text={td.noUnpublishedResources} />;
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={s.table}>
        <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 1fr 1fr' }}>
          {[td.colUnpublishedStores, td.labelType, td.colActions].map((h) => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {(stores || []).length === 0 ? (
          <div style={{ padding: '14px 20px', color: MUTED, fontSize: 13 }}>{td.noUnpublishedStores}</div>
        ) : (
          (stores || []).map((store) => (
            <div key={store.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1fr 1fr' }}>
              <div style={s.td}>
                <div>
                  <div style={s.rowName}>{store.name || '—'}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{store.address || td.noAddress}</div>
                </div>
              </div>
              <div style={{ ...s.td, fontSize: 13, color: MUTED }}>{store.typeLabel || '—'}</div>
              <div style={{ ...s.td, gap: 6 }}>
                <button style={{ ...s.filterBtn, padding: '5px 10px', fontSize: 12 }} onClick={() => onViewStore(store)}>
                  {td.viewDetailBtn}
                </button>
                <button
                  style={s.btnDelete}
                  onClick={() => onDeleteStore(store)}
                  disabled={deletingStoreId === store.id}
                >
                  {deletingStoreId === store.id ? '...' : td.hideBtn}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={s.table}>
        <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 1fr 1fr' }}>
          {[td.colUnpublishedProducts, td.colBrand, td.colActions].map((h) => (
            <div key={h} style={s.th}>{h}</div>
          ))}
        </div>
        {(products || []).length === 0 ? (
          <div style={{ padding: '14px 20px', color: MUTED, fontSize: 13 }}>{td.noUnpublishedProducts}</div>
        ) : (
          (products || []).map((product) => (
            <div key={product.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1fr 1fr' }}>
              <div style={s.td}>
                <div>
                  <div style={s.rowName}>{product.name || '—'}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{td.colBarcode}: {product.barcode || td.noCode}</div>
                </div>
              </div>
              <div style={{ ...s.td, fontSize: 13, color: MUTED }}>{product.brand?.name || td.noBrand}</div>
              <div style={{ ...s.td, gap: 6 }}>
                <button style={{ ...s.filterBtn, padding: '5px 10px', fontSize: 12 }} onClick={() => onViewProduct(product)}>
                  {td.viewDetailBtn}
                </button>
                <button
                  style={s.btnDelete}
                  onClick={() => onDeleteProduct(product)}
                  disabled={deletingProductId === product.id}
                >
                  {deletingProductId === product.id ? '...' : td.hideBtn}
                </button>
              </div>
            </div>
          ))
        )}
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
    active:   { bg: 'var(--success-soft)', color: 'var(--success)', label: td.pubStatusActive },
    hidden:   { bg: 'var(--error-soft)', color: 'var(--error)', label: td.pubHiddenStatus },
    pending:  { bg: 'var(--warning-soft)', color: 'var(--warning)', label: td.pubStatusPending },
    rejected: { bg: 'var(--error-soft)', color: 'var(--error)', label: td.pubStatusRejected },
    expired:  { bg: 'var(--info-soft)', color: 'var(--text-muted)', label: td.pubStatusExpired },
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
      background: 'var(--error-soft)',
      border: '1px solid rgba(248,113,113,0.25)',
      color: 'var(--error)',
      fontSize: 13,
      marginBottom: 20,
    }}>
      ⚠️ {msg}
      <button onClick={onRetry} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', textDecoration: 'underline', marginLeft: 12, fontWeight: 600 }}>
        {td.retry}
      </button>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const CLOSE_BTN_STYLE = { flexShrink: 0, background: 'var(--bg-elevated)', border: '2px solid var(--border)', borderRadius: '50%', width: 34, height: 34, fontSize: 18, fontWeight: 800, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 };
const ACCENT  = 'var(--accent)';
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
  navBadge:   { marginLeft: 'auto', background: 'var(--error)', color: 'var(--text-primary)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },

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
  roleSelect:{ background: 'var(--bg-elevated)', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 6, padding: '5px 8px', fontSize: 12, cursor: 'pointer', width: '100%', maxWidth: '100%', boxSizing: 'border-box' },
  badge:     { fontSize: 12, fontWeight: 600, borderRadius: 6, padding: '3px 10px', textTransform: 'capitalize' },
  actionBtn: { background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: '5px 12px', fontSize: 13, cursor: 'pointer' },
  actionBtnDanger: { borderColor: 'var(--error)', color: 'var(--error)' },

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

  modalOverlay: { position: 'fixed', inset: 0, background: 'var(--overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: 16 },
  modalCard: { width: 720, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 20 },
  detailGrid: { display: 'grid', gap: 10, marginBottom: 14 },
  detailRow: { display: 'grid', gridTemplateColumns: '150px 1fr', gap: 10, fontSize: 13 },
  detailLabel: { color: MUTED },
  modalTextarea: { width: '100%', background: 'var(--bg-elevated)', border: `1px solid ${BORDER}`, color: TEXT, borderRadius: 8, padding: 10, fontSize: 13, resize: 'vertical' },


  btnDelete:  { background: 'var(--error-soft)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: 7, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  btnBan:     { background: 'var(--warning-soft)', border: '1px solid var(--warning)', color: 'var(--warning)', borderRadius: 7, padding: '7px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500 },
  btnDismiss: { background: 'none', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 7, padding: '7px 14px', fontSize: 13, cursor: 'pointer' },

  configCard: { background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' },
  configRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${BORDER}` },
  configParam:{ fontSize: 14, fontWeight: 500, color: TEXT },
  configNote: { fontSize: 12, color: MUTED, marginTop: 2 },
  configValue:{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.5px' },
};
