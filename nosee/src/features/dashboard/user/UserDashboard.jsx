/**
 * UsuarioDashboard.jsx
 *
 * Dashboard principal del usuario estándar de NØSEE.
 * Vista de red social: feed de precios, publicar, validar publicaciones.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/store/authStore';
import { usePublications } from '@/features/publications/hooks';

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export default function UsuarioDashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('feed');
  const [votedIds, setVotedIds] = useState(new Set());

  const {
    publications,
    loading,
    error,
    totalCount,
    validatePublication,
    unvotePublication,
  } = usePublications({ limit: 20 });

  const handleValidate = async (id) => {
    const alreadyVoted = votedIds.has(id);
    if (alreadyVoted) {
      await unvotePublication(id);
      setVotedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } else {
      await validatePublication(id);
      setVotedIds((prev) => new Set([...prev, id]));
    }
  };

  const posts = publications.map((pub) => ({
    id: pub.id,
    author: pub.user?.fullName || pub.users?.fullName || 'Usuario',
    avatar: (pub.user?.fullName || pub.users?.fullName || 'U')[0].toUpperCase(),
    store: pub.store?.name || pub.stores?.name || '',
    product: pub.product?.name || pub.products?.name || '',
    price: Number(pub.price),
    validations: pub.validated_count || 0,
    time: formatRelativeTime(pub.createdAt),
    validated: votedIds.has(pub.id),
  }));

  return (
    <div style={styles.root}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>NØSEE</div>

        <nav style={styles.nav}>
          {[
            { key: 'feed',    icon: '◈', label: 'Feed' },
            { key: 'search',  icon: '◎', label: 'Buscar' },
            { key: 'profile', icon: '◉', label: 'Perfil' },
          ].map((item) => (
            <button
              key={item.key}
              style={{
                ...styles.navItem,
                ...(activeTab === item.key ? styles.navItemActive : {}),
              }}
              onClick={() => setActiveTab(item.key)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

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

        <header style={styles.header}>
          <div>
            <h1 style={styles.headerTitle}>Feed de precios</h1>
            <p style={styles.headerSub}>Valida publicaciones de tu comunidad</p>
          </div>
          <button style={styles.publishBtn} onClick={() => navigate('/publicaciones/nueva')}>
            + Publicar precio
          </button>
        </header>

        <div style={styles.statsBar}>
          {[
            { label: 'Publicaciones', value: loading ? '...' : totalCount },
            { label: 'Validadas',     value: '—' },
            { label: 'Tu reputación', value: user?.reputationPoints ?? 0 },
            { label: 'Comunidad',     value: '—' },
          ].map((s) => (
            <div key={s.label} style={styles.statCard}>
              <span style={styles.statValue}>{s.value}</span>
              <span style={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ color: '#F87171', fontSize: 14, marginBottom: 16 }}>
            Error al cargar publicaciones: {error}
          </div>
        )}

        {loading ? (
          <div style={{ color: MUTED, fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
            Cargando publicaciones...
          </div>
        ) : posts.length === 0 ? (
          <div style={{ color: MUTED, fontSize: 14, padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>◎</div>
            <p>No hay publicaciones aún. ¡Sé el primero en publicar un precio!</p>
          </div>
        ) : (
          <div style={styles.feed}>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} onValidate={handleValidate} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

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

const ACCENT   = '#C8F135';
const BG       = '#0B0C0F';
const SURFACE  = '#141518';
const BORDER   = '#1E2028';
const TEXT     = '#E8EAED';
const MUTED    = '#6B7280';

const styles = {
  root: {
    display: 'flex',
    minHeight: '100vh',
    background: BG,
    color: TEXT,
    fontFamily: "'DM Sans', 'Inter', sans-serif",
  },
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
  nav: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
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
  navItemActive: { background: `${ACCENT}18`, color: ACCENT },
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
  main: { flex: 1, padding: '32px 40px', maxWidth: 700 },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  headerTitle: { fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' },
  headerSub: { color: MUTED, fontSize: 14, margin: '4px 0 0' },
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
  feed: { display: 'flex', flexDirection: 'column', gap: 14 },
  card: {
    background: SURFACE,
    border: `1px solid ${BORDER}`,
    borderRadius: 12,
    padding: '18px 20px',
    transition: 'border-color 0.15s',
  },
  cardTop: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
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
  cardProduct: { fontSize: 15, color: TEXT, marginBottom: 14, paddingLeft: 48 },
  cardFooter: { display: 'flex', gap: 10, paddingLeft: 48 },
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
  validateBtnActive: { background: `${ACCENT}15`, borderColor: ACCENT, color: ACCENT },
  shareBtn: {
    background: 'none',
    border: `1px solid ${BORDER}`,
    borderRadius: 6,
    padding: '6px 14px',
    color: MUTED,
    fontSize: 13,
    cursor: 'pointer',
  },
};
