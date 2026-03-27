/**
 * AdminDashboard.jsx
 *
 * Panel de control total del Admin de NØSEE.
 * Gestión de usuarios, cambio de roles, estadísticas del sistema,
 * moderación de publicaciones, revisión de reportes y configuración.
 *
 * UBICACIÓN: src/features/dashboard/admin/AdminDashboard.jsx
 */
import { useState, useEffect, useRef } from 'react';
import { changeUserRole, getAdminReports, getAllUsers, updateReportReview, updateUserStatus } from '@/services/api/users.api';
import { insertActionLog, getActionLogs, getLoginLogs, getUserActivityLogs } from '@/services/api/audit.api';
import { getActionLabel as _getActionLabel, getObjectType as _getObjectType, getObjectInfo as _getObjectInfo, getDescription as _getDescription, parseBrowser as _parseBrowser, getActionCategory } from '@/features/dashboard/admin/logHelpers';
import { supabase } from '@/services/supabase.client';
import { UserRoleEnum } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Styles ───────────────────────────────────────────────────────────────────
import { s, ACCENT, BG, SURFACE, BORDER, TEXT, MUTED } from './adminStyles';

// ─── Constants & helpers ──────────────────────────────────────────────────────
import {
  REPORT_SEVERITY,
  SEVERITY_COLORS,
  DEFAULT_REPUTATION_PARAMS,
  LS_KEY,
  ALL_ROLES,
  REPORT_STATUS_OPTIONS,
  REPORT_REASON_LABELS,
  getReportTargetTypeLabel,
  getReportTargetDisplay,
  formatPublicationSummary,
  normalizePublicationForAdmin,
  isPublicationVisible,
  isPublicationHidden,
  normalizeReportStatus,
} from './adminConstants';

// ─── UI Primitives ────────────────────────────────────────────────────────────
import { DetailRow, SectionHeader, StatusBadge, LoadingState, EmptyMsg, ErrorBar } from './components/AdminPrimitives';

// ─── Cards & components ───────────────────────────────────────────────────────
import { ReportCard } from './components/ReportCard';
import { SummaryCard } from './components/SummaryCard';

// ─── Tables ───────────────────────────────────────────────────────────────────
import { UsersTable } from './tables/UsersTable';
import { PublicationsTable } from './tables/PublicationsTable';
import { UnpublishedResourcesTable } from './tables/UnpublishedResourcesTable';
import { DealerApplicationsTable } from './tables/DealerApplicationsTable';
import { getApplications } from '@/services/api/dealerApplications.api';

// ─── Modals ───────────────────────────────────────────────────────────────────
import { BanModal } from './modals/BanModal';
import { StoreDetailModal } from './modals/StoreDetailModal';
import { BrandDetailModal } from './modals/BrandDetailModal';
import { ProductDetailModal } from './modals/ProductDetailModal';
import { PublicationDetailModal } from './modals/PublicationDetailModal';
import { ReportDetailsModal } from './modals/ReportDetailsModal';

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

  // Solicitudes de repartidor
  const [applications,        setApplications]        = useState([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsLoaded,  setApplicationsLoaded]  = useState(false);

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
  const loadReportsRef = useRef(null);
  const loadUnpublishedResourcesRef = useRef(null);

  // ─── Cargar usuarios al montar ────────────────────────────────────────────
  // Carga inicial una sola vez al montar.
  useEffect(() => {
    loadUsers();
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar datos de sección cuando se activa (lazy loading)
  useEffect(() => {
    if (activeSection === 'content'  && !pubsLoaded)     loadPublications();
    if (activeSection === 'content'  && pubFilter === 'unpublished' && !unpublishedLoaded && !unpublishedLoading) loadUnpublishedResourcesRef.current?.();
    if (activeSection === 'reports'  && !reportsLoaded)  loadReportsRef.current?.();
    if (activeSection === 'config'   && !catsLoaded)     loadCategories();
    if (activeSection === 'logs'     && !logsLoaded)     loadLogs();
    if (activeSection === 'dealers'  && !applicationsLoaded) loadApplications();
  }, [activeSection, pubFilter, pubsLoaded, unpublishedLoaded, unpublishedLoading, reportsLoaded, catsLoaded, logsLoaded, applicationsLoaded]);

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
  }, [activeSection]);

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

  async function loadUnpublishedResources() {
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
  }
  loadUnpublishedResourcesRef.current = loadUnpublishedResources;

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
  async function loadReports() {
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
  }
  loadReportsRef.current = loadReports;

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

  const loadApplications = async () => {
    setApplicationsLoading(true);
    const { success, data } = await getApplications();
    if (success) setApplications(data);
    setApplicationsLoading(false);
    setApplicationsLoaded(true);
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
            { key: 'dealers',  icon: '🛵', label: 'Repartidores', badge: applications.filter(a => a.status === 'pending').length || null },
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

      {/* ── Solicitudes de Repartidor ──────────────────────────────────── */}
      {activeSection === 'dealers' && (
        <main style={s.main} className="admin-main">
          <div style={s.section}>
            <div style={s.sectionHead}>
              <span style={s.sectionTitle}>🛵 Solicitudes de Repartidor</span>
            </div>
            {applicationsLoading ? (
              <Spinner />
            ) : (
              <DealerApplicationsTable
                applications={applications}
                onReviewed={() => { setApplicationsLoaded(false); loadApplications(); }}
              />
            )}
          </div>
        </main>
      )}

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
