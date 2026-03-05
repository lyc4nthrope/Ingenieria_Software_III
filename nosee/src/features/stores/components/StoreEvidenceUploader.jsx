import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const EMPTY_ARRAY = [];

export default function StoreEvidenceUploader({ evidenceFiles = EMPTY_ARRAY, onAddEvidence, onRemoveEvidence, error }) {
  const { t } = useLanguage();
  const te = t.storeEvidence;
  const fileInputRef = useRef(null);

  const canAddMore = evidenceFiles.length < 3;

  const handleFileChange = (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    onAddEvidence(file);
    event.target.value = '';
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <strong>{te.title}</strong>
         <span style={styles.count}>{evidenceFiles.length}/3</span>
      </div>

      {canAddMore ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button type="button" style={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>
            📁 {te.addEvidence}
          </button>
        </>
      ) : (
        <div style={styles.limit}>{te.limitReached}</div>
      )}

      <div style={styles.list}>
        {evidenceFiles.map((evidence) => (
          <div key={evidence.id} style={styles.item}>
            <img src={evidence.previewUrl} alt={te.altText} style={styles.thumb} />
            <button type="button" style={styles.remove} onClick={() => onRemoveEvidence(evidence.id)}>
              {te.remove}
            </button>
          </div>
        ))}
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}
    </div>
  );
}

const styles = {
  container: { display: 'grid', gap: '10px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px' },
  count: { fontSize: '12px', color: 'var(--text-muted)' },
  limit: {
    border: '1px solid rgba(251,191,36,0.3)',
    background: 'rgba(251,191,36,0.08)',
    color: 'var(--warning)',
    padding: '8px 10px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 600,
  },
  uploadBtn: {
    padding: '10px 16px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--accent)',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    minHeight: '44px',
    alignSelf: 'start',
  },
  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '8px',
  },
  item: {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    background: 'var(--bg-elevated)',
  },
  thumb: { width: '100%', height: '90px', objectFit: 'cover', display: 'block' },
  remove: {
    width: '100%',
    border: 'none',
    background: 'var(--error-soft)',
    color: 'var(--error)',
    padding: '6px 8px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: { color: 'var(--error)', fontSize: '12px', fontWeight: 600 },
};
