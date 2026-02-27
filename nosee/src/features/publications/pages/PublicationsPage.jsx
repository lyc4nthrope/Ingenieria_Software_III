/**
 * PublicationsPage - Listado de publicaciones de precios
 *
 * Ruta: /publicaciones (protegida)
 * Ubicación: src/features/publications/pages/PublicationsPage.jsx
 *
 * Muestra el listado de publicaciones de precios con búsqueda y filtros.
 * Los usuarios pueden ver publicaciones de otros, validarlas y reportar abusos.
 *
 * Features:
 * - Búsqueda y filtrado avanzado
 * - Grid responsivo de publicaciones
 * - Estados de carga y vacío
 * - Botón para crear nuevas publicaciones
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// State Management
import { useAuthStore, selectAuthUser } from '@/features/auth/store/authStore';

// Componentes UI compartidos
import Button from '@/components/ui/Button';

// Componentes de publicaciones
import PriceSearchFilter from '@/features/publications/components/PriceSearchFilter';
import PublicationCard from '@/features/publications/components/PublicationCard';

const MOCK_BASE_TIME = Date.now();

const MOCK_PUBLICATIONS = [
  {
    id: 1,
    productName: 'Aceite Girasol 3L',
    price: 18900,
    currency: 'COP',
    storeName: 'Éxito Downtown',
    description: "Aceite de girasol marca D'Oleorico, 3 litros, excelente para cocina.",
    photoUrl: 'https://via.placeholder.com/300x200?text=Aceite+Girasol',
    author: {
      id: 'user1',
      name: 'María García',
      email: 'maria@example.com',
      avatar: 'https://via.placeholder.com/40?text=MG',
    },
    validations: 14,
    reports: 0,
    timestamp: new Date(MOCK_BASE_TIME - 2 * 60 * 60 * 1000), // hace 2 horas
    status: 'validated',
  },
  {
    id: 2,
    productName: 'Leche Integral 1L',
    price: 4200,
    currency: 'COP',
    storeName: 'Carrefour Centro Comercial',
    description: 'Leche integral fresca, 1 litro, recién llegada.',
    photoUrl: 'https://via.placeholder.com/300x200?text=Leche',
    author: {
      id: 'user2',
      name: 'Juan Pérez',
      email: 'juan@example.com',
      avatar: 'https://via.placeholder.com/40?text=JP',
    },
    validations: 8,
    reports: 0,
    timestamp: new Date(MOCK_BASE_TIME - 4 * 60 * 60 * 1000), // hace 4 horas
    status: 'validated',
  },
  {
    id: 3,
    productName: 'Queso Fresco 500g',
    price: 15800,
    currency: 'COP',
    storeName: 'Éxito Quindío',
    description: 'Queso fresco hecho en la región, 500g, excelente calidad.',
    photoUrl: 'https://via.placeholder.com/300x200?text=Queso',
    author: {
      id: 'user3',
      name: 'Ana López',
      email: 'ana@example.com',
      avatar: 'https://via.placeholder.com/40?text=AL',
    },
    validations: 3,
    reports: 0,
    timestamp: new Date(MOCK_BASE_TIME - 8 * 60 * 60 * 1000), // hace 8 horas
    status: 'pending',
  },
];

// Iconos SVG inline
const SearchIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const PlusIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EmptyIcon = () => (
  <svg
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1"
    opacity="0.6"
  >
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
  </svg>
);

/**
 * Componente principal: PublicationsPage
 * Maneja el listado, búsqueda y filtrado de publicaciones
 */
