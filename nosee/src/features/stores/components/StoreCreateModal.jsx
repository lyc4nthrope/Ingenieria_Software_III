/**
 * StoreCreateModal
 *
 * Modal ligero para crear una tienda rápidamente desde el
 * formulario de publicaciones. No incluye mapa ni evidencias;
 * para la creación completa usar la página /tiendas.
 *
 * Props:
 *   initialName {string}           - Nombre pre-relleno desde la búsqueda
 *   onSuccess   {(store) => void}  - Recibe { id, name, type, address }
 *   onClose     {() => void}       - Cierra el modal sin crear
 */

import { useId, useState } from 'react';
import { createStoreSimple } from '@/services/api/stores.api';

const STORE_TYPE_ID = {
  physical: 1,
  virtual: 2,
};

export default function StoreCreateModal({ initialName = '', onSuccess, onClose }) {
  const [name, setName]           = useState(() => initialName);
  const [type, setType]           = useState('physical');
  const [address, setAddress]     = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  const titleId      = useId();
  const nameId       = useId();
  const addressId    = useId();
  const websiteUrlId = useId();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    if (type === 'virtual' && !websiteUrl.trim()) {
      setError('La URL es requerida para tiendas virtuales');
      return;
    }

    setIsSubmitting(true);
    setError(null);

     try {
      const result = await createStoreSimple(
        name,
        STORE_TYPE_ID[type],
        type === 'physical' ? address : null,
        type === 'virtual'  ? websiteUrl : null,
      );

    if (!result.success) {
        setError(result.error || 'No se pudo crear la tienda');
        return;
      }

      onSuccess(result.data);
    } catch (submitError) {
      setError(submitError?.message || 'Error inesperado creando tienda');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cerrar al hacer click en el overlay (no en la card)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={s.overlay} onClick={handleOverlayClick} aria-hidden="true">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={s.card}
        aria-hidden="false"
      >
        {/* Header */}
        <div style={s.header}>
          <h3 id={titleId} style={s.title}>Nueva tienda</h3>
          <button style={s.closeBtn} onClick={onClose} type="button" aria-label="Cerrar">
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <p style={s.hint}>
          Completa los datos básicos. Luego podrás agregar ubicación y fotos desde tu perfil.
        </p>

        {error && (
          <div role="alert" style={s.errorBox}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Nombre */}
          <div style={s.group}>
            <label htmlFor={nameId} style={s.label}>Nombre *</label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Supermercado Central"
              style={s.input}
              aria-required="true"
            />
          </div>

          {/* Tipo */}
          <div style={s.group}>
            <span id="store-type-label" style={s.label}>Tipo *</span>
            <div role="group" aria-labelledby="store-type-label" style={s.typeRow}>
              <button
                type="button"
                aria-pressed={type === 'physical'}
                style={{ ...s.typeBtn, ...(type === 'physical' ? s.typeBtnActive : {}) }}
                onClick={() => setType('physical')}
              >
                Física
              </button>
              <button
                type="button"
                aria-pressed={type === 'virtual'}
                style={{ ...s.typeBtn, ...(type === 'virtual' ? s.typeBtnActive : {}) }}
                onClick={() => setType('virtual')}
              >
                Virtual
              </button>
            </div>
          </div>

          {/* Dirección (solo física) */}
          {type === 'physical' && (
            <div style={s.group}>
              <label htmlFor={addressId} style={s.label}>Dirección (opcional)</label>
              <input
                id={addressId}
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Calle 10 # 25-30"
                style={s.input}
              />
            </div>
          )}

          {/* URL (solo virtual) */}
          {type === 'virtual' && (
            <div style={s.group}>
              <label htmlFor={websiteUrlId} style={s.label}>URL de la tienda *</label>
              <input
                id={websiteUrlId}
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://mitienda.com"
                style={s.input}
                aria-required="true"
              />
            </div>
          )}

          {/* Acciones */}
          <div style={s.actions}>
            <button type="button" onClick={onClose} style={s.cancelBtn}>
              Cancelar
            </button>
            <button type="submit" style={s.submitBtn} disabled={isSubmitting}>
              {isSubmitting ? 'Creando...' : 'Crear tienda'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'var(--overlay)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '24px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: 'var(--shadow-lg)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    padding: '4px',
    lineHeight: 1,
  },
  hint: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  errorBox: {
    background: 'var(--error-soft)',
    border: '1px solid rgba(248,113,113,0.3)',
    color: 'var(--error)',
    padding: '10px 14px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    marginBottom: '16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    background: 'var(--bg-elevated)',
    color: 'var(--text-primary)',
  },
  typeRow: {
    display: 'flex',
    gap: '8px',
  },
  typeBtn: {
    flex: 1,
    padding: '10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
    transition: 'all 0.15s',
  },
  typeBtnActive: {
    background: 'var(--accent-soft)',
    borderColor: 'var(--accent)',
    color: 'var(--accent)',
    fontWeight: 600,
  },
  actions: {
    display: 'flex',
    gap: '10px',
    marginTop: '4px',
  },
  cancelBtn: {
    flex: 1,
    padding: '11px',
    border: '1px solid var(--border-soft)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    background: 'var(--bg-elevated)',
    color: 'var(--text-secondary)',
  },
  submitBtn: {
    flex: 2,
    padding: '11px',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    background: 'var(--accent)',
    color: 'var(--bg-base)',
  },
};
