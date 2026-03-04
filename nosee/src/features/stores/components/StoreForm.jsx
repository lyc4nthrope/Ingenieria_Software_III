import StoreTypeSwitch from '@/features/stores/components/StoreTypeSwitch';
import StoreMapPicker from '@/features/stores/components/StoreMapPicker';
import StoreEvidenceUploader from '@/features/stores/components/StoreEvidenceUploader';
import { Spinner } from '@/components/ui';
import { StoreTypeEnum } from '@/features/stores/schemas';
import { useStoreCreation } from '@/features/stores/hooks/useStoreCreation';

export default function StoreForm({ 
  mode = 'create',
  storeId,
  onSuccess 
}) {
  const {
    formData,
    errors,
    isSubmitting,
    submitError,
    submitSuccess,
    isLoading,
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
    if (result.success) {
      onSuccess?.(result.data);
    }
  };

  if (isLoading) {
    return (
      <div style={styles.form} className="flex items-center justify-center min-h-96">
        <Spinner />
      </div>
    );
  }

  return (
    <form style={styles.form} onSubmit={onSubmit}>
      <div style={styles.group}>
        <label style={styles.label}>Nombre de la tienda <span style={styles.required}>*</span></label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Ej: Supermercado Central"
          style={styles.input}
        />
        {errors.name ? <div style={styles.error}>{errors.name}</div> : null}
      </div>

      <div style={styles.group}>
        <label style={styles.label}>Tipo de tienda <span style={styles.required}>*</span></label>
        <StoreTypeSwitch value={formData.type} onChange={(value) => updateField('type', value)} />
        {errors.type ? <div style={styles.error}>{errors.type}</div> : null}
      </div>

      {isPhysical ? (
        <>

          <StoreMapPicker
            latitude={formData.latitude}
            longitude={formData.longitude}
            address={formData.address}
            onLocationChange={setLocation}
            onAddressChange={(value) => updateField('address', value)}
            error={errors.location}
          />

          <StoreEvidenceUploader
            evidenceFiles={formData.evidenceFiles}
            onAddEvidence={addEvidenceFile}
            onRemoveEvidence={removeEvidenceFile}
            error={errors.evidenceUrls}
          />
        </>
      ) : (
        <div style={styles.group}>
          <label style={styles.label}>URL de la tienda virtual <span style={styles.required}>*</span></label>
          <input
            type="url"
            value={formData.websiteUrl}
            onChange={(e) => updateField('websiteUrl', e.target.value)}
            placeholder="https://mitienda.com"
            style={styles.input}
          />
          {errors.websiteUrl ? <div style={styles.error}>{errors.websiteUrl}</div> : null}
          {errors.evidenceUrls ? <div style={styles.error}>{errors.evidenceUrls}</div> : null}
        </div>
      )}

      {submitError ? <div style={styles.alertError}>⚠ {submitError}</div> : null}
      {submitSuccess ? <div style={styles.alertSuccess}>✅ {submitSuccess}</div> : null}

      <button type="submit" style={styles.submit} disabled={isSubmitting}>
        {isSubmitting 
          ? (mode === 'create' ? 'Creando tienda...' : 'Actualizando tienda...')
          : (mode === 'create' ? 'Crear tienda' : 'Actualizar tienda')
        }
      </button>
    </form>
  );
}

const styles = {
  form: {
    width: '100%',
    maxWidth: '760px',
    margin: '0 auto',
    display: 'grid',
    gap: '14px',
    padding: '18px',
    border: '1px solid var(--border-color, #e5e7eb)',
    borderRadius: '12px',
    background: '#fff',
  },
  group: { display: 'grid', gap: '8px' },
  label: { fontWeight: 700, fontSize: '14px', color: '#333' },
  required: { color: '#d32f2f' },
  input: {
    border: '1px solid var(--border-color, #d1d5db)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontSize: '14px',
  },
  error: { color: '#dc2626', fontSize: '12px', fontWeight: 600 },
  alertError: {
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#991b1b',
    padding: '10px',
    borderRadius: '8px',
  },
  alertSuccess: {
    border: '1px solid #bbf7d0',
    background: '#f0fdf4',
    color: '#166534',
    padding: '10px',
    borderRadius: '8px',
  },
  submit: {
    border: 'none',
    borderRadius: '8px',
    background: 'var(--accent, #2563eb)',
    color: '#fff',
    padding: '12px 16px',
    fontWeight: 700,
    cursor: 'pointer',
  },
};