export default function PublicationsPage() {
  // ─────────────────────────────────────────────────────────────
  // PASO 1: Estado del usuario desde store
  // ─────────────────────────────────────────────────────────────
  const user = useAuthStore(selectAuthUser);

  // ─────────────────────────────────────────────────────────────
  // PASO 2: Hooks de navegación
  // ─────────────────────────────────────────────────────────────
  const navigate = useNavigate();

  // ─────────────────────────────────────────────────────────────
  // PASO 3: Estado local de la página
  // ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    priceMin: 0,
    priceMax: 1000000,
    distance: 50,
    sortBy: 'recent',
  });
  const [error, setError] = useState(null);
  const loading = false;

  /**
   * Mock data - En producción vendrá de usePublications hook
   * Para facilitar testing visual, usamos datos estáticos por ahora
   *
   * TODO: Integrar usePublications hook cuando esté listo
   * const { publications, loading, error, refetch } = usePublications(filters);
   */
    const [publications] = useState(MOCK_PUBLICATIONS);

  // ─────────────────────────────────────────────────────────────
  // PASO 4: Funciones de manejo de eventos
  // ─────────────────────────────────────────────────────────────

  /**
   * Maneja clic en botón "Publicar precio"
   * Redirige al formulario de crear publicación
   */
  const handlePublish = () => {
    if (!user?.isVerified) {
      setError('Debes verificar tu email antes de publicar');
      return;
    }
    navigate('/publicaciones/nueva');
  };

  /**
   * Maneja cambios en la búsqueda
   * TODO: Implementar búsqueda real con debounce
   */
  const handleSearch = (query) => {
    setSearchQuery(query);
    // En producción: filtrar publicaciones por query
    // setPublications(filteredResults);
  };

  /**
   * Maneja cambios en filtros
   */
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // En producción: refetch con nuevos filtros
    // refetch(newFilters);
  };

  /**
   * Maneja validación de publicación
   */
  const handleValidatePublication = (publicationId) => {
    // En producción: llamar a API
    // validatePublication(publicationId);
    console.log('Validar publicación:', publicationId);
  };

  /**
   * Maneja reporte de publicación
   */
  const handleReportPublication = (publicationId, reason) => {
    // En producción: llamar a API
    // reportPublication(publicationId, reason);
    console.log('Reportar publicación:', publicationId, reason);
  };

  /**
   * Maneja eliminación de publicación (solo si es autor)
   */
  const handleDeletePublication = (publicationId) => {
    // En producción: llamar a API
    // deletePublication(publicationId);
    console.log('Eliminar publicación:', publicationId);
  };

  // ─────────────────────────────────────────────────────────────
  // PASO 5: Render - Estructura de la página
  // ─────────────────────────────────────────────────────────────

  return (
    <main
      style={{
        flex: 1,
        padding: '28px 16px',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      {/* ─────────── SECCIÓN: Encabezado ─────────── */}
      <section
        style={{
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: 'var(--text-primary)',
                marginBottom: '8px',
                letterSpacing: '-0.02em',
              }}
            >
              Precios
            </h1>
            <p
              style={{
                fontSize: '15px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
              }}
            >
              Busca y compara los mejores precios de productos en la región.
              Ayuda a la comunidad publicando los precios que encuentres.
            </p>
          </div>

          {/* Botón Publicar Precio */}
          <Button
            size="md"
            onClick={handlePublish}
            disabled={!user?.isVerified}
            title={!user?.isVerified ? 'Verifica tu email primero' : ''}
          >
            <PlusIcon style={{ marginRight: '6px' }} />
            Publicar precio
          </Button>
        </div>

        {/* Aviso de email no verificado */}
        {!user?.isVerified && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#FBBF24',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            ⚠️ Verifica tu email para publicar precios. Revisa tu bandeja de
            entrada.
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            style={{
              padding: '12px 16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              color: '#EF4444',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}
      </section>

      {/* ─────────── SECCIÓN: Barra de búsqueda ─────────── */}
      <section
        style={{
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '14px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <SearchIcon />
          <input
            type="text"
            placeholder="Buscar producto, tienda o precio..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '14px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </section>

      {/* ─────────── SECCIÓN: Filtros ─────────── */}
      <section
        style={{
          marginBottom: '32px',
        }}
      >
        <PriceSearchFilter
          filters={filters}
          onFiltersChange={handleFilterChange}
          onClearFilters={() =>
            setFilters({
              priceMin: 0,
              priceMax: 1000000,
              distance: 50,
              sortBy: 'recent',
            })
          }
        />
      </section>

      {/* ─────────── SECCIÓN: Listado de publicaciones ─────────── */}
      <section>
        {loading ? (
          // Estado: Cargando
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              color: 'var(--text-muted)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(56,189,248,0.15)',
                borderTop: '3px solid var(--accent, #38BDF8)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '16px',
              }}
            />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ fontSize: '14px' }}>Cargando publicaciones...</p>
          </div>
        ) : publications.length === 0 ? (
          // Estado: Vacío
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '80px 20px',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            <EmptyIcon />
            <h2
              style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text-secondary)',
                marginTop: '16px',
                marginBottom: '8px',
              }}
            >
              No hay publicaciones
            </h2>
            <p style={{ fontSize: '14px', maxWidth: '320px', lineHeight: '1.6' }}>
              No encontramos publicaciones que coincidan con tus filtros.
              Intenta con otros términos o{' '}
              <button
                onClick={handlePublish}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontWeight: '600',
                  textDecoration: 'underline',
                }}
              >
                sé el primero en publicar
              </button>
              .
            </p>
          </div>
        ) : (
          // Estado: Con publicaciones
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
            }}
          >
            {publications.map((publication) => (
              <PublicationCard
                key={publication.id}
                publication={publication}
                onValidate={handleValidatePublication}
                onReport={handleReportPublication}
                onDelete={handleDeletePublication}
                isAuthor={user?.id === publication.author.id}
              />
            ))}
          </div>
        )}

        {/* Indicador de "Cargar más" (para infinite scroll futuro) */}
        {publications.length > 0 && !loading && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '32px',
              paddingTop: '32px',
              borderTop: '1px solid var(--border)',
            }}
          >
            <Button
              variant="ghost"
              size="md"
              onClick={() => {
                // En producción: loadMore()
                console.log('Cargar más publicaciones');
              }}
            >
              Ver más publicaciones
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
