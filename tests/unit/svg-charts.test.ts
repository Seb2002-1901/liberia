import { describe, expect, it } from "vitest";
import {
  buildDonutSlices,
  buildLineChart,
  buildProgressRing,
} from "@/lib/ui/svg-charts";

describe("buildDonutSlices", () => {
  it("renvoie tableau vide si tous les segments sont à 0", () => {
    const r = buildDonutSlices([
      { id: "a", value: 0 },
      { id: "b", value: 0 },
    ]);
    expect(r).toEqual([]);
  });

  it("renvoie tableau vide si segments vide", () => {
    expect(buildDonutSlices([])).toEqual([]);
  });

  it("filtre les segments à valeur 0 ou négative", () => {
    const r = buildDonutSlices([
      { id: "a", value: 100 },
      { id: "b", value: 0 },
      { id: "c", value: -10 },
      { id: "d", value: 50 },
    ]);
    expect(r).toHaveLength(2);
    expect(r.map((s) => s.id)).toEqual(["a", "d"]);
  });

  it("calcule les pourcentages corrects (arrondis à 1 décimale)", () => {
    const r = buildDonutSlices([
      { id: "a", value: 70 },
      { id: "b", value: 20 },
      { id: "c", value: 10 },
    ]);
    expect(r[0].percent).toBe(70);
    expect(r[1].percent).toBe(20);
    expect(r[2].percent).toBe(10);
  });

  it("génère un path SVG valide pour chaque slice", () => {
    const r = buildDonutSlices([
      { id: "a", value: 50 },
      { id: "b", value: 50 },
    ]);
    expect(r).toHaveLength(2);
    for (const s of r) {
      expect(s.pathD).toMatch(/^M /);
      expect(s.pathD).toContain("A");
      expect(s.pathD).toContain("L");
      expect(s.pathD).toMatch(/Z$/);
    }
  });

  it("respecte le gap entre 2 segments uniquement", () => {
    // Un seul segment : pas de gap
    const single = buildDonutSlices([{ id: "a", value: 100 }]);
    expect(single).toHaveLength(1);
    expect(single[0].percent).toBe(100);
  });
});

describe("buildProgressRing", () => {
  it("progress=0 → arcD vide (rien à dessiner)", () => {
    const r = buildProgressRing(0);
    expect(r.arcD).toBe("");
    expect(r.sweepDeg).toBe(0);
    expect(r.trackD).not.toBe("");
  });

  it("progress=1 → arc presque complet (360°)", () => {
    const r = buildProgressRing(1);
    expect(r.sweepDeg).toBe(360);
    expect(r.arcD).not.toBe("");
  });

  it("progress=0.5 → demi-arc (180°)", () => {
    const r = buildProgressRing(0.5);
    expect(r.sweepDeg).toBe(180);
    expect(r.arcD).not.toBe("");
  });

  it("clamp les valeurs hors bornes [0,1]", () => {
    const above = buildProgressRing(1.5);
    const below = buildProgressRing(-0.3);
    expect(above.sweepDeg).toBe(360);
    expect(below.sweepDeg).toBe(0);
  });
});

describe("buildLineChart", () => {
  it("renvoie pathD vide et points=[] si points=[]", () => {
    const r = buildLineChart([]);
    expect(r.pathD).toBe("");
    expect(r.areaD).toBe("");
    expect(r.points).toEqual([]);
  });

  it("point unique → pas de courbe, mais point retourné (pour empty state)", () => {
    const r = buildLineChart([{ id: "w1", value: 50 }]);
    expect(r.pathD).toBe("");
    expect(r.points).toHaveLength(1);
  });

  it("plusieurs points → pathD valide M + L*", () => {
    const r = buildLineChart([
      { id: "w1", value: 30 },
      { id: "w2", value: 40 },
      { id: "w3", value: 46 },
    ]);
    expect(r.pathD).toMatch(/^M /);
    expect(r.pathD.match(/L/g)?.length ?? 0).toBe(2);
    expect(r.points).toHaveLength(3);
  });

  it("respecte les bornes Y forcées (0-100)", () => {
    const r = buildLineChart(
      [
        { id: "w1", value: 30 },
        { id: "w2", value: 60 },
      ],
      { yMin: 0, yMax: 100 },
    );
    expect(r.yMin).toBe(0);
    expect(r.yMax).toBe(100);
  });

  it("areaD ferme la courbe vers la baseline", () => {
    const r = buildLineChart([
      { id: "w1", value: 30 },
      { id: "w2", value: 60 },
    ]);
    expect(r.areaD).toMatch(/Z$/);
  });
});

describe("svg-charts — déterminisme", () => {
  it("buildDonutSlices déterministe sur mêmes entrées", () => {
    const segs = [
      { id: "a", value: 35 },
      { id: "b", value: 65 },
    ];
    expect(buildDonutSlices(segs)).toEqual(buildDonutSlices(segs));
  });

  it("buildLineChart déterministe sur mêmes entrées", () => {
    const pts = [
      { id: "w1", value: 30 },
      { id: "w2", value: 46 },
    ];
    expect(buildLineChart(pts)).toEqual(buildLineChart(pts));
  });
});
