export const PASSWORD_RULES = [
  { label: 'Al menos 8 caracteres', test: (v) => v.length >= 8 },
  { label: 'Una letra mayúscula', test: (v) => /[A-Z]/.test(v) },
  { label: 'Un número', test: (v) => /\d/.test(v) },
];

// ─── Constantes para reportes ─────────────────────────────────────────────────
export const REASON_LABELS = {
  fake_price: 'Precio falso o engañoso',
  wrong_photo: 'Foto no coincide con la publicación',
  spam: 'Spam o contenido repetitivo',
  offensive: 'Contenido ofensivo o inapropiado',
  other: 'Otro motivo',
};

export const REASON_OPTIONS = [
  { value: 'fake_price', label: 'Precio falso o engañoso' },
  { value: 'wrong_photo', label: 'Foto no coincide con la publicación' },
  { value: 'spam', label: 'Spam o contenido repetitivo' },
  { value: 'offensive', label: 'Contenido ofensivo o inapropiado' },
  { value: 'other', label: 'Otro motivo' },
];

export const STATUS_CONFIG = {
  PENDING: { label: 'Pendiente', color: 'var(--warning)', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  pending: { label: 'Pendiente', color: 'var(--warning)', bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.3)' },
  IN_REVIEW: { label: 'En revisión', color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'rgba(56,189,248,0.3)' },
  in_review: { label: 'En revisión', color: 'var(--accent)', bg: 'var(--accent-soft)', border: 'rgba(56,189,248,0.3)' },
  RESOLVED: { label: 'Resuelto', color: 'var(--success)', bg: 'var(--success-soft)', border: 'rgba(52,211,153,0.3)' },
  resolved: { label: 'Resuelto', color: 'var(--success)', bg: 'var(--success-soft)', border: 'rgba(52,211,153,0.3)' },
  REJECTED: { label: 'Rechazado', color: 'var(--error)', bg: 'var(--error-soft)', border: 'rgba(239,68,68,0.3)' },
  rejected: { label: 'Rechazado', color: 'var(--error)', bg: 'var(--error-soft)', border: 'rgba(239,68,68,0.3)' },
};

// is_active: true = activa, false = inactiva
export const getPubStatusConf = (isActive) =>
  isActive !== false
    ? { label: 'Activa', color: 'var(--success)', bg: 'var(--success-soft)' }
    : { label: 'Inactiva', color: 'var(--text-muted)', bg: 'var(--bg-elevated)' };

export const PAGE_SIZE = 5;
