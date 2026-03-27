export const styles = {
  card: {
    marginTop: '20px',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-xl)',
    padding: '20px 24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '12px',
  },
  icon: {
    fontSize: '28px',
    lineHeight: 1,
  },
  title: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: '4px 0 0',
  },
  statusBadge: (status) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: '13px',
    fontWeight: '600',
    marginTop: '12px',
    background: status === 'approved'
      ? 'var(--success-soft, #d1fae5)'
      : status === 'rejected'
        ? 'var(--error-soft, #fee2e2)'
        : 'var(--bg-elevated)',
    color: status === 'approved'
      ? 'var(--success, #065f46)'
      : status === 'rejected'
        ? 'var(--error, #b91c1c)'
        : 'var(--text-secondary)',
    border: status === 'approved'
      ? '1px solid rgba(16,185,129,0.3)'
      : status === 'rejected'
        ? '1px solid rgba(239,68,68,0.3)'
        : '1px solid var(--border)',
  }),
  rejectionNote: {
    marginTop: '10px',
    padding: '10px 14px',
    background: 'var(--error-soft, #fee2e2)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 'var(--radius-md)',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  form: {
    marginTop: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: 'var(--text-primary)',
  },
  input: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-input, var(--bg-elevated))',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '9px 12px',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    background: 'var(--bg-input, var(--bg-elevated))',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '72px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  error: {
    fontSize: '12px',
    color: 'var(--error, #b91c1c)',
    marginTop: '2px',
  },
  submitBtn: {
    padding: '10px 18px',
    borderRadius: 'var(--radius-md)',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
};
