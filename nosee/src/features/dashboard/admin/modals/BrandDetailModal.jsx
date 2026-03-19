import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { s, CLOSE_BTN_STYLE, TEXT, BORDER } from '../adminStyles';
import { DetailRow } from '../components/AdminPrimitives';

export function BrandDetailModal({ brand, onClose, onDelete, isDeleting, onSave }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [name, setName] = useState(brand.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const save = async () => {
    if (!name.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    setSaved(false);
    const ok = await onSave(brand.id, { name: name.trim() });
    setSaving(false);
    if (ok !== false) setSaved(true);
  };
  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxWidth: 560 }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.brandDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>ID: {brand.id}</p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>✕</button>
        </div>
        <div style={s.detailGrid}>
          <DetailRow label={td.colProduct} value={brand.productName || '—'} />
          <DetailRow label={td.colBarcode} value={brand.productBarcode || td.noCode} />
          <DetailRow label={td.colBrand} value={brand.name || '—'} />
          <DetailRow label={td.labelAssociatedProducts} value={brand.productsCount ?? 0} />
          <DetailRow label={td.labelCreatedAt} value={brand.created_at ? new Date(brand.created_at).toLocaleString('es-CO') : '—'} />
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '12px 0' }} />

        <label style={s.filterLabelWrap}>
          <span style={s.filterLabel}>Nombre de la marca</span>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Nombre de la marca" />
        </label>

        {saved && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>✓ Guardado correctamente</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
          <button onClick={onDelete} style={s.btnDelete} disabled={isDeleting}>
            {isDeleting ? td.hidingBtn : td.hideBrandBtn}
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

export default BrandDetailModal;
