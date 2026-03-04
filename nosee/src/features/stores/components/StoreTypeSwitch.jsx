import { StoreTypeEnum } from "@/features/stores/schemas";

export default function StoreTypeSwitch({ value, onChange, ariaLabelledBy }) {
  return (
    <div
      style={styles.container}
      role="radiogroup"
      aria-label="Tipo de tienda"
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
        🏬 Tienda física
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
        🌐 Tienda virtual
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
    border: "1px solid var(--border-color, #e5e7eb)",
    borderRadius: "10px",
    padding: "10px 12px",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  active: {
    borderColor: "var(--accent, #2563eb)",
    background: "var(--accent-soft, #eff6ff)",
    color: "var(--accent, #2563eb)",
  },
};
