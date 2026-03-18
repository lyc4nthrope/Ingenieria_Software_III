import { Link } from 'react-router-dom';
import StoreForm from '@/features/stores/components/StoreForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreateStorePage() {
  const { t } = useLanguage();
  const tc = t.createStore;

  return (
    <section style={styles.page}>
      <div style={styles.inner}>
        <Link to="/tiendas" style={styles.backLink}>← Tiendas</Link>
        <h1 style={styles.title}>{tc.title}</h1>
        <p style={styles.subtitle}>{tc.subtitle}</p>
      </div>
      <StoreForm />
    </section>
  );
}

const styles = {
  page: {
    width: '100%',
    padding: '24px 16px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  inner: {
    width: '100%',
    maxWidth: '980px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  backLink: {
    fontSize: '13px',
    color: 'var(--accent)',
    textDecoration: 'none',
    fontWeight: 600,
    alignSelf: 'flex-start',
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
};
