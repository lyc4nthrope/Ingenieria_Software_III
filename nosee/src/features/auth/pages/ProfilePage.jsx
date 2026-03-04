/**
 * ProfilePage - Página de perfil del usuario autenticado
 * Ruta protegida: solo accesible si hay sesión activa.
 */
import { useState } from 'react';
import { useAuthStore, selectAuthUser, selectAuthStatus } from '@/features/auth/store/authStore';
import ProfileCard from '@/features/auth/components/ProfileCard';
import Button from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

// ─── Modal de eliminación de cuenta ──────────────────────────────────────────
function DeleteAccountModal({ onClose, onConfirm, loading }) {
  // step: 'choose' | 'confirm-deactivate' | 'confirm-permanent'
  const [step, setStep] = useState('choose');
  const [mode, setMode] = useState(null); // 'deactivate' | 'permanent'
  const titleId = 'delete-modal-title';

  const handleChoose = (chosen) => {
    setMode(chosen);
    setStep(chosen === 'permanent' ? 'confirm-permanent' : 'confirm-deactivate');
  };

  const handleConfirm = () => {
    onConfirm(mode === 'permanent');
  };

  const handleKeyDown = (e, chosen) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleChoose(chosen);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          width: '100%', maxWidth: '480px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >

        {/* ── Paso 1: elegir modo ── */}
        {step === 'choose' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>
                ¿Qué quieres hacer con tu cuenta?
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                Tus publicaciones ayudan a la comunidad a encontrar mejores precios.
              </p>
            </div>

            {/* Opción desactivar */}
            <button
              type="button"
              onClick={() => handleChoose('deactivate')}
              onKeyDown={(e) => handleKeyDown(e, 'deactivate')}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
                background: 'none', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                🔒 Desactivar mi cuenta
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Tu cuenta se desactiva y no podrás iniciar sesión. Tus publicaciones
                permanecerán visibles para seguir ayudando a la comunidad con precios reales.
              </span>
            </button>

            {/* Opción eliminar permanente */}
            <button
              type="button"
              onClick={() => handleChoose('permanent')}
              onKeyDown={(e) => handleKeyDown(e, 'permanent')}
              style={{
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
                background: 'none', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#fecaca'}
            >
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#dc2626' }}>
                🗑 Eliminar cuenta permanentemente
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Se eliminan tu cuenta y <strong>todos tus datos</strong>: publicaciones,
                votos, tiendas, historial. Esta acción es irreversible.
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                alignSelf: 'flex-end', background: 'none', border: 'none',
                fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
          </>
        )}

        {/* ── Paso 2a: confirmar desactivación ── */}
        {step === 'confirm-deactivate' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>
                Confirmar desactivación
              </h2>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
              }}>
                ℹ️ Tu cuenta quedará desactivada y no podrás iniciar sesión.
                <br /><br />
                <strong style={{ color: 'var(--text-primary)' }}>Tus publicaciones seguirán visibles</strong> para
                ayudar a la comunidad a comparar precios reales. Nadie sabrá que tu
                cuenta está desactivada.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('choose')}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'none',
                  fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--accent)',
                  fontSize: '13px', fontWeight: '600', color: '#080C14',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Procesando...' : 'Sí, desactivar mi cuenta'}
              </button>
            </div>
          </>
        )}

        {/* ── Paso 2b: confirmar eliminación permanente ── */}
        {step === 'confirm-permanent' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: '#dc2626', margin: '0 0 8px' }}>
                ⚠️ Eliminación permanente
              </h2>
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px', color: '#7f1d1d', lineHeight: 1.6,
              }}>
                Esta acción <strong>no se puede deshacer</strong>. Se eliminarán
                permanentemente:
                <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                  <li>Tu cuenta y acceso</li>
                  <li>Todas tus publicaciones de precios</li>
                  <li>Tus votos y reportes</li>
                  <li>Tus tiendas creadas y sus evidencias</li>
                  <li>Tu historial completo</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('choose')}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'none',
                  fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                Atrás
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: '#dc2626',
                  fontSize: '13px', fontWeight: '600', color: '#fff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? 'Eliminando...' : 'Sí, eliminar todo permanentemente'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const user = useAuthStore(selectAuthUser);
  const status = useAuthStore(selectAuthStatus);
  const { updateProfile, logout, deleteAccount } = useAuthStore();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleDeleteConfirm = async (permanent) => {
    setDeleteError(null);
    const result = await deleteAccount(permanent);
    if (result.success) {
      navigate('/');
    } else {
      setDeleteError(result.error);
    }
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

      {/* Zona peligrosa */}
      <div style={{
        marginTop: '20px',
        background: 'var(--bg-surface)',
        border: '1px solid #fecaca',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#dc2626', marginBottom: '6px' }}>
          Zona peligrosa
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
          Puedes desactivar tu cuenta o eliminarla permanentemente.
          Si tienes publicaciones, te explicaremos qué pasa con ellas antes de confirmar.
        </p>

        {deleteError && (
          <div style={{
            background: '#fef2f2', border: '1px solid #fecaca',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            fontSize: '13px', color: '#991b1b', marginBottom: '12px',
          }}>
            ⚠️ {deleteError}
          </div>
        )}

        <button
          onClick={() => { setDeleteError(null); setShowDeleteModal(true); }}
          disabled={status === 'loading'}
          style={{
            padding: '9px 18px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #dc2626',
            background: 'none',
            fontSize: '13px',
            fontWeight: '600',
            color: '#dc2626',
            cursor: 'pointer',
          }}
        >
          Eliminar cuenta
        </button>
      </div>

      {/* Modal */}
      {showDeleteModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
          loading={status === 'loading'}
        />
      )}
    </main>
  );
}
