import { useEffect, useMemo, useRef, useState } from "react";
import {
  createBrand,
  createProduct,
  getProductCategories,
  getUnitTypes,
  searchBrands,
} from "@/services/api/publications.api";
import CelebrationOverlay from "@/components/ui/CelebrationOverlay";
import { playSuccessSound } from "@/utils/celebrationSound";
import { useLanguage } from "@/contexts/LanguageContext";
import { ReportModal } from "@/components/ReportModal";

const normalizeText = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const CATEGORY_HINT_KEYWORDS = {
  lacteos: ["lacteo", "lacteos", "milk", "yogurt", "yoghurt", "queso", "cheese", "mantequilla", "butter"],
  bebidas: ["bebida", "drink", "juice", "jugo", "soda", "refresco", "agua", "water", "cafe", "coffee", "te"],
  snacks: ["snack", "papas", "chips", "galleta", "cookie", "chocolate", "candy", "dulce", "barra"],
  panaderia: ["pan", "panaderia", "bakery", "tostada", "bizcocho", "ponque", "cake"],
  carnes: ["carne", "beef", "pollo", "chicken", "pork", "cerdo", "atun", "tuna", "pescado", "fish"],
  frutas: ["fruta", "fruit", "manzana", "banana", "banano", "naranja", "uva", "fresa"],
  verduras: ["verdura", "vegetable", "tomate", "cebolla", "zanahoria", "papa", "pepino", "lechuga"],
  granos: ["grano", "rice", "arroz", "lenteja", "frijol", "garbanzo", "avena", "cereal"],
  aseo: ["aseo", "limpieza", "cleaning", "detergente", "jabon", "soap", "shampoo", "higiene"],
};

const findCategoryByHint = (categories = [], hint = "") => {
  if (!hint || !categories.length) return null;
  const normalizedHint = normalizeText(hint);

  const directMatch = categories.find((category) => {
    const normalizedCategory = normalizeText(category.name);
    return (
      normalizedCategory.includes(normalizedHint) ||
      normalizedHint.includes(normalizedCategory)
    );
  });
  if (directMatch) return directMatch;

  for (const category of categories) {
    const normalizedCategory = normalizeText(category.name);
    const categoryKeywords = Object.entries(CATEGORY_HINT_KEYWORDS).find(([key]) =>
      normalizedCategory.includes(key),
    )?.[1];

    if (!categoryKeywords?.length) continue;
    const hasKeyword = categoryKeywords.some((keyword) =>
      normalizedHint.includes(normalizeText(keyword)),
    );
    if (hasKeyword) return category;
  }

  return null;
};

