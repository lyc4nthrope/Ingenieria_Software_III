/**
 * TermsPage - Términos de Uso de NØSEE
 *
 * Página pública (no requiere autenticación).
 * Describe las condiciones de uso de la plataforma de forma veraz y completa.
 */

const Section = ({ title, children }) => (
  <section style={{ marginBottom: '32px' }}>
    <h2 style={{
      fontSize: '1.125rem',
      fontWeight: '700',
      color: 'var(--text-primary)',
      marginBottom: '12px',
      paddingBottom: '8px',
      borderBottom: '1px solid var(--border)',
    }}>
      {title}
    </h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: '1.65' }}>
      {children}
    </div>
  </section>
);

export default function TermsPage() {
  const lastUpdated = '18 de marzo de 2026';

  return (
    <main
      id="main-content"
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        padding: '40px 20px 60px',
        flex: 1,
      }}
    >
      {/* Encabezado */}
      <header style={{ marginBottom: '40px' }}>
        <h1 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          color: 'var(--text-primary)',
          letterSpacing: '-0.03em',
          marginBottom: '8px',
        }}>
          Términos de Uso
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Última actualización: {lastUpdated}
        </p>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px', lineHeight: '1.6' }}>
          Bienvenido a <strong style={{ color: 'var(--text-primary)' }}>NØSEE</strong>, una plataforma colaborativa
          de comparación de precios en tiendas locales. Al crear una cuenta o utilizar cualquier función de
          la plataforma, aceptás plenamente estos Términos de Uso. Si no estás de acuerdo con alguna
          condición, por favor no uses la plataforma.
        </p>
      </header>

      {/* 1. Descripción de la plataforma */}
      <Section title="1. ¿Qué es NØSEE?">
        <p>
          NØSEE es una plataforma web colaborativa que permite a usuarios registrados publicar y consultar
          precios de productos en tiendas físicas locales. Su objetivo es facilitar la comparación de precios
          antes de ir a comprar, ayudando a encontrar la opción más conveniente en el barrio.
        </p>
        <p>
          La plataforma incluye las siguientes funciones principales:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>Publicaciones de precios:</strong> cualquier usuario puede reportar el precio de un producto en una tienda específica, incluyendo foto de referencia.</li>
          <li><strong>Tiendas:</strong> los usuarios pueden registrar tiendas con nombre, tipo, dirección y ubicación GPS, que quedan visibles para todos.</li>
          <li><strong>Ranking:</strong> sistema de reputación basado en las contribuciones de cada usuario.</li>
          <li><strong>Lista de compras inteligente:</strong> permite armar una lista y calcular la canasta óptima de precios entre las tiendas disponibles.</li>
          <li><strong>Órdenes:</strong> coordinación de pedidos con opción de domicilio (repartidor) o recogida en tienda.</li>
          <li><strong>Alertas de precio:</strong> notificación cuando un producto baja del precio objetivo definido por el usuario.</li>
        </ul>
      </Section>

      {/* 2. Registro y cuenta */}
      <Section title="2. Registro y cuenta de usuario">
        <p>
          Para acceder a la mayoría de las funciones de NØSEE es necesario crear una cuenta. Podés registrarte
          con tu correo electrónico y contraseña, o usando tu cuenta de Google (OAuth 2.0 con flujo PKCE).
        </p>
        <p>
          Al registrarte, sos responsable de:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>Proporcionar información verídica (nombre completo y correo electrónico válido).</li>
          <li>Mantener la confidencialidad de tu contraseña.</li>
          <li>Todas las acciones realizadas desde tu cuenta.</li>
        </ul>
        <p>
          NØSEE se reserva el derecho de suspender o desactivar cuentas que incumplan estos términos,
          sin previo aviso en casos de infracción grave.
        </p>
      </Section>

      {/* 3. Conducta del usuario */}
      <Section title="3. Conducta esperada del usuario">
        <p>
          Al usar NØSEE, el usuario se compromete a:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>Publicar precios verídicos:</strong> los precios reportados deben corresponder a la realidad observada en la tienda. Publicar datos falsos o engañosos está prohibido.</li>
          <li><strong>Respetar a otros usuarios:</strong> queda prohibido el acoso, la discriminación o cualquier conducta ofensiva.</li>
          <li><strong>No subir contenido inapropiado:</strong> las imágenes asociadas a publicaciones y tiendas deben ser relevantes y respetuosas.</li>
          <li><strong>No manipular el sistema:</strong> está prohibido crear cuentas falsas, votar en forma fraudulenta o cualquier acción que distorsione el ranking o la información de precios.</li>
          <li><strong>No usar la plataforma con fines comerciales no autorizados:</strong> NØSEE es una herramienta comunitaria, no un canal de publicidad.</li>
        </ul>
      </Section>

      {/* 4. Contenido generado por usuarios */}
      <Section title="4. Contenido generado por usuarios">
        <p>
          Todo el contenido publicado en NØSEE (precios, fotos, datos de tiendas) es responsabilidad
          exclusiva del usuario que lo publica. NØSEE actúa como intermediario y no verifica la exactitud
          de cada publicación en tiempo real.
        </p>
        <p>
          Al publicar contenido en la plataforma, el usuario otorga a NØSEE una licencia no exclusiva para
          mostrar dicho contenido a otros usuarios de la plataforma con fines de comparación de precios.
        </p>
        <p>
          Los usuarios pueden reportar publicaciones incorrectas o inapropiadas. El equipo de moderación
          revisará los reportes y podrá eliminar o suspender el contenido infractor.
        </p>
      </Section>

      {/* 5. Roles y moderación */}
      <Section title="5. Roles y moderación">
        <p>
          NØSEE utiliza un sistema de roles con distintos niveles de acceso:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>Usuario:</strong> puede publicar precios, registrar tiendas, crear listas de compras y realizar pedidos.</li>
          <li><strong>Moderador:</strong> puede revisar y gestionar publicaciones reportadas.</li>
          <li><strong>Repartidor:</strong> tiene acceso a la vista de pedidos y rutas de entrega.</li>
          <li><strong>Administrador:</strong> tiene acceso completo a la plataforma, incluyendo gestión de usuarios y auditoría.</li>
        </ul>
        <p>
          Los roles son asignados por el administrador de la plataforma. Los usuarios serán notificados
          cuando su rol sea actualizado.
        </p>
      </Section>

      {/* 6. Disponibilidad */}
      <Section title="6. Disponibilidad del servicio">
        <p>
          NØSEE es un proyecto universitario en desarrollo activo. La plataforma se ofrece "tal cual" (as-is)
          sin garantía de disponibilidad continua. Podemos realizar mantenimientos, actualizaciones o
          interrupciones sin previo aviso.
        </p>
        <p>
          No nos hacemos responsables por pérdidas o daños derivados de la indisponibilidad temporal
          del servicio.
        </p>
      </Section>

      {/* 7. Eliminación de cuenta */}
      <Section title="7. Eliminación o desactivación de cuenta">
        <p>
          Los usuarios pueden gestionar su cuenta desde la sección de Perfil:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>Desactivar cuenta:</strong> la cuenta queda inactiva. Las publicaciones anteriores permanecen en la plataforma pero se desvinculan del perfil público.</li>
          <li><strong>Eliminar cuenta:</strong> la cuenta es marcada como eliminada en nuestros sistemas. Por razones de auditoría e integridad de datos, los registros históricos se conservan de forma anonimizada.</li>
        </ul>
      </Section>

      {/* 8. Modificaciones */}
      <Section title="8. Modificaciones a estos términos">
        <p>
          NØSEE puede actualizar estos Términos de Uso en cualquier momento. Los cambios significativos
          serán notificados dentro de la plataforma. El uso continuo de NØSEE después de publicar cambios
          implica la aceptación de los nuevos términos.
        </p>
        <p>
          <strong style={{ color: 'var(--text-primary)' }}>Nota sobre el futuro de la plataforma:</strong>{' '}
          NØSEE comenzó como un proyecto universitario, pero está orientado a convertirse en un producto
          real y disponible al público en general. En el momento en que se produzca ese lanzamiento
          comercial, estos Términos de Uso serán actualizados para reflejar las nuevas condiciones,
          responsabilidades y el marco legal correspondiente. Los usuarios registrados serán notificados
          con anticipación y deberán aceptar los términos actualizados para continuar usando la plataforma.
        </p>
      </Section>

      {/* 9. Contacto */}
      <Section title="9. Contacto">
        <p>
          Para consultas, reportes o cualquier inquietud relacionada con estos términos o con el
          funcionamiento de la plataforma, podés escribirnos a:
        </p>
        <p>
          <a
            href="mailto:noseecorp@gmail.com"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}
          >
            noseecorp@gmail.com
          </a>
        </p>
        <p>
          Este documento fue redactado en el contexto del proyecto NØSEE, actualmente en etapa
          universitaria (Ingeniería de Software III), con proyección de lanzamiento comercial.
        </p>
      </Section>
    </main>
  );
}
