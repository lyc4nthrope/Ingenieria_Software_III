import { useNavigate } from "react-router-dom";
import PublicationForm from "@/features/publications/components/PublicationForm";

export default function CreatePublicationPage() {
  const navigate = useNavigate();

  return (
    <section style={{ padding: "24px 16px" }}>
      <PublicationForm onSuccess={() => navigate("/")} />
    </section>
  );
}
