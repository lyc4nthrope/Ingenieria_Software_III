import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

export default function StoresPage() {
  const { t } = useLanguage();
  const ts = t.storesPage;

  return (
    <section style={styles.page} aria-labelledby="stores-heading">
      <header style={styles.header}>
        <h1 id="stores-heading" style={styles.title}>{ts.title}</h1>
        <p style={styles.subtitle}>{ts.subtitle}</p>
        <Link
          to="/tiendas/nueva"
          aria-label={ts.createBtnLabel}
          style={styles.createBtn}
        >
          {ts.createBtn}
        </Link>
      </header>

      <div role="status" aria-live="polite" style={styles.emptyState}>
        <p style={styles.comingSoon}>{ts.comingSoon}</p>
      </div>
    </section>
  );
}

const styles = {
  page: {
    width: '100%',
    padding: '24px 16px 32px',
    display: 'grid',
    gap: '24px',
  },
  header: {
    width: '100%',
    maxWidth: '760px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  subtitle: {
    margin: 0,
    color: 'var(--text-secondary)',
  },
  createBtn: {
    alignSelf: 'flex-start',
    marginTop: '8px',
    padding: '8px 20px',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 'var(--radius-md)',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  emptyState: {
    width: '100%',
    maxWidth: '760px',
    margin: '0 auto',
    textAlign: 'center',
    padding: '48px 0',
  },
  comingSoon: {
    color: 'var(--text-secondary)',
    fontSize: '15px',
  },
};
