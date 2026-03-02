import { useEffect, useMemo, useState } from "react";
import {
  createBrand,
  createProduct,
  getProductCategories,
  getUnitTypes,
  searchBrands,
} from "@/services/api/publications.api";

export default function ProductQuickCreateModal({
  initialName = "",
  onSuccess,
  onClose,
}) {
  const [name, setName] = useState(initialName);
  const [categoryId, setCategoryId] = useState("");
  const [unitTypeId, setUnitTypeId] = useState("");
  const [baseQuantity, setBaseQuantity] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandId, setBrandId] = useState("");

  const [categories, setCategories] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [brandResults, setBrandResults] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [error, setError] = useState(null);
  const [brandMessage, setBrandMessage] = useState(null);

  useEffect(() => {
    const loadCatalogs = async () => {
      setIsLoading(true);
      const [categoriesResult, unitTypesResult] = await Promise.all([
        getProductCategories(),
        getUnitTypes(),
      ]);

      if (!categoriesResult.success || !unitTypesResult.success) {
        setError(
          categoriesResult.error ||
            unitTypesResult.error ||
            "No se pudieron cargar los catálogos",
        );
      } else {
        setCategories(categoriesResult.data);
        setUnitTypes(unitTypesResult.data);
      }

      setIsLoading(false);
    };

    loadCatalogs();
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!brandName.trim()) {
        setBrandResults([]);
        return;
      }

      const result = await searchBrands(brandName.trim());
      setBrandResults(result.success ? result.data : []);

      const exactBrand = (result.data || []).find(
        (brand) => brand.name.toLowerCase() === brandName.trim().toLowerCase(),
      );
      setBrandId(exactBrand ? String(exactBrand.id) : "");
    }, 250);

    return () => clearTimeout(timer);
  }, [brandName]);

  const selectedUnitType = useMemo(
    () => unitTypes.find((unit) => unit.id === Number(unitTypeId)),
    [unitTypeId, unitTypes],
  );

  const handleCreateBrand = async () => {
    if (!brandName.trim() || isCreatingBrand) return;
    setBrandMessage(null);
    setError(null);

    setIsCreatingBrand(true);
    const result = await createBrand(brandName.trim());
    setIsCreatingBrand(false);

    if (!result.success) {
      setError(result.error || "No se pudo registrar la marca");
      return;
    }

    setBrandId(String(result.data.id));
    setBrandName(result.data.name);
    setBrandMessage(`Marca registrada: ${result.data.name}`);
    setBrandResults((prev) => {
      const alreadyExists = prev.some((brand) => brand.id === result.data.id);
      return alreadyExists ? prev : [result.data, ...prev];
    });
  };

  const handleBrandNameChange = (value) => {
    setBrandName(value);
    setBrandMessage(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!brandId) {
      setError("Debes seleccionar una marca existente o registrar una nueva.");
      return;
    }

    setIsSubmitting(true);
    const result = await createProduct({
      name,
      categoryId,
      unitTypeId,
      baseQuantity,
      brandId,
      brandName,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "No se pudo crear el producto");
      return;
    }

    onSuccess(result.data);
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div style={s.overlay} onClick={handleOverlayClick}>
      <div style={s.card}>
        <div style={s.header}>
          <h3 style={s.title}>Crear producto rápido</h3>
          <button style={s.closeBtn} onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {isLoading ? (
          <div style={s.loading}>Cargando catálogos...</div>
        ) : (
          <form onSubmit={handleSubmit} style={s.form}>
            <label style={s.label}>Nombre *</label>
            <input
              style={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Leche Entera"
              required
            />

            <label style={s.label}>Categoría *</label>
            <select
              style={s.input}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Seleccionar...</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>

            <label style={s.label}>Marca *</label>
            <input
              style={s.input}
              value={brandName}
              onChange={(e) => handleBrandNameChange(e.target.value)}
              placeholder="Ej: Alpina"
              required
              list="brand-suggestions"
            />
            <datalist id="brand-suggestions">
              {brandResults.map((brand) => (
                <option key={brand.id} value={brand.name} />
              ))}
            </datalist>
            <div style={s.brandActions}>
              <button
                type="button"
                style={s.brandBtn}
                onClick={handleCreateBrand}
                disabled={!brandName.trim() || isCreatingBrand}
              >
                {isCreatingBrand ? "Registrando marca..." : "Registrar marca"}
              </button>
              {brandId && <span style={s.brandOk}>✓ Marca lista</span>}
            </div>
            {brandMessage && <div style={s.brandMessage}>{brandMessage}</div>}

            <div style={s.twoCols}>
              <div>
                <label style={s.label}>Unidad *</label>
                <select
                  style={s.input}
                  value={unitTypeId}
                  onChange={(e) => setUnitTypeId(e.target.value)}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {unitTypes.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name} ({unit.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={s.label}>Cantidad base *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  style={s.input}
                  value={baseQuantity}
                  onChange={(e) => setBaseQuantity(e.target.value)}
                  placeholder="Ej: 500"
                  required
                />
                {selectedUnitType && (
                  <div style={s.hint}>
                    Se guardará en {selectedUnitType.abbreviation}
                  </div>
                )}
              </div>
            </div>

            <div style={s.actions}>
              <button type="button" onClick={onClose} style={s.cancelBtn}>
                Cancelar
              </button>
              <button type="submit" style={s.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? "Creando..." : "Crear producto"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    background: "#fff",
    borderRadius: "12px",
    padding: "24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  title: { margin: 0, fontSize: "18px", fontWeight: 700 },
  closeBtn: { border: "none", background: "transparent", cursor: "pointer" },
  loading: { padding: "12px", fontSize: "14px", color: "#666" },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: "8px",
    padding: "10px 12px",
    marginBottom: "12px",
    fontSize: "13px",
  },
  form: { display: "flex", flexDirection: "column", gap: "10px" },
  label: { fontSize: "13px", fontWeight: 600, color: "#333" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    fontSize: "14px",
  },
  twoCols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  hint: { marginTop: "4px", color: "#666", fontSize: "12px" },
  brandActions: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    marginTop: "6px",
  },
  brandBtn: {
    border: "1px solid #ff6b35",
    color: "#ff6b35",
    background: "#fff",
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  brandOk: { color: "#166534", fontSize: "12px", fontWeight: 600 },
  brandMessage: { color: "#166534", fontSize: "12px", marginTop: "4px" },
  actions: { display: "flex", gap: "10px", marginTop: "10px" },
  cancelBtn: {
    flex: 1,
    border: "1px solid #ddd",
    background: "#f5f5f5",
    padding: "11px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  submitBtn: {
    flex: 2,
    border: "none",
    background: "#ff6b35",
    color: "white",
    padding: "11px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
};
