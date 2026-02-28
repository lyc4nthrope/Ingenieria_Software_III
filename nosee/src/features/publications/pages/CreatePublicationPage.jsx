import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import PublicationForm from "@/features/publications/components/PublicationForm";
import * as publicationsApi from "@/services/api/publications.api";

export default function CreatePublicationPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadFormCatalogs = async () => {
      setLoading(true);
      setError(null);

      const [productsResult, storesResult] = await Promise.all([
        publicationsApi.getProducts(),
        publicationsApi.getStores(),
      ]);

      if (!productsResult.success) {
        setError(productsResult.error || "No se pudieron cargar productos");
      }

      if (!storesResult.success) {
        setError(storesResult.error || "No se pudieron cargar tiendas");
      }

      setProducts(productsResult.success ? productsResult.data : []);
      setStores(storesResult.success ? storesResult.data : []);
      setLoading(false);
    };

    loadFormCatalogs();
  }, []);

  if (loading) {
    return (
      <p style={{ padding: "16px" }}>Cargando formulario de publicación...</p>
    );
  }

  return (
    <section style={{ padding: "24px 16px" }}>
      {error && (
        <p style={{ color: "#ef4444", marginBottom: "12px" }}>{error}</p>
      )}

      <PublicationForm
        products={products}
        stores={stores}
        onSuccess={() => navigate("/")}
      />
    </section>
  );
}
