/**
 * PublicationDetailPage.jsx
 *
 * Full-page publication detail view at /publicaciones/:id.
 * Stitch dark-glassmorphic two-column layout with hero image,
 * info cards, Leaflet map, threaded comments, and sticky footer.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuthStore, selectAuthUser } from "@/features/auth/store/authStore";
import {
  getPublicationDetail,
  validatePublication,
  downvotePublication,
  unvotePublication,
} from "@/services/api/publications.api";
import { parseStoreLocation } from "../utils/parseStoreLocation";
import { useShoppingListStore } from "@/features/shopping-list/store/shoppingListStore";
import PublicationLocationMap from "../components/PublicationLocationMap";
import CommentsSection from "../components/CommentsSection";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  // PAGE WRAPPER
  page: {
    position: "fixed",
    top: "60px",
    left: 0,
    right: 0,
    bottom: 0,
    background: "var(--bg-base)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    overflow: "hidden",
    zIndex: 1,
  },

  bgBlur: {
    position: "fixed",
    inset: 0,
    zIndex: 0,
    backgroundSize: "cover",
    backgroundPosition: "center",
    filter: "blur(24px) brightness(0.25)",
    transform: "scale(1.05)",
    pointerEvents: "none",
  },

  container: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "1152px",
    height: "calc(100% - 32px)",
    background: "var(--surface-container-low, #181c22)",
    borderRadius: "var(--radius-xl)",
    border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "0 40px 80px -15px rgba(0,0,0,0.8)",
    display: "flex",
    flexDirection: "row",
    overflow: "hidden",
  },

  // BACK BUTTON
  backBtn: {
    position: "absolute",
    top: "24px",
    left: "24px",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "8px 14px",
    background: "rgba(8,12,20,0.5)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "9999px",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s",
    minWidth: 44,
    minHeight: 44,
  },

  // LEFT COLUMN
  leftCol: {
    position: "relative",
    width: "45%",
    flexShrink: 0,
    background: "var(--surface-container-lowest, #0a0e14)",
    display: "flex",
    alignItems: "stretch",
    justifyContent: "stretch",
    overflow: "hidden",
    padding: 0,
  },

  leftGradient: {
    position: "absolute",
    inset: 0,
    background: "linear-gradient(135deg, rgba(121,209,255,0.05) 0%, transparent 100%)",
    pointerEvents: "none",
  },

  imageWrapper: {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },

  heroImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center",
    display: "block",
    transition: "transform 0.7s ease",
  },

  pricePill: {
    position: "absolute",
    bottom: "64px",
    right: "32px",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    background: "rgba(16,20,26,0.7)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "9999px",
    padding: "10px 20px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
  },

  priceText: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: "clamp(20px, 2.5vw, 28px)",
    color: "var(--primary-container, #22b1ec)",
    letterSpacing: "-0.02em",
    lineHeight: 1,
  },

  // RIGHT COLUMN
  rightCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    minWidth: 0,
  },

  rightScrollable: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
  },

  rightHeader: {
    padding: "20px 24px 0",
  },

  badgesRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
    flexWrap: "wrap",
  },

  badgeCategory: {
    background: "rgba(92,222,148,0.1)",
    color: "#5cde94",
    padding: "4px 12px",
    borderRadius: "9999px",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
  },

  badgeStatus: {
    background: "rgba(121,209,255,0.1)",
    color: "var(--primary-container, #22b1ec)",
    padding: "4px 12px",
    borderRadius: "9999px",
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.15em",
  },

  heroTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 900,
    fontSize: "clamp(18px, 2.5vw, 28px)",
    color: "#dfe2eb",
    lineHeight: 1.15,
    marginBottom: "4px",
    letterSpacing: "-0.02em",
    outline: "none",
  },

  heroBrand: {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-secondary)",
    marginBottom: "12px",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
    marginBottom: "12px",
  },

  infoCard: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "var(--radius-md)",
    background: "var(--surface-container-high, #262a31)",
    transition: "background 0.2s",
    cursor: "default",
    minWidth: 0,
    overflow: "hidden",
  },

  infoCardIconWrap: {
    width: "32px",
    height: "32px",
    borderRadius: "9999px",
    background: "var(--surface-container-lowest, #0a0e14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    border: "1px solid rgba(121,209,255,0.2)",
  },

  infoCardInitials: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 800,
    fontSize: "12px",
    color: "var(--primary-container, #22b1ec)",
  },

  infoCardLabel: {
    fontSize: "9px",
    fontWeight: 700,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: "1px",
  },

  infoCardValue: {
    fontWeight: 600,
    fontSize: "12px",
    color: "#dfe2eb",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  // MAP SECTION
  mapSection: {
    padding: "0 24px 12px",
  },

  mapHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "8px",
  },

  mapSectionTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#dfe2eb",
  },

  mapGmapsLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--primary-container, #22b1ec)",
    textDecoration: "none",
    padding: "4px 10px",
    borderRadius: "9999px",
    border: "1px solid rgba(121,209,255,0.2)",
    transition: "background 0.2s",
    minHeight: "44px",
  },

  mapContainer: {
    position: "relative",
    width: "100%",
    height: "180px",
    borderRadius: "var(--radius-md)",
    overflow: "hidden",
  },

  mapFilter: {
    filter: "brightness(0.5) contrast(1.25) saturate(0.3)",
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
  },

  mapAddressOverlay: {
    position: "absolute",
    bottom: "12px",
    left: "16px",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    background: "rgba(16,20,26,0.7)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "var(--radius-sm)",
    padding: "6px 12px",
    fontSize: "10px",
    fontWeight: 700,
    color: "#dfe2eb",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    pointerEvents: "none",
  },

  // COMMUNITY FEED
  feedSection: {
    padding: "0 24px 16px",
    flexGrow: 1,
  },

  feedHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },

  feedToggleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "8px 0",
    marginBottom: "4px",
    borderRadius: "8px",
  },

  feedTitle: {
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 700,
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    color: "#dfe2eb",
  },

  feedCount: {
    fontSize: "11px",
    color: "rgba(255,255,255,0.4)",
    fontWeight: 500,
  },

  // STICKY FOOTER — always visible at bottom of right column
  stickyFooter: {
    flexShrink: 0,
    padding: "8px 16px",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    background: "rgba(16,20,26,0.7)",
    borderTop: "1px solid rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    zIndex: 5,
  },

  addToListBtn: {
    flex: 1,
    padding: "8px 16px",
    borderRadius: "9999px",
    border: "none",
    background: "linear-gradient(135deg, #22b1ec 0%, #1d96c7 100%)",
    color: "#002b3d",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    fontWeight: 900,
    fontSize: "12px",
    textTransform: "uppercase",
    letterSpacing: "0.15em",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(121,209,255,0.2)",
    transition: "transform 0.15s, box-shadow 0.15s",
    minHeight: "36px",
  },

  voteChipUp: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 10px",
    borderRadius: "9999px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(74,222,128,0.08)",
    color: "var(--success, #4ade80)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
    minWidth: "44px",
    justifyContent: "center",
    minHeight: "36px",
  },

  voteChipDown: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "6px 10px",
    borderRadius: "9999px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(248,113,113,0.08)",
    color: "var(--error, #f87171)",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "background 0.2s",
    minWidth: "44px",
    justifyContent: "center",
    minHeight: "36px",
  },

  shareBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "36px",
    height: "36px",
    borderRadius: "9999px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "transparent",
    color: "#dfe2eb",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.2s",
  },

  skeletonLine: {
    height: "16px",
    borderRadius: "8px",
    background:
      "linear-gradient(90deg, var(--surface-container-high, #262a31) 25%, var(--surface-container-highest, #31353c) 50%, var(--surface-container-high, #262a31) 75%)",
    backgroundSize: "200% 100%",
    animation: "shimmer 1.4s infinite",
  },

  errorBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    padding: "48px 24px",
    textAlign: "center",
    color: "var(--error, #f87171)",
    minHeight: "300px",
  },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div style={{ ...styles.container, pointerEvents: "none" }}>
      <div
        style={{
          ...styles.leftCol,
          background: "var(--surface-container-high, #262a31)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-container-highest, #31353c)",
            animation: "shimmer 1.4s infinite",
          }}
        />
      </div>
      <div
        style={{
          ...styles.rightCol,
          padding: "48px",
          gap: "16px",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          <div style={{ ...styles.skeletonLine, width: "80px", height: "20px" }} />
          <div style={{ ...styles.skeletonLine, width: "100px", height: "20px" }} />
        </div>
        <div
          style={{
            ...styles.skeletonLine,
            height: "48px",
            width: "75%",
            marginBottom: "8px",
          }}
        />
        <div
          style={{
            ...styles.skeletonLine,
            height: "20px",
            width: "40%",
            marginBottom: "32px",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "16px",
            marginBottom: "32px",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...styles.skeletonLine,
                height: "72px",
                borderRadius: "var(--radius-md)",
              }}
            />
          ))}
        </div>
        <div
          style={{
            ...styles.skeletonLine,
            height: "160px",
            borderRadius: "var(--radius-md)",
            marginBottom: "32px",
          }}
        />
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              ...styles.skeletonLine,
              height: "80px",
              borderRadius: "var(--radius-lg)",
              marginBottom: "16px",
            }}
          />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message, onBack, td }) {
  return (
    <div style={styles.errorBox}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--error, #f87171)" }} aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p role="alert">{message || td?.loadError || "No se pudo cargar esta publicación."}</p>
      <button
        type="button"
        onClick={onBack}
        style={{
          padding: "10px 24px",
          borderRadius: "9999px",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "transparent",
          color: "var(--text-primary)",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "14px",
          minHeight: "44px",
        }}
      >
        {td?.backButton || "Volver"}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PublicationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const td = t.publicationDetail;
  const currentUser = useAuthStore(selectAuthUser);

  const [publication, setPublication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voting, setVoting] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  const pageTitleRef = useRef(null);

  // Shopping list
  const addItem = useShoppingListStore((s) => s.addItem);
  const isInList = useShoppingListStore((s) =>
    s.items.some((i) => i.publicationId === publication?.id)
  );

  // Responsive resize listener
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  // Fetch publication
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPublication(null);

    getPublicationDetail(id).then((result) => {
      if (cancelled) return;
      if (!result.success) {
        const isPgrst116 =
          result.error?.includes?.("PGRST116") ||
          result.error?.includes?.("Row not found");
        setError(
          isPgrst116
            ? (td?.notFound ?? "Esta publicación no existe o fue eliminada.")
            : (result.error || td?.loadError || "No se pudo cargar esta publicación.")
        );
        setLoading(false);
        return;
      }
      setPublication(result.data);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus title for a11y on load
  useEffect(() => {
    if (publication && pageTitleRef.current) {
      pageTitleRef.current.focus();
    }
  }, [publication]);

  // ─── Derived values ───────────────────────────────────────────
  const votes = publication?.votes || [];
  const positiveVotes = votes.filter((v) => Number(v.vote_type) === 1).length;
  const negativeVotes = votes.filter((v) => Number(v.vote_type) === -1).length;
  const userVote = currentUser
    ? (votes.find((v) => v.user_id === currentUser.id)?.vote_type ?? null)
    : null;
  const upActive = Number(userVote) === 1;
  const downActive = Number(userVote) === -1;

  const isVirtualStore = Number(publication?.store?.store_type_id) === 2;
  const mainImage =
    publication?.photo_url ||
    "https://via.placeholder.com/1200x800?text=Tienda+virtual";

  const { latitude, longitude } = parseStoreLocation(
    publication?.store?.location ?? null
  );
  const hasCoordinates =
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude));

  const categoryName = publication?.product?.category?.name ?? "";
  const brandName = publication?.product?.brand?.name ?? "";
  const sellerName =
    publication?.user?.full_name ?? td?.unknownUser ?? "Usuario";
  const storeName = publication?.store?.name ?? "-";
  const sellerInitials = sellerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ─── Handlers ─────────────────────────────────────────────────

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/publicaciones");
  };

  const handleVote = async (voteType) => {
    if (!currentUser) { navigate('/login'); return; }
    if (voting) return;
    setVoting(true);

    const prevVotes = publication.votes;
    const isSame = Number(userVote) === voteType;

    // Optimistic update — el usuario ve el cambio instantáneo
    if (isSame) {
      setPublication((prev) => ({
        ...prev,
        votes: prev.votes.filter((v) => v.user_id !== currentUser.id),
      }));
    } else {
      setPublication((prev) => ({
        ...prev,
        votes: [
          ...prev.votes.filter((v) => v.user_id !== currentUser.id),
          { id: Date.now(), vote_type: voteType, user_id: currentUser.id },
        ],
      }));
    }

    try {
      if (isSame) {
        const r = await unvotePublication(publication.id);
        if (!r.success) {
          setPublication((prev) => ({ ...prev, votes: prevVotes }));
        }
      } else {
        const fn = voteType === 1 ? validatePublication : downvotePublication;
        const r = await fn(publication.id);
        if (r.success) {
          setShowCelebration(true);
        } else {
          setPublication((prev) => ({ ...prev, votes: prevVotes }));
        }
      }
    } catch {
      setPublication((prev) => ({ ...prev, votes: prevVotes }));
    } finally {
      setVoting(false);
    }
  };

  const handleAddToList = () => {
    if (!isInList && publication) {
      addItem(publication.product?.name ?? "Producto", 1, {
        storeName,
        price: publication.price,
        publicationId: publication.id,
      });
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/publicaciones/${publication.id}`;
    const data = {
      title: publication.product?.name ?? "Publicación NØSEE",
      text: `${publication.product?.name ?? "Producto"} - $${Number(
        publication.price || 0
      ).toLocaleString("es-CO")} COP`,
      url,
    };
    if (navigator.share && navigator.canShare?.(data)) {
      try {
        await navigator.share(data);
      } catch (e) {
        if (e.name !== "AbortError") {
          await navigator.clipboard.writeText(url);
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      {/* Blurred background image */}
      {publication?.photo_url && (
        <div
          style={{
            ...styles.bgBlur,
            backgroundImage: `url(${publication.photo_url})`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Back button */}
      <button type="button" style={styles.backBtn} onClick={handleBack}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        {td?.backLabel ?? "Volver"}
      </button>

      {loading && <LoadingSkeleton />}
      {error && !loading && (
        <ErrorState message={error} onBack={handleBack} td={td} />
      )}

      {!loading && !error && publication && (
        <div
          style={{
            ...styles.container,
            flexDirection: isMobile ? "column" : "row",
            maxHeight: isMobile ? "none" : "calc(100vh - 32px)",
            overflowY: isMobile ? "auto" : "hidden",
          }}
        >
          {/* ── LEFT COLUMN ── */}
          <div
            style={{
              ...styles.leftCol,
              width: isMobile ? "100%" : "45%",
              height: isMobile ? "280px" : "100%",
              position: isMobile ? "relative" : "sticky",
              top: isMobile ? undefined : 0,
            }}
            onMouseEnter={() => setImageHovered(true)}
            onMouseLeave={() => setImageHovered(false)}
          >
            <div style={styles.leftGradient} aria-hidden="true" />
            <div style={styles.imageWrapper}>
              <img
                src={mainImage}
                alt={publication.product?.name ?? td?.noName ?? "Producto"}
                style={{
                  ...styles.heroImage,
                  transform: imageHovered ? "scale(1.10)" : "scale(1)",
                }}
              />
            </div>
            {/* Price pill */}
            <div style={styles.pricePill}>
              <span style={styles.priceText}>
                ${Number(publication.price || 0).toLocaleString("es-CO")}
              </span>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={styles.rightCol}>
          <div style={styles.rightScrollable} className="detail-scrollbar">
            {/* HEADER: badges + title + info grid */}
            <div style={styles.rightHeader}>
              <div style={styles.badgesRow}>
                {categoryName && (
                  <span style={styles.badgeCategory}>{categoryName}</span>
                )}
                <span style={styles.badgeStatus}>
                  {isVirtualStore
                    ? (td?.virtualStore ?? "Tienda Virtual")
                    : (td?.physicalStore ?? "Tienda Física")}
                </span>
              </div>

              <h1
                ref={pageTitleRef}
                style={styles.heroTitle}
                tabIndex={-1}
              >
                {publication.product?.name ?? td?.noName ?? "Producto"}
              </h1>

              {brandName && (
                <p style={styles.heroBrand}>{brandName}</p>
              )}

              {/* 2x2 info grid */}
              <div style={styles.infoGrid}>
                {/* Seller card */}
                <div
                  style={styles.infoCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--surface-container-highest, #31353c)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "var(--surface-container-high, #262a31)";
                  }}
                >
                  <div style={styles.infoCardIconWrap}>
                    <span style={styles.infoCardInitials}>{sellerInitials}</span>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={styles.infoCardLabel}>
                      {td?.publicadorLabel ?? "Publicador"}
                    </p>
                    <p style={styles.infoCardValue}>{sellerName}</p>
                    <p style={{ ...styles.infoCardLabel, marginTop: "2px" }}>
                      {publication.user?.reputation_points ?? 0}{" "}
                      {td?.reputationLabel ?? "pts reputación"}
                    </p>
                  </div>
                </div>

                {/* Store card */}
                <div
                  style={styles.infoCard}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--surface-container-highest, #31353c)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background =
                      "var(--surface-container-high, #262a31)";
                  }}
                >
                  <div
                    style={{
                      ...styles.infoCardIconWrap,
                      borderColor: "rgba(92,222,148,0.2)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ color: "#5cde94" }} aria-hidden="true">
                      <path d="M20 4H4v2l-1 6h18l-1-6V4zm-1 8H5l.67 4h12.66L19 12zM4 20h16v-2H4v2z"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={styles.infoCardLabel}>
                      {td?.storeLabel ?? "Tienda"}
                    </p>
                    <p style={styles.infoCardValue}>{storeName}</p>
                  </div>
                </div>

                {/* Price card */}
                <div style={styles.infoCard}>
                  <div
                    style={{
                      ...styles.infoCardIconWrap,
                      borderColor: "rgba(235,195,62,0.2)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ color: "#ebc33e" }} aria-hidden="true">
                      <path d="M21.41 11.58l-9-9A2 2 0 0011 2H4a2 2 0 00-2 2v7a2 2 0 00.59 1.42l9 9A2 2 0 0013 22a2 2 0 001.41-.59l7-7A2 2 0 0022 13a2 2 0 00-.59-1.42zM5.5 7A1.5 1.5 0 117 5.5 1.5 1.5 0 015.5 7z"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={styles.infoCardLabel}>
                      {td?.priceLabel ?? "Precio"}
                    </p>
                    <p style={styles.infoCardValue}>
                      ${Number(publication.price || 0).toLocaleString("es-CO")}
                    </p>
                  </div>
                </div>

                {/* Date card */}
                <div style={styles.infoCard}>
                  <div
                    style={{
                      ...styles.infoCardIconWrap,
                      borderColor: "rgba(255,255,255,0.1)",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-secondary)" }} aria-hidden="true">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={styles.infoCardLabel}>
                      {td?.dateLabel ?? "Publicado"}
                    </p>
                    <p style={styles.infoCardValue}>
                      {publication.created_at
                        ? new Date(publication.created_at).toLocaleDateString(
                            "es-CO"
                          )
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* MAP SECTION */}
            <div style={styles.mapSection}>
              <div style={styles.mapHeader}>
                <h2 style={styles.mapSectionTitle}>
                  {td?.storeLocation ?? "Ubicación"}
                </h2>
                {!isVirtualStore && hasCoordinates && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    style={styles.mapGmapsLink}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="3 11 22 2 13 21 11 13 3 11"/>
                    </svg>
                    {td?.openInGoogleMaps ?? "Cómo llegar"}
                  </a>
                )}
              </div>

              {isVirtualStore ? (
                publication.store?.website_url ? (
                  <a
                    href={publication.store.website_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...styles.badgeStatus,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "8px 16px",
                      minHeight: "44px",
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                    {td?.virtualStoreLink ?? "Visitar tienda"}
                  </a>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                    {td?.noCoordinates ?? "Ubicación no disponible"}
                  </p>
                )
              ) : hasCoordinates ? (
                <div style={styles.mapContainer}>
                  <div style={styles.mapFilter}>
                    <PublicationLocationMap
                      latitude={latitude}
                      longitude={longitude}
                      storeName={storeName}
                      td={td}
                    />
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  {td?.noCoordinates ?? "Ubicación no disponible"}
                </p>
              )}
            </div>

            {/* COMMUNITY FEED — colapsable */}
            <div style={styles.feedSection} id="community-feed">
              <button
                type="button"
                style={styles.feedToggleBtn}
                onClick={() => setCommentsOpen((v) => !v)}
                aria-expanded={commentsOpen}
              >
                <h2 style={styles.feedTitle}>
                  {td?.communityTitle ?? "Comunidad"}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={styles.feedCount}>
                    {publication.comments?.length ?? 0}{" "}
                    {td?.reviewsLabel ?? "comentarios"}
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(255,255,255,0.4)", transition: "transform 0.2s", transform: commentsOpen ? "rotate(180deg)" : "rotate(0deg)" }} aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
              </button>
              {commentsOpen && (
                // CommentsSection reads auth state internally via useAuthStore —
                // the comment form is already hidden for guests without extra props.
                <CommentsSection
                  publicationId={publication.id}
                  initialComments={publication.comments || []}
                  td={td}
                />
              )}
            </div>
          </div>{/* end rightScrollable */}

            {/* STICKY FOOTER */}
            <div style={styles.stickyFooter}>
              {/* Upvote chip */}
              <button
                type="button"
                style={{
                  ...styles.voteChipUp,
                  background: upActive
                    ? "rgba(74,222,128,0.2)"
                    : "rgba(74,222,128,0.08)",
                }}
                onClick={() => handleVote(1)}
                disabled={voting || !currentUser}
                aria-pressed={upActive}
                aria-label={`${td?.upvoteLabel ?? "Votar positivo"} (${positiveVotes})`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={upActive ? "currentColor" : "none"} stroke={upActive ? "none" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/>
                  <path d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
                </svg>
                <span>{positiveVotes}</span>
              </button>

              {/* Downvote chip */}
              <button
                type="button"
                style={{
                  ...styles.voteChipDown,
                  background: downActive
                    ? "rgba(248,113,113,0.2)"
                    : "rgba(248,113,113,0.08)",
                }}
                onClick={() => handleVote(-1)}
                disabled={voting || !currentUser}
                aria-pressed={downActive}
                aria-label={`${td?.downvoteLabel ?? "Votar negativo"} (${negativeVotes})`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10z"/>
                  <path d="M17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17"/>
                </svg>
                <span>{negativeVotes}</span>
              </button>

              {/* Add to list — primary CTA */}
              <button
                type="button"
                style={{
                  ...styles.addToListBtn,
                  opacity: isInList ? 0.6 : 1,
                }}
                onClick={handleAddToList}
                aria-label={
                  isInList
                    ? (td?.alreadyInList ?? "En lista")
                    : (td?.addToListBtn ?? "Agregar a lista")
                }
              >
                {isInList
                  ? (td?.alreadyInList ?? "En lista")
                  : (td?.addToListBtn ?? "Agregar a lista")}
              </button>

              {/* Share */}
              <button
                type="button"
                style={styles.shareBtn}
                onClick={handleShare}
                aria-label={td?.shareLabel ?? "Compartir publicación"}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="18" cy="5" r="3"/>
                  <circle cx="6" cy="12" r="3"/>
                  <circle cx="18" cy="19" r="3"/>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                </svg>
              </button>
            </div>
          </div>{/* end rightCol */}
        </div>
      )}

      <CelebrationOverlay
        visible={showCelebration}
        message={t.celebration?.vote ?? "¡Voto registrado!"}
        onDone={() => setShowCelebration(false)}
      />
    </div>
  );
}
