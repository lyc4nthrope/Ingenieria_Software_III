import { useState } from "react";
import StoreTypeSwitch from "@/features/stores/components/StoreTypeSwitch";
import StoreMapPicker from "@/features/stores/components/StoreMapPicker";
import StoreEvidenceUploader from "@/features/stores/components/StoreEvidenceUploader";
import { StoreTypeEnum } from "@/features/stores/schemas";
import { useStoreCreation } from "@/features/stores/hooks/useStoreCreation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Spinner } from "@/components/ui/Spinner";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import { playSuccessSound } from "@/utils/celebrationSound";

export default function StoreForm({ storeId = null, mode = 'create', onSuccess }) {
  const { t } = useLanguage();
  const tf = t.storeForm;
  const [showCelebration, setShowCelebration] = useState(false);
  const [pendingSuccessData, setPendingSuccessData] = useState(null);

  const {
    formData,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    isLoading,
    nearbyStoreMessage,
    updateField,
    setLocation,
    addEvidenceFile,
    removeEvidenceFile,
    submit,
  } = useStoreCreation({ storeId, mode });

  const isPhysical = formData.type === StoreTypeEnum.PHYSICAL;

  const onSubmit = async (event) => {
    event.preventDefault();
    const result = await submit();
    if (result.success && mode === 'create') {
      playSuccessSound();
      setPendingSuccessData(result.data);
      setShowCelebration(true);
    } else if (result.success) {
      onSuccess?.(result.data);
    }
  };

  const handleCelebrationDone = () => {
    setShowCelebration(false);
    onSuccess?.(pendingSuccessData);
    setPendingSuccessData(null);
  };

  if (isLoading) {
    return (
      <div style={styles.form} className="flex items-center justify-center min-h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <form style={styles.form} onSubmit={onSubmit} noValidate>
      <div style={styles.group}>
        <label htmlFor="store-name" style={styles.label}>
          {tf.nameLabel} <span style={styles.required}>*</span>
        </label>
        <input
          id="store-name"
          name="name"
          type="text"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "store-name-error" : undefined}
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder={tf.namePlaceholder}
          style={styles.input}
        />
        {errors.name ? (
          <div id="store-name-error" style={styles.error} role="alert">
            {errors.name}
          </div>
        ) : null}
      </div>

      <div style={styles.group}>
        <span style={styles.label} id="store-type-label">
          {tf.typeLabel} <span style={styles.required}>*</span>
        </span>
        <StoreTypeSwitch
          value={formData.type}
          onChange={(value) => updateField("type", value)}
          ariaLabelledBy="store-type-label"
        />
        {errors.type ? (
          <div style={styles.error} role="alert">
            {errors.type}
          </div>
        ) : null}
      </div>

      {isPhysical ? (
        <>
          <StoreMapPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            address={formData.address}
            onLocationChange={setLocation}
            onAddressChange={(value) => updateField("address", value)}
            error={errors.location}
          />
          {nearbyStoreMessage ? <div style={styles.info}>{nearbyStoreMessage}</div> : null}

          <StoreEvidenceUploader
            evidenceFiles={formData.evidenceFiles}
            onAddEvidence={addEvidenceFile}
            onRemoveEvidence={removeEvidenceFile}
            error={errors.evidenceUrls}
          />
        </>
      ) : (
        <div style={styles.group}>
          <label htmlFor="store-url" style={styles.label}>
            {tf.urlLabel} <span style={styles.required}>*</span>
          </label>
          <input
            id="store-url"
            name="websiteUrl"
            type="url"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.websiteUrl)}
            aria-describedby={errors.websiteUrl ? "store-url-error" : undefined}
            value={formData.websiteUrl}
            onChange={(e) => updateField("websiteUrl", e.target.value)}
            placeholder={tf.urlPlaceholder}
            style={styles.input}
          />
          {errors.websiteUrl ? (
            <div id="store-url-error" style={styles.error} role="alert">
              {errors.websiteUrl}
            </div>
          ) : null}
          {errors.evidenceUrls ? (
            <div style={styles.error} role="alert">
              {errors.evidenceUrls}
            </div>
          ) : null}
        </div>
      )}

      {submitError ? (
        <div style={styles.alertError}>⚠ {submitError}</div>
      ) : null}
      {submitSuccess ? (
        <div style={styles.alertSuccess}>✅ {submitSuccess}</div>
      ) : null}

      <button type="submit" style={styles.submit} disabled={isSubmitting}>
        {isSubmitting ? tf.submitting : tf.submit}
      </button>
      <CelebrationOverlay
        visible={showCelebration}
        message={t.celebration?.store}
        onDone={handleCelebrationDone}
      />
    </form>
  );
}

const styles = {
  form: {
    width: "100%",
    maxWidth: "760px",
    margin: "0 auto",
    display: "grid",
    gap: "14px",
    padding: "18px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    background: "var(--bg-surface)",
  },
  group: { display: "grid", gap: "8px" },
  label: { fontWeight: 700, fontSize: "14px", color: "var(--text-secondary)" },
  required: { color: "var(--error)" },
  input: {
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
    fontSize: "14px",
    background: "var(--bg-elevated)",
    color: "var(--text-primary)",
  },
  error: { color: "var(--error)", fontSize: "12px", fontWeight: 600 },
  info: {
    color: "var(--text-secondary)",
    fontSize: "12px",
    fontWeight: 600,
  },
  alertError: {
    border: "1px solid rgba(248,113,113,0.3)",
    background: "var(--error-soft)",
    color: "var(--error)",
    padding: "10px",
    borderRadius: "var(--radius-sm)",
  },
  alertSuccess: {
    border: "1px solid rgba(74,222,128,0.3)",
    background: "var(--success-soft)",
    color: "var(--success)",
    padding: "10px",
    borderRadius: "var(--radius-sm)",
  },
  submit: {
    border: "1px solid var(--accent)",
    borderRadius: "var(--radius-sm)",
    background: "var(--accent)",
    color: "#080C14",
    padding: "12px 16px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
