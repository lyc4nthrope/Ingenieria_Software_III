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

const HeartIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" />
  </svg>
);

const MessageIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const mockPublications = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  author: `Usuario ${i + 1}`,
  avatar: `U${i + 1}`,
  productName: "Producto ejemplo",
  price: 3000 + i * 500,
  store: "Tienda Demo",
  photo: "simple",
  description: "Descripción corta del producto",
  likes: 10 + i,
  timestamp: "Hace 2 horas",
  verified: i % 2 === 0,
}));

function PublicationCard({ pub, isAuthenticated }) {
  const publicationImage = resolvePublicationPhoto(pub);
  return (
    <div className="card">
      {/* Header */}
      <div className="card-header">
        <div className="avatar">{pub.avatar}</div>
        <div className="card-user">
          <div className="card-author">
            {pub.author} {pub.verified && "✓"}
          </div>
          <div className="card-meta">
            {pub.timestamp} • {pub.store}
          </div>
        </div>
      </div>

      {/* Imagen */}
      <img
        src={publicationImage}
        alt={pub.productName}
        className="card-image"
        loading="lazy"
      />

      {/* Acciones */}
      <div className="card-actions">
        <button disabled={!isAuthenticated}>
          <HeartIcon /> {pub.likes}
        </button>
        <button disabled={!isAuthenticated}>
          <MessageIcon /> Reportar
        </button>
      </div>

      {/* Info producto */}
      <div className="card-body">
        <div className="card-title">{pub.productName}</div>
        <div className="card-price">${pub.price.toLocaleString()}</div>
        <div className="card-description">{pub.description}</div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);

  return (
    <div className="home-wrapper">
      {/* Banner */}
      <section className="banner">
        <h1>Bienvenidos a NØSEE, plataforma colaborativa.</h1>
        <p>No sabes donde es más barato, te mostramos donde no ves.</p>
      </section>

      {/* Categorías */}
      <div className="categories">
        <button>Electrodomésticos</button>
        <button>Mercado</button>
        <button>Comida</button>
        <button>Juegos</button>
      </div>

      {/* Grid principal */}
      <div className="layout">
        {/* Feed */}
        <div className="feed">
          {mockPublications.map((pub) => (
            <PublicationCard
              key={pub.id}
              pub={pub}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>

        {/* Ads */}
        <div className="ads">
          <div className="ad-card">
            <span>Anuncio</span>
          </div>

          <div className="ad-card">
            <span>Anuncio</span>
          </div>
        </div>
      </div>
    </div>
  );
}
