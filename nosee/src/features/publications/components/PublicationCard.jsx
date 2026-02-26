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

import { useState } from 'react';
import { formatDistanceToNowInSpanish } from '@/features/publications/utils/dateUtils';

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
  onReport,
  onDelete,
}) {
  // ─── Estados ───────────────────────────────────────────────────────────────

  const [photoExpanded, setPhotoExpanded] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleValidate = async () => {
    if (isValidating) return;

    setIsValidating(true);
    try {
      await onValidate?.(publication.id);
    } catch (err) {
      console.error('Error validando:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleReport = async () => {
    if (!reportType || isReporting) return;

    setIsReporting(true);
    try {
      await onReport?.(publication.id, reportType);
      setShowReportModal(false);
      setReportType('');
    } catch (err) {
      console.error('Error reportando:', err);
    } finally {
      setIsReporting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar publicación?') || isDeleting) return;

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
    return <div>Publicación no disponible</div>;
  }

  const timeAgo = formatDistanceToNowInSpanish(
    publication.timestamp || publication.created_at
  );

  return (
    <div style={styles.card}>
      {/* Header: Usuario */}
      <div style={styles.header}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {publication.user?.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div style={styles.userName}>
              {publication.user?.full_name || 'Usuario anónimo'}
            </div>
            <div style={styles.timeAgo}>{timeAgo}</div>
          </div>
        </div>
      </div>

      {/* Body: Producto y Precio */}
      <div style={styles.body}>
        <div style={styles.productInfo}>
          <div style={styles.productName}>
            {publication.product?.name || 'Producto desconocido'}
          </div>
          <div style={styles.storeName}>
            🏪 {publication.store?.name || 'Tienda desconocida'}
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
            style={styles.photoContainer}
            onClick={() => setPhotoExpanded(!photoExpanded)}
          >
            <img
              src={publication.photo_url}
              alt={publication.product?.name}
              style={styles.photo}
            />
            <div style={styles.photoOverlay}>
              <span style={styles.photoIcon}>🔍 Expandir</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats: Validaciones y Reportes */}
      <div style={styles.stats}>
        <div style={styles.stat}>
          <span style={styles.statIcon}>✓</span>
          <span style={styles.statText}>
            {publication.validated_count || 0} validaciones
          </span>
        </div>
        <div style={styles.stat}>
          <span style={styles.statIcon}>⚠</span>
          <span style={styles.statText}>
            {publication.reported_count || 0} reportes
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div style={styles.actions}>
        <button
          style={{ ...styles.button, ...styles.buttonPrimary }}
          onClick={handleValidate}
          disabled={isValidating}
        >
          {isValidating ? 'Validando...' : '✓ Validar'}
        </button>

        <button
          style={{ ...styles.button, ...styles.buttonSecondary }}
          onClick={() => setShowReportModal(true)}
        >
          ⚠ Reportar
        </button>

        <button
          style={{ ...styles.button, ...styles.buttonDanger }}
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? '...' : '🗑 Eliminar'}
        </button>
      </div>

      {/* Modal: Reportar */}
      {showReportModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Reportar publicación</h3>

            <div style={styles.formGroup}>
              <label style={styles.label}>Tipo de reporte:</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                style={styles.select}
              >
                <option value="">Seleccionar...</option>
                <option value="fake_price">Precio falso</option>
                <option value="wrong_photo">Foto incorrecta</option>
                <option value="spam">Spam</option>
                <option value="offensive">Contenido ofensivo</option>
              </select>
            </div>

            <div style={styles.modalActions}>
              <button
                style={{ ...styles.button, ...styles.buttonSecondary }}
                onClick={() => {
                  setShowReportModal(false);
                  setReportType('');
                }}
              >
                Cancelar
              </button>
              <button
                style={{ ...styles.button, ...styles.buttonDanger }}
                onClick={handleReport}
                disabled={!reportType || isReporting}
              >
                {isReporting ? 'Enviando...' : 'Reportar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Foto expandida */}
      {photoExpanded && (
        <div style={styles.photoModal} onClick={() => setPhotoExpanded(false)}>
          <img
            src={publication.photo_url}
            alt={publication.product?.name}
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
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    marginBottom: '16px',
    overflow: 'hidden',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.2s',
  },

  header: {
    padding: '12px 16px',
    borderBottom: '1px solid #f0f0f0',
    background: '#fafafa',
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
    background: '#ff6b35',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
  },

  userName: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#333',
  },

  timeAgo: {
    fontSize: '12px',
    color: '#999',
    marginTop: '2px',
  },

  body: {
    padding: '16px',
  },

  productInfo: {
    marginBottom: '12px',
  },

  productName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px',
  },

  storeName: {
    fontSize: '13px',
    color: '#666',
  },

  priceSection: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    marginBottom: '12px',
    padding: '12px',
    background: '#f0f0f0',
    borderRadius: '6px',
  },

  price: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#ff6b35',
  },

  currency: {
    fontSize: '12px',
    color: '#999',
  },

  description: {
    fontSize: '13px',
    color: '#666',
    marginBottom: '12px',
    lineHeight: '1.4',
  },

  photoContainer: {
    position: 'relative',
    cursor: 'pointer',
    marginBottom: '12px',
    borderRadius: '6px',
    overflow: 'hidden',
    background: '#f5f5f5',
  },

  photo: {
    width: '100%',
    height: 'auto',
    maxHeight: '300px',
    objectFit: 'cover',
    display: 'block',
  },

  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(0,0,0,0.5)',
    color: '#fff',
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

  stats: {
    display: 'flex',
    padding: '12px 16px',
    borderTop: '1px solid #f0f0f0',
    borderBottom: '1px solid #f0f0f0',
    gap: '16px',
    background: '#fafafa',
    fontSize: '13px',
  },

  stat: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#666',
  },

  statIcon: {
    fontSize: '14px',
  },

  statText: {
    fontWeight: 500,
  },

  actions: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
  },

  button: {
    flex: 1,
    padding: '10px 12px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  buttonPrimary: {
    background: '#ff6b35',
    color: '#fff',
  },

  buttonSecondary: {
    background: '#f0f0f0',
    color: '#333',
    border: '1px solid #e0e0e0',
  },

  buttonDanger: {
    background: '#fff3f3',
    color: '#d32f2f',
    border: '1px solid #ffcccc',
  },

  // Modal
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },

  modalContent: {
    background: '#fff',
    borderRadius: '8px',
    padding: '20px',
    maxWidth: '400px',
    width: '90%',
  },

  modalTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    margin: 0,
  },

  formGroup: {
    marginBottom: '16px',
  },

  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
    color: '#333',
  },

  select: {
    width: '100%',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid #e0e0e0',
    fontSize: '13px',
  },

  modalActions: {
    display: 'flex',
    gap: '8px',
  },

  // Photo modal
  photoModal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.9)',
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

export default PublicationCard;