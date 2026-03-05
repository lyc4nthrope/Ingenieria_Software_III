import { useNavigate, useParams } from 'react-router-dom';
import StoreForm from '@/features/stores/components/StoreForm';

export default function EditStorePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    return (
      <section style={styles.page}>
        <div style={{ color: 'var(--error)', fontSize: '14px' }}>
          Error: ID de tienda no válido
        </div>
      </section>
    );
  }

  return (
    <section style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>✏️ Editar tienda</h1>
        <p style={styles.subtitle}>
          Actualiza la información de tu tienda física o virtual.
        </p>
      </header>

      <StoreForm
        mode="edit"
        storeId={id}
        onSuccess={() => navigate(-1)}
      />
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
