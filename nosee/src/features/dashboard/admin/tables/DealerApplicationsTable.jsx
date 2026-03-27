/**
 * DealerApplicationsTable.jsx
 *
 * Lista de solicitudes para ser repartidor.
 * El Admin puede aprobar o rechazar cada solicitud.
 * Al aprobar, el sistema llama a changeUserRole(userId, 4) automáticamente.
 */

import { useState } from 'react';
import { reviewApplication } from '@/services/api/dealerApplications.api';

const STATUS_BADGE = {
  pending:  { label: 'Pendiente', bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  approved: { label: 'Aprobado',  bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  rejected: { label: 'Rechazado', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

function StatusBadge({ status }) {
  const s = STATUS_BADGE[status] ?? STATUS_BADGE.pending;
  return (
    <span style={{
      padding: '3px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      background: s.bg,
      color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}

export function DealerApplicationsTable({ applications, onReviewed }) {
  const [rejectionModal, setRejectionModal] = useState(null); // { applicationId, applicantUserId }
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(null); // id del que se está procesando

  const pending = applications.filter((a) => a.status === 'pending');
  const reviewed = applications.filter((a) => a.status !== 'pending');

  const handleApprove = async (app) => {
    setProcessing(app.id);
    const { success, error } = await reviewApplication(app.id, 'approved', {
      applicantUserId: app.user_id,
    });
    setProcessing(null);
    if (!success) { alert(`Error al aprobar: ${error}`); return; }
    onReviewed?.();
  };

  const handleRejectConfirm = async () => {
    if (!rejectionModal) return;
    setProcessing(rejectionModal.applicationId);
    const { success, error } = await reviewApplication(
      rejectionModal.applicationId,
      'rejected',
      { applicantUserId: rejectionModal.applicantUserId, rejectionReason }
    );
    setProcessing(null);
    setRejectionModal(null);
    setRejectionReason('');
    if (!success) { alert(`Error al rechazar: ${error}`); return; }
    onReviewed?.();
  };

  if (applications.length === 0) {
    return (
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', padding: '24px 0' }}>
        No hay solicitudes de repartidor.
      </p>
    );
  }

  const renderRow = (app) => (
    <div key={app.id} style={{
      padding: '16px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-surface)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <p style={{ margin: 0, fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
            {app.full_name}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            📞 {app.phone}
            {app.applicant?.reputation_points > 0 && (
              <span style={{ marginLeft: '12px' }}>⭐ {app.applicant.reputation_points} pts</span>
            )}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      {app.motivation && (
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
          "{app.motivation}"
        </p>
      )}

      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, var(--text-secondary))' }}>
        Solicitado: {new Date(app.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
      </p>

      {app.status === 'pending' && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            onClick={() => handleApprove(app)}
            disabled={processing === app.id}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: '#065f46',
              color: '#fff',
              fontSize: '13px',
              fontWeight: '600',
              cursor: processing === app.id ? 'not-allowed' : 'pointer',
              opacity: processing === app.id ? 0.6 : 1,
            }}
          >
            {processing === app.id ? 'Procesando...' : '✅ Aprobar'}
          </button>
          <button
            onClick={() => setRejectionModal({ applicationId: app.id, applicantUserId: app.user_id })}
            disabled={processing === app.id}
            style={{
              padding: '7px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid #fca5a5',
              background: 'transparent',
              color: '#991b1b',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ❌ Rechazar
          </button>
        </div>
      )}

      {app.status === 'rejected' && app.rejection_reason && (
        <p style={{ margin: 0, fontSize: '12px', color: '#991b1b' }}>
          Motivo: {app.rejection_reason}
        </p>
      )}
    </div>
  );

  return (
    <>
      {/* Modal de rechazo */}
      {rejectionModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px',
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-xl)',
            padding: '24px',
            width: '100%',
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
              Rechazar solicitud
            </h3>
            <div>
              <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                Motivo del rechazo (opcional)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ej: No cumple con los requisitos mínimos..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 12px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  fontSize: '14px', minHeight: '72px',
                  resize: 'vertical', fontFamily: 'inherit',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleRejectConfirm}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: 'none', background: '#991b1b', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
              >
                Confirmar rechazo
              </button>
              <button
                onClick={() => { setRejectionModal(null); setRejectionReason(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {pending.length > 0 && (
          <section>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Pendientes ({pending.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pending.map(renderRow)}
            </div>
          </section>
        )}

        {reviewed.length > 0 && (
          <section>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px', marginTop: pending.length > 0 ? '8px' : 0 }}>
              Revisadas ({reviewed.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {reviewed.map(renderRow)}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
