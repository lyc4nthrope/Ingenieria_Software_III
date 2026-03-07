/**
 * Navbar - Barra de navegación principal
 *
 * Muestra el logo y las opciones de sesión según el estado de auth.
 * Se adapta a mobile (barra inferior) y desktop (top bar).
 */
import { memo, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  useAuthStore,
  selectAuthUser,
  selectIsAuthenticated,
  selectIsInitialized,
} from "@/features/auth/store/authStore";
import { UserRoleEnum } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

// Íconos SVG inline (no dependencias externas)
const HomeIcon = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9,22 9,12 15,12 15,22" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    aria-hidden="true"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
    <polyline points="16,17 21,12 16,7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const TagIcon = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

const StoreIcon = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 9l1.5-5h15L21 9" />
    <path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M9 21v-6h6v6" />
  </svg>
);

const TrophyIcon = () => (
  <svg
    aria-hidden="true"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0012 0V2z" />
  </svg>
);

const MenuIcon = ({ open }) =>
  open ? (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );

const Navbar = memo(function Navbar() {
  const { t } = useLanguage();
  const tn = t.nav;

  const user = useAuthStore(selectAuthUser);
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitialized = useAuthStore(selectIsInitialized);
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => location.pathname === path;

  const DASHBOARD_CONFIG = {
    [UserRoleEnum.ADMIN]: { label: tn.panelAdmin, path: "/dashboard/admin" },
    [UserRoleEnum.MODERADOR]: { label: tn.moderation, path: "/dashboard/moderator" },
    [UserRoleEnum.REPARTIDOR]: { label: tn.myOrders, path: "/dashboard/dealer" },
  };
  const dashboardConfig = user?.role ? DASHBOARD_CONFIG[user.role] : null;

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const navStyle = {
    position: "sticky",
    top: 0,
    zIndex: 100,
    height: "60px",
    background: "var(--nav-bg)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
  };

  const logoStyle = {
    fontSize: "1.25rem",
    fontWeight: "800",
    letterSpacing: "-0.04em",
    color: "var(--accent)",
    textDecoration: "none",
    marginRight: "auto",
  };

  const navLinkStyle = (active) => ({
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    borderRadius: "var(--radius-sm)",
    fontSize: "0.8125rem",
    fontWeight: "500",
    color: active ? "var(--accent)" : "var(--text-secondary)",
    background: active ? "var(--accent-soft)" : "transparent",
    transition: "color 0.18s ease, background-color 0.18s ease",
    textDecoration: "none",
  });

  const avatarStyle = {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "var(--bg-elevated)",
    border: "2px solid var(--border-soft)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8125rem",
    fontWeight: "600",
    color: "var(--accent)",
    cursor: "pointer",
    overflow: "hidden",
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() || "U";

  return (
    <nav style={navStyle} className="main-nav" aria-label={tn.label}>
      <Link to="/" style={logoStyle}>
        NØ<span style={{ color: "var(--text-secondary)" }}>SEE</span>
      </Link>

      {!isInitialized ? null : isAuthenticated ? (
        <>
          <button
            type="button"
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
          >
            <MenuIcon open={mobileMenuOpen} />
          </button>

          {mobileMenuOpen && (
            <div
              style={{ position: "fixed", inset: 0, top: "60px", zIndex: 98 }}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          <div className={`nav-links${mobileMenuOpen ? " nav-links--open" : ""}`}>
            <Link
              to="/"
              style={navLinkStyle(isActive("/"))}
              aria-current={isActive("/") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <HomeIcon />
              <span className="nav-label">{tn.home}</span>
            </Link>

            <Link
              to="/publicaciones"
              style={navLinkStyle(isActive("/publicaciones"))}
              aria-current={isActive("/publicaciones") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <TagIcon />
              <span className="nav-label">{tn.products}</span>
            </Link>

            <Link
              to="/tiendas"
              style={navLinkStyle(isActive("/tiendas"))}
              aria-current={isActive("/tiendas") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <StoreIcon />
              <span className="nav-label">{tn.stores}</span>
            </Link>

            <Link
              to="/ranking"
              style={navLinkStyle(isActive("/ranking"))}
              aria-current={isActive("/ranking") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <TrophyIcon />
              <span className="nav-label">{tn.ranking}</span>
            </Link>

            {dashboardConfig && (
              <Link
                to={dashboardConfig.path}
                style={navLinkStyle(isActive(dashboardConfig.path))}
                aria-current={isActive(dashboardConfig.path) ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                {dashboardConfig.label}
              </Link>
            )}
          </div>

          <Link
            to="/perfil"
            style={avatarStyle}
            title={tn.myProfile}
            aria-label={tn.myProfile}
            onClick={() => setMobileMenuOpen(false)}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || "Avatar"}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              initials
            )}
          </Link>

          <button
            onClick={handleLogout}
            title={tn.logout}
            aria-label={tn.logout}
            type="button"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "color 0.18s ease, background-color 0.18s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--error)";
              e.currentTarget.style.background = "var(--error-soft)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <LogoutIcon />
            <span className="sr-only">{tn.logout}</span>
          </button>
        </>
      ) : (
        <>
          <Link to="/ranking" style={navLinkStyle(isActive("/ranking"))}>
            <TrophyIcon />
            <span className="nav-label">{tn.ranking}</span>
          </Link>
          <Link to="/login" style={navLinkStyle(isActive("/login"))}>
            {tn.login}
          </Link>
          <Link
            to="/registro"
            style={{
              ...navLinkStyle(false),
              background: "var(--accent)",
              color: "var(--bg-base)",
              fontWeight: "600",
              padding: "6px 16px",
            }}
          >
            {tn.register}
          </Link>
        </>
      )}
    </nav>
  );
});

export default Navbar;
