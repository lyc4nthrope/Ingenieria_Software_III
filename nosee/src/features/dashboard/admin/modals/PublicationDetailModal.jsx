import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase.client';
import { useLanguage } from '@/contexts/LanguageContext';
import { s, CLOSE_BTN_STYLE, TEXT, BORDER, SURFACE, MUTED } from '../adminStyles';
import { DetailRow, SectionHeader, StatusBadge } from '../components/AdminPrimitives';

export function PublicationDetailModal({ pub, onClose, onSave, onDelete }) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  const [isActive, setIsActive]       = useState(pub.is_active !== false);
  const [price, setPrice]             = useState(pub.price ?? '');
  const [description, setDescription] = useState(pub.description || '');
  const [photoUrl, setPhotoUrl]       = useState(pub.photoUrl || pub.photo_url || '');

  // Búsqueda de producto
  const [productQuery, setProductQuery]     = useState(pub.productName || pub.product?.name || '');
  const [productId, setProductId]           = useState(pub.productId || pub.product_id || null);
  const [productResults, setProductResults] = useState([]);
  const [searchingProduct, setSearchingProduct] = useState(false);

  // Búsqueda de tienda
  const [storeQuery, setStoreQuery]         = useState(pub.storeName || pub.store?.name || '');
  const [storeId, setStoreId]               = useState(pub.storeId || pub.store_id || null);
  const [storeResults, setStoreResults]     = useState([]);
  const [searchingStore, setSearchingStore] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const authorName = pub.authorName || pub.userName || pub.user?.full_name || '—';
  const createdAt  = pub.createdAt  ? new Date(pub.createdAt).toLocaleString('es-CO') : '—';
  const confidence = typeof pub.confidenceScore === 'number' ? pub.confidenceScore.toFixed(2) : '—';
  const productBarcode = pub.productBarcode || pub.product?.barcode || 'Sin código';
  const brandName      = pub.brandName || pub.product?.brand?.name || 'Sin marca';

  // Buscar productos al escribir
  useEffect(() => {
    if (productQuery.length < 2) { setProductResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingProduct(true);
      const { data } = await supabase.from('products').select('id, name, barcode, brand:brands(name)').ilike('name', `%${productQuery}%`).limit(8);
      setProductResults(data || []);
      setSearchingProduct(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [productQuery]);

  // Buscar tiendas al escribir
  useEffect(() => {
    if (storeQuery.length < 2) { setStoreResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingStore(true);
      const { data } = await supabase.from('stores').select('id, name, address, store_type_id').ilike('name', `%${storeQuery}%`).limit(8);
      setStoreResults(data || []);
      setSearchingStore(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [storeQuery]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const db = { is_active: isActive, description: description?.trim() || null };
    const parsedPrice = Number(price);
    if (!isNaN(parsedPrice) && parsedPrice > 0) db.price = parsedPrice;
    if (productId && productId !== (pub.productId || pub.product_id)) db.product_id = productId;
    if (storeId && storeId !== (pub.storeId || pub.store_id)) db.store_id = storeId;
    if (photoUrl.trim() !== (pub.photoUrl || pub.photo_url || '')) db.photo_url = photoUrl.trim() || null;
    const ui = {};
    if (db.product_id) { ui.productId = productId; ui.productName = productQuery; }
    if (db.store_id)   { ui.storeId = storeId; ui.storeName = storeQuery; }
    if (db.photo_url !== undefined) ui.photoUrl = db.photo_url;
    const ok = await onSave({ db, ui });
    setSaving(false);
    if (ok !== false) setSaved(true);
  };

  return (
    <div role="button" tabIndex={0} style={s.modalOverlay} onClick={onClose} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}>
      <div role="button" tabIndex={0} style={{ ...s.modalCard, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, color: TEXT }}>{td.pubDetailTitle}</h2>
            <p style={{ ...s.headerSub, margin: '4px 0 0' }}>ID: {pub.id}</p>
          </div>
          <button onClick={onClose} style={CLOSE_BTN_STYLE}>✕</button>
        </div>

        {/* Detalle */}
        <div style={{ ...s.section, marginBottom: 16, marginTop: 0 }}>
          <div style={{ ...s.sectionHead, marginBottom: 10 }}>
            <span style={s.sectionTitle}>{td.pubDetailTitle}</span>
            <StatusBadge status={pub.is_active ? 'active' : 'hidden'} />
          </div>
          <div style={s.detailGrid}>
            <DetailRow label={td.pubProductLabel} value={productQuery || '—'} />
            <DetailRow label={td.pubBarcodeLabel} value={productBarcode} />
            <DetailRow label={td.pubBrandLabel} value={brandName} />
            <DetailRow label={td.pubStoreLabel}   value={storeQuery || '—'} />
            <DetailRow label={td.pubPriceLabel}   value={`$${typeof pub.price === 'number' ? pub.price.toLocaleString('es-CO') : pub.price || '—'}`} />
            <DetailRow label={td.pubAuthorLabel}  value={authorName} />
            <DetailRow label={td.pubDateLabel}    value={createdAt} />
            <DetailRow label={td.pubConfidenceLabel} value={confidence} />
            <DetailRow label={td.pubDescriptionLabel} value={pub.description || '—'} />
          </div>
        </div>

        {/* Imagen */}
        {pub.photoUrl && (
          <div style={{ marginBottom: 16 }}>
            <img
              src={pub.photoUrl}
              alt={td.pubPhotoAlt}
              style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: `1px solid ${BORDER}` }}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>
        )}

        <hr style={{ border: 'none', borderTop: `1px solid ${BORDER}`, margin: '0 0 16px' }} />

        {/* Edición */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>{td.pubVisibilityLabel}</span>
            <select
              value={isActive ? 'visible' : 'hidden'}
              onChange={(e) => setIsActive(e.target.value === 'visible')}
              style={s.filterSelect}
            >
              <option value="visible">{td.pubIsActiveLabel}</option>
              <option value="hidden">{td.pubIsHiddenLabel}</option>
            </select>
          </label>

          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>{td.pubPriceLabel}</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              style={{ ...s.filterSelect, fontFamily: 'inherit' }}
              min={0}
              placeholder={td.pricePlaceholder}
            />
          </label>

          {/* Producto */}
          <div style={s.filterLabelWrap}>
            <span style={s.filterLabel}>Producto</span>
            <div style={{ position: 'relative' }}>
              <input
                value={productQuery}
                onChange={(e) => { setProductQuery(e.target.value); setProductId(null); }}
                style={{ ...s.filterSelect, fontFamily: 'inherit' }}
                placeholder="Buscar producto..."
              />
              {searchingProduct && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: MUTED }}>...</span>}
              {productResults.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  {productResults.map(pr => (
                    <button key={pr.id} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: TEXT, cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${BORDER}` }}
                      onClick={() => { setProductId(pr.id); setProductQuery(pr.name); setProductResults([]); }}>
                      <strong>{pr.name}</strong>
                      {pr.brand?.name && <span style={{ color: MUTED, marginLeft: 6 }}>— {pr.brand.name}</span>}
                      {pr.barcode && <span style={{ color: MUTED, marginLeft: 6, fontSize: 11 }}>{pr.barcode}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {productId && <span style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ ID: {productId}</span>}
          </div>

          {/* Tienda */}
          <div style={s.filterLabelWrap}>
            <span style={s.filterLabel}>Tienda</span>
            <div style={{ position: 'relative' }}>
              <input
                value={storeQuery}
                onChange={(e) => { setStoreQuery(e.target.value); setStoreId(null); }}
                style={{ ...s.filterSelect, fontFamily: 'inherit' }}
                placeholder="Buscar tienda..."
              />
              {searchingStore && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: MUTED }}>...</span>}
              {storeResults.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 10, top: '100%', left: 0, right: 0, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                  {storeResults.map(sr => (
                    <button key={sr.id} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', color: TEXT, cursor: 'pointer', fontSize: 13, borderBottom: `1px solid ${BORDER}` }}
                      onClick={() => { setStoreId(sr.id); setStoreQuery(sr.name); setStoreResults([]); }}>
                      <strong>{sr.name}</strong>
                      {sr.address && <span style={{ color: MUTED, marginLeft: 6, fontSize: 11 }}>{sr.address}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {storeId && <span style={{ fontSize: 11, color: 'var(--success)', marginTop: 4 }}>✓ ID: {storeId}</span>}
          </div>

          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>URL de foto</span>
            <input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              style={{ ...s.filterSelect, fontFamily: 'inherit' }}
              placeholder="https://..."
            />
          </label>

          <label style={s.filterLabelWrap}>
            <span style={s.filterLabel}>{td.pubDescriptionLabel}</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ ...s.filterSelect, fontFamily: 'inherit', resize: 'vertical' }}
              placeholder={td.descriptionPlaceholder}
            />
          </label>
        </div>

        {saved && (
          <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--success)', textAlign: 'right' }}>
            ✓ {td.pubSavedOk}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 10 }}>
          <button onClick={onDelete} style={s.btnDelete}>{td.deletePublicationBtn}</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={s.btnDismiss}>{td.cancel}</button>
            <button onClick={save} style={{ ...s.filterBtn, ...s.filterBtnActive }} disabled={saving}>
              {saving ? '...' : td.savePubBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PublicationDetailModal;
