import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 5.0 S3.1 — fondations design system premium.
 *
 * Check statique : on lit globals.css et tailwind.config.ts pour
 * verrouiller la présence des primitives ajoutées par le commit 1
 * du sprint S3.1 :
 *
 *   1. Tokens HSL :
 *      --chart-violet (jalon roadmap 12 mois + slice donut "Loisirs")
 *      --chart-coral  (icône priority "bouclier fonds d'urgence")
 *
 *   2. Color families Tailwind correspondants : chart-violet, chart-coral
 *
 *   3. boxShadow utilities Tailwind :
 *      shadow-card        (carte standard, ombre subtile)
 *      shadow-card-hover  (carte interactive en hover)
 *      shadow-card-navy   (carte navy — score)
 *      shadow-halo-primary, -coral, -violet, -success
 *        (halos colorés autour des icônes badge)
 *
 * Aucun de ces utilities ne doit régresser silencieusement sans test
 * — ils sont la grammaire visuelle de tous les composants futurs
 * (S3.1 → S3.x → S4 → S5...).
 */

const globalsSource = readFileSync(
  resolve(process.cwd(), "app/globals.css"),
  "utf8",
);

const tailwindSource = readFileSync(
  resolve(process.cwd(), "tailwind.config.ts"),
  "utf8",
);

describe("Phase 5.0 S3.1 — tokens HSL charts (globals.css)", () => {
  it("expose --chart-violet (jalon 12 mois roadmap + slice donut Loisirs)", () => {
    expect(globalsSource).toMatch(/--chart-violet:\s*265 70% 60%/);
    expect(globalsSource).toMatch(/--chart-violet-foreground:\s*0 0% 100%/);
  });

  it("expose --chart-coral (icône bouclier fonds d'urgence)", () => {
    expect(globalsSource).toMatch(/--chart-coral:\s*15 85% 60%/);
    expect(globalsSource).toMatch(/--chart-coral-foreground:\s*0 0% 100%/);
  });
});

describe("Phase 5.0 S3.1 — color families Tailwind (chart-violet, chart-coral)", () => {
  it("expose le color family chart-violet pointant vers --chart-violet", () => {
    expect(tailwindSource).toMatch(
      /"chart-violet":\s*\{[^}]*var\(--chart-violet\)/s,
    );
  });

  it("expose le color family chart-coral pointant vers --chart-coral", () => {
    expect(tailwindSource).toMatch(
      /"chart-coral":\s*\{[^}]*var\(--chart-coral\)/s,
    );
  });
});

describe("Phase 5.0 S3.1 — ombres premium (boxShadow utilities)", () => {
  it("expose shadow-card (ombre standard subtile)", () => {
    expect(tailwindSource).toMatch(/\bcard:\s*["'][^"']*rgb\(15 23 42/);
  });

  it("expose shadow-card-hover (ombre renforcée sur hover)", () => {
    expect(tailwindSource).toMatch(/"card-hover":/);
  });

  it("expose shadow-card-navy (ombre teintée navy pour ScoreCard)", () => {
    expect(tailwindSource).toMatch(/"card-navy":/);
    // Phase 5.0 S3.1 v9 — ombre navy recalibrée avec la couleur
    // navy extraite pixel maquette : rgb(2 30 95) = #011E5F.
    expect(tailwindSource).toMatch(/"card-navy":\s*["'][^"']*2 30 95/);
  });

  it("expose 4 halos colorés (primary, coral, violet, success)", () => {
    expect(tailwindSource).toMatch(/"halo-primary":/);
    expect(tailwindSource).toMatch(/"halo-coral":/);
    expect(tailwindSource).toMatch(/"halo-violet":/);
    expect(tailwindSource).toMatch(/"halo-success":/);
  });

  it("aucune ombre ne dépasse 0.20 d'opacité (interdit premium)", () => {
    // Extrait le bloc boxShadow et vérifie qu'aucune valeur d'opacité
    // (rgb(X X X / 0.YY)) ne dépasse 0.20. Au-delà = ombre lourde,
    // anti-premium. Calibration validée maquette.
    const match = tailwindSource.match(/boxShadow:\s*\{([\s\S]*?)\n\s*\},/);
    expect(match).not.toBeNull();
    const block = match![1];
    const opacities = block.match(/\/\s*0\.\d+/g) ?? [];
    for (const op of opacities) {
      const value = parseFloat(op.replace("/", "").trim());
      expect(value).toBeLessThanOrEqual(0.2);
    }
  });
});

describe("Phase 5.0 S3.1 — animation fade-in (mount des cartes)", () => {
  it("garde l'animation fade-in (déjà définie S1, vérifie non-régression)", () => {
    expect(tailwindSource).toMatch(/"fade-in":\s*"fade-in [\d.]+s/);
    expect(tailwindSource).toMatch(/"fade-in":\s*\{/); // keyframe
  });
});
