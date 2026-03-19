import { s } from '../adminStyles';

const EMPTY_LABELS = {};

export function SummaryCard({ title, counts, labels = EMPTY_LABELS }) {
  return (
    <div style={s.summaryCard}>
      <h3 style={s.summaryTitle}>{title}</h3>
      {Object.keys(counts).length === 0 ? (
        <p style={s.summaryEmpty}>—</p>
      ) : (
        Object.entries(counts).map(([key, value]) => (
          <div key={key} style={s.summaryRow}>
            <span>{labels?.[key] || key}</span>
            <strong>{value}</strong>
          </div>
        ))
      )}
    </div>
  );
}

export default SummaryCard;
