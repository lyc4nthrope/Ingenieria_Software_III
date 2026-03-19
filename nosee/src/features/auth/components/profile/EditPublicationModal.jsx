import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { updatePublication } from '@/services/api/publications.api';
import { inputStyle, btnStyle } from './profileStyles';

// ─── Modal inline para editar publicación ─────────────────────────────────────
function EditPublicationModal({ publication, onClose, onSave }) {
  const { t } = useLanguage();
  const [price, setPrice] = useState(String(publication.price || ''));
  const [description, setDescription] = useState(publication.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    if (!price || isNaN(Number(price))) { setError(t.profile.invalidPrice); return; }
    setSaving(true);
    setError(null);
    const result = await updatePublication(publication.id, {
      price: Number(price),
      description,
    });
    setSaving(false);
    if (!result.success) { setError(result.error || 'No se pudo actualizar'); return; }
    onSave();
  };

  return (
    <div role="button" tabIndex={0} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(e); }} style={{
      position: 'fixed', inset: 0, background: 'var(--overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '16px',
    }}>
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-xl)', padding: '24px', width: '100%', maxWidth: '420px',
        display: 'flex', flexDirection: 'column', gap: '16px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
          Editar publicación
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
          {publication.product?.name} · {publication.store?.name}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="edit-pub-price" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Precio *</label>
          <input
            id="edit-pub-price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
            step="1"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label htmlFor="edit-pub-desc" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Descripción</label>
          <textarea
            id="edit-pub-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </div>

        {error && <p style={{ fontSize: '13px', color: 'var(--error)', margin: 0 }}>⚠ {error}</p>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)', background: 'none',
            fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving} style={{
            ...btnStyle, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer',
          }}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  );
}

export default EditPublicationModal;
