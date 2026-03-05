import { StoreTypeEnum } from "@/features/stores/schemas";
import { useLanguage } from "@/contexts/LanguageContext";

export default function StoreTypeSwitch({ value, onChange, ariaLabelledBy }) {
  const { t } = useLanguage();
  const ts = t.storeType;

  return (
    <div
      style={styles.container}
      role="radiogroup"
      aria-label={ts.ariaLabel}
      aria-labelledby={ariaLabelledBy}
    >
      <button
        type="button"
        style={{
          ...styles.option,
          ...(value === StoreTypeEnum.PHYSICAL ? styles.active : {}),
        }}
        onClick={() => onChange(StoreTypeEnum.PHYSICAL)}
        role="radio"
        aria-checked={value === StoreTypeEnum.PHYSICAL}
      >
        {ts.physical}
      </button>
      <button
        type="button"
        style={{
          ...styles.option,
          ...(value === StoreTypeEnum.VIRTUAL ? styles.active : {}),
        }}
        onClick={() => onChange(StoreTypeEnum.VIRTUAL)}
        role="radio"
        aria-checked={value === StoreTypeEnum.VIRTUAL}
      >
        {ts.virtual}
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px",
  },
  option: {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    cursor: "pointer",
    fontWeight: 600,
  },
  active: {
    borderColor: "var(--accent)",
    background: "var(--accent-soft)",
    color: "var(--accent)",
  },
};
