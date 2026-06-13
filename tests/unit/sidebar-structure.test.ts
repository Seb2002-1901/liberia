import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROUTES } from "@/lib/constants";

/**
 * Phase 5.0 S2 — sidebar + topbar light premium.
 *
 * Check statique : on lit la source de l'AppShell, des stubs et
 * des composants topbar pour verrouiller :
 *   1. la structure 4 sections de la sidebar (Principal / Finances /
 *      Croissance / Plus)
 *   2. la largeur 280 px et le main lg:pl-[280px] correspondant
 *   3. la présence des 3 nouvelles routes (savings / investments /
 *      opportunities) avec stub ComingSoonPage propre
 *   4. l'intégration Greeting + NotificationBell dans la topbar
 *   5. l'absence de fausses notifications (cloche inerte, pas de
 *      badge hardcodé)
 *   6. l'état actif sidebar en primary (plus de gold pour l'item
 *      sélectionné — D6 validé)
 */

const appShellSource = readFileSync(
  resolve(process.cwd(), "components/layout/app-shell.tsx"),
  "utf8",
);

const brandMarkSource = readFileSync(
  resolve(process.cwd(), "components/layout/brand-mark.tsx"),
  "utf8",
);

const notificationBellSource = readFileSync(
  resolve(process.cwd(), "components/layout/notification-bell.tsx"),
  "utf8",
);

const greetingSource = readFileSync(
  resolve(process.cwd(), "components/layout/greeting.tsx"),
  "utf8",
);

const appLayoutSource = readFileSync(
  resolve(process.cwd(), "app/(app)/layout.tsx"),
  "utf8",
);

const savingsPageSource = readFileSync(
  resolve(process.cwd(), "app/(app)/savings/page.tsx"),
  "utf8",
);

const investmentsPageSource = readFileSync(
  resolve(process.cwd(), "app/(app)/investments/page.tsx"),
  "utf8",
);

const opportunitiesPageSource = readFileSync(
  resolve(process.cwd(), "app/(app)/opportunities/page.tsx"),
  "utf8",
);

describe("Phase 5.0 S2 — ROUTES (3 nouvelles entrées)", () => {
  it("expose ROUTES.savings = /savings", () => {
    expect(ROUTES.savings).toBe("/savings");
  });

  it("expose ROUTES.investments = /investments", () => {
    expect(ROUTES.investments).toBe("/investments");
  });

  it("expose ROUTES.opportunities = /opportunities", () => {
    expect(ROUTES.opportunities).toBe("/opportunities");
  });
});

