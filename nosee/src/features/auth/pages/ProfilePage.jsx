/**
 * ProfilePage - Página de perfil del usuario autenticado
 * Ruta protegida: solo accesible si hay sesión activa.
 */
import { useState } from 'react';
import { useAuthStore, selectAuthUser, selectAuthStatus } from '@/features/auth/store/authStore';
import ProfileCard from '@/features/auth/components/ProfileCard';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/services/supabase.client';
import PriceAlertsSection from '@/features/auth/components/profile/PriceAlertsSection';
import DeleteAccountModal from '@/features/auth/components/profile/DeleteAccountModal';
import ProfileActivitySection from '@/features/auth/components/profile/ProfileActivitySection';
import EyeIcon from '@/features/auth/components/profile/EyeIcon';
import CheckIcon from '@/features/auth/components/profile/CheckIcon';
import { PASSWORD_RULES } from '@/features/auth/components/profile/profileUtils';
import { DealerBankSection } from '@/features/auth/components/profile/DealerBankSection';
import { UserRoleEnum } from '@/types';

// ─── ProfilePage ──────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { t } = useLanguage();
  const tp = t.profile;
  const user = useAuthStore(selectAuthUser);
  const status = useAuthStore(selectAuthStatus);
  const { updateProfile, logout, deleteAccount } = useAuthStore();
  const navigate = useNavigate();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!PASSWORD_RULES.every((r) => r.test(pwForm.newPassword))) {
      errors.newPassword = tp.passwordInvalid;
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      errors.confirmPassword = tp.passwordMismatch;
    }
    if (Object.keys(errors).length > 0) { setPwErrors(errors); return; }

    setPwLoading(true);
    setPwErrors({});
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPassword });
    setPwLoading(false);

    if (error) {
      setPwErrors({ server: error.message });
    } else {
      setPwSuccess(true);
      setPwForm({ newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setPwSuccess(false);
        setShowPasswordForm(false);
      }, 2500);
    }
  };

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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {tp.title}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {tp.subtitle}
        </p>
      </div>

      {/* Tarjeta de perfil */}
      <ProfileCard
        user={user}
        onUpdate={updateProfile}
        loading={status === 'loading'}
      />

      <ProfileActivitySection user={user} />

      {/* Sección de seguridad */}
      <div style={{
        marginTop: '20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '14px' }}>
          {tp.securityTitle}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!showPasswordForm ? (
            <Button variant="secondary" size="md" onClick={() => { setShowPasswordForm(true); setPwSuccess(false); setPwErrors({}); }}>
              {tp.changePassword}
            </Button>
          ) : (
            <form onSubmit={handleChangePassword} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: 0 }}>
                Nueva contraseña
              </p>

              {pwErrors.server && (
                <div role="alert" style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--error-soft)', color: 'var(--error)', fontSize: '13px', border: '1px solid rgba(248,113,113,0.25)' }}>
                  {pwErrors.server}
                </div>
              )}

              {pwSuccess && (
                <div style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--success-soft)', color: 'var(--success)', fontSize: '13px', fontWeight: '600' }}>
                  ✓ Contraseña actualizada correctamente
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <Input
                  label={tp.newPassword}
                  id="profile-new-password"
                  name="newPassword"
                  type={showPw ? 'text' : 'password'}
                  value={pwForm.newPassword}
                  onChange={(e) => { setPwForm((p) => ({ ...p, newPassword: e.target.value })); setPwErrors((p) => ({ ...p, newPassword: '' })); }}
                  placeholder={tp.passwordPlaceholder}
                  error={pwErrors.newPassword}
                  iconRight={
                    <button type="button" onClick={() => setShowPw((v) => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }} tabIndex={-1} aria-label={showPw ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      <EyeIcon open={showPw} />
                    </button>
                  }
                  autoComplete="new-password"
                  required
                  disabled={pwLoading}
                />

                {pwForm.newPassword.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {PASSWORD_RULES.map((rule) => {
                      const met = rule.test(pwForm.newPassword);
                      return (
                        <div key={rule.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: met ? 'var(--success)' : 'var(--text-muted)' }}>
                          <span style={{ opacity: met ? 1 : 0.4 }}><CheckIcon /></span>
                          {rule.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Input
                label={tp.confirmPassword}
                id="profile-confirm-password"
                name="confirmPassword"
                type="password"
                value={pwForm.confirmPassword}
                onChange={(e) => { setPwForm((p) => ({ ...p, confirmPassword: e.target.value })); setPwErrors((p) => ({ ...p, confirmPassword: '' })); }}
                placeholder={tp.confirmPlaceholder}
                error={pwErrors.confirmPassword}
                autoComplete="new-password"
                required
                disabled={pwLoading}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <Button type="submit" size="md" loading={pwLoading} disabled={pwLoading}>
                  {tp.savePassword}
                </Button>
                <Button type="button" variant="ghost" size="md" onClick={() => { setShowPasswordForm(false); setPwForm({ newPassword: '', confirmPassword: '' }); setPwErrors({}); }} disabled={pwLoading}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          <Button variant="danger" size="md" onClick={handleLogout} loading={status === 'loading'}>
            {tp.logout}
          </Button>
        </div>
      </div>

      {/* Métodos de cobro — solo repartidores */}
      {user?.role === UserRoleEnum.REPARTIDOR && (
        <DealerBankSection dealerId={user.id} />
      )}

      {/* Alertas de precios */}
      <PriceAlertsSection />

      {/* Zona peligrosa */}
      <div style={{
        marginTop: '20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--error-soft)',
        borderRadius: 'var(--radius-xl)',
        padding: '20px 24px',
      }}>
        <h2 style={{ fontSize: '15px', fontWeight: '600', color: 'var(--error)', marginBottom: '6px' }}>
          {tp.dangerZoneTitle}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: 1.5 }}>
          {tp.dangerZoneDesc}
        </p>

        {deleteError && (
          <div style={{
            background: 'var(--error-soft)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            fontSize: '13px', color: 'var(--error)', marginBottom: '12px',
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
            border: '1px solid var(--error)',
            background: 'none',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--error)',
            cursor: 'pointer',
          }}
        >
          {tp.deleteAccount}
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
