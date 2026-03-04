export default function StoreEvidenceUploader({ evidenceFiles = [], onAddEvidence, onRemoveEvidence, error }) {
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
        <strong>🖼 Evidencias del local</strong>
         <span style={styles.count}>{evidenceFiles.length}/3</span>
      </div>

      {canAddMore ? (
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
      ) : (
        <div style={styles.limit}>Límite alcanzado (máximo 3 imágenes)</div>
      )}

      <div style={styles.list}>
        {evidenceFiles.map((evidence) => (
          <div key={evidence.id} style={styles.item}>
            <img src={evidence.previewUrl} alt="Evidencia" style={styles.thumb} />
            <button type="button" style={styles.remove} onClick={() => onRemoveEvidence(evidence.id)}>
              Quitar
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
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#333', fontWeight: 700, fontSize: '14px' },
  count: { fontSize: '12px', color: 'var(--text-secondary, #6b7280)' },
  limit: {
    border: '1px solid #f59e0b',
    background: '#fffbeb',
    color: '#92400e',
    padding: '8px 10px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 600,
  },
  list: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '8px',
  },
  item: {
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '8px',
    overflow: 'hidden',
    background: '#fff',
  },
  thumb: { width: '100%', height: '90px', objectFit: 'cover', display: 'block' },
  remove: {
    width: '100%',
    border: 'none',
    background: '#fee2e2',
    color: '#991b1b',
    padding: '6px 8px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  error: { color: '#dc2626', fontSize: '12px', fontWeight: 600 },
};
