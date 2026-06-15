import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 5.0 S3.1 v7 — verrouillage anti-régression du fix overflow
 * de la carte Répartition des dépenses.
 *
 * Bug v6 : la légende débordait sur desktop 3-cols (montants CHF
 * coupés). Fix v7 : structure grid + min-w-0 + truncate uniquement
 * sur le label.
 *
 * Ce test verrouille les invariants critiques anti-overflow. Si
 * quelqu'un retire un `min-w-0`, un `truncate` ou réintroduit du
 * flex `justify-between`, le test casse et signale la régression.
 */

const source = readFileSync(
  resolve(process.cwd(), "components/dashboard/repartition-donut-card.tsx"),
  "utf8",
);

describe("RepartitionDonutCard — anti-overflow structure", () => {
  it("légende <ul> a `min-w-0 flex-1` (autorise compression dans flex parent)", () => {
    // L'ul DOIT avoir min-w-0 pour autoriser la compression. Sans
    // ça, le contenu force l'ul à dépasser de son conteneur flex
    // → légende débordant à droite + montants coupés.
    expect(source).toMatch(/<ul[^>]*min-w-0[^>]*flex-1[^>]*>/);
  });

  it("légende utilise un grid CSS 3 colonnes (label / percent / montant)", () => {
    // Grid avec minmax(0,1fr) auto auto :
    //   col 1 = label compressible
    //   col 2 = percent non-compressible
    //   col 3 = montant non-compressible
    expect(source).toMatch(
      /gridTemplateColumns:\s*["']minmax\(0,\s*1fr\)\s+auto\s+auto["']/,
    );
  });

  it("la classe `truncate` est appliquée UNIQUEMENT au label catégorie", () => {
    // Le label peut être tronqué (ex. "Loisirs & divers" coupé en
    // "Loisirs & d…"). MAIS les montants CHF et pourcentages ne
    // doivent jamais être tronqués.
    expect(source).toMatch(
      /<span\s+className="truncate text-foreground">\{label\}<\/span>/,
    );
  });

  it("les montants CHF et pourcentages utilisent `tabular-nums` (alignement)", () => {
    // tabular-nums sur tous les chiffres garantit l'alignement
    // vertical des colonnes percent + montant.
    expect(source).toMatch(/font-medium\s+tabular-nums\s+text-foreground/);
    expect(source).toMatch(/tabular-nums\s+text-muted-foreground/);
  });

  it("aucune classe `truncate` n'est appliquée au pourcentage ou au montant", () => {
    // Anti-régression : si quelqu'un ajoute `truncate` sur le
    // span percent ou montant pour "régler" un overflow, le bug
    // se déplace mais ne disparaît pas. Bloquer cette dérive.
    // On vérifie que les seuls usages de truncate touchent `{label}`.
    const truncateMatches =
      source.match(/className="truncate[^"]*">[^<]*<\/span>/g) ?? [];
    for (const m of truncateMatches) {
      expect(m).toContain("{label}");
    }
  });

  it("le donut a une taille fixe (120 px) et `shrink-0`", () => {
    // Donut shrink-0 ne se compresse pas — protège son ratio
    // visuel. Sa taille est descendue de 144 → 120 px pour
    // libérer de la largeur à la légende.
    expect(source).toMatch(
      /style=\{\{\s*width:\s*120,\s*height:\s*120\s*\}\}/,
    );
    expect(source).toMatch(/className="relative shrink-0"/);
  });

  it("le centre du donut utilise text-sm (tient dans inner ring 68 px)", () => {
    // Le centre est rendu en text-sm font-bold pour qu'un montant
    // comme "15 893 CHF" tienne dans la zone vide centrale du
    // donut (inner radius 34 → diamètre 68 px). Un text-lg
    // déborderait sur les slices.
    expect(source).toMatch(/text-sm\s+font-bold\s+tabular-nums\s+text-foreground/);
  });

  it("aucun flex `justify-between` dans les rows de légende (cause du bug v6)", () => {
    // L'ancienne structure utilisait flex justify-between qui ne
    // contraignait pas les enfants → overflow. La structure v7
    // est en CSS grid. Bloquer le retour en arrière.
    expect(source).not.toMatch(/<li[^>]*justify-between/);
  });
});
