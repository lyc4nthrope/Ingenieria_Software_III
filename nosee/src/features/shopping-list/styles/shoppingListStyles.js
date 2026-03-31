// ─── Estilos ──────────────────────────────────────────────────────────────────
export const page = {
  header: {
    textAlign: 'center', marginBottom: '16px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
  },
  title: { fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  badge: {
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '999px', fontSize: '12px', fontWeight: 600,
    padding: '3px 12px',
  },
  tabBar: {
    display: 'flex', gap: '4px',
    borderBottom: '2px solid var(--border)',
    marginBottom: '20px',
  },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px',
    background: 'none', border: 'none',
    borderBottom: '2px solid transparent', marginBottom: '-2px',
    fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)',
    cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
  },
  tabBtnActive: {
    color: 'var(--accent)',
    borderBottomColor: 'var(--accent)',
  },
  tabBadge: {
    padding: '1px 7px', borderRadius: '999px',
    background: 'var(--bg-elevated)', color: 'var(--text-muted)',
    fontSize: '11px', fontWeight: 700,
    border: '1px solid var(--border)',
  },
  tabBadgeActive: {
    background: 'var(--accent-soft)', color: 'var(--accent)',
    borderColor: 'var(--accent)',
  },
  content: { maxWidth: '600px', margin: '0 auto', width: '100%' },
};

