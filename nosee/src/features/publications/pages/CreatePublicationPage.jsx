import { useNavigate } from "react-router-dom";
import PublicationForm from "@/features/publications/components/PublicationForm";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CreatePublicationPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tf = t.publicationForm;

  return (
    <main style={styles.page}>
      <header style={styles.header}>
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
  },
  title: {
    fontSize: "32px",
    fontWeight: 800,
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
    margin: 0,
  },
};
