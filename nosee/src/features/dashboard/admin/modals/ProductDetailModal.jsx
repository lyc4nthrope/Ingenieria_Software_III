import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase.client';
import { useLanguage } from '@/contexts/LanguageContext';
import { s, CLOSE_BTN_STYLE, TEXT, BORDER, MUTED } from '../adminStyles';
import { DetailRow } from '../components/AdminPrimitives';

export function ProductDetailModal({ product, onClose, onDelete, isDeleting, onSave }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [name, setName]             = useState(product?.name || '');
  const [barcode, setBarcode]       = useState(product?.barcode || '');
  const [baseQuantity, setBaseQuantity] = useState(product?.base_quantity ?? '');
  const [brandId, setBrandId]       = useState(product?.brand?.id ?? '');
  const [unitTypeId, setUnitTypeId] = useState(product?.unit?.id ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? '');

  const [categories, setCategories] = useState([]);
  const [unitTypes, setUnitTypes]   = useState([]);
  const [brands, setBrands]         = useState([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from('product_categories').select('id, name').order('name'),
      supabase.from('unit_types').select('id, name, abbreviation').order('name'),
      supabase.from('brands').select('id, name').order('name').limit(300),
    ]).then(([cats, units, brnds]) => {
      setCategories(cats.data || []);
      setUnitTypes(units.data || []);
      setBrands(brnds.data || []);
      setLoadingMeta(false);
    });
  }, []);

  const save = async () => {
    if (!name.trim()) { alert('El nombre es obligatorio.'); return; }
    setSaving(true);
    setSaved(false);
    const updates = { name: name.trim(), barcode: barcode.trim() || null };
    if (baseQuantity !== '') updates.base_quantity = Number(baseQuantity);
    if (brandId !== '') updates.brand_id = Number(brandId);
    if (unitTypeId !== '') updates.unit_type_id = Number(unitTypeId);
    if (categoryId !== '') updates.category_id = Number(categoryId);
    const ok = await onSave(product.id, updates);
    setSaving(false);
    if (ok !== false) setSaved(true);
  };


  const quantity = product?.base_quantity != null && product?.unit?.abbreviation
    ? `${product.base_quantity} ${product.unit.abbreviation}`
    : product?.base_quantity != null && product?.unit?.name
      ? `${product.base_quantity} ${product.unit.name}`
      : product?.base_quantity ?? '—';

  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.productDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>ID: {product.id}</p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>✕</button>
        </div>

        <div style={s.detailGrid}>
          <DetailRow label={td.colProduct} value={product?.name || '—'} />
          <DetailRow label={td.colBrand} value={product?.brand?.name || td.noBrand} />
          <DetailRow label={td.colBarcode} value={product?.barcode || td.noCode} />
          <DetailRow label={td.labelBaseQuantity} value={quantity} />
          <DetailRow label={td.labelCreatedAtProduct} value={product?.created_at ? new Date(product.created_at).toLocaleString('es-CO') : '—'} />
        </div>

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '12px 0' }} />

        {loadingMeta ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: MUTED, fontSize: 13 }}>Cargando opciones...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Nombre del producto</span>
              <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Nombre del producto" />
            </label>

            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Código de barras</span>
              <input value={barcode} onChange={(e) => setBarcode(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} placeholder="Código de barras (opcional)" />
            </label>

            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Marca</span>
              <select value={brandId} onChange={(e) => setBrandId(e.target.value)} style={s.filterSelect}>
                <option value="">Sin marca</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>

            <label style={s.filterLabelWrap}>
              <span style={s.filterLabel}>Categoría</span>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={s.filterSelect}>
                <option value="">Sin categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>

            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ ...s.filterLabelWrap, flex: 1 }}>
                <span style={s.filterLabel}>Cantidad base</span>
                <input type="number" value={baseQuantity} onChange={(e) => setBaseQuantity(e.target.value)} style={{ ...s.filterSelect, fontFamily: 'inherit' }} min={0} placeholder="Ej: 500" />
              </label>
              <label style={{ ...s.filterLabelWrap, flex: 1 }}>
                <span style={s.filterLabel}>Unidad</span>
                <select value={unitTypeId} onChange={(e) => setUnitTypeId(e.target.value)} style={s.filterSelect}>
                  <option value="">Sin unidad</option>
                  {unitTypes.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                </select>
              </label>
            </div>
          </div>
        )}

        {saved && <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>✓ Guardado correctamente</p>}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, gap: 10 }}>
          <button onClick={onDelete} style={s.btnDelete} disabled={isDeleting}>
            {isDeleting ? td.hidingBtn : td.hideProductBtn}
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={s.btnDismiss}>Cerrar</button>
            <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving || loadingMeta}>
              {saving ? '...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailModal;
