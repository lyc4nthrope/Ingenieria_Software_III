import { useNavigate, useParams } from "react-router-dom";
import { PublicationForm } from "@/features/publications/components/PublicationForm";

export default function EditPublicationPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  if (!id) {
    return (
      <section style={{ padding: "24px 16px" }}>
        <div style={{ color: "var(--error)", fontSize: "14px" }}>
          Error: ID de publicación no válido
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
