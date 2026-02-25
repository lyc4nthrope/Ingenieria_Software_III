/**
 * UsuarioDashboard.jsx
 *
 * Dashboard principal del usuario estándar de NØSEE.
 * Vista de red social: feed de precios, publicar, validar publicaciones.
 *
 * UBICACIÓN: src/features/dashboard/usuario/UsuarioDashboard.jsx
 */
import { useState } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';

// ─── Datos mock (reemplazar por fetch real a Supabase) ───────────────────────
const MOCK_POSTS = [
  {
    id: 1,
    author: 'María G.',
    avatar: 'MG',
    store: 'Éxito Carrera 30',
    product: 'Aceite Girasol 3L',
    price: 18900,
    validations: 14,
    time: 'hace 12 min',
    validated: false,
  },
  {
    id: 2,
    author: 'Carlos R.',
    avatar: 'CR',
    store: 'D1 Laureles',
    product: 'Leche entera x6',
    price: 21500,
    validations: 8,
    time: 'hace 28 min',
    validated: true,
  },
  {
    id: 3,
    author: 'Ana P.',
    avatar: 'AP',
    store: 'Jumbo Bello',
    product: 'Pollo entero kg',
    price: 9800,
    validations: 22,
    time: 'hace 1h',
    validated: false,
  },
  {
    id: 4,
    author: 'Luis T.',
    avatar: 'LT',
    store: 'Ara Itagüí',
    product: 'Arroz Fedearroz 5kg',
    price: 16400,
    validations: 5,
    time: 'hace 2h',
    validated: false,
  },
];

