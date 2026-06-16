import { describe, it, expect } from "vitest";
import {
  parseBankCsv,
  parseDate,
  parseAmount,
  suggestCategory,
  buildDedupSeed,
} from "@/lib/banking/csv-parser";

/**
 * Sprint V5 Banking V1 — tests du parser CSV bancaire CH.
 *
 * On valide tous les formats observés en réel sur les exports
 * e-banking des 7 banques CH cibles. Pas de mock — vrais CSV
 * fabriqués pour reproduire fidèlement le format export 2024-2026.
 */

describe("parseAmount", () => {
  it.each([
    ["1234.56", 1234.56],
    ["1'234.56", 1234.56],
    ["1'234'567.89", 1234567.89],
    ["1.234,56", 1234.56], // format DE
    ["1234,56", 1234.56],
    ["-42.50", -42.5],
    ["1234.56-", -1234.56],
    ["", null],
    [undefined, null],
    ["abc", null],
  ])("'%s' → %s", (input, expected) => {
    expect(parseAmount(input as string | undefined)).toEqual(expected);
  });
});

describe("parseDate", () => {
  it.each([
    ["2026-03-15", "2026-03-15"],
    ["15.03.2026", "2026-03-15"],
    ["15/03/2026", "2026-03-15"],
    ["1.3.2026", "2026-03-01"],
    ["15.03.26", "2026-03-15"],
    ["", null],
    [undefined, null],
    ["not a date", null],
  ])("'%s' → %s", (input, expected) => {
    expect(parseDate(input as string | undefined)).toEqual(expected);
  });
});

describe("suggestCategory", () => {
  it.each([
    ["COOP COOP-2120 Lausanne", "food"],
    ["Migros M-Vélo Lausanne", "food"],
    ["Restaurant Le Lac", "food"],
    ["CFF Lausanne Gare 12.50", "transport"],
    ["Migrol Avenue de la Gare", "transport"],
    ["Swisscom Mobile facture", "utilities"],
    ["CSS Assurance prime maladie", "insurance"],
    ["Netflix Subscription", "subscriptions"],
    ["H&M Lausanne", "shopping"],
    ["Pharmacie Amavita", "health"],
    ["Random nothing", null],
  ])('"%s" → %s', (label, category) => {
    expect(suggestCategory(label)).toBe(category);
  });
});

describe("buildDedupSeed — déterministe", () => {
  it("produit le même seed pour la même transaction", () => {
    const a = buildDedupSeed("u1", "2026-03-15", -42.5, "COOP-2120 Lausanne");
    const b = buildDedupSeed("u1", "2026-03-15", -42.5, "COOP-2120 Lausanne");
    expect(a).toBe(b);
  });
  it("seed différent par user", () => {
    const a = buildDedupSeed("u1", "2026-03-15", -42.5, "Coop");
    const b = buildDedupSeed("u2", "2026-03-15", -42.5, "Coop");
    expect(a).not.toBe(b);
  });
  it("normalise le label (case + ponctuation)", () => {
    const a = buildDedupSeed("u1", "2026-03-15", -42.5, "COOP - 2120");
    const b = buildDedupSeed("u1", "2026-03-15", -42.5, "coop  2120");
    expect(a).toBe(b);
  });
});

describe("parseBankCsv — Neon", () => {
  const CSV = `Date,Amount,Original amount,Original currency,Exchange rate,Description,Subject,Category
2026-03-15,-42.50,-42.50,CHF,1,COOP COOP-2120 Lausanne,Courses,
2026-03-14,4800.00,4800.00,CHF,1,Salaire mars,Employer SA,
2026-03-13,-1500.00,-1500.00,CHF,1,LOYER mensuel,régie,
`;

  it("détecte le format Neon", () => {
    const r = parseBankCsv(CSV);
    expect(r.bankHint).toBe("neon");
    expect(r.delimiter).toBe(",");
  });

  it("parse 3 transactions correctement", () => {
    const r = parseBankCsv(CSV);
    expect(r.transactions).toHaveLength(3);
    expect(r.transactions[0]).toMatchObject({
      date: "2026-03-15",
      amount: -42.5,
      currency: "CHF",
    });
    expect(r.transactions[1].amount).toBe(4800);
    expect(r.transactions[2].amount).toBe(-1500);
  });
});

