/**
 * Footer - Pie de página global de NØSEE
 *
 * Se renderiza en todas las páginas de la aplicación.
 * Contiene: logo, tagline, links legales (Términos y Privacidad) y copyright.
 */
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();
  const tf = t.footer;

  return (
    <footer
      aria-label="Pie de página"
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-base)',
        padding: '24px 20px',
        marginTop: 'auto',
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
          textAlign: 'center',
        }}
      >
        {/* Logo + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '1.125rem', fontWeight: '800', letterSpacing: '-0.04em', color: 'var(--accent)' }}>
            NØ<span style={{ color: 'var(--text-secondary)' }}>SEE</span>
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{tf.tagline}</span>
        </div>

        {/* Links legales */}
        <nav aria-label="Links legales" style={{ display: 'flex', gap: '20px' }}>
          <Link
            to="/terminos"
            style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {tf.terms}
          </Link>
          <Link
            to="/privacidad"
            style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {tf.privacy}
          </Link>
        </nav>

        {/* Contacto */}
        <a
          href="mailto:noseecorp@gmail.com"
          style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          noseecorp@gmail.com
        </a>

        {/* Copyright */}
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
          {tf.copyright}
        </p>
      </div>
    </footer>
  );
}
