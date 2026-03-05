/**
 * PublicationCard.jsx
 *
 * Tarjeta que muestra una publicación de precio
 * Se usa en el feed de publicaciones
 *
 * UBICACIÓN: src/features/publications/components/PublicationCard.jsx
 * FECHA: 26-02-2026
 * STATUS: Paso 3a de Proceso 2
 *
 * PROPS:
 * - publication: {Object} Datos de la publicación
 * - onValidate: {Function} Callback al validar
 * - onReport: {Function} Callback al reportar
 * - onDelete: {Function} Callback al eliminar
 *
 * FEATURES:
 * - Muestra foto expandible
 * - Contador de validaciones
 * - Botones de acción
 * - Información del usuario
 * - Tiempo relativo
 */

import { memo, useState, useId } from 'react';
import { formatDistanceToNow } from '@/features/publications/utils/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import { ReportPublicationModal } from '@/features/publications/components/ReportPublicationModal';

const HappyFaceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

const SadFaceIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="3" strokeLinecap="round" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/**
 * Componente: PublicationCard
 * Tarjeta visual de una publicación de precio
 *
 * @param {Object} publication - Datos de publicación
 * @param {number} publication.id - ID único
 * @param {number} publication.price - Precio
 * @param {string} publication.currency - Moneda (COP, USD, etc)
 * @param {string} publication.photo_url - URL de la foto
 * @param {string} publication.description - Descripción
 * @param {number} publication.validated_count - Upvotes
 * @param {number} publication.reported_count - Reportes
 * @param {Object} publication.user - Info del usuario
 * @param {Object} publication.product - Info del producto
 * @param {Object} publication.store - Info de la tienda
 * @param {Date} publication.created_at - Fecha de creación
 * @param {Function} onValidate - Callback: (publicationId) => Promise
 * @param {Function} onReport - Callback: (publicationId, type) => Promise
 * @param {Function} onDelete - Callback: (publicationId) => Promise
 *
 * @example
 * <PublicationCard
 *   publication={pub}
 *   onValidate={(id) => validatePublication(id)}
 *   onReport={(id, type) => reportPublication(id, type)}
 *   onDelete={(id) => deletePublication(id)}
 * />
 */
