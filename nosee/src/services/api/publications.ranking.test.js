import { describe, it, expect, vi } from "vitest";

vi.mock("@/utils/debugLogger", () => ({
  debugPublications: vi.fn(),
  createDebugger: () => vi.fn(),
}));

import { enrichSearchRankingSignals } from "./publications.ranking";
import { SORT_OPTIONS } from "@/constants/publications";

// ─── Fixture ──────────────────────────────────────────────────────────────────

const makePublication = (overrides = {}) => ({
  id: 1,
  product_id: 10,
  price: 1000,
  validated_count: 0,
  downvoted_count: 0,
  active_reports_count: 0,
  created_at: new Date().toISOString(),
  distance_km: 1,
  product: { name: "leche", brand: { name: "colanta" } },
  store: { name: "exito", evidence_count: 0 },
  user: { reputation_points: 0 },
  ...overrides,
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("enrichSearchRankingSignals", () => {
  describe("inputs inválidos", () => {
    it("retorna el mismo valor si no es un array", () => {
      expect(enrichSearchRankingSignals(null)).toBeNull();
      expect(enrichSearchRankingSignals(undefined)).toBeUndefined();
    });

    it("retorna array vacío si se pasa array vacío", () => {
      expect(enrichSearchRankingSignals([])).toEqual([]);
    });
  });

  describe("enriquecimiento de señales", () => {
    it("agrega search_score (número entre 0 y 1) a cada publicación", () => {
      const result = enrichSearchRankingSignals([makePublication()]);
      expect(result[0].search_score).toBeTypeOf("number");
      expect(result[0].search_score).toBeGreaterThanOrEqual(0);
      expect(result[0].search_score).toBeLessThanOrEqual(1);
    });

    it("agrega search_signals con las claves esperadas", () => {
      const result = enrichSearchRankingSignals([makePublication()]);
      const signals = result[0].search_signals;
      expect(signals).toHaveProperty("positive");
      expect(signals).toHaveProperty("negative");
      expect(signals).toHaveProperty("reports_active");
      expect(signals).toHaveProperty("text_score");
      expect(signals).toHaveProperty("recency_score");
    });

    it("no modifica las propiedades originales de la publicación", () => {
      const pub = makePublication({ id: 42, price: 5000 });
      const result = enrichSearchRankingSignals([pub]);
      expect(result[0].id).toBe(42);
      expect(result[0].price).toBe(5000);
    });
  });

  describe("señales de scoring", () => {
    it("más votos positivos → score más alto", () => {
      const highVotes = makePublication({ id: 1, validated_count: 10, downvoted_count: 0 });
      const lowVotes  = makePublication({ id: 2, validated_count: 0,  downvoted_count: 5 });
      const result = enrichSearchRankingSignals([highVotes, lowVotes]);
      const scoreHigh = result.find((p) => p.id === 1).search_score;
      const scoreLow  = result.find((p) => p.id === 2).search_score;
      expect(scoreHigh).toBeGreaterThan(scoreLow);
    });

    it("más reportes activos → score más bajo", () => {
      const limpio   = makePublication({ id: 1, active_reports_count: 0 });
      const reportado = makePublication({ id: 2, active_reports_count: 5 });
      const result = enrichSearchRankingSignals([limpio, reportado]);
      const scoreLimpio   = result.find((p) => p.id === 1).search_score;
      const scoreReportado = result.find((p) => p.id === 2).search_score;
      expect(scoreLimpio).toBeGreaterThan(scoreReportado);
    });

    it("menor distancia → score más alto", () => {
      const cercano = makePublication({ id: 1, distance_km: 1 });
      const lejano  = makePublication({ id: 2, distance_km: 40 });
      const result = enrichSearchRankingSignals([cercano, lejano]);
      const scoreCercano = result.find((p) => p.id === 1).search_score;
      const scoreLejano  = result.find((p) => p.id === 2).search_score;
      expect(scoreCercano).toBeGreaterThan(scoreLejano);
    });
  });

  describe("ordenamiento", () => {
    it("BEST_MATCH ordena publicaciones por score descendente", () => {
      const pubs = [
        makePublication({ id: 1, validated_count: 0,  downvoted_count: 5 }),
        makePublication({ id: 2, validated_count: 10, downvoted_count: 0 }),
        makePublication({ id: 3, validated_count: 3,  downvoted_count: 1 }),
      ];
      const result = enrichSearchRankingSignals(pubs, { sortBy: SORT_OPTIONS.BEST_MATCH });
      expect(result[0].id).toBe(2); // más votos → primer lugar
      expect(result[result.length - 1].id).toBe(1); // más downvotes → último
    });

    it("RECENT sin término de búsqueda NO ordena por score", () => {
      const pubs = [
        makePublication({ id: 1, validated_count: 0 }),
        makePublication({ id: 2, validated_count: 10 }),
      ];
      const result = enrichSearchRankingSignals(pubs, { sortBy: SORT_OPTIONS.RECENT });
      // Orden original preservado (sin búsqueda activa)
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(2);
    });

    it("RECENT con término de búsqueda SÍ ordena por score", () => {
      const pubs = [
        makePublication({ id: 1, validated_count: 0,  downvoted_count: 5 }),
        makePublication({ id: 2, validated_count: 10, downvoted_count: 0 }),
      ];
      const result = enrichSearchRankingSignals(pubs, {
        sortBy: SORT_OPTIONS.RECENT,
        productName: "leche",
      });
      expect(result[0].id).toBe(2);
    });
  });
});
