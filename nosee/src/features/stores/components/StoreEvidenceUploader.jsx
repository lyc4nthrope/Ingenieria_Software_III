import { useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

const EMPTY_ARRAY = [];

export default function StoreEvidenceUploader({
  evidenceFiles = EMPTY_ARRAY,
  onAddEvidence,
  onRemoveEvidence,
  error,
  containerStyle,
}) {
  const { t } = useLanguage();
  const te = t.storeEvidence;
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const canAddMore = evidenceFiles.length < 3;
  const hasFiles = evidenceFiles.length > 0;

  const handleFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    onAddEvidence(file);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    if (!canAddMore) return;
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canAddMore) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onAddEvidence(file);
  };

  const openPicker = () => fileInputRef.current?.click();

  return (
    <div style={{ ...styles.container, ...containerStyle }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Miniaturas */}
      {hasFiles && (
        <div style={styles.thumbGrid}>
          {evidenceFiles.map((ev) => (
            <div key={ev.id} style={styles.thumbItem}>
              <img src={ev.previewUrl} alt={te.altText} style={styles.thumb} />
              <button
                type="button"
                style={styles.removeBtn}
                onClick={() => onRemoveEvidence(ev.id)}
                aria-label={te.remove}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Zona de arrastre */}
      {canAddMore ? (
        <div
          style={{
            ...styles.dropZone,
            ...(hasFiles ? styles.dropZoneSmall : styles.dropZoneFull),
            ...(isDragging ? styles.dropZoneDragging : {}),
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={openPicker}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && openPicker()}
          aria-label={te.addEvidence}
        >
          <span style={styles.dropIcon}>{hasFiles ? '➕' : '📸'}</span>
          <span style={styles.dropLabel}>
            {hasFiles ? te.addMore : te.dropHere}
          </span>
          {!hasFiles && (
            <span style={styles.dropSubtext}>{te.dropSubtext}</span>
          )}
        </div>
      ) : (
        <div style={styles.limitBox}>{te.limitReached}</div>
      )}

      {error && <div style={styles.error}>{error}</div>}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  thumbGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
    gap: '8px',
  },
  thumbItem: {
    position: 'relative',
    borderRadius: 'var(--radius-sm)',
    overflow: 'hidden',
    border: '1px solid var(--border)',
    background: 'var(--bg-elevated)',
    aspectRatio: '1',
  },
  thumb: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  removeBtn: {
    position: 'absolute',
    top: '4px',
    right: '4px',
    width: '22px',
    height: '22px',
    border: 'none',
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)',
    color: 'white',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    lineHeight: 1,
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: '2px dashed var(--border)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    userSelect: 'none',
    outline: 'none',
  },
  dropZoneFull: {
    flex: 1,
    minHeight: '140px',
    padding: '24px 16px',
    background: 'var(--bg-elevated)',
  },
  dropZoneSmall: {
    padding: '12px',
    flexDirection: 'row',
    gap: '8px',
    background: 'var(--bg-elevated)',
  },
  dropZoneDragging: {
    borderColor: 'var(--accent)',
    background: 'var(--accent-soft)',
  },
  dropIcon: {
    fontSize: '24px',
    lineHeight: 1,
  },
  dropLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
  },
  dropSubtext: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  limitBox: {
    border: '1px solid rgba(251,191,36,0.3)',
    background: 'var(--warning-soft)',
    color: 'var(--warning)',
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '13px',
    fontWeight: 600,
    textAlign: 'center',
  },
  error: { color: 'var(--error)', fontSize: '12px', fontWeight: 600 },
};
