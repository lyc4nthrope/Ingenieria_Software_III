import {
  useAuthStore,
  selectIsAuthenticated,
} from "@/features/auth/store/authStore";

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

const mockPublications = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  productName: "Producto ejemplo",
  price: 3000 + i * 500,
  description: "Descripción corta del producto",
  photo: "simple",
  likes: 10 + i,
  comments: 2 + i,
}));

function PublicationCard({ pub, isAuthenticated }) {
  const publicationImage = resolvePublicationPhoto(pub);
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
          alt={pub.productName}
          className="card-image"
          loading="lazy"
        />
      </div>

      <div className="card-body">
        <div className="card-title">{pub.productName}</div>
        <div className="card-price">${pub.price.toLocaleString()}</div>
        <div className="card-description">{pub.description}</div>
      </div>

      <div className="card-divider" />

      <div className="card-actions-row">
        <div className="card-indicators">
          <span>{pub.likes}</span>
          <span>{pub.comments}</span>
          <span>Demo</span>
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

      <div className={`layout ${!isAuthenticated ? "layout--guest" : ""}`}>
        <div className="feed">
          {mockPublications.map((pub) => (
            <PublicationCard
              key={pub.id}
              pub={pub}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>

        <aside className={`ads ${!isAuthenticated ? "ads--guest" : ""}`}>
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
