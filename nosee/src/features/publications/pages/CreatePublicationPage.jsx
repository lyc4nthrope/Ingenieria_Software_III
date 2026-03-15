import { useNavigate, Link } from "react-router-dom";
import PublicationForm from "@/features/publications/components/PublicationForm";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CreatePublicationPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tf = t.publicationForm;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <Link to="/publicaciones" style={styles.backLink}>← Publicaciones</Link>
        <h1 style={styles.title}>{tf.title}</h1>
      </header>
      <PublicationForm onSuccess={() => navigate("/")} />
    </main>
  );
}

const styles = {
  page: {
    flex: 1,
    padding: "28px 16px",
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%",
    display: "grid",
    gap: "20px",
  },
  header: {
    maxWidth: "600px",
    margin: "0 auto",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  backLink: {
    fontSize: "13px",
    color: "var(--accent)",
    textDecoration: "none",
    fontWeight: 600,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: "32px",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    margin: 0,
  },
};