export default function UsuarioDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [posts, setPosts] = useState(MOCK_POSTS);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('feed');

  // Validar / des-validar una publicación
  const handleValidate = (id) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              validated: !p.validated,
              validations: p.validated ? p.validations - 1 : p.validations + 1,
            }
          : p
      )
    );
  };

  return (
    <div style={styles.root}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>NØSEE</div>

        <nav style={styles.nav}>
          {[
            { key: 'feed',    icon: '◈', label: 'Feed' },
            { key: 'search',  icon: '◎', label: 'Buscar' },
            { key: 'post',    icon: '⊕', label: 'Publicar' },
            { key: 'profile', icon: '◉', label: 'Perfil' },
          ].map((item) => (
            <button
              key={item.key}
              style={{
                ...styles.navItem,
                ...(activeTab === item.key ? styles.navItemActive : {}),
              }}
              onClick={() => {
                if (item.key === 'post') setShowForm(true);
                else setActiveTab(item.key);
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* User info */}
        <div style={styles.userInfo}>
          <div style={styles.userAvatar}>
            {user?.fullName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={styles.userName}>{user?.fullName || 'Usuario'}</div>
            <div style={styles.userRole}>Usuario</div>
          </div>
        </div>

        <button style={styles.logoutBtn} onClick={logout}>
          ⏻ Salir
        </button>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
      <main style={styles.main}>

        {/* Header */}
        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Feed de precios</h1>
            <p style={styles.headerSub}>Valida publicaciones de tu comunidad</p>
          </div>
          <button style={styles.publishBtn} onClick={() => setShowForm(true)}>
            + Publicar precio
          </button>
        </header>

        {/* Stats bar */}
        <div style={styles.statsBar}>
          {[
            { label: 'Publicaciones hoy',  value: '127' },
            { label: 'Validadas',           value: '89' },
            { label: 'Tu reputación',       value: user?.reputationPoints ?? 0 },
            { label: 'Comunidad activa',    value: '1.2k' },
          ].map((s) => (
            <div key={s.label} style={styles.statCard}>
              <span style={styles.statValue}>{s.value}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Feed */}
        <div style={styles.feed}>
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onValidate={handleValidate}
            />
          ))}
        </div>
      </main>

      {/* ── Modal: nueva publicación ─────────────────────────────── */}
      {showForm && (
        <NewPostModal onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ─── PostCard ────────────────────────────────────────────────────────────────
function PostCard({ post, onValidate }) {
  return (
    <article style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.cardAvatar}>{post.avatar}</div>
        <div>
          <div style={styles.cardAuthor}>{post.author}</div>
          <div style={styles.cardMeta}>{post.store} · {post.time}</div>
        </div>
        <div style={styles.cardPrice}>
          ${post.price.toLocaleString('es-CO')}
        </div>
      </div>

      <div style={styles.cardProduct}>{post.product}</div>

      <div style={styles.cardFooter}>
        <button
          style={{
            ...styles.validateBtn,
            ...(post.validated ? styles.validateBtnActive : {}),
          }}
          onClick={() => onValidate(post.id)}
        >
          {post.validated ? '✓ Validado' : '✓ Validar'} · {post.validations}
        </button>
        <button style={styles.shareBtn}>↗ Compartir</button>
      </div>
    </article>
  );
}

// ─── NewPostModal ─────────────────────────────────────────────────────────────
function NewPostModal({ onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle}>Nueva publicación</h2>
          <button style={styles.modalClose} onClick={onClose}>×</button>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Producto</label>
          <input style={styles.input} placeholder="ej. Arroz Fedearroz 5kg" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Tienda</label>
          <input style={styles.input} placeholder="ej. D1 Laureles" />
        </div>
        <div style={styles.formGroup}>
          <label style={styles.label}>Precio (COP)</label>
          <input style={styles.input} type="number" placeholder="ej. 16400" />
        </div>

        <button style={styles.submitBtn}>Publicar precio</button>
      </div>
    </div>
  );
}

// ─── Estilos ─────────────────────────────────────────────────────────────────
const ACCENT   = '#C8F135';   // lima eléctrico
const BG       = '#0B0C0F';   // negro profundo
const SURFACE  = '#141518';   // superficie elevada
const BORDER   = '#1E2028';   // borde sutil
const TEXT     = '#E8EAED';   // texto principal
const MUTED    = '#6B7280';   // texto secundario

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Inter', sans-serif",
  },

  // Sidebar
  sidebar: {
    width: 220,
    background: SURFACE,
    borderRight: `1px solid ${BORDER}`,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    position: 'sticky',
    top: 0,
    height: '100vh',
  },
  logo: {
    fontSize: 22,
    fontWeight: 800,
    color: ACCENT,
    letterSpacing: '-1px',
    marginBottom: 36,
    paddingLeft: 8,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    flex: 1,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: MUTED,
    fontSize: 14,
    fontWeight: 500,
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  navItemActive: {
    background: `${ACCENT}18`,
    color: ACCENT,
  },
  navIcon: { fontSize: 18 },
  navLabel: {},

  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 8px',
    borderTop: `1px solid ${BORDER}`,
    marginTop: 'auto',
    marginBottom: 12,
  },
  userAvatar: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    background: `${ACCENT}30`,
    color: ACCENT,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 14,
  },
  userName: { fontSize: 13, fontWeight: 600, color: TEXT },
  userRole: { fontSize: 11, color: MUTED },

  logoutBtn: {
    background: 'none',
    border: `1px solid ${BORDER}`,
    color: MUTED,
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 13,
    textAlign: 'left',
  },

  // Main
  main: {
    flex: 1,
    padding: '32px 40px',
    maxWidth: 700,
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 700,
    margin: 0,
    letterSpacing: '-0.5px',
  },
  headerSub: {
    color: MUTED,
    fontSize: 14,
    margin: '4px 0 0',
  },
  publishBtn: {
    background: ACCENT,
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '10px 18px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
  },

  // Stats
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  statValue: { fontSize: 22, fontWeight: 700, color: ACCENT },
  statLabel: { fontSize: 11, color: MUTED },

  // Feed
  feed: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  card: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '18px 20px',
    transition: 'border-color 0.15s',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  cardAvatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: '#1E2028',
    color: MUTED,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    fontWeight: 700,
  },
  cardAuthor: { fontSize: 14, fontWeight: 600 },
  cardMeta: { fontSize: 12, color: MUTED },
  cardPrice: {
    marginLeft: 'auto',
    fontSize: 20,
    fontWeight: 800,
    color: ACCENT,
    letterSpacing: '-0.5px',
  },
  cardProduct: {
    fontSize: 15,
    color: TEXT,
    marginBottom: 14,
    paddingLeft: 48,
  },
  cardFooter: {
    display: 'flex',
    gap: 10,
    paddingLeft: 48,
  },
  validateBtn: {
    background: 'none',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '6px 14px',
    color: MUTED,
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  validateBtnActive: {
    background: `${ACCENT}15`,
    borderColor: ACCENT,
    color: ACCENT,
  },
  shareBtn: {
    background: 'none',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '6px 14px',
    color: MUTED,
    fontSize: 13,
    cursor: 'pointer',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    padding: 28,
    width: 420,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
  modalClose: {
    background: 'none',
    border: 'none',
    color: MUTED,
    fontSize: 22,
    cursor: 'pointer',
  },
  formGroup: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, color: MUTED, marginBottom: 6 },
  input: {
    width: '100%',
    background: BG,
    border: `1px solid ${BORDER}`,
    borderRadius: 8,
    padding: '10px 14px',
    color: TEXT,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none',
  },
  submitBtn: {
    width: '100%',
    background: ACCENT,
    color: '#000',
    border: 'none',
    borderRadius: 8,
    padding: '12px',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    marginTop: 8,
  },
};