describe("parseBankCsv — PostFinance", () => {
  const CSV = `Date;Type d'opération;Description;Crédit;Débit
15.03.2026;Achat carte;COOP COOP-2120 Lausanne;;42.50
14.03.2026;Virement reçu;Salaire mars Employer SA;4800.00;
13.03.2026;Prélèvement;LOYER régie;;1500.00
`;

  it("détecte le format PostFinance", () => {
    const r = parseBankCsv(CSV);
    expect(r.bankHint).toBe("postfinance");
    expect(r.delimiter).toBe(";");
  });

  it("parse 3 transactions (débit en négatif, crédit en positif)", () => {
    const r = parseBankCsv(CSV);
    expect(r.transactions).toHaveLength(3);
    expect(r.transactions[0].amount).toBe(-42.5);
    expect(r.transactions[1].amount).toBe(4800);
    expect(r.transactions[2].amount).toBe(-1500);
  });

  it("dates DD.MM.YYYY → ISO", () => {
    const r = parseBankCsv(CSV);
    expect(r.transactions[0].date).toBe("2026-03-15");
  });
});

describe("parseBankCsv — UBS", () => {
  const CSV = `Date de transaction;Date de valeur;Description;Débit;Crédit
15.03.2026;15.03.2026;COOP-2120 Lausanne;42.50;
14.03.2026;14.03.2026;Virement Salaire mars;;4800.00
`;

  it("détecte UBS", () => {
    const r = parseBankCsv(CSV);
    expect(r.bankHint).toBe("ubs");
  });

  it("parse correctement débit/crédit", () => {
    const r = parseBankCsv(CSV);
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0].amount).toBe(-42.5);
    expect(r.transactions[1].amount).toBe(4800);
  });
});

describe("parseBankCsv — Revolut", () => {
  const CSV = `Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
CARD_PAYMENT,Current,2026-03-15,2026-03-15,COOP Lausanne,-42.50,0,CHF,COMPLETED,5000
TOPUP,Current,2026-03-14,2026-03-14,Top-up by card,100.00,0,CHF,COMPLETED,5042.50
TRANSFER,Current,2026-03-13,2026-03-13,To friend,-50.00,0,CHF,PENDING,4942.50
`;

  it("détecte Revolut", () => {
    const r = parseBankCsv(CSV);
    expect(r.bankHint).toBe("revolut");
  });

  it("skip les états PENDING", () => {
    const r = parseBankCsv(CSV);
    // 3 lignes input, 1 PENDING skipped → 2 transactions
    expect(r.transactions).toHaveLength(2);
  });
});

describe("parseBankCsv — Raiffeisen format avec montant signé", () => {
  const CSV = `Date;Description;Compte;Type;Montant en CHF;Solde en CHF
15.03.2026;COOP Lausanne;Compte;Carte;-42.50;5000.00
14.03.2026;Salaire mars Employer;Compte;Virement;4800.00;5042.50
`;

  it("détecte Raiffeisen", () => {
    const r = parseBankCsv(CSV);
    expect(r.bankHint).toBe("raiffeisen");
  });

  it("parse montant signé directement", () => {
    const r = parseBankCsv(CSV);
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0].amount).toBe(-42.5);
    expect(r.transactions[1].amount).toBe(4800);
  });
});

describe("parseBankCsv — format générique inconnu", () => {
  const CSV = `Date,Amount,Description
2026-03-15,-42.50,Some shop
2026-03-14,4800.00,Salary
`;

  it("retombe sur generic et parse quand même", () => {
    const r = parseBankCsv(CSV);
    expect(r.bankHint).toBe("generic");
    expect(r.transactions).toHaveLength(2);
  });
});

describe("parseBankCsv — fichier vide", () => {
  it("retourne unknown + erreur", () => {
    const r = parseBankCsv("");
    expect(r.bankHint).toBe("unknown");
    expect(r.parseErrors.length).toBeGreaterThan(0);
  });
});

describe("parseBankCsv — montants CH avec apostrophe", () => {
  const CSV = `Date;Description;Débit;Crédit
15.03.2026;Salaire;;5'200.00
16.03.2026;LOYER;1'200.00;
`;

  it("parse 5'200.00 et 1'200.00 correctement", () => {
    const r = parseBankCsv(CSV);
    expect(r.transactions[0].amount).toBe(5200);
    expect(r.transactions[1].amount).toBe(-1200);
  });
});
