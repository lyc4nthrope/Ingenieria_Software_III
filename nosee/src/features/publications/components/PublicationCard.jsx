/**
 * PublicationCard.jsx
 *
 * Tarjeta Instagram-style para publicaciones de precio.
 * Se usa en el feed de PublicationsPage y HomePage.
 *
 * UBICACIÓN: src/features/publications/components/PublicationCard.jsx
 *
 * PROPS:
 * - publication: {Object} Datos de la publicación (normalizado: .product, .store, .user)
 * - onValidate: {Function} Callback al validar/upvote
 * - onDownvote: {Function} Callback al downvote
 * - onReport: {Function} Callback al reportar
 * - onDelete: {Function} Callback al eliminar
 * - onViewMore: {Function} Callback al ver más
 * - isAuthor: {boolean} Si el usuario es el autor
 * - isAdmin: {boolean} Si el usuario es admin
 * - isAuthenticated: {boolean} Opcional — para HomePage (requiere login para votar)
 * - onRequireAuth: {Function} Opcional — para HomePage (llamado si no está logueado)
 */

import { memo, useState, useEffect, useId } from 'react';
import { formatDistanceToNow } from '@/features/publications/utils/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReportPublicationModal } from '@/features/publications/components/ReportPublicationModal';
import { optimizeCloudinaryUrl } from '@/services/cloudinary';
import { useShoppingListStore } from '@/features/shopping-list/store/shoppingListStore';

const HappyFaceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SadFaceIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const DotsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="5" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="19" r="1" fill="currentColor" />
  </svg>
);

const StoreIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export function PublicationCard({
  publication,
  onValidate,
  onDownvote,
  onReport,
  onDelete,
  onViewMore,
  isAuthor,
  isAdmin,
  isAuthenticated,
  onRequireAuth,
}) {
  const { t } = useLanguage();
  const tc = t.publicationCard;

  const addItem = useShoppingListStore((s) => s.addItem);
  const isInList = useShoppingListStore((s) =>
    s.items.some((i) => i.publicationId === publication?.id)
  );

  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isDownvoting, setIsDownvoting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);

  const photoModalId = useId();

  const handleAddToList = () => {
    if (!isInList) {
      const name = publication.product?.name || tc.unknownProduct;
      addItem(name, 1, {
        storeName: publication.store?.name || '',
        price: publication.price || null,
        publicationId: publication.id,
      });
      setAddedFeedback(true);
      setTimeout(() => setAddedFeedback(false), 1500);
    }
  };

  const handleValidate = async () => {
    if (isValidating || isDownvoting) return;
    if (isAuthenticated === false) { onRequireAuth?.(); return; }
    setIsValidating(true);
    try {
      await onValidate?.(publication.id, publication.user_vote);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownvote = async () => {
    if (isDownvoting || isValidating) return;
    if (isAuthenticated === false) { onRequireAuth?.(); return; }
    setIsDownvoting(true);
    try {
      await onDownvote?.(publication.id, publication.user_vote);
    } finally {
      setIsDownvoting(false);
    }
  };

  const handleReport = async ({ publicationId, reason, description, evidenceFile }) => {
    if (!reason || isReporting) return;
    setIsReporting(true);
    try {
      const result = await onReport?.(publicationId, { reason, description, evidenceFile });
      if (result?.success) setShowReportModal(false);
    } finally {
      setIsReporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(tc.confirmDelete) || isDeleting) return;
    setShowMenu(false);
    setIsDeleting(true);
    try {
      await onDelete?.(publication.id);
    } finally {
      setIsDeleting(false);
    }
  };

  const pubDate = publication?.timestamp || publication?.created_at;
  const [timeAgo, setTimeAgo] = useState(() =>
    pubDate ? formatDistanceToNow(pubDate, t.timeAgo) : ''
  );

  useEffect(() => {
    if (!pubDate) return;
    const update = () => setTimeAgo(formatDistanceToNow(pubDate, t.timeAgo));
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [pubDate, t.timeAgo]);

  useEffect(() => {
    if (!showMenu) return;
    const close = (e) => {
      if (!e.target.closest('[data-menu-container]')) setShowMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMenu]);

  useEffect(() => {
    if (!photoExpanded) return;
    const onKey = (e) => { if (e.key === 'Escape') setPhotoExpanded(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photoExpanded]);

  if (!publication) return <div>{tc.notAvailable}</div>;

  const productName = publication.product?.name || tc.unknownProduct;
  const productBrand =
    publication.product?.brand?.name ||
    publication.product?.brands?.name ||
    publication.product?.brand_name ||
    tc.noBrand;
  const unitValue =
    publication.product?.base_quantity != null &&
    (publication.product?.unit_type?.abbreviation || publication.product?.unit_type?.name)
      ? `${publication.product.base_quantity} ${publication.product.unit_type?.abbreviation || publication.product.unit_type?.name}`
      : publication.product?.unit_type?.abbreviation ||
        publication.product?.unit_type?.name ||
        tc.noUnit;

  const storeName = publication.store?.name || tc.noStore;
  const isOnline = Number(publication.store?.store_type_id) === 2;
  const metaParts = [productBrand, unitValue].filter(Boolean).join(' · ');

  const upActive = publication.user_vote === 1;
  const downActive = publication.user_vote === -1;
  const canDelete = isAuthor || isAdmin;

  const photoUrl = publication.photo_url || publication.photo;
  const resolvedPhoto = photoUrl
    ? (photoUrl.includes('res.cloudinary.com')
        ? optimizeCloudinaryUrl(photoUrl, { width: 600 })
        : photoUrl)
    : null;

  return (
    <article
      style={styles.card}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
    >
      {/* ── Header: tienda + menú ── */}
      <div style={styles.header}>
        <div style={styles.storeIconWrap}>
          {isOnline
            ? <span style={{ fontSize: '14px', lineHeight: 1 }}>🌐</span>
            : <StoreIcon />
          }
        </div>
        <span style={styles.storeName} title={storeName}>{storeName}</span>
        {timeAgo && (
          <span style={styles.timeAgo}>{timeAgo}</span>
        )}

        <div style={styles.headerActions}>
          <button
            type="button"
            aria-label={tc.reportLabel(productName)}
            title={tc.report}
            style={styles.reportBtn}
            onClick={() => {
              if (isAuthenticated === false) { onRequireAuth?.(); return; }
              setShowReportModal(true);
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.35'; }}
          >
            ⚑
          </button>

          {canDelete && (
            <div style={{ position: 'relative' }} data-menu-container>
              <button
                type="button"
                aria-label="Opciones"
                style={styles.menuBtn}
                onClick={() => setShowMenu((v) => !v)}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.35'; }}
              >
                <DotsIcon />
              </button>
              {showMenu && (
                <div style={styles.dropdownMenu}>
                  <button
                    type="button"
                    aria-label={tc.deleteLabel(productName)}
                    aria-busy={isDeleting || undefined}
                    style={styles.dropdownItem}
                    onClick={handleDelete}
                    disabled={isDeleting}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--error-soft)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {isDeleting ? tc.deleting : tc.delete}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Imagen 4:3 con badge de precio ── */}
      <div style={styles.imageContainer}>
        {resolvedPhoto ? (
          <img
            src={resolvedPhoto}
            alt={productName}
            style={styles.image}
            loading="lazy"
            decoding="async"
            onClick={() => setPhotoExpanded(true)}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div style={styles.imagePlaceholder} aria-hidden="true" />
        )}
        <div style={styles.priceBadge}>
          ${publication.price?.toLocaleString('es-CO')}
        </div>
      </div>

      {/* ── Info del producto ── */}
      <div style={styles.content}>
        <div style={styles.productName}>{productName}</div>
        <div style={styles.metaLine} title={metaParts}>{metaParts}</div>
        {publication.description && (
          <div style={styles.description}>{publication.description}</div>
        )}
      </div>

      {/* ── Barra de acciones ── */}
      <div style={styles.actionsBar}>
        <div style={styles.voteGroup}>
          <button
            type="button"
            aria-label={tc.validateLabel(productName)}
            aria-pressed={upActive}
            disabled={isValidating || isDownvoting}
            style={{
              ...styles.voteBtn,
              ...styles.voteBtnLeft,
              ...(upActive ? styles.voteBtnUpActive : {}),
            }}
            onClick={handleValidate}
          >
            <HappyFaceIcon />
            <span style={styles.voteCount}>{publication.validated_count || 0}</span>
          </button>
          <button
            type="button"
            aria-label={tc.downvoteLabel?.(productName) ?? `Votar negativamente ${productName}`}
            aria-pressed={downActive}
            disabled={isValidating || isDownvoting}
            style={{
              ...styles.voteBtn,
              ...styles.voteBtnRight,
              ...(downActive ? styles.voteBtnDownActive : {}),
            }}
            onClick={handleDownvote}
          >
            <SadFaceIcon />
            <span style={styles.voteCount}>{publication.downvoted_count || 0}</span>
          </button>
        </div>

        <div style={styles.secondaryActions}>
          <button
            type="button"
            aria-label={`${t.shoppingList.addToList}: ${productName}`}
            title={t.shoppingList.addToList}
            style={{
              ...styles.addBtn,
              ...(isInList ? styles.addBtnActive : {}),
            }}
            onClick={handleAddToList}
          >
            {(isInList || addedFeedback) ? <CheckIcon /> : <PlusIcon />}
          </button>

          <button
            type="button"
            aria-label={tc.viewMoreLabel(productName)}
            style={styles.viewMoreBtn}
            onClick={() => onViewMore?.(publication.id)}
          >
            {tc.viewMore} ›
          </button>
        </div>
      </div>

      {showReportModal && (
        <ReportPublicationModal
          publication={publication}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReport}
        />
      )}

      {photoExpanded && resolvedPhoto && (
        <div
          id={photoModalId}
          role="dialog"
          aria-modal="true"
          aria-label={tc.photoExpandLabel(true, productName)}
          style={styles.photoModal}
          onClick={() => setPhotoExpanded(false)}
        >
          <button
            type="button"
            aria-label={tc.closePhotoLabel}
            onClick={() => setPhotoExpanded(false)}
            style={styles.photoModalClose}
          >
            ✕
          </button>
          <img
            src={photoUrl}
            alt={productName}
            style={styles.photoModalImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  );
}

const styles = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    transition: 'box-shadow 0.2s ease',
    boxShadow: 'none',
    height: '100%',
  },

  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 14px 10px',
  },

  storeIconWrap: {
    width: '28px',
    height: '28px',
    background: 'var(--accent-soft)',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent)',
    flexShrink: 0,
  },

  storeName: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  timeAgo: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },

  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flexShrink: 0,
  },

  reportBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    color: 'var(--text-muted)',
    opacity: 0.35,
    transition: 'opacity 0.15s',
    borderRadius: 'var(--radius-sm)',
  },

  menuBtn: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    opacity: 0.35,
    transition: 'opacity 0.15s',
    borderRadius: 'var(--radius-sm)',
  },

  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
    zIndex: 10,
    minWidth: '140px',
    overflow: 'hidden',
  },

  dropdownItem: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    color: 'var(--error)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },

  imageContainer: {
    position: 'relative',
    aspectRatio: '4 / 3',
    overflow: 'hidden',
    background: 'var(--bg-elevated)',
  },

  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
    cursor: 'zoom-in',
  },

  imagePlaceholder: {
    width: '100%',
    height: '100%',
    background: 'var(--bg-elevated)',
  },

  priceBadge: {
    position: 'absolute',
    bottom: '10px',
    right: '10px',
    background: 'var(--accent)',
    color: '#0a1628',
    padding: '5px 12px',
    borderRadius: 'var(--radius-md)',
    fontSize: '16px',
    fontWeight: '800',
    letterSpacing: '-0.02em',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
    lineHeight: 1.2,
  },

  content: {
    padding: '12px 14px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },

  productName: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    lineHeight: 1.3,
  },

  metaLine: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },

  description: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
    lineHeight: 1.5,
  },

  actionsBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 14px 12px',
    gap: '6px',
    borderTop: '1px solid var(--border)',
  },

  voteGroup: {
    display: 'flex',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    flex: 1,
  },

  voteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 10px',
    border: 'none',
    background: 'var(--bg-surface)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    transition: 'background 0.15s, color 0.15s',
    minHeight: '36px',
  },

  voteBtnLeft: {
    borderRight: '1px solid var(--border)',
    flex: 1,
    justifyContent: 'center',
  },

  voteBtnRight: {
    flex: 1,
    justifyContent: 'center',
  },

  voteBtnUpActive: {
    background: 'var(--success-soft)',
    color: 'var(--success)',
  },

  voteBtnDownActive: {
    background: 'var(--error-soft)',
    color: 'var(--error)',
  },

  voteCount: {
    fontSize: '13px',
    fontWeight: 700,
    minWidth: '14px',
    textAlign: 'center',
  },

  secondaryActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },

  addBtn: {
    width: '34px',
    height: '34px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-muted)',
    transition: 'background 0.15s, color 0.15s, border-color 0.15s',
    flexShrink: 0,
  },

  addBtnActive: {
    background: 'var(--success-soft)',
    color: 'var(--success)',
    borderColor: 'var(--success)',
  },

  viewMoreBtn: {
    padding: '6px 10px',
    fontSize: '12px',
    color: 'var(--accent)',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500,
    display: 'flex',
    gap: '2px',
    alignItems: 'center',
    whiteSpace: 'nowrap',
  },

  photoModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.88)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1200,
    padding: '24px',
    cursor: 'pointer',
  },

  photoModalClose: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'rgba(0,0,0,0.75)',
    border: '2px solid rgba(255,255,255,0.7)',
    color: '#fff',
    fontWeight: 800,
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },

  photoModalImg: {
    maxWidth: '90vw',
    maxHeight: '85vh',
    objectFit: 'contain',
    borderRadius: '10px',
    boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
  },
};

export default memo(PublicationCard);
