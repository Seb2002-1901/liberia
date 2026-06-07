import { describe, expect, it } from "vitest";
import {
  buildFirstCoachMessage,
  WELCOME_MESSAGE_MODEL_TAG,
} from "@/lib/coach/first-message";

/**
 * Phase 4.0 J5 — tests du helper pur `buildFirstCoachMessage`.
 *
 * Le helper concatène 4 chunks déjà i18n-rendus avec "\n\n", trim
 * chaque chunk, puis trim le résultat. Le tag `model` est figé : un
 * changement de valeur casserait l'idempotence des rows existantes.
 *
 * Le service d'injection (`maybeInjectFirstCoachMessage`) est testé
 * en intégration séparément ; ici on ne couvre QUE la pureté de la
 * composition.
 */

const sample = {
  greeting: "Salut Alice.",
  reflection: "J'ai regardé ta situation.",
  priorityLine: "Ta priorité actuelle : constituer un premier coussin de sécurité.",
  invitation: "On peut commencer par là si tu veux.",
};

describe("buildFirstCoachMessage — pureté & format", () => {
  it("concatène les 4 chunks avec '\\n\\n' dans l'ordre attendu", () => {
    const out = buildFirstCoachMessage(sample);
    const parts = out.split("\n\n");
    expect(parts).toHaveLength(4);
    expect(parts[0]).toBe(sample.greeting);
    expect(parts[1]).toBe(sample.reflection);
    expect(parts[2]).toBe(sample.priorityLine);
    expect(parts[3]).toBe(sample.invitation);
  });

  it("trim les espaces internes de chaque chunk", () => {
    const out = buildFirstCoachMessage({
      greeting: "  Salut Alice.  ",
      reflection: "\tJ'ai regardé ta situation.\n",
      priorityLine: "  Ta priorité actuelle : X.  ",
      invitation: " On peut commencer par là si tu veux. ",
    });
    expect(out).toBe(
      "Salut Alice.\n\nJ'ai regardé ta situation.\n\nTa priorité actuelle : X.\n\nOn peut commencer par là si tu veux.",
    );
  });

  it("trim le résultat final (pas de blanc traînant)", () => {
    const out = buildFirstCoachMessage(sample);
    expect(out).toBe(out.trim());
    expect(out.endsWith("\n")).toBe(false);
    expect(out.startsWith(" ")).toBe(false);
  });

  it("respecte la spec produit (format exact 4 lignes séparées)", () => {
    const out = buildFirstCoachMessage(sample);
    expect(out).toBe(
      [
        "Salut Alice.",
        "J'ai regardé ta situation.",
        "Ta priorité actuelle : constituer un premier coussin de sécurité.",
        "On peut commencer par là si tu veux.",
      ].join("\n\n"),
    );
  });

  it("ne contient ni triple newline ni ligne vide interne", () => {
    const out = buildFirstCoachMessage(sample);
    expect(out.includes("\n\n\n")).toBe(false);
  });

  it("est déterministe : 2 appels avec les mêmes inputs → même output", () => {
    const a = buildFirstCoachMessage(sample);
    const b = buildFirstCoachMessage(sample);
    expect(a).toBe(b);
  });
});

describe("WELCOME_MESSAGE_MODEL_TAG — valeur figée (idempotence DB)", () => {
  it("vaut 'liberia-onboarding-template' — ne change pas sans migration", () => {
    // Cette constante est utilisée comme valeur de la colonne `model`
    // dans ai_messages pour détecter qu'un user a déjà reçu son
    // welcome. Toute modification casse l'idempotence des rows
    // existantes : un user pourrait recevoir DEUX messages de
    // bienvenue. Garder ce test pour bloquer un rename involontaire.
    expect(WELCOME_MESSAGE_MODEL_TAG).toBe("liberia-onboarding-template");
  });

  it("est une string non-vide, kebab-case, sans espace ni emoji", () => {
    expect(typeof WELCOME_MESSAGE_MODEL_TAG).toBe("string");
    expect(WELCOME_MESSAGE_MODEL_TAG.length).toBeGreaterThan(0);
    expect(/^[a-z0-9-]+$/.test(WELCOME_MESSAGE_MODEL_TAG)).toBe(true);
  });
});
