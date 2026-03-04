import StoreForm from '@/features/stores/components/StoreForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CreateStorePage() {
  const { t } = useLanguage();
  const tc = t.createStore;

  return (
    <section style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>{tc.title}</h1>
        <p style={styles.subtitle}>{tc.subtitle}</p>
      </header>

      <StoreForm />
    </section>
  );
}

const styles = {
  page: {
    width: '100%',
    padding: '24px 16px 32px',
    display: 'grid',
    gap: '16px',
  },
  header: {
    width: '100%',
    maxWidth: '760px',
    margin: '0 auto',
  },
  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  subtitle: {
    margin: '8px 0 0',
    color: 'var(--text-secondary)',
  },
};