export function PublicationCard({
  publication,
  onValidate,
  onDownvote,
  onReport,
  onDelete,
  onViewMore,
  isAuthor,
  isAdmin,
}) {
  // ─── Idioma ─────────────────────────────────────────────────────────────────
  const { t } = useLanguage();
  const tc = t.publicationCard;

  // ─── Estados ───────────────────────────────────────────────────────────────

  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isDownvoting, setIsDownvoting] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const photoModalId = useId();

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleValidate = async () => {
    if (isValidating || isDownvoting) return;
    setIsValidating(true);
    try {
      await onValidate?.(publication.id);
    } catch (err) {
      console.error('Error validando:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleDownvote = async () => {
    if (isDownvoting || isValidating) return;
    setIsDownvoting(true);
    try {
      await onDownvote?.(publication.id);
    } catch (err) {
      console.error('Error downvoteando:', err);
    } finally {
      setIsDownvoting(false);
    }
  };

  const handleReport = async ({ publicationId, reason, description, evidenceFile }) => {
    if (!reason || isReporting) return;

    setIsReporting(true);
    try {
      const result = await onReport?.(publicationId, { reason, description, evidenceFile });
      if (result?.success) {
        setShowReportModal(false);
      }
    } catch (err) {
      console.error('Error reportando:', err);
    } finally {
      setIsReporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(tc.confirmDelete) || isDeleting) return;

    setIsDeleting(true);
    try {
      await onDelete?.(publication.id);
    } catch (err) {
      console.error('Error eliminando:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (!publication) {
    return <div>{tc.notAvailable}</div>;
  }

  const timeAgo = formatDistanceToNow(
    publication.timestamp || publication.created_at,
    t.timeAgo
  );

  return (
    <div style={styles.card}>
      {/* Header: Usuario */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {(publication.user?.full_name || 'U')
              .charAt(0)
              .toUpperCase()}
          </div>
          <div>
            <div style={styles.userName}>
              {publication.user?.full_name || tc.user}
            </div>
            <div style={styles.timeAgo}>{timeAgo}</div>
          </div>
        </div>
      </div>

      {/* Body: Producto y Precio */}
      <div style={styles.body}>
        <div style={styles.productInfo}>
          <div style={styles.productName}>
            {publication.product?.name || tc.unknownProduct}
          </div>
          <div style={styles.storeName}>
            <span aria-hidden="true">🏪 </span>{publication.store?.name || tc.noStore}
          </div>
        </div>

        {/* Precio destacado */}
        <div style={styles.priceSection}>
          <div style={styles.price}>
            ${publication.price?.toLocaleString('es-CO')}
          </div>
          <div style={styles.currency}>{publication.currency || 'COP'}</div>
        </div>

        {/* Descripción */}
        {publication.description && (
          <div style={styles.description}>{publication.description}</div>
        )}

        {/* Foto */}
        {publication.photo_url && (
          <div
            role="button"
            tabIndex={0}
            aria-expanded={photoExpanded}
            aria-label={tc.photoExpandLabel(photoExpanded, publication.product?.name || tc.unknownProduct)}
            style={styles.photoContainer}
            onClick={() => setPhotoExpanded(!photoExpanded)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPhotoExpanded(!photoExpanded); } }}
          >
            <img
              src={publication.photo_url}
              alt={publication.product?.name || tc.unknownProduct}
              style={styles.photo}
              loading="lazy"
              decoding="async"
            />
            <div aria-hidden="true" style={styles.photoOverlay}>
              <span style={styles.photoIcon}>{tc.photoExpand}</span>
            </div>
          </div>
        )}
      </div>

      {/* Votos + Acciones */}
      <div style={styles.actionsRow}>
        {/* Grupo de votos estilo Reddit */}
        <div style={styles.voteGroup}>
          <button
            type="button"
            aria-label={tc.validateLabel(publication.product?.name || tc.unknownProduct)}
            aria-pressed={publication.user_vote === 1}
            style={{
              ...styles.voteBtn,
              ...styles.voteBtnLeft,
              ...(publication.user_vote === 1 ? styles.voteBtnUpActive : {}),
            }}
            onClick={handleValidate}
            disabled={isValidating || isDownvoting}
          >
            <HappyFaceIcon />
            <span style={styles.voteCount}>{publication.validated_count || 0}</span>
          </button>
          <button
            type="button"
            aria-label={tc.downvoteLabel?.(publication.product?.name || tc.unknownProduct) ?? `Votar negativamente ${publication.product?.name || ''}`}
            aria-pressed={publication.user_vote === -1}
            style={{
              ...styles.voteBtn,
              ...styles.voteBtnRight,
              ...(publication.user_vote === -1 ? styles.voteBtnDownActive : {}),
            }}
            onClick={handleDownvote}
            disabled={isValidating || isDownvoting}
          >
            <SadFaceIcon />
            <span style={styles.voteCount}>{publication.downvoted_count || 0}</span>
          </button>
        </div>

        {/* Acciones secundarias */}
        <div style={styles.actions}>
          <button
            type="button"
            aria-label={tc.reportLabel(publication.product?.name || tc.unknownProduct)}
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={() => setShowReportModal(true)}
          >
            {tc.report}
          </button>

          <button
            type="button"
            aria-label={tc.viewMoreLabel(publication.product?.name || tc.unknownProduct)}
            style={{ ...styles.button, ...styles.buttonSecondary }}
            onClick={() => onViewMore?.(publication.id)}
          >
            {tc.viewMore}
          </button>

          {(isAuthor || isAdmin) && (
            <button
              type="button"
              aria-label={tc.deleteLabel(publication.product?.name || tc.unknownProduct)}
              aria-busy={isDeleting || undefined}
              style={{ ...styles.button, ...styles.buttonDanger }}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? tc.deleting : tc.delete}
            </button>
          )}
        </div>
      </div>

      {/* Modal: Reportar */}
      {showReportModal && (
        <ReportPublicationModal
          publication={publication}
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReport}
        />
      )}

      {/* Modal: Foto expandida */}
      {photoExpanded && (
        <div
          id={photoModalId}
          role="dialog"
          aria-modal="true"
          aria-label={tc.photoExpandLabel(true, publication.product?.name || tc.unknownProduct)}
          style={styles.photoModal}
          onClick={() => setPhotoExpanded(false)}
          onKeyDown={(e) => { if (e.key === 'Escape') setPhotoExpanded(false); }}
        >
          <button
            type="button"
            aria-label={tc.closePhotoLabel}
            onClick={() => setPhotoExpanded(false)}
            style={{
              position: 'absolute', top: '16px', right: '16px',
              background: 'var(--overlay)', border: '1px solid rgba(255,255,255,0.3)',
              color: 'var(--text-primary)', borderRadius: '50%', width: '36px', height: '36px',
              fontSize: '18px', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
          <img
            src={publication.photo_url}
            alt={publication.product?.name || tc.unknownProduct}
            style={styles.photoModalImg}
          />
        </div>
      )}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles = {
  card: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },

  header: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg-surface)',
  },

  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'var(--accent)',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
  },

  userName: {
    fontWeight: 600,
    fontSize: '14px',
    color: 'var(--text-primary)',
  },

  timeAgo: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },

  body: {
    padding: '16px',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },

  productInfo: {
    marginBottom: '12px',
  },

  productName: {
    fontSize: '16px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '4px',
  },

  storeName: {
    fontSize: '13px',
    color: 'var(--text-muted)',
  },

  priceSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '12px',
    padding: '12px',
    background: 'var(--accent-soft)',
    borderRadius: 'var(--radius-md)',
  },

  price: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--accent)',
  },

  currency: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },

  description: {
    fontSize: '13px',
    color: 'var(--text-muted)',
    marginBottom: '12px',
    lineHeight: '1.4',
  },

  photoContainer: {
    position: 'relative',
    cursor: 'pointer',
    marginBottom: '12px',
    marginTop: 'auto',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    flexShrink: 0,
  },

  photo: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
    display: 'block',
  },

  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'var(--overlay-light)',
    color: 'var(--text-primary)',
    padding: '8px',
    textAlign: 'center',
    fontSize: '12px',
    opacity: 0,
    transition: 'opacity 0.2s',
  },

  photoIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
  },

  actionsRow: {
    borderTop: '1px solid var(--border)',
    padding: '10px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },

  voteGroup: {
    display: 'flex',
    alignSelf: 'flex-start',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
  },

  voteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    border: 'none',
    background: 'var(--bg-surface)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    transition: 'background 0.15s, color 0.15s',
  },

  voteBtnLeft: {
    borderRight: '1px solid var(--border)',
  },

  voteBtnRight: {},

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

  actions: {
    display: 'flex',
    gap: '8px',
  },

  button: {
    padding: '8px 14px',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },

  buttonSecondary: {
    background: 'var(--accent-soft)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
  },

  buttonDanger: {
    background: 'var(--error-soft)',
    color: 'var(--error)',
    border: '1px solid rgba(239,68,68,0.3)',
  },

  // Photo modal
  photoModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--overlay-heavy)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
    cursor: 'pointer',
  },

  photoModalImg: {
    maxWidth: '90vw',
    maxHeight: '90vh',
    objectFit: 'contain',
  },
};

export default memo(PublicationCard);