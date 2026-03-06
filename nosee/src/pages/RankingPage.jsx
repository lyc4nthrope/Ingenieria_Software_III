/**
 * RankingPage.jsx
 * Muestra el ranking de usuarios con más reputación.
 * Usa useLanguage() para i18n y respeta las clases de accesibilidad del proyecto.
 */
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getTopUsersByReputation } from "@/services/api/users.api";

const MEDALS = ["🥇", "🥈", "🥉"];
const MEDAL_COLORS = ["#f59e0b", "#9ca3af", "#b45309"];

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function RankingPage() {
  const { t } = useLanguage();
  const tr = t.ranking;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getTopUsersByReputation(20).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setUsers(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  return (
    <main style={s.page}>
      <header style={s.header}>
        <h1 style={s.title}>🏆 {tr.title}</h1>
        <p style={s.subtitle}>{tr.subtitle}</p>
      </header>

      {loading && (
        <div style={s.centered} aria-live="polite">
          <span style={s.loadingDot} aria-hidden="true" />
          <span style={s.loadingDot} aria-hidden="true" />
          <span style={s.loadingDot} aria-hidden="true" />
          <span style={s.srOnly}>{tr.loading}</span>
        </div>
      )}

      {error && !loading && (
        <div style={s.errorBox} role="alert">
          {tr.error}: {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <p style={s.empty}>{tr.noUsers}</p>
      )}

      {!loading && !error && users.length > 0 && (
        <div style={s.tableWrapper}>
          <table style={s.table} aria-label={tr.title}>
            <thead>
              <tr>
                <th style={{ ...s.th, width: "60px" }}>{tr.position}</th>
                <th style={s.th}>{tr.user}</th>
                <th style={{ ...s.th, textAlign: "right" }}>{tr.points}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => {
                const isTop3 = idx < 3;
                return (
                  <tr
                    key={user.id}
                    style={{
                      ...s.row,
                      background: isTop3
                        ? `${MEDAL_COLORS[idx]}18`
                        : idx % 2 === 0
                        ? "var(--bg-surface)"
                        : "var(--bg-elevated)",
                    }}
                  >
                    <td style={s.td}>
                      <span
                        style={{
                          ...s.positionBadge,
                          color: isTop3 ? MEDAL_COLORS[idx] : "var(--text-muted)",
                          fontWeight: isTop3 ? 800 : 600,
                        }}
                        aria-label={`${tr.position} ${idx + 1}`}
                      >
                        {isTop3 ? MEDALS[idx] : `#${idx + 1}`}
                      </span>
                    </td>
                    <td style={s.td}>
                      <div style={s.userCell}>
                        <div
                          style={{
                            ...s.avatar,
                            background: isTop3
                              ? MEDAL_COLORS[idx]
                              : "var(--accent-soft)",
                            color: isTop3 ? "#fff" : "var(--accent)",
                            fontWeight: 700,
                          }}
                          aria-hidden="true"
                        >
                          {getInitials(user.full_name)}
                        </div>
                        <div>
                          <div style={s.userName}>{user.full_name || "—"}</div>
                          {user.roles?.name && (
                            <span style={s.roleBadge}>{user.roles.name}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...s.td, textAlign: "right" }}>
                      <span
                        style={{
                          ...s.points,
                          color: isTop3 ? MEDAL_COLORS[idx] : "var(--accent)",
                        }}
                      >
                        {(user.reputation_points ?? 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

const s = {
  page: {
    flex: 1,
    padding: "28px 16px 48px",
    maxWidth: "720px",
    margin: "0 auto",
    width: "100%",
    display: "grid",
    gap: "24px",
  },
  header: {
    textAlign: "center",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    margin: 0,
  },
  subtitle: {
    margin: "8px 0 0",
    color: "var(--text-secondary)",
    fontSize: "0.9375rem",
  },
  centered: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    padding: "40px 0",
  },
  loadingDot: {
    display: "inline-block",
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "var(--accent)",
    animation: "pulse 1.2s ease-in-out infinite",
  },
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    whiteSpace: "nowrap",
  },
  errorBox: {
    background: "var(--error-soft)",
    color: "var(--error)",
    border: "1px solid rgba(248,113,113,0.3)",
    borderRadius: "var(--radius-sm)",
    padding: "12px 16px",
    fontSize: "0.875rem",
  },
  empty: {
    textAlign: "center",
    color: "var(--text-muted)",
    fontSize: "0.9375rem",
    padding: "40px 0",
  },
  tableWrapper: {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    overflowX: "auto",
    overflowY: "hidden",
    background: "var(--bg-surface)",
    WebkitOverflowScrolling: "touch",
  },
  table: {
    width: "100%",
    minWidth: "340px",
    borderCollapse: "collapse",
    fontSize: "0.875rem",
  },
  th: {
    padding: "12px 16px",
    textAlign: "left",
    fontWeight: 700,
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    background: "var(--bg-elevated)",
    borderBottom: "1px solid var(--border)",
  },
  row: {
    borderBottom: "1px solid var(--border-soft, var(--border))",
    transition: "background 0.15s",
  },
  td: {
    padding: "14px 16px",
    verticalAlign: "middle",
  },
  positionBadge: {
    fontSize: "1.125rem",
    display: "inline-block",
    minWidth: "32px",
    textAlign: "center",
  },
  userCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    minWidth: 0,
  },
  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.875rem",
    flexShrink: 0,
  },
  userName: {
    fontWeight: 600,
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  roleBadge: {
    display: "inline-block",
    marginTop: "2px",
    padding: "1px 8px",
    borderRadius: "100px",
    fontSize: "0.6875rem",
    fontWeight: 600,
    background: "var(--accent-soft)",
    color: "var(--accent)",
  },
  points: {
    fontSize: "1rem",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
};
