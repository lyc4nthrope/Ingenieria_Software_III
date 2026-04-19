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
import { useShoppingListStore } from "@/features/shopping-list/store/shoppingListStore";

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

const CartIcon = () => (
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
    <circle cx="9" cy="21" r="1" />
    <circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.98-1.69l1.38-7.3H6" />
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

  const cartCount = useShoppingListStore((s) => s.items.length);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
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
  };

  const navLinkStyle = {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    fontSize: "0.8125rem",
    textDecoration: "none",
  };

  const navLinkClass = (active) =>
    `nav-link${active ? " nav-link--active" : ""}`;

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
      {!isInitialized ? (
        <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
          <Link to="/" style={logoStyle}>
            NØ<span style={{ color: "var(--text-secondary)" }}>SEE</span>
          </Link>
        </div>
      ) : isAuthenticated ? (
        <>
          {/* Logo — left column */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
            <Link to="/" style={logoStyle}>
              NØ<span style={{ color: "var(--text-secondary)" }}>SEE</span>
            </Link>
          </div>

          {/* Nav links — center column */}
          <div
            className={`nav-links${mobileMenuOpen ? " nav-links--open" : ""}`}
            style={{ flex: 1, justifyContent: "center", gap: "4px" }}
          >
            <Link
              to="/"
              style={navLinkStyle}
              className={navLinkClass(isActive("/"))}
              aria-current={isActive("/") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <HomeIcon />
              <span className="nav-label">{tn.home}</span>
            </Link>

            <Link
              to="/tiendas"
              style={navLinkStyle}
              className={navLinkClass(isActive("/tiendas"))}
              aria-current={isActive("/tiendas") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <StoreIcon />
              <span className="nav-label">{tn.stores}</span>
            </Link>

            <Link
              to="/ranking"
              style={navLinkStyle}
              className={navLinkClass(isActive("/ranking"))}
              aria-current={isActive("/ranking") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <TrophyIcon />
              <span className="nav-label">{tn.ranking}</span>
            </Link>

            <Link
              to="/lista"
              style={{ ...navLinkStyle, position: "relative" }}
              className={navLinkClass(isActive("/lista"))}
              aria-current={isActive("/lista") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
              aria-label={`${tn.shoppingList}${cartCount > 0 ? ` (${cartCount})` : ""}`}
            >
              <CartIcon />
              <span className="nav-label">{tn.shoppingList}</span>
              {cartCount > 0 && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "var(--accent)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    fontSize: "10px",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Avatar/hamburger — right column */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>

          {mobileMenuOpen && (
            <div
              style={{ position: "fixed", inset: 0, top: "60px", zIndex: 98 }}
              onClick={() => setMobileMenuOpen(false)}
              aria-hidden="true"
            />
          )}

          <button
            type="button"
            className="nav-hamburger"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? tn.closeMenu : tn.openMenu}
          >
            <MenuIcon open={mobileMenuOpen} />
          </button>

          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((v) => !v)}
              style={avatarStyle}
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
              aria-label={tn.myProfile}
              title={tn.myProfile}
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
            </button>

            {profileMenuOpen && (
              <>
                <div
                  style={{ position: "fixed", inset: 0, zIndex: 98 }}
                  onClick={() => setProfileMenuOpen(false)}
                  aria-hidden="true"
                />
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    minWidth: "200px",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    overflow: "hidden",
                    zIndex: 99,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 16px",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {user?.fullName && (
                      <div
                        style={{
                          fontWeight: "600",
                          fontSize: "0.875rem",
                          color: "var(--text-primary)",
                          marginBottom: "2px",
                        }}
                      >
                        {user.fullName}
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {user?.email}
                    </div>
                  </div>

                  <Link
                    to="/perfil"
                    onClick={() => setProfileMenuOpen(false)}
                    style={{
                      display: "block",
                      padding: "10px 16px",
                      fontSize: "0.875rem",
                      color: "var(--text-secondary)",
                      textDecoration: "none",
                      transition: "background-color 0.15s ease, color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--bg-hover)";
                      e.currentTarget.style.color = "var(--text-primary)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--text-secondary)";
                    }}
                  >
                    {tn.accountDetails}
                  </Link>

                  {dashboardConfig && (
                    <Link
                      to={dashboardConfig.path}
                      onClick={() => setProfileMenuOpen(false)}
                      style={{
                        display: "block",
                        padding: "10px 16px",
                        fontSize: "0.875rem",
                        color: "var(--text-secondary)",
                        textDecoration: "none",
                        transition: "background-color 0.15s ease, color 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "var(--bg-hover)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      {dashboardConfig.label}
                    </Link>
                  )}

                  <div style={{ height: "1px", background: "var(--border)", margin: "4px 0" }} />

                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 16px",
                      textAlign: "left",
                      fontSize: "0.875rem",
                      color: "var(--error)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      transition: "background-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--error-soft)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    {tn.logout}
                  </button>
                </div>
              </>
            )}
          </div>
          </div>
        </>
      ) : (
        <>
          {/* Logo — left column */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
            <Link to="/" style={logoStyle}>
              NØ<span style={{ color: "var(--text-secondary)" }}>SEE</span>
            </Link>
          </div>

          {/* Nav links — center column (responsive: se oculta en mobile) */}
          <div
            className={`nav-links${mobileMenuOpen ? " nav-links--open" : ""}`}
            style={{ flex: 1, justifyContent: "center", gap: "4px" }}
          >
            <Link
              to="/"
              style={navLinkStyle}
              className={navLinkClass(isActive("/"))}
              aria-current={isActive("/") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <HomeIcon />
              <span className="nav-label">{tn.home}</span>
            </Link>

            <Link
              to="/tiendas"
              style={navLinkStyle}
              className={navLinkClass(isActive("/tiendas"))}
              aria-current={isActive("/tiendas") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <StoreIcon />
              <span className="nav-label">{tn.stores}</span>
            </Link>

            <Link
              to="/ranking"
              style={navLinkStyle}
              className={navLinkClass(isActive("/ranking"))}
              aria-current={isActive("/ranking") ? "page" : undefined}
              onClick={() => setMobileMenuOpen(false)}
            >
              <TrophyIcon />
              <span className="nav-label">{tn.ranking}</span>
            </Link>

            <Link
              to="/lista"
              style={navLinkStyle}
              className={navLinkClass(isActive("/lista"))}
              aria-current={isActive("/lista") ? "page" : undefined}
              aria-label={tn.shoppingList}
              onClick={() => setMobileMenuOpen(false)}
            >
              <CartIcon />
              <span className="nav-label">{tn.shoppingList}</span>
            </Link>

          </div>

          {/* Right side — hamburger (mobile) + login + register (desktop) */}
          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "4px" }}>
            {mobileMenuOpen && (
              <div
                style={{ position: "fixed", inset: 0, top: "60px", zIndex: 98 }}
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              className="nav-hamburger"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? tn.closeMenu : tn.openMenu}
            >
              <MenuIcon open={mobileMenuOpen} />
            </button>
            <Link
              to="/login"
              style={navLinkStyle}
              className={`${navLinkClass(isActive("/login"))} nav-desktop-auth`}
            >
              {tn.login}
            </Link>
            <Link
              to="/registro"
              style={{
                ...navLinkStyle,
                background: "var(--accent)",
                color: "var(--bg-base)",
                fontWeight: "600",
                padding: "6px 16px",
                borderRadius: "var(--radius-sm)",
              }}
              className="nav-desktop-auth"
            >
              {tn.register}
            </Link>
          </div>
        </>
      )}
    </nav>
  );
});

export default Navbar;
