/**
 * Navbar - Barra de navegación principal
 *
 * Muestra el logo y las opciones de sesión según el estado de auth.
 * Se adapta a mobile (barra inferior) y desktop (top bar).
 */
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectAuthUser } from '@/features/auth/store/authStore';

// Íconos SVG inline (no dependencias externas)
const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
    <polyline points="16,17 21,12 16,7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const TagIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
    <line x1="7" y1="7" x2="7.01" y2="7"/>
  </svg>
);

export default function Navbar() {
  const user = useAuthStore(selectAuthUser);
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Estilo de la barra superior (desktop)
  const navStyle = {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    height: '60px',
    background: 'rgba(8, 12, 20, 0.85)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: '16px',
  };

  const logoStyle = {
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '-0.04em',
    color: 'var(--accent)',
    textDecoration: 'none',
    marginRight: 'auto',
  };

  const navLinkStyle = (active) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: '500',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    background: active ? 'var(--accent-soft)' : 'transparent',
    transition: 'all 0.18s ease',
    textDecoration: 'none',
  });

  const avatarStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--bg-elevated)',
    border: '2px solid var(--border-soft)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--accent)',
    cursor: 'pointer',
    overflow: 'hidden',
  };

  // Iniciales del usuario
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <nav style={navStyle} aria-label="Navegación principal">
      {/* Logo */}
      <Link to="/" style={logoStyle}>
        NØ<span style={{ color: 'var(--text-secondary)' }}>SEE</span>
      </Link>

      {user ? (
        <>
          {/* Nav links */}
          <Link to="/" style={navLinkStyle(isActive('/'))}>
            <HomeIcon />
            <span className="nav-label">Inicio</span>
          </Link>

          <Link to="/publicaciones" style={navLinkStyle(isActive('/publicaciones'))}>
            <TagIcon />
            <span className="nav-label">Precios</span>
          </Link>

          {/* Avatar → perfil */}
          <Link to="/perfil" style={avatarStyle} title="Mi perfil">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullName || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--error)';
              e.currentTarget.style.background = 'var(--error-soft)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <LogoutIcon />
          </button>
        </>
      ) : (
        <>
          <Link to="/login" style={navLinkStyle(isActive('/login'))}>
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            style={{
              ...navLinkStyle(false),
              background: 'var(--accent)',
              color: '#080C14',
              fontWeight: '600',
              padding: '6px 16px',
            }}
          >
            Registrarse
          </Link>
        </>
      )}
    </nav>
  );
}