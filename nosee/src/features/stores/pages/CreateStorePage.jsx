import StoreForm from '@/features/stores/components/StoreForm';

export default function CreateStorePage() {
  return (
    <section style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>🏪 Crear tienda</h1>
        <p style={styles.subtitle}>
          Registra una tienda física o virtual. Para tiendas físicas puedes adjuntar hasta 3 evidencias.
        </p>
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