describe("Phase 5.0 S2 — Sidebar : 4 sections selon maquette", () => {
  it("contient la section PRINCIPAL (sectionPrincipal)", () => {
    expect(appShellSource).toMatch(/t\(["']sectionPrincipal["']\)/);
  });

  it("contient la section FINANCES (sectionFinances)", () => {
    expect(appShellSource).toMatch(/t\(["']sectionFinances["']\)/);
  });

  it("contient la section CROISSANCE (sectionCroissance)", () => {
    expect(appShellSource).toMatch(/t\(["']sectionCroissance["']\)/);
  });

  it("contient la section PLUS (sectionPlus)", () => {
    expect(appShellSource).toMatch(/t\(["']sectionPlus["']\)/);
  });

  it("ordre des sections : Principal → Finances → Croissance → Plus", () => {
    const principal = appShellSource.indexOf('"sectionPrincipal"');
    const finances = appShellSource.indexOf('"sectionFinances"');
    const croissance = appShellSource.indexOf('"sectionCroissance"');
    const plus = appShellSource.indexOf('"sectionPlus"');
    expect(principal).toBeGreaterThan(-1);
    expect(finances).toBeGreaterThan(principal);
    expect(croissance).toBeGreaterThan(finances);
    expect(plus).toBeGreaterThan(croissance);
  });
});

describe("Phase 5.0 S2 — Sidebar : items par section", () => {
  it("PRINCIPAL contient dashboard / coach / plan dans cet ordre", () => {
    const block = extractBlock(appShellSource, "SECTION_PRINCIPAL");
    const dashboardIdx = block.indexOf("ROUTES.dashboard");
    const coachIdx = block.indexOf("ROUTES.coach");
    const planIdx = block.indexOf("ROUTES.plan");
    expect(dashboardIdx).toBeGreaterThan(-1);
    expect(coachIdx).toBeGreaterThan(dashboardIdx);
    expect(planIdx).toBeGreaterThan(coachIdx);
  });

  it("FINANCES contient incomes / expenses / budget / goals dans cet ordre", () => {
    const block = extractBlock(appShellSource, "SECTION_FINANCES");
    const incomesIdx = block.indexOf("ROUTES.incomes");
    const expensesIdx = block.indexOf("ROUTES.expenses");
    const budgetIdx = block.indexOf("ROUTES.budget");
    const goalsIdx = block.indexOf("ROUTES.goals");
    expect(incomesIdx).toBeGreaterThan(-1);
    expect(expensesIdx).toBeGreaterThan(incomesIdx);
    expect(budgetIdx).toBeGreaterThan(expensesIdx);
    expect(goalsIdx).toBeGreaterThan(budgetIdx);
  });

  it("CROISSANCE contient savings / investments / opportunities dans cet ordre", () => {
    const block = extractBlock(appShellSource, "SECTION_CROISSANCE");
    const savingsIdx = block.indexOf("ROUTES.savings");
    const investmentsIdx = block.indexOf("ROUTES.investments");
    const opportunitiesIdx = block.indexOf("ROUTES.opportunities");
    expect(savingsIdx).toBeGreaterThan(-1);
    expect(investmentsIdx).toBeGreaterThan(savingsIdx);
    expect(opportunitiesIdx).toBeGreaterThan(investmentsIdx);
  });

  it("PLUS contient settings puis profile (maquette : Paramètres avant Profil)", () => {
    const block = extractBlock(appShellSource, "SECTION_PLUS");
    const settingsIdx = block.indexOf("ROUTES.settings");
    const profileIdx = block.indexOf("ROUTES.profile");
    expect(settingsIdx).toBeGreaterThan(-1);
    expect(profileIdx).toBeGreaterThan(settingsIdx);
  });
});

describe("Phase 5.0 S2 — Sidebar : dimensions et theme", () => {
  it("largeur sidebar = 280 px (vs 256 avant)", () => {
    expect(appShellSource).toMatch(/w-\[280px\]/);
  });

  it("main content : padding gauche aligné sur 280 px", () => {
    expect(appShellSource).toMatch(/lg:pl-\[280px\]/);
  });

  it("topbar : décalage gauche 280 px sur lg+", () => {
    expect(appShellSource).toMatch(/lg:left-\[280px\]/);
  });

  it("état actif item sidebar : fond gris bleuté + icône bleu plein", () => {
    // Phase 5.0 S3.1 v5 — feedback v4 : "bouton actif moins bleu,
    // plus gris bleuté". Le fond du link actif passe en
    // `bg-secondary` (neutre gris bleuté). L'icône active conserve
    // bg-primary text-primary-foreground (contraste pour identifier
    // la page courante). Plus de gold nulle part.
    expect(appShellSource).toMatch(/active[^?]*\?[^"]*"bg-secondary text-foreground"/s);
    expect(appShellSource).toMatch(/"bg-primary text-primary-foreground"/);
    expect(appShellSource).not.toMatch(/bg-gold|text-gold/);
  });
});

describe("Phase 5.0 S2 — Topbar : Greeting + NotificationBell", () => {
  it("AppShell accepte une prop `greeting` (Server Component injecté)", () => {
    expect(appShellSource).toMatch(/greeting\?:\s*React\.ReactNode/);
    expect(appShellSource).toMatch(/\{greeting\}/);
  });

  it("AppShell intègre NotificationBell dans la topbar", () => {
    expect(appShellSource).toMatch(/<NotificationBell\s*\/>/);
  });

  it("layout serveur passe le firstName au composant Greeting", () => {
    expect(appLayoutSource).toMatch(
      /<Greeting\s+firstName=\{firstName\}/,
    );
  });
});

describe("Phase 5.0 S2 — NotificationBell : inerte, pas de badge fake", () => {
  it("aria-disabled='true' (D2 : pas de fonctionnalité tant que pas de système)", () => {
    expect(notificationBellSource).toMatch(/aria-disabled=["']true["']/);
  });

  it("aucun JSX visible 'badge' ni compteur '2' hardcodé", () => {
    // Le mot 'badge' ne doit apparaître que dans les commentaires
    // expliquant la décision (qu'il n'y a PAS de badge tant que le
    // système de notif n'existe pas). Aucun élément JSX rendu ne
    // doit contenir un compteur.
    expect(notificationBellSource).not.toMatch(/>2</);
    expect(notificationBellSource).not.toMatch(/className=[^"]*"[^"]*badge/);
  });

  it("est cliquable dans le DOM mais sans handler onClick câblé", () => {
    expect(notificationBellSource).toMatch(/<button/);
    expect(notificationBellSource).not.toMatch(/onClick=/);
  });
});

describe("Phase 5.0 S2 — Greeting", () => {
  it("est un composant async (utilise getTranslations server)", () => {
    expect(greetingSource).toMatch(/export async function Greeting/);
    expect(greetingSource).toMatch(/getTranslations\(["']common\.shell\.greeting["']\)/);
  });

  it("affiche un fallback si firstName est null/vide", () => {
    expect(greetingSource).toMatch(/firstName\?\.trim\(\)\s*\|\|\s*t\(["']fallbackName["']\)/);
  });

  it("cachée sur < lg (hidden) pour préserver la place de la BrandMark mobile", () => {
    expect(greetingSource).toMatch(/className="hidden[^"]*lg:flex"/);
  });
});

describe("Phase 5.0 S2 — Redirects vers cockpits V3 (3 pages)", () => {
  // Phase Stabilisation : les anciens stubs <ComingSoonPage>
  // (savings/investments/opportunities) ont été convertis en
  // simples redirects vers leur équivalent V3, pour éliminer la
  // dernière surface AppShell visible côté utilisateur final.
  // On verrouille désormais le fait qu'ils restent des redirects
  // et qu'aucun chiffre fake n'apparaît dans leur source.
  it("savings page redirige vers /design-match/epargne-v3", () => {
    expect(savingsPageSource).toMatch(/redirect\(["']\/design-match\/epargne-v3["']\)/);
    expect(savingsPageSource).not.toMatch(/<ComingSoonPage/);
  });

  it("investments page redirige vers /design-match/investissements-v3", () => {
    expect(investmentsPageSource).toMatch(/redirect\(["']\/design-match\/investissements-v3["']\)/);
    expect(investmentsPageSource).not.toMatch(/<ComingSoonPage/);
  });

  it("opportunities page redirige vers /design-match/opportunites-v3", () => {
    expect(opportunitiesPageSource).toMatch(/redirect\(["']\/design-match\/opportunites-v3["']\)/);
    expect(opportunitiesPageSource).not.toMatch(/<ComingSoonPage/);
  });

  it("aucun stub ne contient de KPI ou de chiffre fake", () => {
    // Les redirect stubs ne doivent contenir aucun chiffre,
    // montant, ou pourcentage hardcodé (D2 + C3 validés).
    for (const src of [savingsPageSource, investmentsPageSource, opportunitiesPageSource]) {
      expect(src).not.toMatch(/CHF/);
      expect(src).not.toMatch(/\d+\s*%/);
    }
  });
});

describe("Phase 5.0 S2 — BrandMark : light premium (navy)", () => {
  it("plus de gradient gold dans BrandMark", () => {
    expect(brandMarkSource).not.toMatch(/from-\[hsl\(var\(--gold\)\)\]/);
    expect(brandMarkSource).not.toMatch(/shadow-\[[^\]]*--gold/);
  });

  it("utilise bg-navy + text-navy pour le wordmark", () => {
    expect(brandMarkSource).toMatch(/bg-navy/);
    expect(brandMarkSource).toMatch(/text-navy/);
  });
});

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Extrait le bloc de déclaration `const SECTION_XXX: NavItem[] = [
 *   ...
 * ];` depuis le source. Permet de tester l'ordre des items.
 */
function extractBlock(source: string, name: string): string {
  const start = source.indexOf(`const ${name}`);
  if (start === -1) throw new Error(`Block ${name} not found`);
  const end = source.indexOf("];", start);
  if (end === -1) throw new Error(`Closing ']' for ${name} not found`);
  return source.slice(start, end + 2);
}
