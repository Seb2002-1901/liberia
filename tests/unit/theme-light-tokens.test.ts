import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Phase 5.0 S1 — design system "light premium".
 *
 * Check statique : on vérifie que les tokens HSL maquette sont bien
 * exposés dans globals.css, que la classe `dark` a quitté le root
 * layout, et que Tailwind n'autorise plus la réactivation
 * accidentelle d'un thème sombre.
 *
 * On ne rend pas le DOM : les tokens CSS sont lus dans le browser
 * runtime, pas testables en JSDOM sans monter un layout réel.
 * L'audit visuel se fait à l'oeil sur Vercel après push.
 */

const globalsSource = readFileSync(
  resolve(process.cwd(), "app/globals.css"),
  "utf8",
);

const tailwindSource = readFileSync(
  resolve(process.cwd(), "tailwind.config.ts"),
  "utf8",
);

const rootLayoutSource = readFileSync(
  resolve(process.cwd(), "app/layout.tsx"),
  "utf8",
);

describe("Phase 5.0 S1 — tokens light premium (globals.css)", () => {
  it("expose le background #F6F8FC en HSL (220 33% 98%)", () => {
    expect(globalsSource).toMatch(/--background:\s*220 33% 98%/);
  });

  it("expose le foreground #0F172A en HSL (222 47% 11%)", () => {
    expect(globalsSource).toMatch(/--foreground:\s*222 47% 11%/);
  });

  it("expose la card blanche #FFFFFF en HSL (0 0% 100%)", () => {
    expect(globalsSource).toMatch(/--card:\s*0 0% 100%/);
  });

  it("expose le muted-foreground #64748B en HSL (215 16% 47%)", () => {
    expect(globalsSource).toMatch(/--muted-foreground:\s*215 16% 47%/);
  });

  it("expose le primary bleu accent #2563EB en HSL (221 83% 53%)", () => {
    expect(globalsSource).toMatch(/--primary:\s*221 83% 53%/);
  });

  it("expose le brand navy #0F3D9E en HSL (221 83% 34%)", () => {
    expect(globalsSource).toMatch(/--navy:\s*221 83% 34%/);
  });

  it("expose success #16A34A en HSL (142 76% 36%)", () => {
    expect(globalsSource).toMatch(/--success:\s*142 76% 36%/);
  });

  it("expose warning #F59E0B en HSL (38 92% 50%)", () => {
    expect(globalsSource).toMatch(/--warning:\s*38 92% 50%/);
  });

  it("expose destructive #DC2626 en HSL (0 72% 51%)", () => {
    expect(globalsSource).toMatch(/--destructive:\s*0 72% 51%/);
  });

  it("conserve `--gold` comme alias backward-compat vers primary", () => {
    // Le token `--gold` est utilisé 152 fois dans la base. Tant qu'on
    // n'a pas migré tout le code vers `primary`/`navy` (programmé
    // S3), `--gold` doit valoir exactement la même chose que
    // `--primary` pour que les écrans pas encore migrés rendent en
    // bleu accent au lieu de couleur or.
    const primaryMatch = globalsSource.match(/--primary:\s*([\d\s%]+);/);
    const goldMatch = globalsSource.match(/--gold:\s*([\d\s%]+);/);
    expect(primaryMatch).not.toBeNull();
    expect(goldMatch).not.toBeNull();
    expect(goldMatch![1].trim()).toBe(primaryMatch![1].trim());
  });

  it("retire le bloc `.dark` (light-first, plus de thème sombre)", () => {
    // Aucun bloc `.dark` ne doit redéfinir des tokens. Sinon, un user
    // qui ajoute `className="dark"` quelque part réactive un thème
    // sombre potentiellement cassé.
    expect(globalsSource).not.toMatch(/\.dark\s*[,{]/);
  });

  it("radius par défaut = 1rem (16 px, cible maquette)", () => {
    expect(globalsSource).toMatch(/--radius:\s*1rem/);
  });

  it("::selection utilise primary (bleu) — plus de gold", () => {
    expect(globalsSource).toMatch(
      /::selection[^}]*hsl\(var\(--primary\)\s*\/\s*0\.2\)/,
    );
  });
});

describe("Phase 5.0 S1 — Tailwind config (light-first verrouillé)", () => {
  it("retire `darkMode: ['class']` (plus de réactivation accidentelle)", () => {
    expect(tailwindSource).not.toMatch(/darkMode:\s*\[['"]class['"]\]/);
  });

  it("expose le nouveau color family `navy`", () => {
    expect(tailwindSource).toMatch(/navy:\s*\{[^}]*var\(--navy\)/s);
  });

  it("conserve `gold` color family (backward compat)", () => {
    expect(tailwindSource).toMatch(/gold:\s*\{[^}]*var\(--gold\)/s);
  });

  it("ajoute le backgroundImage `accent-gradient` (renommage S3)", () => {
    expect(tailwindSource).toMatch(/"accent-gradient":/);
  });
});

describe("Phase 5.0 S1 — root layout (light-first)", () => {
  it("retire la classe `dark` de <html>", () => {
    // Le className ne doit plus contenir `dark`. On vérifie
    // littéralement la liste de classes du html.
    expect(rootLayoutSource).not.toMatch(
      /className=\{`\$\{inter\.variable\} \$\{outfit\.variable\} dark`\}/,
    );
  });

  it("colorScheme passe à 'light'", () => {
    expect(rootLayoutSource).toMatch(/colorScheme:\s*["']light["']/);
  });

  it("themeColor passe au fond app #F6F8FC", () => {
    expect(rootLayoutSource).toMatch(/themeColor:\s*["']#F6F8FC["']/i);
  });

  it("Toaster passe en thème clair", () => {
    expect(rootLayoutSource).toMatch(/theme=["']light["']/);
  });
});