// ── Lista tab styles ───────────────────────────────────────────────────────────
export const lista = {
  root: { display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0, overflow: 'hidden' },

  inputRow: { display: 'flex', gap: '8px' },
  input: {
    flex: 1, padding: '10px 14px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-base)', color: 'var(--text-primary)',
    fontSize: '14px', outline: 'none',
  },
  addBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '42px', height: '42px', flexShrink: 0,
    borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
  },

  empty: {
    padding: '32px 24px', textAlign: 'center',
    background: 'var(--bg-surface)', border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-md)',
    display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center',
  },
  emptyText: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  emptyHint: { fontSize: '12px', color: 'var(--text-muted)', margin: 0 },

  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0 2px',
  },
  itemCount: { fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 },
  saveBtn: {
    background: 'none', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600,
    color: 'var(--text-secondary)', cursor: 'pointer', padding: '3px 8px',
  },
  clearBtn: { background: 'none', border: 'none', fontSize: '12px', color: 'var(--error)', cursor: 'pointer', padding: '2px 4px' },

  // Notificación de guardado
  saveNotice: {
    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
    fontSize: '12px', fontWeight: 600,
  },
  saveNoticeSuccess: {
    background: 'var(--success-soft, #dcfce7)',
    color: 'var(--success, #16a34a)',
    border: '1px solid var(--success, #16a34a)',
  },
  saveNoticeError: {
    background: 'var(--error-soft, #fee2e2)',
    color: 'var(--error, #dc2626)',
    border: '1px solid var(--error, #dc2626)',
  },

  saveRow: { display: 'flex', gap: '6px' },
  saveInput: {
    flex: 1, padding: '8px 12px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)',
    background: 'var(--bg-base)', color: 'var(--text-primary)',
    fontSize: '13px', outline: 'none',
  },
  saveConfirmBtn: {
    padding: '8px 14px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontSize: '12px', fontWeight: 700, flexShrink: 0,
  },

  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px', overflowX: 'hidden' },
  itemWrap: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  item: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--bg-surface)',
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
    borderTopLeftRadius: 'var(--radius-md)', borderTopRightRadius: 'var(--radius-md)',
    borderBottomLeftRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)',
    padding: '10px 12px',
    transition: 'border-color 0.15s',
  },
  itemExpanded: {
    borderColor: 'var(--accent)',
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },

  // Checkbox
  checkbox: {
    width: '15px', height: '15px', flexShrink: 0,
    accentColor: 'var(--accent)', cursor: 'pointer',
  },

  itemText: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 },
  itemName: { fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' },
  itemChecked: {
    textDecoration: 'line-through',
    color: 'var(--text-muted)',
    fontWeight: 400,
  },
  itemBestPrice: { fontSize: '11px', color: 'var(--accent)', fontWeight: 700 },
  itemNoPubs: { fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' },

  // Badge de opciones inline
  optionsBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '3px',
    padding: '2px 7px',
    borderRadius: '999px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    fontSize: '11px', fontWeight: 600, flexShrink: 0,
  },

  removeBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '5px', borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center', flexShrink: 0,
  },

  carouselWrap: {
    marginTop: '-1px',
    borderTopWidth: 0,
    borderRightWidth: '1px', borderBottomWidth: '1px', borderLeftWidth: '1px',
    borderStyle: 'solid', borderColor: 'var(--accent)',
    borderTopLeftRadius: 0, borderTopRightRadius: 0,
    borderBottomLeftRadius: 'var(--radius-md)', borderBottomRightRadius: 'var(--radius-md)',
    background: 'var(--bg-elevated)',
    padding: '10px',
    overflow: 'hidden',
    maxWidth: '100%',
  },

  totalCard: {
    background: 'var(--bg-surface)', border: '2px solid var(--accent)',
    borderRadius: 'var(--radius-md)', padding: '12px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  totalCardInner: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
  },
  totalLabel: {
    fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  },
  totalValue: {
    fontSize: '22px', fontWeight: 800, color: 'var(--accent)', lineHeight: 1.2,
  },
  totalCurrency: { fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' },
  totalSub: { fontSize: '11px', color: 'var(--text-muted)' },

  errorMsg: {
    fontSize: '13px', color: 'var(--error)',
    background: 'var(--error-soft, #fee2e2)',
    padding: '10px 14px', borderRadius: 'var(--radius-sm)', margin: 0,
  },

  // ── Selector de modo (intención primero) ──
  modeBlock: { display: 'flex', flexDirection: 'column', gap: '8px' },
  modeLabel: {
    fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', margin: 0,
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  modeRow: { display: 'flex', gap: '10px' },
  modeCard: {
    flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center',
    padding: '14px 10px', borderRadius: 'var(--radius-md)', border: '2px solid var(--border)',
    background: 'var(--bg-surface)', cursor: 'pointer', transition: 'all 0.15s',
    textAlign: 'center',
  },
  modeCardActive: { borderColor: 'var(--accent)', background: 'var(--accent-soft)' },
  modeCardIcon: { fontSize: '22px', lineHeight: 1 },
  modeCardName: { fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' },
  modeCardDesc: { fontSize: '11px', color: 'var(--text-secondary)', margin: 0 },
  modeCardFee: { fontSize: '10px', color: 'var(--text-muted)', margin: 0 },

  // ── Badge modo activo (post-optimización) ──
  modeBadgeBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '7px 12px', background: 'var(--accent-soft)',
    border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)',
  },
  modeBadgeText: { fontSize: '12px', fontWeight: 700, color: 'var(--accent)' },
  modeBadgeChange: {
    background: 'none', border: 'none', fontSize: '11px', color: 'var(--accent)',
    cursor: 'pointer', fontWeight: 600, padding: 0, textDecoration: 'underline',
  },

  // ── Botón confirmar único ──
  confirmBtn: {
    padding: '14px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontWeight: 800, fontSize: '14px', cursor: 'pointer', width: '100%',
  },

  calcRow: {
    display: 'flex', gap: '8px', marginTop: '4px', alignItems: 'stretch',
  },
  calcBtn: {
    flex: 1,
    padding: '12px 16px',
    borderRadius: 'var(--radius-md)', border: '1px solid var(--accent)',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    fontWeight: 800, fontSize: '14px',
  },
  gearBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: '44px', flexShrink: 0,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  gearBtnActive: {
    background: 'var(--accent-soft)', color: 'var(--accent)',
    borderColor: 'var(--accent)',
  },

  // ── Optimized item card ──
  optimItemWrap: { display: 'flex', flexDirection: 'column', minWidth: 0 },
  optimItemRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '12px 14px',
    transition: 'border-color 0.15s',
  },
  optimItemRowExpanded: {
    borderColor: 'var(--accent)',
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
  },
  optimItemAvatar: {
    width: '42px', height: '42px', flexShrink: 0,
    borderRadius: '50%',
    background: 'var(--accent-soft)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '16px', fontWeight: 800, color: 'var(--accent)',
    textTransform: 'uppercase',
    border: '1px solid var(--accent)',
  },
  optimItemBody: { flex: 1, display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 },
  optimItemName: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 },
  optimItemMeta: { fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' },
  optimItemQty: {
    display: 'inline-flex', alignItems: 'center',
    padding: '1px 7px', borderRadius: '999px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', fontSize: '11px', fontWeight: 700,
  },
  optimItemRight: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  optimItemPrice: { fontSize: '15px', fontWeight: 800, color: 'var(--accent)', textAlign: 'right', lineHeight: 1.2 },
  optimItemPriceSub: { fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right' },
  optimItemActions: { display: 'flex', alignItems: 'center', gap: '4px' },
  optimChevronBtn: {
    background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)',
    cursor: 'pointer', padding: '5px 7px', borderRadius: 'var(--radius-sm)',
    display: 'flex', alignItems: 'center', transition: 'all 0.15s',
  },
  optimChevronBtnActive: {
    background: 'var(--accent-soft)', borderColor: 'var(--accent)', color: 'var(--accent)',
  },

  // ── Summary bar + info banner ──
  summaryBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px',
    background: 'var(--bg-surface)', border: '2px solid var(--accent)',
    borderRadius: 'var(--radius-md)',
  },
  summaryLeft: { display: 'flex', flexDirection: 'column', gap: '2px' },
  summaryTitle: { fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' },
  summaryCount: { fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' },
  summaryTotal: { fontSize: '22px', fontWeight: 800, color: 'var(--accent)' },
  summaryTotalCurrency: { fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' },

  infoBanner: {
    padding: '10px 14px',
    background: 'var(--accent-soft)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-md)',
    fontSize: '12px', color: 'var(--accent)',
    lineHeight: 1.5,
  },

  proceedBtn: {
    padding: '14px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontWeight: 800, fontSize: '14px', cursor: 'pointer', width: '100%',
  },
};

// ── Optim settings panel styles ───────────────────────────────────────────────
export const optim = {
  panel: {
    background: 'var(--bg-surface)', border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-md)', padding: '14px 16px',
    display: 'flex', flexDirection: 'column', gap: '14px',
  },
  panelHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  panelTitle: {
    fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  resetBtn: {
    background: 'none', border: 'none',
    fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer',
    textDecoration: 'underline', padding: 0,
  },
  section: { display: 'flex', flexDirection: 'column', gap: '6px' },
  sectionLabel: {
    fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0,
  },
  sectionHint: {
    fontSize: '11px', color: 'var(--text-muted)', margin: 0,
  },
  segmentRow: {
    display: 'flex', gap: '4px',
  },
  segmentBtn: {
    flex: 1, padding: '7px 4px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)',
    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.15s', textAlign: 'center',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  segmentBtnActive: {
    background: 'var(--accent-soft)', color: 'var(--accent)',
    borderColor: 'var(--accent)', fontWeight: 700,
  },
  sliderHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  sliderValue: {
    fontSize: '13px', fontWeight: 800, color: 'var(--accent)',
  },
  sliderWrap: {
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  slider: {
    flex: 1, accentColor: 'var(--accent)',
    height: '4px', cursor: 'pointer',
  },
  sliderEdge: {
    fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0,
  },
  locationBtn: {
    padding: '7px 12px',
    borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent)',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    fontSize: '12px', fontWeight: 700, cursor: 'pointer', alignSelf: 'flex-start',
  },
  toggleRow: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    cursor: 'pointer',
  },
  toggle: {
    width: '38px', height: '22px',
    borderRadius: '999px',
    position: 'relative', cursor: 'pointer',
    transition: 'background 0.2s', flexShrink: 0,
    border: 'none', outline: 'none',
  },
  toggleThumb: {
    position: 'absolute', top: '3px',
    width: '16px', height: '16px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s',
    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  },
};

// ── Carousel styles ────────────────────────────────────────────────────────────
export const carousel = {
  // Track unificado: scroll horizontal con carga infinita
  infiniteTrack: {
    display: 'flex', gap: '8px',
    overflowX: 'auto', overflowY: 'hidden',
    paddingBottom: '6px', paddingRight: '4px',
  },
  loadMoreSentinel: {
    flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '48px', height: '100%',
    color: 'var(--text-muted)',
    alignSelf: 'center',
  },
  empty: {
    fontSize: '12px', color: 'var(--text-muted)',
    fontStyle: 'italic', padding: '4px 0',
  },
  card: {
    flexShrink: 0,
    width: '150px',
    display: 'flex', flexDirection: 'column', gap: '4px',
    padding: '10px 12px',
    background: 'var(--bg-surface)',
    borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)',
    borderRadius: 'var(--radius-md)', cursor: 'pointer',
    textAlign: 'left', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  cardSelected: {
    borderColor: 'var(--accent)',
    boxShadow: '0 0 0 2px var(--accent)',
    background: 'var(--accent-soft, rgba(99,102,241,0.08))',
  },
  bestBadge: {
    fontSize: '10px', fontWeight: 800, color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  selectedBadge: {
    fontSize: '10px', fontWeight: 800, color: 'var(--accent)',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  storeName: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  price: { fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)' },
  currency: { fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)' },
  prodName: { fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  unitQty: {
    fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  detailBtn: {
    marginTop: '6px',
    background: 'none', border: 'none',
    color: 'var(--accent)', fontSize: '10px', fontWeight: 600,
    cursor: 'pointer', padding: 0, textAlign: 'left',
    textDecoration: 'underline', textUnderlineOffset: '2px',
  },
};

// ── Pedidos tab styles ─────────────────────────────────────────────────────────
export const pedidos = {
  root: { display: 'flex', flexDirection: 'column', gap: '10px' },

  empty: {
    padding: '40px 24px', textAlign: 'center',
    background: 'var(--bg-surface)', border: '1px dashed var(--border)',
    borderRadius: 'var(--radius-md)',
    display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center',
  },
  emptyText: { fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  emptyHint: { fontSize: '12px', color: 'var(--text-muted)', margin: 0 },

  carousel: {
    display: 'flex', gap: '8px', overflowX: 'auto',
    paddingBottom: '4px', scrollbarWidth: 'none',
  },
  pill: {
    flexShrink: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
    padding: '10px 18px', borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)', background: 'var(--bg-surface)',
    cursor: 'pointer', transition: 'all 0.15s', minWidth: '90px',
  },
  pillActive: {
    background: 'var(--accent)', borderColor: 'var(--accent)', color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  pillId: { fontSize: '14px', fontWeight: 800, fontFamily: 'monospace' },
  pillDate: { fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 },
  pillTotal: { fontSize: '11px', fontWeight: 700, marginTop: '2px' },

  orderHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 14px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  orderHeaderLeft: { display: 'flex', flexDirection: 'column', gap: '1px' },
  orderRef: { fontSize: '13px', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' },
  orderDate: { fontSize: '11px', color: 'var(--text-muted)' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
  },

  stats: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '8px',
  },
  stat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
    padding: '10px 8px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  statVal: { fontSize: '15px', fontWeight: 800, color: 'var(--accent)' },
  statLabel: { fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' },

  productsWrap: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    maxHeight: '320px', overflowY: 'auto',
  },
  storeBlock: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
  },
  storeBlockHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 14px', background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
  },
  prodList: { listStyle: 'none', margin: 0, padding: 0 },
  prodItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px', borderBottom: '1px solid var(--border)',
    fontSize: '13px',
  },
  prodName: { fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' },
  prodMeta: { fontSize: '11px', color: 'var(--text-muted)' },
  prodTotal: { fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '8px' },

  mapWrap: {
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
    border: '1px solid var(--border)',
  },
  mapCol: {
    position: 'sticky', top: '80px',
  },
};

// ── Sidebar styles ─────────────────────────────────────────────────────────────
export const sidebar = {
  root: {
    display: 'flex', flexDirection: 'column', gap: '8px',
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', padding: '12px',
    position: 'sticky', top: '80px',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: '8px', borderBottom: '1px solid var(--border)',
  },
  title: {
    fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
    textTransform: 'uppercase', letterSpacing: '0.05em',
  },
  count: {
    padding: '1px 7px', borderRadius: '999px',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    fontSize: '11px', fontWeight: 700, border: '1px solid var(--accent)',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
    padding: '16px 8px', textAlign: 'center',
  },
  emptyIcon: { fontSize: '24px' },
  emptyText: { fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 },
  emptyHint: { fontSize: '11px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 },
  list: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '4px' },
  item: {
    display: 'flex', alignItems: 'center', gap: '4px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  itemBtn: {
    flex: 1, padding: '8px 10px', background: 'none', border: 'none',
    cursor: 'pointer', textAlign: 'left',
    display: 'flex', flexDirection: 'column', gap: '2px',
  },
  itemName: { fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 },
  itemMeta: { fontSize: '10px', color: 'var(--text-muted)' },
  deleteBtn: {
    background: 'none', border: 'none', color: 'var(--text-muted)',
    cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', flexShrink: 0,
  },
};

// ── ResultView styles ──────────────────────────────────────────────────────────
export const resv = {
  root: { display: 'flex', flexDirection: 'column', gap: '12px' },
  header: { display: 'flex', flexDirection: 'column', gap: '4px' },
  backBtn: {
    background: 'none', border: 'none', fontSize: '13px', fontWeight: 600,
    color: 'var(--accent)', cursor: 'pointer', padding: 0, alignSelf: 'flex-start',
  },
  title: { fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 },
  modeBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '4px 10px', borderRadius: '999px',
    background: 'var(--accent-soft)', color: 'var(--accent)',
    border: '1px solid var(--accent)', fontSize: '12px', fontWeight: 700,
    alignSelf: 'flex-start',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: 'var(--bg-surface)',
    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
  },
  totalLabel: { fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 },
  totalValue: { fontSize: '18px', fontWeight: 800, color: 'var(--accent)' },
  warning: {
    background: 'var(--warning-soft, #fef9c3)', border: '1px solid var(--warning, #ca8a04)',
    borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--text-primary)',
  },
  storeList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  storeCard: {
    background: 'var(--bg-surface)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)', overflow: 'hidden',
  },
  storeHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 14px', background: 'var(--bg-elevated)',
    borderBottom: '1px solid var(--border)',
    fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)',
  },
  prodList: { listStyle: 'none', margin: 0, padding: 0 },
  prodItem: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '8px 14px', borderBottom: '1px solid var(--border)', fontSize: '13px',
  },
  prodName: { fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' },
  prodMeta: { fontSize: '11px', color: 'var(--text-muted)' },
  prodTotal: { fontWeight: 700, color: 'var(--text-primary)', flexShrink: 0, marginLeft: '8px' },
  confirmBtn: {
    padding: '14px', borderRadius: 'var(--radius-md)', border: 'none',
    background: 'var(--accent)', color: '#fff',
    fontWeight: 800, fontSize: '15px', cursor: 'pointer', width: '100%',
  },
};
