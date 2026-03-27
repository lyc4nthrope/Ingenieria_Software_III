/**
 * DealerOnboardingCard.jsx
 *
 * Tarjeta en ProfilePage para que un usuario solicite el rol de Repartidor.
 * Solo se muestra si el usuario NO es ya Repartidor.
 *
 * Estados posibles:
 *   - Sin solicitud     → muestra CTA + formulario
 *   - pending           → "Tu solicitud está siendo revisada"
 *   - approved          → "Felicitaciones, ya eres repartidor" (recarga la sesión)
 *   - rejected          → "No fue aprobado" + motivo
 */

import { useState, useEffect } from 'react';
import { getMyApplication, submitApplication } from '@/services/api/dealerApplications.api';
import { styles } from './dealerOnboardingStyles';

const STATUS_LABEL = {
  pending:  { icon: '⏳', text: 'Solicitud en revisión' },
  approved: { icon: '✅', text: 'Solicitud aprobada — ¡ya eres repartidor!' },
  rejected: { icon: '❌', text: 'Solicitud rechazada' },
};

export default function DealerOnboardingCard() {
  const [application, setApplication] = useState(undefined); // undefined = cargando
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState({ fullName: '', phone: '', motivation: '' });
  const [errors,      setErrors]      = useState({});
  const [submitting,  setSubmitting]  = useState(false);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    getMyApplication().then(({ data }) => setApplication(data)); // null si no hay solicitud
  }, []);

  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Ingresa tu nombre completo';
    if (!form.phone.trim())    errs.phone    = 'Ingresa tu número de teléfono';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setServerError(null);
    const { success, error } = await submitApplication(form);
    setSubmitting(false);

    if (!success) {
      setServerError(error);
      return;
    }

    // Refrescar la solicitud recién creada
    const { data } = await getMyApplication();
    setApplication(data);
    setShowForm(false);
  };

  // Mientras carga
  if (application === undefined) return null;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.icon}>🛵</span>
        <div>
          <p style={styles.title}>¿Quieres ser repartidor?</p>
          <p style={styles.subtitle}>
            Gana dinero entregando pedidos de otros usuarios en tu zona
          </p>
        </div>
      </div>

      {/* Sin solicitud enviada aún */}
      {!application && (
        <>
          {!showForm ? (
            <button
              style={styles.submitBtn}
              onClick={() => setShowForm(true)}
            >
              Solicitar ser repartidor
            </button>
          ) : (
            <form onSubmit={handleSubmit} noValidate style={styles.form}>
              {serverError && (
                <div style={styles.rejectionNote}>{serverError}</div>
              )}

              <div style={styles.field}>
                <label style={styles.label}>Nombre completo *</label>
                <input
                  style={styles.input}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  placeholder="Tu nombre como aparecerá a los usuarios"
                />
                {errors.fullName && <span style={styles.error}>{errors.fullName}</span>}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Teléfono de contacto *</label>
                <input
                  style={styles.input}
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Ej: 300 123 4567"
                />
                {errors.phone && <span style={styles.error}>{errors.phone}</span>}
              </div>

              <div style={styles.field}>
                <label style={styles.label}>¿Por qué quieres ser repartidor? (opcional)</label>
                <textarea
                  style={styles.textarea}
                  value={form.motivation}
                  onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))}
                  placeholder="Cuéntanos un poco sobre ti..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{
                    ...styles.submitBtn,
                    ...(submitting ? styles.submitBtnDisabled : {}),
                  }}
                  disabled={submitting}
                >
                  {submitting ? 'Enviando...' : 'Enviar solicitud'}
                </button>
                <button
                  type="button"
                  style={{ ...styles.submitBtn, background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                  onClick={() => { setShowForm(false); setErrors({}); setServerError(null); }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </>
      )}

      {/* Solicitud existente — mostrar estado */}
      {application && (
        <>
          <div style={styles.statusBadge(application.status)}>
            <span>{STATUS_LABEL[application.status]?.icon}</span>
            <span>{STATUS_LABEL[application.status]?.text}</span>
          </div>

          {application.status === 'rejected' && application.rejection_reason && (
            <div style={styles.rejectionNote}>
              <strong>Motivo: </strong>{application.rejection_reason}
            </div>
          )}

          {application.status === 'approved' && (
            <p style={{ marginTop: '10px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Cierra sesión y vuelve a ingresar para acceder a tu panel de repartidor.
            </p>
          )}
        </>
      )}
    </div>
  );
}
