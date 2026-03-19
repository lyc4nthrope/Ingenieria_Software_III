import { useLanguage } from '@/contexts/LanguageContext';
import { s, MUTED } from '../adminStyles';
import { EmptyMsg, StatusBadge } from '../components/AdminPrimitives';

export function PublicationsTable({
  publications,
  onDelete,
  onView,
  onViewStore,
  onDeleteStore,
  onViewBrand,
  onDeleteBrand,
  deletingId,
  deletingStoreId,
  deletingBrandId,
}) {
  const { t } = useLanguage();
  const td = t.adminDashboard;
  if (publications.length === 0) {
    return <EmptyMsg text={td.noPubsView} />;
  }
  return (
    <div style={s.table} className="admin-table admin-table-pubs">
      <div style={{ ...s.tableHead, gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 1.2fr' }}>
        {[td.colProduct, td.colStore, td.colPrice, td.colAuthor, td.colDate, td.colAction].map(h => (
          <div key={h} style={s.th}>{h}</div>
        ))}
      </div>
      {publications.map(p => (
        <div key={p.id} style={{ ...s.tableRow, gridTemplateColumns: '2fr 1fr 1fr 0.8fr 0.8fr 1.2fr' }}>
          <div style={s.td}>
            <div>
              <div style={s.rowName}>{p.productName || p.product?.name || '—'}</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {td.colBrand}: {p.brandName || p.product?.brand?.name || td.noBrand}
              </div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                {td.colBarcode}: {p.productBarcode || p.product?.barcode || td.noCode}
              </div>
              <StatusBadge status={p.is_active ? 'active' : 'hidden'} />
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  style={{ ...s.filterBtn, padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onViewBrand(p)}
                >
                  {td.viewDetailBtn}
                </button>
                <button
                  style={{ ...s.btnDelete, padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onDeleteBrand(p)}
                  disabled={deletingBrandId === (p.brandId || p.product?.brand?.id)}
                >
                  {deletingBrandId === (p.brandId || p.product?.brand?.id) ? '...' : td.hideBtn}
                </button>
              </div>
            </div>
          </div>
          <div style={s.td}>
            <div>
              <div style={s.rowName}>{p.storeName || p.store?.name || '—'}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button
                  style={{ ...s.filterBtn, padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onViewStore(p)}
                >
                  {td.viewDetailBtn}
                </button>
                <button
                  style={{ ...s.btnDelete, padding: '4px 8px', fontSize: 11 }}
                  onClick={() => onDeleteStore(p)}
                  disabled={deletingStoreId === (p.storeId || p.store?.id || p.store_id)}
                >
                  {deletingStoreId === (p.storeId || p.store?.id || p.store_id) ? '...' : td.hideBtn}
                </button>
              </div>
            </div>
          </div>
          <div style={{ ...s.td, ...s.tdNum }}>
            ${typeof p.price === 'number' ? p.price.toLocaleString('es-CO') : p.price || '—'}
          </div>
          <div style={{ ...s.td, fontSize: 13, color: MUTED }}>{p.authorName || p.userName || p.user?.full_name || '—'}</div>
          <div style={{ ...s.td, fontSize: 12, color: MUTED }}>
            {p.createdAt ? new Date(p.createdAt).toLocaleDateString('es-CO') : '—'}
          </div>
          <div style={{ ...s.td, gap: 6 }}>
            <button
              style={{ ...s.filterBtn, padding: '5px 10px', fontSize: 12 }}
              onClick={() => onView(p)}
              title={td.viewPubBtn}
            >
              {td.viewPubBtn}
            </button>
            <button
              style={s.btnDelete}
              onClick={() => onDelete(p)}
              disabled={deletingId === p.id}
              title={td.colAction}
            >
              {deletingId === p.id ? '...' : '🗑'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PublicationsTable;