export default function ProductQuickCreateModal({
  initialName = "",
  initialBarcode = "",
  initialBrandName = "",
  initialCategoryHint = "",
  initialBaseQuantity = "",
  initialUnitAbbreviation = "",
  onSuccess,
  onClose,
}) {
  const { t } = useLanguage();
  const [name, setName] = useState(() => initialName);
  const [categoryId, setCategoryId] = useState("");
  const [unitTypeId, setUnitTypeId] = useState("");
  const [baseQuantity, setBaseQuantity] = useState(() => String(initialBaseQuantity || ""));
  const [barcode, setBarcode] = useState(() => String(initialBarcode || ""));
  const [brandName, setBrandName] = useState(() => String(initialBrandName || ""));
  const [brandId, setBrandId] = useState("");
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const pendingSuccessRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [unitTypes, setUnitTypes] = useState([]);
  const [brandResults, setBrandResults] = useState([]);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const brandWrapperRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingBrand, setIsCreatingBrand] = useState(false);
  const [error, setError] = useState(null);
  const [brandMessage, setBrandMessage] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);

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

  const suggestedCategoryId = useMemo(() => {
    if (!initialCategoryHint || !categories.length) return "";
    const suggestedCategory = findCategoryByHint(categories, initialCategoryHint);
    return suggestedCategory ? String(suggestedCategory.id) : "";
  }, [categories, initialCategoryHint]);

  const suggestedUnitTypeId = useMemo(() => {
    if (!initialUnitAbbreviation || !unitTypes.length) return "";
    const normalizedHintUnit = String(initialUnitAbbreviation).toLowerCase().trim();
    const suggestedUnit = unitTypes.find(
      (unit) => String(unit.abbreviation || "").toLowerCase().trim() === normalizedHintUnit,
    );
    return suggestedUnit ? String(suggestedUnit.id) : "";
  }, [unitTypes, initialUnitAbbreviation]);

  const effectiveCategoryId = categoryId || suggestedCategoryId;
  const effectiveUnitTypeId = unitTypeId || suggestedUnitTypeId;

  useEffect(() => {
    const handler = (e) => {
      if (brandWrapperRef.current && !brandWrapperRef.current.contains(e.target)) {
        setShowBrandDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
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
      if (result.alreadyExists && result.data) {
        setBrandId(String(result.data.id));
        setBrandName(result.data.name);
        setError("Esta marca ya está registrada. Se seleccionó automáticamente.");
      } else {
        setError(result.error || "No se pudo registrar la marca");
      }
      return;
    }

    setBrandId(String(result.data.id));
    setBrandName(result.data.name);
    setBrandMessage(`Marca registrada: ${result.data.name}`);
    setBrandResults((prev) => {
      const alreadyExists = prev.some((brand) => brand.id === result.data.id);
      return alreadyExists ? prev : [result.data, ...prev];
    });

    // Celebración por crear marca
    playSuccessSound();
    setCelebrationMsg(t.celebration?.brand || "¡Marca registrada! +1 punto de reputación");
  };

  const handleBrandNameChange = (value) => {
    setBrandName(value);
    setBrandId("");
    setBrandMessage(null);
    setShowBrandDropdown(true);
  };

  const handleBrandSelect = (brand) => {
    setBrandName(brand.name);
    setBrandId(String(brand.id));
    setBrandMessage(null);
    setShowBrandDropdown(false);
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
      categoryId: effectiveCategoryId,
      unitTypeId: effectiveUnitTypeId,
      baseQuantity,
      barcode,
      brandId,
      brandName,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error || "No se pudo crear el producto");
      return;
    }

    // Celebración por crear producto - llama onSuccess cuando termina
    playSuccessSound();
    pendingSuccessRef.current = result.data;
    setCelebrationMsg(t.celebration?.product || "¡Producto registrado! +2 puntos de reputación");
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  const handleCelebrationDone = () => {
    const pending = pendingSuccessRef.current;
    setCelebrationMsg(null);
    if (pending) {
      pendingSuccessRef.current = null;
      onSuccess(pending);
    }
  };

  return (
    <div style={s.overlay} onClick={handleOverlayClick} onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }} aria-hidden="true">
      <div role="dialog" aria-modal="true" aria-labelledby="pqc-title" style={s.card} onClick={(e) => e.stopPropagation()} aria-hidden="false">
        <div style={s.header}>
          <h3 id="pqc-title" style={s.title}>Crear producto rápido</h3>
          <button style={s.closeBtn} onClick={onClose} type="button" aria-label="Cerrar">
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        {error && <div style={s.errorBox}>{error}</div>}

        {isLoading ? (
          <div style={s.loading}>Cargando catálogos...</div>
        ) : (
          <form onSubmit={handleSubmit} style={s.form}>
            <label htmlFor="pqc-name" style={s.label}>Nombre *</label>
            <input
              id="pqc-name"
              style={s.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Leche Entera"
              required
            />
            {(initialBrandName || initialCategoryHint || initialBaseQuantity || initialUnitAbbreviation) && (
              <div style={s.hint}>
                Sugerencias cargadas desde código de barras. Puedes editarlas antes de guardar.
              </div>
            )}

            <label htmlFor="pqc-barcode" style={s.label}>Código de barras (opcional)</label>
            <input
              id="pqc-barcode"
              style={s.input}
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Ej: 7702001043509"
              inputMode="numeric"
              autoComplete="off"
            />
            <div style={s.hint}>Si existe, ayuda a evitar duplicados y acelera próximas búsquedas.</div>

            <label htmlFor="pqc-category" style={s.label}>Categoría *</label>
            <select
              id="pqc-category"
              style={s.input}
              value={effectiveCategoryId}
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

            <label htmlFor="pqc-brand" style={s.label}>Marca *</label>
            <div ref={brandWrapperRef} style={s.brandRow}>
              <div style={s.brandAutocomplete}>
                <input
                  id="pqc-brand"
                  style={s.input}
                  value={brandName}
                  onChange={(e) => handleBrandNameChange(e.target.value)}
                  onFocus={() => brandName.trim().length >= 1 && setShowBrandDropdown(true)}
                  placeholder="Ej: Alpina"
                  autoComplete="off"
                />
                {showBrandDropdown && brandName.trim().length >= 1 && (
                  <div style={s.brandDropdown} role="listbox" aria-label="Marcas disponibles">
                    {brandResults.map((brand) => (
                      <div
                        key={brand.id}
                        role="option"
                        aria-selected={brandId === String(brand.id)}
                        tabIndex={0}
                        style={{ ...s.brandDropdownItem, display: 'flex', alignItems: 'center' }}
                        onMouseDown={() => handleBrandSelect(brand)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleBrandSelect(brand); }}
                      >
                        <span style={{ flex: 1 }}>{brand.name}</span>
                        <button
                          type="button"
                          aria-label={`Reportar ${brand.name}`}
                          title="Reportar marca"
                          style={s.brandReportBtn}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setReportTarget({ id: brand.id, name: brand.name });
                            setShowBrandDropdown(false);
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(180, 40, 40, 0.75)';
                            e.currentTarget.style.borderColor = 'rgba(180, 40, 40, 0.75)';
                            e.currentTarget.style.color = 'var(--bg-elevated, #fff)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'none';
                            e.currentTarget.style.borderColor = 'rgba(180, 40, 40, 0.25)';
                            e.currentTarget.style.color = 'rgba(180, 40, 40, 0.55)';
                          }}
                        >
                          !
                        </button>
                      </div>
                    ))}
                    {brandResults.length === 0 && (
                      <div role="option" aria-selected="false" style={s.brandDropdownEmpty}>Sin coincidencias</div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="button"
                style={{
                  ...s.brandRegisterBtn,
                  opacity: !brandName.trim() || isCreatingBrand ? 0.5 : 1,
                  cursor: !brandName.trim() || isCreatingBrand ? "not-allowed" : "pointer",
                }}
                onClick={handleCreateBrand}
                disabled={!brandName.trim() || isCreatingBrand}
                aria-label="Registrar nueva marca"
                title="Registrar nueva marca"
              >
                <span aria-hidden="true">{isCreatingBrand ? "⏳" : "＋"}</span>
              </button>
            </div>
            {brandId && <span style={s.brandOk}>✓ Marca lista</span>}
            {brandMessage && <div style={s.brandMessage}>{brandMessage}</div>}

            <div style={s.twoCols} className="modal-two-cols">
              <div>
                <label htmlFor="pqc-unit" style={s.label}>Unidad *</label>
                <select
                  id="pqc-unit"
                  style={s.input}
                  value={effectiveUnitTypeId}
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
                <label htmlFor="pqc-qty" style={s.label}>Cantidad base *</label>
                <input
                  id="pqc-qty"
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
      <CelebrationOverlay
        visible={!!celebrationMsg}
        message={celebrationMsg}
        onDone={handleCelebrationDone}
      />
      {reportTarget && (
        <ReportModal
          targetType="brand"
          targetId={reportTarget.id}
          targetName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "var(--overlay)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "16px",
  },
  card: {
    width: "100%",
    maxWidth: "520px",
    background: "var(--bg-surface)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-md)",
    padding: "24px",
    boxShadow: "var(--shadow-lg)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  title: { margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" },
  closeBtn: { border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", fontSize: "16px" },
  loading: { padding: "12px", fontSize: "14px", color: "var(--text-muted)" },
  errorBox: {
    background: "var(--error-soft)",
    border: "1px solid rgba(248,113,113,0.3)",
    color: "var(--error)",
    borderRadius: "var(--radius-sm)",
    padding: "10px 12px",
    marginBottom: "12px",
    fontSize: "13px",
  },
  form: { display: "flex", flexDirection: "column", gap: "10px" },
  label: { fontSize: "13px", fontWeight: 600, color: "var(--text-secondary)" },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontSize: "14px",
    color: "var(--text-primary)",
    background: "var(--bg-elevated)",
  },
  twoCols: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  hint: { marginTop: "4px", color: "var(--text-muted)", fontSize: "12px" },
  brandRow: {
    display: "flex",
    gap: "6px",
    alignItems: "flex-start",
  },
  brandAutocomplete: {
    position: "relative",
    flex: 1,
  },
  brandDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "var(--bg-elevated)",
    border: "1px solid var(--border)",
    borderTop: "none",
    borderRadius: "0 0 var(--radius-sm) var(--radius-sm)",
    maxHeight: "180px",
    overflowY: "auto",
    zIndex: 60,
    boxShadow: "var(--shadow-md)",
  },
  brandDropdownItem: {
    padding: "9px 12px",
    fontSize: "13px",
    cursor: "pointer",
    borderBottom: "1px solid var(--border)",
    color: "var(--text-primary)",
    background: "var(--bg-elevated)",
  },
  brandDropdownEmpty: {
    padding: "9px 12px",
    fontSize: "13px",
    color: "var(--text-muted)",
  },
  brandRegisterBtn: {
    flexShrink: 0,
    width: "40px",
    height: "40px",
    border: "1px solid var(--accent)",
    color: "var(--accent)",
    background: "var(--accent-soft)",
    borderRadius: "var(--radius-sm)",
    fontSize: "20px",
    fontWeight: 700,
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandReportBtn: {
    flexShrink: 0,
    background: "none",
    border: "1.5px solid rgba(180, 40, 40, 0.25)",
    borderRadius: "50%",
    width: "20px",
    height: "20px",
    cursor: "pointer",
    fontSize: "11px",
    fontWeight: 700,
    color: "rgba(180, 40, 40, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: "6px",
  },
  brandOk: { color: "var(--success)", fontSize: "12px", fontWeight: 600, marginTop: "2px" },
  brandMessage: { color: "var(--success)", fontSize: "12px", marginTop: "4px" },
  actions: { display: "flex", gap: "10px", marginTop: "10px" },
  cancelBtn: {
    flex: 1,
    border: "1px solid var(--border-soft)",
    background: "var(--bg-elevated)",
    color: "var(--text-secondary)",
    padding: "11px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
  },
  submitBtn: {
    flex: 2,
    border: "1px solid var(--accent)",
    background: "var(--accent)",
    color: "#080C14",
    padding: "11px",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    fontWeight: 600,
  },
};
