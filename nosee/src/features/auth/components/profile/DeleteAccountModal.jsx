import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

// ─── Modal de eliminación de cuenta ──────────────────────────────────────────
function DeleteAccountModal({ onClose, onConfirm, loading }) {
  const { t } = useLanguage();
  const tp = t.profile;
  const [step, setStep] = useState('choose');
  const [mode, setMode] = useState(null);
  const titleId = 'delete-modal-title';

  const handleChoose = (chosen) => {
    setMode(chosen);
    setStep(chosen === 'permanent' ? 'confirm-permanent' : 'confirm-deactivate');
  };

  const handleConfirm = () => {
    onConfirm(mode === 'permanent');
  };

  const handleKeyDown = (e, chosen) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleChoose(chosen);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(e); }}
      style={{
        position: 'fixed', inset: 0,
        background: 'var(--overlay)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '16px',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          width: '100%', maxWidth: '480px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >

        {/* ── Paso 1: elegir modo ── */}
        {step === 'choose' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {tp.deleteModalTitle}
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                {tp.deleteModalSubtitle}
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleChoose('deactivate')}
              onKeyDown={(e) => handleKeyDown(e, 'deactivate')}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
                background: 'none', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {tp.deactivateTitle}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {tp.deactivateDesc}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleChoose('permanent')}
              onKeyDown={(e) => handleKeyDown(e, 'permanent')}
              style={{
                border: '1px solid var(--error-soft)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '6px',
                transition: 'border-color 0.15s',
                background: 'none', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--error)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--error-soft)'}
            >
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--error)' }}>
                {tp.permanentTitle}
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {tp.permanentDesc}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                alignSelf: 'flex-end', background: 'none', border: 'none',
                fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer',
              }}
            >
              {tp.cancel}
            </button>
          </>
        )}

        {/* ── Paso 2a: confirmar desactivación ── */}
        {step === 'confirm-deactivate' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 8px' }}>
                {tp.confirmDeactivateTitle}
              </h2>
              <div style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6,
              }}>
                {tp.confirmDeactivateInfo}
                <br /><br />
                <strong style={{ color: 'var(--text-primary)' }}>{tp.confirmDeactivateDetail}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('choose')}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'none',
                  fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                {tp.back}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--accent)',
                  fontSize: '13px', fontWeight: '600', color: 'var(--bg-base)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? tp.processing : tp.confirmDeactivate}
              </button>
            </div>
          </>
        )}

        {/* ── Paso 2b: confirmar eliminación permanente ── */}
        {step === 'confirm-permanent' && (
          <>
            <div>
              <h2 id={titleId} style={{ fontSize: '18px', fontWeight: '700', color: 'var(--error)', margin: '0 0 8px' }}>
                {tp.permanentModalTitle}
              </h2>
              <div style={{
                background: 'var(--error-soft)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px',
                fontSize: '13px', color: 'var(--error)', lineHeight: 1.6,
              }}>
                {tp.permanentWarning}
                <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
                  {tp.permanentItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setStep('choose')}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)', background: 'none',
                  fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                {tp.back}
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                style={{
                  padding: '9px 18px', borderRadius: 'var(--radius-md)',
                  border: 'none', background: 'var(--error)',
                  fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? tp.deleting : tp.confirmPermanent}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default DeleteAccountModal;
