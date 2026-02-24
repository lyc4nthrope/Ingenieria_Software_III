/**
 * ProfilePage - Página de perfil del usuario autenticado
 * Ruta protegida: solo accesible si hay sesión activa.
 */
import { useAuthStore, selectAuthUser, selectAuthStatus } from '@/features/auth/store/authStore';
import ProfileCard from '@/features/auth/components/ProfileCard';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const user = useAuthStore(selectAuthUser);
  const status = useAuthStore(selectAuthStatus);
  const { updateProfile, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <main style={{
      flex: 1,
      maxWidth: '640px',
      margin: '0 auto',
      padding: '28px 16px',
      width: '100%',
    }}>
      {/* Breadcrumb / Título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
          Mi perfil
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Gestiona tu información personal
        </p>
      </div>

      {/* Tarjeta de perfil */}
      <ProfileCard
        user={user}
        onUpdate={updateProfile}
        loading={status === 'loading'}
      />

      {/* Sección de seguridad */}
      <div style={{
        marginTop: '20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '14px' }}>
          Seguridad y sesión
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Button variant="secondary" size="md" onClick={() => navigate('/recuperar-contrasena')}>
            Cambiar contraseña
          </Button>
          <Button variant="danger" size="md" onClick={handleLogout} loading={status === 'loading'}>
            Cerrar sesión
          </Button>
        </div>
      </div>
    </main>
  );
}