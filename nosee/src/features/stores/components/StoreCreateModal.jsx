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

import { useState } from 'react';
import { createStoreSimple } from '@/services/api/stores.api';

export default function StoreCreateModal({ initialName = '', onSuccess, onClose }) {
  const [name, setName]           = useState(initialName);
  const [type, setType]           = useState('physical');
  const [address, setAddress]     = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]         = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('El nombre es requerido'); return; }
    if (type === 'virtual' && !websiteUrl.trim()) {
      setError('La URL es requerida para tiendas virtuales');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await createStoreSimple(
      name,
      type,
      type === 'physical' ? address : null,
      type === 'virtual'  ? websiteUrl : null,
    );

    setIsSubmitting(false);

    if (!result.success) { setError(result.error); return; }
    onSuccess(result.data);
  };

  // Cerrar al hacer click en el overlay (no en la card)
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div style={s.overlay} onClick={handleOverlayClick}>
      <div style={s.card}>
        {/* Header */}
        <div style={s.header}>
          <h3 style={s.title}>Nueva tienda</h3>
          <button style={s.closeBtn} onClick={onClose} type="button" aria-label="Cerrar">✕</button>
        </div>

        <p style={s.hint}>
          Completa los datos básicos. Luego podrás agregar ubicación y fotos desde tu perfil.
        </p>

        {error && <div style={s.errorBox}>{error}</div>}

        <form onSubmit={handleSubmit} style={s.form}>
          {/* Nombre */}
          <div style={s.group}>
            <label style={s.label}>Nombre *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Supermercado Central"
              style={s.input}
              autoFocus
            />
          </div>

          {/* Tipo */}
          <div style={s.group}>
            <label style={s.label}>Tipo *</label>
            <div style={s.typeRow}>
              <button
                type="button"
                style={{ ...s.typeBtn, ...(type === 'physical' ? s.typeBtnActive : {}) }}
                onClick={() => setType('physical')}
              >
                Física
              </button>
              <button
                type="button"
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
              <label style={s.label}>Dirección (opcional)</label>
              <input
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
              <label style={s.label}>URL de la tienda *</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://mitienda.com"
                style={s.input}
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
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  card: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
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
    color: '#111',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: '#666',
    padding: '4px',
    lineHeight: 1,
  },
  hint: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '20px',
    lineHeight: 1.5,
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    padding: '10px 14px',
    borderRadius: '8px',
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
    color: '#333',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
  },
  typeRow: {
    display: 'flex',
    gap: '8px',
  },
  typeBtn: {
    flex: 1,
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    background: '#f9f9f9',
    color: '#555',
    transition: 'all 0.15s',
  },
  typeBtnActive: {
    background: '#ff6b35',
    borderColor: '#ff6b35',
    color: '#fff',
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
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    background: '#f5f5f5',
    color: '#555',
  },
  submitBtn: {
    flex: 2,
    padding: '11px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    background: '#ff6b35',
    color: '#fff',
  },
};
