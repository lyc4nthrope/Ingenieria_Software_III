import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { s, CLOSE_BTN_STYLE, TEXT, BORDER } from '../adminStyles';
import { DetailRow } from '../components/AdminPrimitives';

export function StoreDetailModal({ store, onClose, onDelete, isDeleting, onSave }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [name, setName]           = useState(store.name || '');
  const [storeTypeId, setStoreTypeId] = useState(String(store.store_type_id || '1'));
  const [address, setAddress]     = useState(store.address || '');
  const [websiteUrl, setWebsiteUrl] = useState(store.website_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const isPhysical = storeTypeId === '1';

  const save = async () => {
    if (!name.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    setSaved(false);
    const updates = { name: name.trim(), store_type_id: Number(storeTypeId) };
    if (isPhysical) updates.address = address.trim() || null;
    else updates.website_url = websiteUrl.trim() || null;
    const ok = await onSave(store.id, updates);
    setSaving(false);
    if (ok !== false) setSaved(true);
  };
  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.storeDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>ID: {store.id}</p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>✕</button>
        </div>

        <div style={s.detailGrid}>
          <DetailRow label={td.labelName} value={store.name || '—'} />
          <DetailRow label={td.labelType} value={store.typeLabel || '—'} />
          <DetailRow label={td.labelAddress} value={store.address || '—'} />
          <DetailRow label={td.labelWeb} value={store.website_url || '—'} />
          <DetailRow label={td.labelCreatedAt} value={store.created_at ? new Date(store.created_at).toLocaleString('es-CO') : '—'} />
          <DetailRow label={td.labelRelatedPubs} value={store.relatedCount ?? 0} />
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '12px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>Nombre</span>
            <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Nombre de la tienda" />
          </label>

          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>Tipo</span>
            <select value={storeTypeId} onChange={(e) => setStoreTypeId(e.target.value)} style={s.filterSelect}>
              <option value="1">Física</option>
              <option value="2">Virtual</option>
            </select>
          </label>

          {isPhysical ? (
            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Dirección</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Dirección física" />
            </label>
          ) : (
            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Sitio web</span>
              <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="https://..." />
            </label>
          )}
        </div>

        {saved && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>✓ Guardado correctamente</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
          <button onClick={onDelete} style={s.btnDelete} disabled={isDeleting}>
            {isDeleting ? td.hidingBtn : td.hideStoreBtn}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={s.btnDismiss}>Cerrar</button>
            <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving}>
              {saving ? '...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoreDetailModal;
