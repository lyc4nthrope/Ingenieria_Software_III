import { useNavigate, useParams, Link } from "react-router-dom";
import { PublicationForm } from "@/features/publications/components/PublicationForm";
import { useLanguage } from "@/contexts/LanguageContext";

export default function EditPublicationPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    return (
      <section style={{ padding: "24px 16px" }}>
        <div style={{ color: "var(--error)", fontSize: "14px" }}>
          {t.editPublicationPage.invalidId}
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: "24px 16px", maxWidth: "760px", margin: "0 auto", width: "100%" }}>
      <Link to="/publicaciones" style={backLinkStyle}>← Publicaciones</Link>
      <PublicationForm
        mode="edit"
        publicationId={id}
        onSuccess={() => navigate("/")}
      />
    </section>
  );
}

const backLinkStyle = {
  display: "inline-block",
  marginBottom: "16px",
  fontSize: "13px",
  color: "var(--accent)",
  textDecoration: "none",
  fontWeight: 600,
};
