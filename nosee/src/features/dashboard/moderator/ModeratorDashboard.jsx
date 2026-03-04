/**
 * ModeratorDashboard.jsx
 *
 * Dashboard del moderador de NØSEE.
 * Vista de usuario + controles de moderación de reportes.
 */
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/services/supabase.client";
import { useLanguage } from "@/contexts/LanguageContext";

const REPORT_SEVERITY = {
  offensive: "alta",
  spam: "media",
  fake_price: "media",
  wrong_photo: "baja",
};

const SEVERITY_COLORS = {
  alta: { bg: "#F8717118", text: "#F87171" },
  media: { bg: "#FCD34D18", text: "#FCD34D" },
  baja: { bg: "#60A5FA18", text: "#60A5FA" },
};

export default function ModeratorDashboard() {
  const { t } = useLanguage();
  const td = t.moderatorDashboard || {};

  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("reportes");
  const [resolved, setResolved] = useState([]);

  const fetchReports = async () => {
    setLoading(true);

    try {
      // 1. Reportes pendientes
      const { data: rawReports, error } = await supabase
        .from("reports")
        .select(
          "id, reason, description, created_at, publication_id, reporter_user_id"
        )
        .eq("status", "pending")
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

      // 2. Detalles de las publicaciones reportadas (producto + autor)
      const pubIds = [
        ...new Set(rawReports.map((r) => r.publication_id).filter(Boolean)),
      ];
      const { data: publications } = await supabase
        .from("price_publications")
        .select(
          "id, user_id, products(name), author:users!price_publications_user_id_fkey(full_name)"
        )
        .in("id", pubIds);

      // 3. Nombres de los reportadores
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
  }, []);

  const handleResolve = async (id, action, report) => {
    try {
      // Marcar el reporte como resuelto
      await supabase
        .from("reports")
        .update({ status: "resolved" })
        .eq("id", id);

      if (action === "eliminado" && report.publicationId) {
        await supabase
          .from("price_publications")
          .delete()
          .eq("id", report.publicationId);
      }

      if (action === "baneado" && report.reportedUserId) {
        await supabase
          .from("users")
          .update({ is_active: false })
          .eq("id", report.reportedUserId);
      }

      setResolved((prev) => [...prev, { id, action }]);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("Error resolving report:", err);
    }
  };

  const pendingCount = reports.length;

  return (
    <div style={st.root}>
      <aside style={st.sidebar}>
        <nav style={st.nav}>
          {[
            {
              key: "reportes",
              icon: "⚑",
              label: td.navReports || "Reportes",
              badge: pendingCount,
            },
            { key: "feed", icon: "◈", label: td.navFeed || "Feed" },
            { key: "historial", icon: "◎", label: td.navHistory || "Historial" },
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

      <main style={st.main}>
        {/* Reportes pendientes */}
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
              <EmptyState t={t} td={td} />
            ) : (
              <div style={st.reportList}>
                {reports.map((r) => (
                  <ReportCard
                    key={r.id}
                    report={r}
                    onResolve={handleResolve}
                    t={t}
                    td={td}
                  />
                ))}
              </div>
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
          <div style={st.placeholder}>
            <span style={st.placeholderIcon}>◎</span>
            <h2 style={st.placeholderTitle}>
              {td.historyTitle || "Historial"}
            </h2>
            <p style={st.placeholderSub}>
              {td.historySub || "Historial de acciones de moderación"}
            </p>
            <div style={st.tag}>{td.comingSoon || "Próximamente"}</div>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── ReportCard ───────────────────────────────────────────────────────────────
function ReportCard({ report, onResolve, t, td }) {
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
        <div style={st.reportRow}>
          <span style={st.reportLabel}>
            {td.labelPublication || "Publicación"}
          </span>
          <span style={st.reportValue}>
            "{report.post ?? (td.deletedPub || "Publicación eliminada")}"
          </span>
        </div>
        <div style={st.reportRow}>
          <span style={st.reportLabel}>
            {td.labelReportedBy || "Reportado por"}
          </span>
          <span style={st.reportValue}>
            {report.reporter ?? (td.anonymous || "Anónimo")}
          </span>
        </div>
        <div style={st.reportRow}>
          <span style={st.reportLabel}>
            {td.labelReportedUser || "Usuario reportado"}
          </span>
          <span style={st.reportValue}>
            {report.reported ?? (td.unknown || "Desconocido")}
          </span>
        </div>
      </div>

      <div style={st.reportActions}>
        <button
          style={st.btnDelete}
          onClick={() => onResolve(report.id, "eliminado", report)}
        >
          {td.deletePublicationBtn || "Eliminar publicación"}
        </button>
        <button
          style={st.btnBan}
          onClick={() => onResolve(report.id, "baneado", report)}
        >
          {td.banUserBtn || "Banear usuario"}
        </button>
        <button
          style={st.btnDismiss}
          onClick={() => onResolve(report.id, "descartado", report)}
        >
          {td.dismissBtn || "Descartar"}
        </button>
      </div>
    </article>
  );
}

function EmptyState({ t, td }) {
  const ACCENT = "#A78BFA";
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
const ACCENT = "#A78BFA"; // violeta moderador — autoridad sutil
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
    background: "#F87171",
    color: "#fff",
    borderRadius: 10,
    padding: "1px 7px",
    fontSize: 11,
    fontWeight: 700,
  },
  userBlock: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 8px",
    borderTop: `1px solid ${BORDER}`,
    marginTop: "auto",
    marginBottom: 12,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: `${ACCENT}20`,
    color: ACCENT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
  },
  userName: { fontSize: 13, fontWeight: 600, color: TEXT },
  userRole: { fontSize: 11, color: MUTED },

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
  btnDelete: {
    background: "#F8717115",
    border: "1px solid #F87171",
    color: "#F87171",
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 13,
    cursor: "pointer",
    fontWeight: 500,
  },
  btnBan: {
    background: "#FCD34D15",
    border: "1px solid #FCD34D",
    color: "#FCD34D",
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
