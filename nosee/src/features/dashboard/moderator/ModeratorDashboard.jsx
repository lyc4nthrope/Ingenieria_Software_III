/**
 * ModeratorDashboard.jsx
 *
 * Dashboard del moderador de NØSEE.
 * Vista de usuario + controles de moderación de reportes.
 */
import { useState, useEffect } from "react";
import { supabase } from "@/services/supabase.client";
import { useLanguage } from "@/contexts/LanguageContext";
import { updateReportReview } from "@/services/api/users.api";
import { insertActionLog, getActionLogs } from "@/services/api/audit.api";

const REPORT_SEVERITY = {
  offensive: "alta",
  spam: "media",
  fake_price: "media",
  wrong_photo: "baja",
};

const SEVERITY_COLORS = {
  alta: { bg: "#F8717118", text: "var(--error)" },
  media: { bg: "#FCD34D18", text: "var(--warning)" },
  baja: { bg: "#60A5FA18", text: "#60A5FA" },
};

const REPORT_STATUS_OPTIONS = ["PENDING", "IN_REVIEW", "RESOLVED", "REJECTED"];

const normalizeReportStatus = (status) =>
  String(status || "PENDING").toUpperCase();

export default function ModeratorDashboard() {
  const { t } = useLanguage();
  const td = t.moderatorDashboard || {};

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reportes");
  const [resolved, setResolved] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionModal, setActionModal] = useState(null); // { report, action }
  const [toast, setToast] = useState(null); // { message, type }

  const [historialLogs, setHistorialLogs] = useState([]);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [historialLoaded, setHistorialLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchReports = async () => {
    setLoading(true);

    try {
      const { data: rawReports, error } = await supabase
        .from("reports")
        .select(
          "id, reason, description, created_at, publication_id, reporter_user_id, status"
        )
        .in("status", ["pending", "PENDING", "in_review", "IN_REVIEW"])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching reports:", error);
        setLoading(false);
        return;
      }

      if (!rawReports?.length) {
        setReports([]);
        setLoading(false);
        return;
      }

      const pubIds = [
        ...new Set(rawReports.map((r) => r.publication_id).filter(Boolean)),
      ];
      const { data: publications } = await supabase
        .from("price_publications")
        .select(
          "id, user_id, products(name), author:users!price_publications_user_id_fkey(full_name)"
        )
        .in("id", pubIds);

      const reporterIds = [
        ...new Set(rawReports.map((r) => r.reporter_user_id).filter(Boolean)),
      ];
      const { data: reporters } = await supabase
        .from("users")
        .select("id, full_name")
        .in("id", reporterIds);

      const pubMap = Object.fromEntries(
        (publications || []).map((p) => [p.id, p])
      );
      const reporterMap = Object.fromEntries(
        (reporters || []).map((u) => [u.id, u])
      );

      const mapped = rawReports.map((r) => {
        const pub = pubMap[r.publication_id];
        const reporter = reporterMap[r.reporter_user_id];
        return {
          id: r.id,
          rawType: r.reason,
          severity: REPORT_SEVERITY[r.reason] || "baja",
          time: new Date(r.created_at).toLocaleDateString("es-CO"),
          createdAt: r.created_at,
          status: normalizeReportStatus(r.status),
          description: r.description || null,
          // evidenceUrl, actionTaken, modNotes se cargan al abrir el modal
          evidenceUrl: null,
          actionTaken: null,
          modNotes: null,
          post: pub?.products?.name || null,
          reporter: reporter?.full_name || null,
          reported: pub?.author?.full_name || null,
          publicationId: r.publication_id,
          reportedUserId: pub?.user_id,
        };
      });

      setReports(mapped);
    } catch (err) {
      console.error("Error in fetchReports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data?.user?.id || null);
    });
  }, []);

  useEffect(() => {
    if (activeTab === "historial" && !historialLoaded && currentUserId) {
      loadHistorial();
    }
  }, [activeTab, historialLoaded, currentUserId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadHistorial = async () => {
    setHistorialLoading(true);
    const { data } = await getActionLogs({ actorId: currentUserId, limit: 100 });
    setHistorialLogs(data || []);
    setHistorialLoading(false);
    setHistorialLoaded(true);
  };

  const openDetail = async (report) => {
    setSelectedReport(report);
    // Carga lazy: campos del reporte + detalles de la publicación
    try {
      const [{ data: reportData }, { data: pubData }] = await Promise.all([
        supabase
          .from("reports")
          .select("evidence_url, mod_notes, action_taken")
          .eq("id", report.id)
          .single(),
        report.publicationId
          ? supabase
              .from("price_publications")
              .select(
                "id, price, products(name, base_quantity, brand:brands(name), unit_type:unit_types(name, abbreviation)), store:stores(name)"
              )
              .eq("id", report.publicationId)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      let publicationSummary = null;
      if (pubData) {
        const quantity = pubData.products?.base_quantity;
        const unitAbbr = pubData.products?.unit_type?.abbreviation || pubData.products?.unit_type?.name;
        publicationSummary = {
          productName: pubData.products?.name || "—",
          brand: pubData.products?.brand?.name || "—",
          unit: quantity && unitAbbr ? `${quantity} ${unitAbbr}` : "—",
          store: pubData.store?.name || "—",
          price:
            typeof pubData.price === "number"
              ? pubData.price.toLocaleString("es-CO", { style: "currency", currency: "COP" })
              : "—",
        };
      }

      setSelectedReport((prev) =>
        prev?.id === report.id
          ? {
              ...prev,
              evidenceUrl: reportData?.evidence_url || null,
              actionTaken: reportData?.action_taken || null,
              modNotes: reportData?.mod_notes || null,
              publicationSummary,
            }
          : prev
      );
    } catch {
      // Si falla, el modal funciona sin estos campos extra
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
      resolved_at: ["RESOLVED", "REJECTED"].includes(nextStatus)
        ? new Date().toISOString()
        : null,
    };

    const result = await updateReportReview(report.id, payload);
    if (!result.success) {
      alert(td.errorUpdateReport || "Error al actualizar el reporte");
      return false;
    }

    if (["RESOLVED", "REJECTED"].includes(nextStatus)) {
      setReports((prev) => prev.filter((item) => item.id !== report.id));
      setResolved((prev) => [...prev, { id: report.id, action: nextStatus }]);
    } else {
      setReports((prev) =>
        prev.map((item) =>
          item.id === report.id
            ? { ...item, status: nextStatus, modNotes: payload.mod_notes, actionTaken: payload.action_taken }
            : item
        )
      );
    }

    return true;
  };

  const handleResolve = async (action, report, notes = "") => {
    try {
      if (action === "baneado" && report.reportedUserId) {
        const { data: targetUser } = await supabase
          .from("users")
          .select("role_id")
          .eq("id", report.reportedUserId)
          .single();
        if (targetUser?.role_id >= 2) {
          showToast("No puedes banear a un moderador o administrador. Solo el administrador puede realizar esta acción.", "error");
          return;
        }
        const { error: banUserError } = await supabase
          .from("users")
          .update({ is_active: false })
          .eq("id", report.reportedUserId);
        if (banUserError) {
          showToast("Error al banear el usuario reportado.", "error");
          return;
        }

        const { error: hidePublicationsError } = await supabase
          .from("price_publications")
          .update({ is_active: false })
          .eq("user_id", report.reportedUserId)
          .eq("is_active", true);
        if (hidePublicationsError) {
          showToast("Usuario baneado, pero falló ocultar sus publicaciones.", "error");
        }
      }
      if (action === "eliminar_publicacion" && report.publicationId) {
        const { error } = await supabase.rpc("deactivate_publication", {
          pub_id: report.publicationId,
        });
        if (error) {
          const { error: fallbackError } = await supabase
            .from("price_publications")
            .update({ is_active: false })
            .eq("id", report.publicationId)
            .eq("is_active", true);
          if (fallbackError) {
            showToast("Error al desactivar la publicación", "error");
            return;
          }
        }
      }
      const nextStatus = action === "descartado" ? "REJECTED" : "RESOLVED";
      const ok = await updateReportData(report, {
        status: nextStatus,
        modNotes: notes || report.modNotes,
        actionTaken: action === "eliminar_publicacion" ? "Publicación desactivada por moderador" : report.actionTaken,
      });
      if (ok) {
        const { data: authData } = await supabase.auth.getUser();
        const actorId = authData?.user?.id || null;
        const resourceType = action === "baneado" ? "user" : action === "eliminar_publicacion" ? "publication" : "report";
        const resourceId = action === "baneado" ? report.reportedUserId : action === "eliminar_publicacion" ? report.publicationId : report.id;
        insertActionLog(actorId, resourceType, resourceId, action, notes || null, { reportId: report.id });
        setHistorialLoaded(false); // Fuerza recarga del historial en la próxima visita
        const messages = {
          baneado: "Usuario baneado y reporte resuelto.",
          eliminar_publicacion: "Publicación desactivada y reporte resuelto.",
          descartado: "Reporte descartado.",
        };
        showToast(messages[action] || "Acción realizada correctamente.");
      }
    } catch (err) {
      console.error("Error resolving report:", err);
      showToast("Ocurrió un error al procesar la acción.", "error");
    }
  };

  const pendingCount = reports.length;

  return (
    <div style={st.root} className="dash-root">
      <aside style={st.sidebar} className="dash-sidebar">
        <nav style={st.nav}>
          {[
            {
              key: "reportes",
              icon: "⚑",
              label: td.navReports || "Reportes",
              badge: pendingCount,
            },
            { key: "feed", icon: "◈", label: td.navFeed || "Feed" },
            { key: "historial", icon: "◎", label: td.navHistory || "Logs" },
          ].map((item) => (
            <button
              key={item.key}
              style={{
                ...st.navItem,
                ...(activeTab === item.key ? st.navActive : {}),
              }}
              onClick={() => setActiveTab(item.key)}
            >
              <span style={st.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {!!item.badge && <span style={st.navBadge}>{item.badge}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main style={st.main} className="dash-main">
        {activeTab === "reportes" && (
          <>
            <header style={st.header}>
              <div>
                <h1 style={st.headerTitle}>
                  {td.reportsTitle || "Reportes Pendientes"}
                </h1>
                <p style={st.headerSub}>
                  {pendingCount > 0
                    ? `${pendingCount} reporte${pendingCount > 1 ? "s" : ""} pendiente${pendingCount > 1 ? "s" : ""}`
                    : "Todos resueltos"}
                </p>
              </div>
              <div style={st.resolvedCount}>
                {td.resolvedToday
                  ? td.resolvedToday(resolved.length)
                  : `${resolved.length} resueltos`}
              </div>
            </header>

            {loading ? (
              <div style={st.emptyState}>
                <span style={{ fontSize: 32 }}>⟳</span>
                <p style={{ color: MUTED, marginTop: 8 }}>
                  {td.loadingReports || "Cargando reportes..."}
                </p>
              </div>
            ) : reports.length === 0 ? (
              <EmptyState td={td} />
            ) : (
              <div style={st.reportList}>
                {reports.map((r) => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    onAction={(report, action) => setActionModal({ report, action })}
                    onOpenDetails={() => openDetail(r)}
                    td={td}
                  />
                ))}
              </div>
            )}

            {actionModal && (
              <ActionConfirmModal
                report={actionModal.report}
                action={actionModal.action}
                td={td}
                onClose={() => setActionModal(null)}
                onConfirm={async (notes) => {
                  setActionModal(null);
                  await handleResolve(actionModal.action, actionModal.report, notes);
                }}
              />
            )}

            {selectedReport && (
              <ReportDetailsModal
                report={selectedReport}
                td={td}
                onClose={() => setSelectedReport(null)}
                onSave={async (updates) => {
                  const ok = await updateReportData(selectedReport, updates);
                  if (ok) {
                    setSelectedReport((prev) =>
                      prev
                        ? {
                            ...prev,
                            ...updates,
                            status: normalizeReportStatus(
                              updates.status || prev.status
                            ),
                          }
                        : null
                    );
                  }
                  return ok;
                }}
              />
            )}
          </>
        )}

        {activeTab === "feed" && (
          <div style={st.placeholder}>
            <span style={st.placeholderIcon}>◈</span>
            <h2 style={st.placeholderTitle}>
              {td.feedTitle || "Feed de Moderación"}
            </h2>
            <p style={st.placeholderSub}>
              {td.feedSub || "Vista del feed de la plataforma"}
            </p>
            <div style={st.tag}>{td.comingSoon || "Próximamente"}</div>
          </div>
        )}

        {activeTab === "historial" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: TEXT }}>
                {td.historyTitle || "Historial de acciones"}
              </h1>
              <p style={{ margin: 0, fontSize: 14, color: MUTED }}>
                {td.historySub || "Registro de todas las moderaciones realizadas por este moderador"}
              </p>
            </div>

            {historialLoading ? (
              <p style={{ color: MUTED, fontSize: 14 }}>{td.historyLoading || "Cargando historial..."}</p>
            ) : historialLogs.length === 0 ? (
              <div style={{ ...st.emptyState }}>
                <span style={{ fontSize: 32 }}>◎</span>
                <p style={{ color: MUTED, marginTop: 8 }}>{td.historyEmpty || "Aún no hay acciones registradas"}</p>
              </div>
            ) : (
              <div style={{ background: 'var(--bg-surface)', border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', background: 'var(--bg-elevated)', padding: '10px 16px', gap: 8 }}>
                  {[td.historyColDate || 'Fecha', td.historyColAction || 'Acción', td.historyColResource || 'Recurso', td.historyColReason || 'Motivo'].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                  ))}
                </div>
                {historialLogs.map((log, i) => (
                  <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 1fr', padding: '10px 16px', gap: 8, borderTop: i === 0 ? 'none' : `1px solid ${BORDER}`, fontSize: 13 }}>
                    <div style={{ color: MUTED }}>{new Date(log.created_at).toLocaleString('es-CO')}</div>
                    <div style={{ fontWeight: 600, color: ACCENT }}>{log.action_type}</div>
                    <div style={{ color: TEXT }}>{log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ''}</div>
                    <div style={{ color: MUTED }}>{log.reason || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            background: toast.type === "error" ? "var(--error)" : "var(--success)",
            color: "#0f172a",
            borderRadius: 10,
            padding: "13px 20px",
            fontSize: 14,
            fontWeight: 600,
            boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 360,
          }}
        >
          <span>{toast.type === "error" ? "✕" : "✓"}</span>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({ report, onAction, onOpenDetails, td }) {
  const sev = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.baja;
  const typeLabel = td.reportTypes?.[report.rawType] || report.rawType;
  const severityLabel =
    td.severityLabels?.[report.severity] || report.severity?.toUpperCase();

  return (
    <article style={st.reportCard}>
      <div style={st.reportTop}>
        <span style={{ ...st.severityBadge, background: sev.bg, color: sev.text }}>
          {severityLabel}
        </span>
        <span style={st.reportType}>{typeLabel}</span>
        <span style={st.reportTime}>{report.time}</span>
      </div>

      <div style={st.reportBody}>
        <div style={st.reportRow} className="mod-report-row">
          <span style={st.reportLabel} className="mod-report-label">
            {td.labelPublication || "Publicación"}
          </span>
          <span style={st.reportValue}>
            "{report.post ?? (td.deletedPub || "Publicación eliminada")}"
          </span>
        </div>
        <div style={st.reportRow} className="mod-report-row">
          <span style={st.reportLabel} className="mod-report-label">
            {td.labelReportedBy || "Reportado por"}
          </span>
          <span style={st.reportValue}>
            {report.reporter ?? (td.anonymous || "Anónimo")}
          </span>
        </div>
        <div style={st.reportRow} className="mod-report-row">
          <span style={st.reportLabel} className="mod-report-label">
            {td.labelReportedUser || "Usuario reportado"}
          </span>
          <span style={st.reportValue}>
            {report.reported ?? (td.unknown || "Desconocido")}
          </span>
        </div>
      </div>

      <div style={st.reportActions} className="mod-report-actions">
        <button
          style={st.btnDetail}
          onClick={onOpenDetails}
          title={td.viewReportDetailBtn || "Ver detalle"}
        >
          {td.viewReportDetailBtn || "Ver detalle"}
        </button>
        {/* Solo visible para el admin — oculto para el moderador */}
        {report.publicationId && (
          <button
            style={st.btnDelete}
            onClick={() => onAction(report, "eliminar_publicacion")}
            title={td.deletePublicationBtn || "Eliminar publicación"}
          >
            {td.deletePublicationBtn || "Eliminar publicación"}
          </button>
        )}
        <button
          style={st.btnBan}
          onClick={() => onAction(report, "baneado")}
          title={td.banUserBtn || "Banear usuario"}
        >
          {td.banUserBtn || "Banear usuario"}
        </button>
        <button
          style={st.btnDismiss}
          onClick={() => onAction(report, "descartado")}
          title={td.dismissBtn || "Descartar"}
        >
          {td.dismissBtn || "Descartar"}
        </button>
      </div>
    </article>
  );
}

// ─── ReportDetailsModal ───────────────────────────────────────────────────────
function ReportDetailsModal({ report, td, onClose, onSave }) {
  const [status, setStatus] = useState(normalizeReportStatus(report.status));
  const [actionTaken, setActionTaken] = useState(report.actionTaken || "");
  const [modNotes, setModNotes] = useState(report.modNotes || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    await onSave({ status, actionTaken, modNotes });
    setSaving(false);
    setSaved(true);
  };

  const sev = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.baja;
  const typeLabel = td.reportTypes?.[report.rawType] || report.rawType || "—";
  const severityLabel =
    td.severityLabels?.[report.severity] || report.severity?.toUpperCase() || "—";

  return (
    <div role="button" tabIndex={0} style={st.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div
        role="button"
        tabIndex={0}
        style={{ ...st.modalCard, maxHeight: "90vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 16,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>
              {td.reportDetailTitle || "Detalle de reporte"}
            </h2>
            <p style={{ ...st.headerSub, margin: "4px 0 0" }}>
              {typeof td.reportDetailSubtitle === "function"
                ? td.reportDetailSubtitle(report.id)
                : `ID: ${report.id}`}
            </p>
          </div>
          <button
            onClick={onClose}
            title={td.cancel || "Cancelar"}
            aria-label={td.cancel || "Cancelar"}
            style={CLOSE_BTN_STYLE}
          >
            ✕
          </button>
        </div>

        {/* Badges */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          <span
            style={{
              ...st.severityBadge,
              background: sev.bg,
              color: sev.text,
            }}
          >
            {severityLabel}
          </span>
          <span
            style={{
              ...st.severityBadge,
              background: "var(--info-soft)",
              color: "#94a3b8",
            }}
          >
            {typeLabel}
          </span>
          <span
            style={{
              ...st.severityBadge,
              background: `${ACCENT}18`,
              color: ACCENT,
            }}
          >
            {td.statusLabels?.[normalizeReportStatus(report.status)] ||
              report.status}
          </span>
        </div>

        {/* Info del reporte */}
        <div style={{ ...st.modalSection, marginBottom: 16 }}>
          <div style={st.reportRow}>
            <span style={{ ...st.reportLabel, width: 160 }}>{td.labelReportedBy || "Reportado por"}</span>
            <span style={st.reportValue}>{report.reporter || td.anonymous || "—"}</span>
          </div>
          <div style={st.reportRow}>
            <span style={{ ...st.reportLabel, width: 160 }}>{td.labelReportedUser || "Usuario denunciado"}</span>
            <span style={st.reportValue}>{report.reported || td.unknown || "—"}</span>
          </div>
          <div style={st.reportRow}>
            <span style={{ ...st.reportLabel, width: 160 }}>Fecha</span>
            <span style={st.reportValue}>
              {report.createdAt
                ? new Date(report.createdAt).toLocaleString("es-CO")
                : "—"}
            </span>
          </div>
        </div>

        {/* Descripción */}
        {report.description && (
          <div style={{ ...st.modalSection, marginBottom: 16 }}>
            <p style={st.modalSectionTitle}>
              {td.labelDescription || "Descripción"}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: TEXT,
                lineHeight: 1.5,
                background: "var(--bg-surface)",
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
              }}
            >
              {report.description}
            </p>
          </div>
        )}

        {/* Publicación reportada */}
        {report.publicationSummary && (
          <div style={{ ...st.modalSection, marginBottom: 16 }}>
            <p style={st.modalSectionTitle}>Publicación reportada</p>
            {[
              ["Producto", report.publicationSummary.productName],
              ["Marca",    report.publicationSummary.brand],
              ["Cantidad", report.publicationSummary.unit],
              ["Tienda",   report.publicationSummary.store],
              ["Precio",   report.publicationSummary.price],
            ].map(([label, value]) => (
              <div key={label} style={{ ...st.reportRow, marginBottom: 4 }}>
                <span style={{ ...st.reportLabel, width: 80 }}>{label}</span>
                <span style={{ ...st.reportValue, fontSize: 14 }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Evidencia */}
        {report.evidenceUrl && (
          <div style={{ ...st.modalSection, marginBottom: 16 }}>
            <p style={st.modalSectionTitle}>
              {td.labelEvidence || "Evidencia"}
            </p>
            <img
              src={report.evidenceUrl}
              alt="Evidencia del reporte"
              style={{
                width: "100%",
                maxHeight: 240,
                objectFit: "cover",
                borderRadius: 8,
                border: `1px solid ${BORDER}`,
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}

        <hr
          style={{
            border: "none",
            borderTop: `1px solid ${BORDER}`,
            margin: "16px 0",
          }}
        />

        {/* Campos editables */}
        <label style={st.modalFieldWrap}>
          <span style={st.modalFieldLabel}>
            {td.filterStatusLabel || "Estado"}
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            style={st.modalSelect}
          >
            {REPORT_STATUS_OPTIONS.map((item) => (
              <option key={item} value={item}>
                {td.statusLabels?.[item] || item}
              </option>
            ))}
          </select>
        </label>

        <label style={st.modalFieldWrap}>
          <span style={st.modalFieldLabel}>
            {td.labelActionTaken || "Acción tomada"}
          </span>
          <textarea
            value={actionTaken}
            onChange={(e) => setActionTaken(e.target.value)}
            placeholder="Ej: Publicación eliminada, usuario advertido..."
            style={st.modalTextarea}
            rows={3}
          />
        </label>

        <label style={st.modalFieldWrap}>
          <span style={st.modalFieldLabel}>
            {td.labelModNotes || "Notas del moderador"}
          </span>
          <textarea
            value={modNotes}
            onChange={(e) => setModNotes(e.target.value)}
            placeholder="Notas internas (no visibles al usuario)..."
            style={st.modalTextarea}
            rows={3}
          />
        </label>

        {saved && (
          <p style={{ margin: "8px 0 0", fontSize: 13, color: "var(--success)", textAlign: "right" }}>
            ✓ {td.reportSavedOk || "Revisión guardada correctamente"}
          </p>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            marginTop: 8,
          }}
        >
          <button onClick={onClose} style={st.btnDismiss}>
            {td.cancel || "Cancelar"}
          </button>
          <button
            onClick={save}
            style={st.btnSave}
            disabled={saving}
          >
            {saving ? "..." : td.saveReportBtn || "Guardar revisión"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ActionConfirmModal ────────────────────────────────────────────────────────
function ActionConfirmModal({ report, action, td, onClose, onConfirm }) {
  const [notes, setNotes] = useState("");
  const [confirming, setConfirming] = useState(false);

  const isBan = action === "baneado";
  const isDeletePub = action === "eliminar_publicacion";
  let desc;
  if (isBan) {
    const descFn = td.actionConfirmBan;
    desc = descFn
      ? (typeof descFn === "function" ? descFn(report.reported || report.reportedUserId || "?") : descFn)
      : `Vas a banear al usuario ${report.reported || "?"}.`;
  } else if (isDeletePub) {
    desc = td.actionConfirmDeletePub
      ? (typeof td.actionConfirmDeletePub === "function"
          ? td.actionConfirmDeletePub(report.post || report.publicationId || "?")
          : td.actionConfirmDeletePub)
      : `Vas a desactivar la publicación "${report.post || "?"}" relacionada a este reporte. El reporte quedará como resuelto.`;
  } else {
    desc = td.actionConfirmDismiss || "Vas a descartar este reporte.";
  }

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(notes);
    setConfirming(false);
  };

  return (
    <div role="button" tabIndex={0} style={st.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div
        role="button"
        tabIndex={0}
        style={{ ...st.modalCard, maxWidth: 440 }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 17, color: TEXT }}>
            {td.actionConfirmTitle || "Confirmar acción"}
          </h2>
          <button
            onClick={onClose}
            title={td.cancel || "Cancelar"}
            aria-label={td.cancel || "Cancelar"}
            style={CLOSE_BTN_STYLE}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: "0 0 16px", fontSize: 14, color: MUTED, lineHeight: 1.5 }}>
          {desc}
        </p>

        <label style={st.modalFieldWrap}>
          <span style={st.modalFieldLabel}>
            {td.actionNotesLabel || "Notas internas (opcional)"}
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: Usuario reincidente, contenido claramente falso..."
            style={{ ...st.modalTextarea, width: "100%", boxSizing: "border-box" }}
            rows={3}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
          <button onClick={onClose} style={st.btnDismiss}>
            {td.cancel || "Cancelar"}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming}
            style={isBan ? st.btnBan : isDeletePub ? st.btnDelete : st.btnSave}
          >
            {confirming ? "..." : td.actionConfirmBtn || "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ td }) {
  return (
    <div style={st.emptyState}>
      <span style={{ fontSize: 48 }}>✓</span>
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          margin: "12px 0 6px",
          color: ACCENT,
        }}
      >
        {td.noReportsTitle || "¡Todos limpios!"}
      </h2>
      <p style={{ color: MUTED, fontSize: 14, margin: 0 }}>
        {td.noReportsSub || "No hay reportes pendientes"}
      </p>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const CLOSE_BTN_STYLE = { flexShrink: 0, background: 'var(--bg-elevated)', border: '2px solid var(--border)', borderRadius: '50%', width: 34, height: 34, fontSize: 18, fontWeight: 800, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 };
const ACCENT = 'var(--accent)';
const BG = "var(--bg-base)";
const SURFACE = "var(--bg-surface)";
const BORDER = "var(--border)";
const TEXT = "var(--text-primary)";
const MUTED = "var(--text-secondary)";

const st = {
  root: {
    display: "flex",
    height: "100vh",
    overflow: "hidden",
    background: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Inter', sans-serif",
  },
  sidebar: {
    width: 220,
    background: SURFACE,
    borderRight: `1px solid ${BORDER}`,
    display: "flex",
    flexDirection: "column",
    padding: "24px 16px",
    height: "100%",
    flexShrink: 0,
  },
  nav: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    borderRadius: 8,
    background: "none",
    border: "none",
    cursor: "pointer",
    color: MUTED,
    fontSize: 14,
    fontWeight: 500,
    textAlign: "left",
    transition: "all 0.15s",
  },
  navActive: { background: `${ACCENT}18`, color: ACCENT },
  navIcon: { fontSize: 16 },
  navBadge: {
    marginLeft: "auto",
    background: "var(--error)",
    color: "var(--text-primary)",
    borderRadius: 10,
    padding: "1px 7px",
    fontSize: 11,
    fontWeight: 700,
  },

  main: {
    flex: 1,
    padding: "32px 40px",
    maxWidth: 760,
    overflowY: "auto",
    height: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    letterSpacing: "-0.5px",
  },
  headerSub: { color: MUTED, fontSize: 14, margin: "4px 0 0" },
  resolvedCount: {
    background: `${ACCENT}15`,
    color: ACCENT,
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
  },

  reportList: { display: "flex", flexDirection: "column", gap: 14 },
  reportCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: "18px 20px",
  },
  reportTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  severityBadge: {
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 4,
    padding: "3px 8px",
    letterSpacing: "0.5px",
  },
  reportType: { fontSize: 15, fontWeight: 600 },
  reportTime: { marginLeft: "auto", fontSize: 12, color: MUTED },

  reportBody: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 16,
  },
  reportRow: { display: "flex", gap: 12, fontSize: 14 },
  reportLabel: { color: MUTED, width: 140, flexShrink: 0 },
  reportValue: { color: TEXT },

  reportActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnDetail: {
    background: `${ACCENT}18`,
    border: `1px solid ${ACCENT}`,
    color: ACCENT,
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  btnDelete: {
    background: "var(--error-soft)",
    border: "1px solid #F87171",
    color: "var(--error)",
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  btnBan: {
    background: "var(--warning-soft)",
    border: "1px solid #FCD34D",
    color: "var(--warning)",
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  btnDismiss: {
    background: "none",
    border: `1px solid ${BORDER}`,
    color: MUTED,
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
  },
  btnSave: {
    background: ACCENT,
    border: "none",
    color: "#0f172a",
    borderRadius: 7,
    padding: "7px 16px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 600,
  },

  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "var(--overlay)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modalCard: {
    background: "var(--bg-surface)",
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: "28px 32px",
    width: "100%",
    maxWidth: 560,
  },
  modalSection: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "14px 16px",
  },
  modalSectionTitle: {
    margin: "0 0 8px",
    fontSize: 12,
    fontWeight: 600,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  modalFieldWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 14,
  },
  modalFieldLabel: {
    fontSize: 13,
    fontWeight: 500,
    color: MUTED,
  },
  modalSelect: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 7,
    color: TEXT,
    padding: "8px 12px",
    fontSize: 13,
  },
  modalTextarea: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 7,
    color: TEXT,
    padding: "10px 12px",
    fontSize: 13,
    resize: "vertical",
    fontFamily: "inherit",
  },

  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
    color: MUTED,
    gap: 4,
  },
  placeholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 400,
    gap: 12,
    color: MUTED,
  },
  placeholderIcon: { fontSize: 48 },
  placeholderTitle: { fontSize: 20, fontWeight: 700, color: TEXT, margin: 0 },
  placeholderSub: {
    fontSize: 14,
    margin: 0,
    textAlign: "center",
    maxWidth: 360,
  },
  tag: {
    background: `${ACCENT}15`,
    color: ACCENT,
    borderRadius: 6,
    padding: "4px 12px",
    fontSize: 12,
    fontWeight: 600,
    marginTop: 8,
  },
};
