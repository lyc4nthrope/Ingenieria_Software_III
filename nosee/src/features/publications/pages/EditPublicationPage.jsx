import { useNavigate, useParams } from "react-router-dom";
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
    <section style={{ padding: "24px 16px" }}>
      <PublicationForm
        mode="edit"
        publicationId={id}
        onSuccess={() => navigate("/")}
      />
    </section>
  );
}
