/**
 * PrivacyPage - Política de Privacidad de NØSEE
 *
 * Página pública (no requiere autenticación).
 * Detalla con precisión qué datos se recopilan, cómo se almacenan
 * y qué servicios de terceros utiliza la plataforma.
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

const Tag = ({ children }) => (
  <span style={{
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'var(--accent-soft)',
    color: 'var(--accent)',
    fontSize: '12px',
    fontWeight: '600',
    marginRight: '6px',
  }}>
    {children}
  </span>
);

export default function PrivacyPage() {
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
          Política de Privacidad
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Última actualización: {lastUpdated}
        </p>
        <p style={{ color: 'var(--text-secondary)', marginTop: '16px', lineHeight: '1.6' }}>
          En <strong style={{ color: 'var(--text-primary)' }}>NØSEE</strong> valoramos tu privacidad.
          Esta política explica de forma clara y precisa qué datos personales recopilamos, por qué los
          recopilamos, cómo los usamos y qué servicios de terceros intervienen en el proceso.
        </p>
      </header>

      {/* 1. Responsable */}
      <Section title="1. Responsable del tratamiento de datos">
        <p>
          NØSEE es un proyecto universitario desarrollado en la materia Ingeniería de Software III.
          Los datos recopilados son tratados exclusivamente con fines académicos y de funcionamiento
          de la plataforma. No existe una entidad comercial detrás de NØSEE.
        </p>
      </Section>

      {/* 2. Qué datos recopilamos */}
      <Section title="2. Datos que recopilamos">
        <p><strong style={{ color: 'var(--text-primary)' }}>2.1 Datos de cuenta</strong></p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><Tag>Nombre completo</Tag> Ingresado durante el registro o importado de tu cuenta de Google.</li>
          <li><Tag>Correo electrónico</Tag> Usado para autenticación e identificación. Nunca se muestra públicamente sin tu consentimiento.</li>
          <li><Tag>Foto de perfil</Tag> Solo si usás Google OAuth: se importa el avatar de tu cuenta de Google. No es obligatorio.</li>
          <li><Tag>Contraseña</Tag> Si te registrás con email/contraseña, esta se almacena de forma segura mediante hashing en Supabase Auth. NØSEE nunca accede a tu contraseña en texto plano.</li>
        </ul>

        <p style={{ marginTop: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>2.2 Datos de uso de la plataforma</strong></p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><Tag>Publicaciones de precios</Tag> Nombre del producto, precio, fecha y hora de publicación, tienda asociada, y foto de referencia (si se sube).</li>
          <li><Tag>Tiendas registradas</Tag> Nombre de la tienda, tipo (supermercado, almacén, etc.), dirección, y coordenadas GPS (latitud/longitud). Estos datos son públicos dentro de la plataforma.</li>
          <li><Tag>Órdenes de compra</Tag> Items seleccionados, modo de entrega (domicilio o recogida), repartidor asignado (si aplica), estado y timestamps.</li>
          <li><Tag>Alertas de precio</Tag> Producto y precio objetivo que definiste para recibir notificaciones.</li>
          <li><Tag>Lista de compras</Tag> Tu lista de compras se guarda localmente en el almacenamiento de tu navegador (localStorage). No se sube a nuestros servidores hasta que iniciás una optimización o creás un pedido.</li>
          <li><Tag>Reportes</Tag> Si reportás una publicación, registramos el contenido del reporte, quién lo hizo y cuándo.</li>
        </ul>

        <p style={{ marginTop: '8px' }}><strong style={{ color: 'var(--text-primary)' }}>2.3 Datos técnicos</strong></p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><Tag>Logs de auditoría</Tag> El sistema registra acciones clave (creación de publicaciones, cambios de rol, reportes) con identificador de usuario y timestamp. Solo los administradores pueden acceder a estos logs.</li>
          <li><Tag>Métricas de rendimiento</Tag> Datos agregados y anónimos sobre el rendimiento técnico de la aplicación (tiempo de respuesta, disponibilidad). Sin datos personales.</li>
        </ul>
      </Section>

      {/* 3. Servicios de terceros */}
      <Section title="3. Servicios de terceros que usamos">
        <p>
          Para funcionar, NØSEE utiliza los siguientes servicios externos. Al usar la plataforma,
          también aceptás las políticas de privacidad de estos proveedores:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '4px' }}>
          {/* Supabase */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Supabase (base de datos y autenticación)</p>
            <p>
              Toda la información de tu cuenta, publicaciones, tiendas, órdenes y alertas se almacena en
              una base de datos PostgreSQL alojada en <strong>Supabase Cloud</strong>. Supabase gestiona
              también la autenticación (email/contraseña y Google OAuth mediante flujo PKCE).
            </p>
            <p>
              Los datos están protegidos por <strong>Row Level Security (RLS)</strong>: cada usuario solo
              puede leer y modificar sus propios datos, según las políticas definidas en la base de datos.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Política de privacidad de Supabase: supabase.com/privacy
            </p>
          </div>

          {/* Google OAuth */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Google OAuth 2.0 (inicio de sesión con Google)</p>
            <p>
              Si elegís iniciar sesión con Google, Google autentica tu identidad y comparte con nosotros
              únicamente tu nombre, correo electrónico y foto de perfil. NØSEE no recibe ni almacena
              tu contraseña de Google.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Política de privacidad de Google: policies.google.com/privacy
            </p>
          </div>

          {/* Cloudinary */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Cloudinary (almacenamiento de imágenes)</p>
            <p>
              Las fotografías que subís (imágenes de productos en publicaciones, fotos de tiendas o
              evidencia de locales) se almacenan en <strong>Cloudinary</strong>, un servicio de gestión
              de imágenes en la nube. Estas imágenes pueden ser visibles públicamente dentro de la
              plataforma.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Política de privacidad de Cloudinary: cloudinary.com/privacy
            </p>
          </div>

          {/* Google Analytics */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Google Analytics 4 (métricas de uso)</p>
            <p>
              Utilizamos <strong>Google Analytics 4 (GA4)</strong> para recopilar datos anónimos sobre
              cómo se usa la plataforma: páginas visitadas, tiempo en la aplicación y eventos de
              navegación. Estos datos nos ayudan a mejorar la experiencia del usuario.
            </p>
            <p>
              GA4 utiliza cookies y no recopila datos que permitan identificarte directamente.
              Podés optar por no ser rastreado activando el bloqueador de tu navegador o instalando
              la extensión de inhabilitación de Google Analytics.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Política de privacidad de Google Analytics: policies.google.com/privacy
            </p>
          </div>

          {/* Prometheus + Grafana */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Prometheus + Grafana (monitoreo de rendimiento)</p>
            <p>
              Para monitorear el rendimiento técnico de la plataforma en producción, recopilamos métricas
              agregadas (tiempo de carga, disponibilidad, errores) mediante <strong>Prometheus</strong>,
              visualizadas en <strong>Grafana</strong>. Estos datos son completamente anónimos y no
              contienen información personal.
            </p>
            <p>
              El servidor de métricas está alojado en <strong>Railway</strong> y solo es accesible
              para el equipo de desarrollo.
            </p>
          </div>

          {/* OpenStreetMap / Leaflet */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>OpenStreetMap / Leaflet / Nominatim (mapas)</p>
            <p>
              Los mapas dentro de la aplicación (selector de tienda, visualización de rutas) utilizan
              <strong> Leaflet</strong> con tiles de <strong>OpenStreetMap</strong>. La geocodificación
              de direcciones usa <strong>Nominatim</strong> (gratuito, con límites de uso). Estas
              herramientas no reciben datos personales tuyos.
            </p>
          </div>

          {/* Azure Static Web Apps */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
            <p style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Microsoft Azure Static Web Apps (hosting)</p>
            <p>
              La aplicación web está desplegada en <strong>Azure Static Web Apps</strong> de Microsoft.
              Cuando accedés a NØSEE, tu petición pasa por los servidores de Azure, que pueden registrar
              datos técnicos básicos como dirección IP con fines de seguridad y disponibilidad.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Política de privacidad de Microsoft Azure: microsoft.com/privacystatement
            </p>
          </div>
        </div>
      </Section>

      {/* 4. Cómo usamos los datos */}
      <Section title="4. Para qué usamos tus datos">
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li><strong>Autenticación:</strong> verificar tu identidad y darte acceso a la plataforma.</li>
          <li><strong>Funcionamiento del servicio:</strong> mostrar publicaciones, tiendas, órdenes y alertas correctamente asociadas a tu cuenta.</li>
          <li><strong>Ranking de usuarios:</strong> calcular tu posición en el ranking en base a tus contribuciones de precios.</li>
          <li><strong>Notificaciones de precios:</strong> alertarte cuando un precio baja del umbral que definiste.</li>
          <li><strong>Moderación:</strong> revisar reportes de contenido inapropiado y mantener la calidad de la información.</li>
          <li><strong>Auditoría:</strong> registrar acciones del sistema para detectar comportamientos irregulares o abusos.</li>
          <li><strong>Mejora de la plataforma:</strong> analizar métricas anónimas de uso para mejorar la experiencia.</li>
        </ul>
      </Section>

      {/* 5. Retención y eliminación */}
      <Section title="5. Retención y eliminación de datos">
        <p>
          NØSEE aplica una política de <strong>eliminación lógica (soft delete)</strong>: cuando eliminás
          tu cuenta o una publicación, los registros no se borran físicamente de la base de datos de forma
          inmediata. En su lugar, se marcan como eliminados o inactivos.
        </p>
        <p>
          Esta decisión responde a razones de auditoría e integridad referencial de los datos (por ejemplo,
          mantener el historial de precios aunque el usuario ya no esté activo). Los datos marcados como
          eliminados no son visibles para otros usuarios ni para vos.
        </p>
        <p>
          Si querés solicitar la eliminación permanente de tus datos, podés comunicarte con el equipo de
          desarrollo a través del repositorio del proyecto.
        </p>
      </Section>

      {/* 6. Seguridad */}
      <Section title="6. Seguridad de los datos">
        <p>
          Implementamos medidas de seguridad para proteger tus datos:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>Cifrado en tránsito:</strong> toda la comunicación con nuestros servidores usa HTTPS/TLS.</li>
          <li><strong>Contraseñas hasheadas:</strong> Supabase Auth almacena las contraseñas usando bcrypt. Nunca vemos tu contraseña en texto plano.</li>
          <li><strong>Row Level Security (RLS):</strong> las políticas en la base de datos garantizan que cada usuario solo puede acceder a sus propios datos.</li>
          <li><strong>OAuth PKCE:</strong> el flujo de inicio de sesión con Google usa el protocolo PKCE para prevenir ataques de interceptación.</li>
        </ul>
      </Section>

      {/* 7. Compartir datos */}
      <Section title="7. No vendemos tus datos">
        <p>
          NØSEE <strong>no vende, alquila ni comparte</strong> tus datos personales con terceros con fines
          comerciales o publicitarios. Los únicos terceros que reciben datos son los proveedores de
          infraestructura listados en la sección 3, y únicamente en la medida necesaria para operar el servicio.
        </p>
      </Section>

      {/* 8. Tus derechos */}
      <Section title="8. Tus derechos">
        <p>
          Como usuario de NØSEE tenés derecho a:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>Acceder</strong> a los datos que tenemos sobre vos (visible desde tu perfil).</li>
          <li><strong>Rectificar</strong> tu nombre y datos de perfil desde la sección Perfil.</li>
          <li><strong>Desactivar</strong> tu cuenta en cualquier momento desde la sección Perfil.</li>
          <li><strong>Solicitar la eliminación</strong> de tu cuenta y datos asociados contactando al equipo de desarrollo.</li>
        </ul>
      </Section>

      {/* 9. Cookies */}
      <Section title="9. Cookies y almacenamiento local">
        <p>
          NØSEE utiliza:
        </p>
        <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li><strong>Cookies de sesión de Supabase:</strong> para mantener tu sesión activa de forma segura.</li>
          <li><strong>localStorage:</strong> para guardar preferencias de accesibilidad (idioma, tamaño de fuente), tu lista de compras temporal y configuraciones locales.</li>
          <li><strong>Cookies de Google Analytics:</strong> para métricas anónimas de uso. Podés desactivarlas desde la configuración de tu navegador.</li>
        </ul>
      </Section>

      {/* 10. Cambios */}
      <Section title="10. Cambios a esta política">
        <p>
          Podemos actualizar esta Política de Privacidad periódicamente. Cuando lo hagamos, actualizaremos
          la fecha al inicio del documento. El uso continuado de NØSEE después de los cambios implica
          la aceptación de la nueva política.
        </p>
        <p>
          <strong style={{ color: 'var(--text-primary)' }}>Nota sobre el futuro de la plataforma:</strong>{' '}
          NØSEE está en etapa universitaria pero tiene proyección de convertirse en un producto comercial.
          Cuando se produzca ese lanzamiento, esta Política de Privacidad será revisada y actualizada para
          cumplir con los marcos legales aplicables (como GDPR, leyes de protección de datos locales u
          otras regulaciones vigentes en los países donde opere). Los usuarios serán informados con
          anticipación sobre cualquier cambio relevante en el tratamiento de sus datos.
        </p>
        <p>
          Esta política fue redactada en el contexto del proyecto NØSEE, actualmente en etapa
          universitaria (Ingeniería de Software III), con proyección de lanzamiento comercial.
        </p>
      </Section>

      {/* 11. Contacto */}
      <Section title="11. Contacto">
        <p>
          Para ejercer tus derechos, hacer consultas sobre esta política o reportar cualquier
          inquietud relacionada con el tratamiento de tus datos, podés contactarnos en:
        </p>
        <p>
          <a
            href="mailto:noseecorp@gmail.com"
            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}
          >
            noseecorp@gmail.com
          </a>
        </p>
      </Section>
    </main>
  );
}
