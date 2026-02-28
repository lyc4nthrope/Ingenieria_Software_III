import {
  useAuthStore,
  selectIsAuthenticated,
} from "@/features/auth/store/authStore";

import { usePublications } from "@/features/publications/hooks";

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const FALLBACK_IMAGE = "https://via.placeholder.com/400x300?text=Sin+foto";

const isAbsoluteUrl = (value = "") => /^https?:\/\//i.test(value);

const buildCloudinaryImageUrl = (publicId) => {
  if (!publicId || !CLOUDINARY_CLOUD_NAME) return null;

  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_auto,w_800/${publicId}`;
};

const resolvePublicationPhoto = (publication) => {
  const candidate =
    publication?.photo ||
    publication?.photo_url ||
    publication?.cloudinary_public_id;

  if (!candidate) return FALLBACK_IMAGE;
  if (isAbsoluteUrl(candidate)) return candidate;

  return buildCloudinaryImageUrl(candidate) || FALLBACK_IMAGE;
};

function PublicationCard({ pub, isAuthenticated }) {
  const publicationImage = resolvePublicationPhoto(pub);

  const handleImageError = (event) => {
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <article className="card">
      <div className="card-image-wrap">
        <button
          className="card-report-button"
          type="button"
          aria-label="Reportar publicación"
        >
          !
        </button>
        <img
          src={publicationImage}
          alt=""
          className="card-image"
          loading="lazy"
          onError={handleImageError}
        />
      </div>

      <div className="card-body">
        <div className="card-title">{pub.product?.name || "Producto"}</div>
        <div className="card-price">${pub.price.toLocaleString()}</div>
        <div className="card-description">
          {pub.description || "Sin descripción"}
        </div>
      </div>

      <div className="card-divider" />

      <div className="card-actions-row">
        <div className="card-indicators">
          <span>{pub.validated_count || 0}</span>
          <span>{pub.reported_count || 0}</span>
          <span>{pub.store?.name || "Tienda"}</span>
        </div>

        <button className="card-action-button" disabled={!isAuthenticated}>
          Ver
        </button>
      </div>
    </article>
  );
}

export default function HomePage() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const { publications, loading } = usePublications({ limit: 12 });

  return (
    <div className="home-wrapper">
      <section className="banner">
        <h1>Bienvenidos a NØSEE, plataforma colaborativa.</h1>
        <p>No sabes donde es más barato, te mostramos donde no ves.</p>
      </section>

      <div className="categories">
        <button>Electrodomésticos</button>
        <button>Mercado</button>
        <button>Comida</button>
        <button>Juegos</button>
        <button>Hogar</button>
        <button>Tecnología</button>
      </div>

      <div className="layout">
        <div className="feed">
          {loading ? (
            <p>Cargando publicaciones...</p>
          ) : publications.length === 0 ? (
            <p>Aún no hay publicaciones. Cuando un usuario cree una, aparecerá aquí.</p>
          ) : (
            publications.map((pub) => (
              <PublicationCard
                key={pub.id}
                pub={pub}
                isAuthenticated={isAuthenticated}
              />
            ))
          )}
        </div>

        <aside className="ads">
          <div className="ad-card">
            <span>Anuncio</span>
          </div>

          <div className="ad-card">
            <span>Anuncio</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
