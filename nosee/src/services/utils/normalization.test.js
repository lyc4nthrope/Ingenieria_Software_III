import { describe, it, expect } from "vitest";
import { tokenTextScore } from "./normalization";

describe("tokenTextScore", () => {
  describe("sin query", () => {
    it("retorna 0.5 cuando el query es string vacío", () => {
      expect(tokenTextScore("", "pan tajado")).toBe(0.5);
    });

    it("retorna 0.5 cuando el query es undefined", () => {
      expect(tokenTextScore(undefined, "pan tajado")).toBe(0.5);
    });
  });

  describe("sin texto de producto", () => {
    it("retorna 0 cuando el texto del producto está vacío", () => {
      expect(tokenTextScore("pan", "")).toBe(0);
    });
  });

  describe("match exacto", () => {
    it("retorna 1.0 para match exacto de una sola palabra", () => {
      expect(tokenTextScore("pan", "pan")).toBe(1.0);
    });

    it("retorna 1.0 para match exacto de múltiples palabras", () => {
      expect(tokenTextScore("leche entera", "leche entera")).toBe(1.0);
    });
  });

  describe("caso pan vs panela vs pan tajado", () => {
    it("pan tajado debe rankear más alto que panela al buscar pan", () => {
      const panTajado = tokenTextScore("pan", "pan tajado");
      const panela = tokenTextScore("pan", "panela");
      expect(panTajado).toBeGreaterThan(panela);
    });

    it("pan exacto rankea más alto que pan tajado", () => {
      const panExacto = tokenTextScore("pan", "pan");
      const panTajado = tokenTextScore("pan", "pan tajado");
      expect(panExacto).toBeGreaterThan(panTajado);
    });

    it("panela recibe score bajo (~0.60) al buscar pan", () => {
      const score = tokenTextScore("pan", "panela");
      expect(score).toBeCloseTo(0.6, 1);
    });

    it("pan tajado recibe score alto (~0.90) al buscar pan", () => {
      const score = tokenTextScore("pan", "pan tajado");
      expect(score).toBeCloseTo(0.9, 1);
    });
  });

  describe("caso huevo vs huevos vs cebolla huevo", () => {
    it("huevo exacto rankea más alto que huevos", () => {
      const huevo = tokenTextScore("huevo", "huevo");
      const huevos = tokenTextScore("huevo", "huevos");
      expect(huevo).toBeGreaterThan(huevos);
    });

    it("huevos recibe score por prefijo (~0.83-0.87)", () => {
      const score = tokenTextScore("huevo", "huevos");
      expect(score).toBeGreaterThan(0.8);
      expect(score).toBeLessThan(1.0);
    });

    it("cebolla huevo recibe score alto por match exacto de token huevo", () => {
      const score = tokenTextScore("huevo", "cebolla huevo");
      expect(score).toBeGreaterThan(0.8);
    });
  });

  describe("caso crítico: búsqueda multi-palabra con palabra intermedia", () => {
    it("aceite oliva encuentra aceite de oliva (no debe retornar 0)", () => {
      const score = tokenTextScore("aceite oliva", "aceite de oliva");
      expect(score).toBeGreaterThan(0.8);
    });

    it("aceite de oliva exacto rankea igual o más alto que aceite oliva buscando aceite oliva", () => {
      const exacto = tokenTextScore("aceite oliva", "aceite oliva");
      const conDe = tokenTextScore("aceite oliva", "aceite de oliva");
      expect(exacto).toBeGreaterThanOrEqual(conDe);
    });

    it("leche entera rankea más alto que leche descremada al buscar leche entera", () => {
      const entera = tokenTextScore("leche entera", "leche entera");
      const descremada = tokenTextScore("leche entera", "leche descremada");
      expect(entera).toBeGreaterThan(descremada);
    });

    it("leche descremada recibe score parcial (no 0) al buscar leche entera", () => {
      const score = tokenTextScore("leche entera", "leche descremada");
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.8);
    });
  });

  describe("prefijos parciales", () => {
    it("arroz rankea más alto que arrachera al buscar arr", () => {
      const arroz = tokenTextScore("arr", "arroz");
      const arrachera = tokenTextScore("arr", "arrachera");
      expect(arroz).toBeGreaterThan(arrachera);
    });

    it("búsqueda exacta rankea más alto que prefijo", () => {
      const exacto = tokenTextScore("coca", "coca");
      const prefijo = tokenTextScore("coca", "coca cola");
      expect(exacto).toBeGreaterThan(prefijo);
    });
  });

  describe("orden de resultados consistente", () => {
    it("búsqueda pan produce ranking correcto: pan > pan tajado > panela", () => {
      const scores = [
        { name: "pan", score: tokenTextScore("pan", "pan") },
        { name: "pan tajado", score: tokenTextScore("pan", "pan tajado") },
        { name: "panela", score: tokenTextScore("pan", "panela") },
      ].sort((a, b) => b.score - a.score);

      expect(scores[0].name).toBe("pan");
      expect(scores[1].name).toBe("pan tajado");
      expect(scores[2].name).toBe("panela");
    });

    it("búsqueda aceite oliva produce ranking correcto: aceite oliva > aceite de oliva > aceite girasol", () => {
      const scores = [
        { name: "aceite oliva", score: tokenTextScore("aceite oliva", "aceite oliva") },
        { name: "aceite de oliva", score: tokenTextScore("aceite oliva", "aceite de oliva") },
        { name: "aceite girasol", score: tokenTextScore("aceite oliva", "aceite girasol") },
      ].sort((a, b) => b.score - a.score);

      expect(scores[0].name).toBe("aceite oliva");
      expect(scores[1].name).toBe("aceite de oliva");
      expect(scores[2].name).toBe("aceite girasol");
    });
  });
});
