/**
 * ProfileCard - Tarjeta que muestra y permite editar el perfil del usuario
 */
import { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const UserIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);

const RoleBadge = ({ role }) => {
  const colors = {
    admin: { bg: 'rgba(251,191,36,0.15)', color: '#FBBF24', border: 'rgba(251,191,36,0.3)' },
    moderator: { bg: 'rgba(167,139,250,0.15)', color: '#A78BFA', border: 'rgba(167,139,250,0.3)' },
    user: { bg: 'var(--accent-soft)', color: 'var(--accent)', border: 'rgba(56,189,248,0.3)' },
  };
  const c = colors[role] || colors.user;
  const labels = { admin: 'Administrador', moderator: 'Moderador', user: 'Usuario' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: '600',
      letterSpacing: '0.04em', textTransform: 'uppercase',
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
    }}>
      {labels[role] || role}
    </span>
  );
};

export default function ProfileCard({ user, onUpdate, loading = false }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: user?.fullName || '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) { setError('El nombre no puede estar vacío'); return; }

    const result = await onUpdate({ fullName: form.fullName.trim() });
    if (result?.success) {
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result?.error || 'Error al actualizar perfil');
    }
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.[0]?.toUpperCase() || 'U';

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      animation: 'fadeIn 0.3s ease',
    }}>
      {/* Header con gradiente */}
      <div style={{
        height: '100px',
        background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(14,165,233,0.05) 100%)',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
      }} />

      {/* Contenido */}
      <div style={{ padding: '0 24px 28px' }}>
        {/* Avatar */}
        <div style={{
          width: '72px', height: '72px',
          borderRadius: '50%',
          background: 'var(--bg-elevated)',
          border: '3px solid var(--bg-surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '24px', fontWeight: '700', color: 'var(--accent)',
          marginTop: '-36px',
          marginBottom: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt={user.fullName || 'Avatar'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>

        {!editing ? (
          /* Vista de lectura */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {user?.fullName || 'Sin nombre'}
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {user?.email}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                <EditIcon /> Editar
              </Button>
            </div>

            <div style={{ marginTop: '8px' }}>
              <RoleBadge role={user?.role || 'user'} />
            </div>

            {success && (
              <p style={{ fontSize: '13px', color: 'var(--success)', marginTop: '8px' }}>
                ✓ Perfil actualizado correctamente
              </p>
            )}

            {/* Stats placeholder */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px', marginTop: '20px',
              background: 'var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden',
            }}>
              {[
                { label: 'Publicaciones', value: '0' },
                { label: 'Validaciones', value: '0' },
                { label: 'Reputación', value: '0' },
              ].map(stat => (
                <div key={stat.label} style={{
                  padding: '14px', textAlign: 'center', background: 'var(--bg-elevated)',
                }}>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{stat.value}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Modo edición */
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text-primary)' }}>
              Editar perfil
            </h3>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--error-soft)', color: 'var(--error)', fontSize: '13px',
              }}>
                {error}
              </div>
            )}

            <Input
              label="Nombre completo"
              id="profile-fullname"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Tu nombre"
              required
              disabled={loading}
            />

            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Email: <span style={{ color: 'var(--text-secondary)' }}>{user?.email}</span>
              <br />
              <small>(El email no se puede cambiar aquí)</small>
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <Button type="submit" loading={loading} disabled={loading} size="md">
                Guardar cambios
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => { setEditing(false); setError(null); setForm({ fullName: user?.fullName || '' }); }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}