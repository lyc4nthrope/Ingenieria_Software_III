/**
 * ReportPublicationModal.jsx
 *
 * Wrapper de compatibilidad sobre el ReportModal genérico.
 * Mantiene la misma API de props que antes para no romper PublicationCard.
 *
 * Props:
 *   publication - objeto con { id, product, store, price }
 *   onClose     - callback al cerrar
 *   onSubmit    - (legacy, ya no se usa; el modal llama al API directamente)
 */

import { ReportModal } from '@/components/ReportModal';

export function ReportPublicationModal({ publication, onClose }) {
  const targetName = [
    publication?.product?.name,
    publication?.store?.name,
    publication?.price != null ? `$${publication.price.toLocaleString()}` : null,
  ].filter(Boolean).join(' • ');

  return (
    <ReportModal
      targetType="publication"
      targetId={publication?.id}
      targetName={targetName}
      onClose={onClose}
    />
  );
}

export default ReportPublicationModal;
