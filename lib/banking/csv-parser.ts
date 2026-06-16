/**
 * Sprint V5 — parser CSV bancaire avec détection format CH.
 *
 * Pas de dépendance externe (csv-parse, papaparse) : on écrit un parser
 * RFC 4180-ish minimal qui couvre les cas observés des 7 banques CH
 * cibles. Pas de support multi-ligne quoted CSV (jamais rencontré sur
 * les exports CH). Délimiteur : virgule OU point-virgule (auto-détecté).
 *
 * Banques cibles + formats observés (échantillons réels e-banking 2024-2026) :
 *  - UBS : ";" séparateur, colonnes "Date de transaction;...;Description;Débit;Crédit"
 *  - PostFinance : ";" séparateur, colonnes "Date;Type d'opération;Description;Crédit;Débit"
 *  - Neon : "," séparateur, colonnes "Date,Amount,Original amount,Original currency,Exchange rate,Description,Subject,Category"
 *  - Yuh : ";" séparateur, format proche PostFinance
 *  - Revolut : "," séparateur, colonnes "Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance"
 *  - Raiffeisen : ";" séparateur, colonnes "Date;Description;Compte;Type;Montant en CHF;Solde en CHF"
 *  - BCV : ";" séparateur, colonnes "Date;Libellé;Débit;Crédit;Date de valeur;Solde"
 *
 * Logique :
 *  1. Détecter délimiteur (compter ; vs , sur les 10 premières lignes)
 *  2. Détecter banque via signature de header (mots-clés discriminants)
 *  3. Parser avec mapping de colonnes propre à la banque
 *  4. Si banque inconnue : fallback "generic" qui cherche date/montant/label
 */

export type BankHint =
  | "ubs"
  | "postfinance"
  | "neon"
  | "yuh"
  | "revolut"
  | "raiffeisen"
  | "bcv"
  | "generic"
  | "unknown";

export type ParsedTransaction = {
  date: string; // ISO YYYY-MM-DD
  amount: number; // positif = entrée, négatif = sortie
  currency: string;
  label: string;
  raw: string;
};

export type ParseResult = {
  bankHint: BankHint;
  delimiter: "," | ";";
  rowCount: number;
  transactions: ParsedTransaction[];
  parseErrors: Array<{ line: number; reason: string }>;
};

const HEADER_SIGNATURES: Array<{ hint: BankHint; keywords: string[] }> = [
  // Ordre = priorité. On évalue dans l'ordre, premier match gagne.
  // On vise des mots-clés DISCRIMINANTS uniquement (pas "crédit" ou
  // "débit" qui apparaissent chez plusieurs banques).
  {
    hint: "neon",
    keywords: ["original amount", "original currency", "subject", "exchange rate"],
  },
  {
    hint: "revolut",
    keywords: ["started date", "completed date", "fee", "state"],
  },
  // UBS a la signature "date de transaction" + "date de valeur"
  { hint: "ubs", keywords: ["date de transaction"] },
  // PostFinance/Yuh ont "type d'opération"
  {
    hint: "postfinance",
    keywords: ["type d'opération", "type doperation"],
  },
  { hint: "raiffeisen", keywords: ["montant en chf", "solde en chf"] },
  { hint: "yuh", keywords: ["yuh"] }, // Yuh export inclut explicitement "Yuh" parfois
  { hint: "bcv", keywords: ["bcv", "banque cantonale vaudoise"] },
];

export function parseBankCsv(content: string): ParseResult {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const allLines = normalized.split("\n").filter((l) => l.length > 0);
  if (allLines.length === 0) {
    return {
      bankHint: "unknown",
      delimiter: ",",
      rowCount: 0,
      transactions: [],
      parseErrors: [{ line: 0, reason: "Fichier vide" }],
    };
  }

  const delimiter = detectDelimiter(allLines.slice(0, 10));
  const headerLine = findHeaderLine(allLines, delimiter);
  const headerIndex = allLines.indexOf(headerLine);
  const dataLines = allLines.slice(headerIndex + 1);
  const headers = splitCsvLine(headerLine, delimiter).map((h) =>
    h.toLowerCase().trim(),
  );

  const bankHint = detectBankFromHeaders(headers);
  const parser = getParserForBank(bankHint, headers);

  const transactions: ParsedTransaction[] = [];
  const parseErrors: ParseResult["parseErrors"] = [];

  dataLines.forEach((line, idx) => {
    try {
      const cells = splitCsvLine(line, delimiter);
      if (cells.length === 0 || cells.every((c) => !c.trim())) return;
      const tx = parser(cells, line);
      if (tx) transactions.push(tx);
    } catch (err) {
      parseErrors.push({
        line: headerIndex + 1 + idx + 1,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  });

  return {
    bankHint,
    delimiter,
    rowCount: dataLines.length,
    transactions,
    parseErrors,
  };
}

function detectDelimiter(lines: string[]): "," | ";" {
  let semi = 0;
  let comma = 0;
  for (const line of lines) {
    semi += (line.match(/;/g) ?? []).length;
    comma += (line.match(/,/g) ?? []).length;
  }
  return semi >= comma ? ";" : ",";
}

function findHeaderLine(lines: string[], _delimiter: "," | ";"): string {
  // Stratégie : le header est la première ligne qui contient un mot-clé
  // banque (date, montant, débit, crédit, amount, description...).
  const headerKeywords = [
    "date", "amount", "montant", "débit", "credit", "crédit",
    "description", "libellé", "label", "type",
  ];
  for (const line of lines) {
    const lower = line.toLowerCase();
    let hits = 0;
    for (const kw of headerKeywords) {
      if (lower.includes(kw)) hits++;
    }
    if (hits >= 2) return line;
  }
  // Sinon, première ligne par défaut
  return lines[0];
}

function detectBankFromHeaders(headers: string[]): BankHint {
  const joined = headers.join(" | ");
  for (const sig of HEADER_SIGNATURES) {
    if (sig.keywords.some((kw) => joined.includes(kw))) {
      return sig.hint;
    }
  }
  return "generic";
}

/**
 * Découpe CSV ligne en cellules. Gère les guillemets minimaux (cellule
 * encadrée par "..." avec virgule à l'intérieur). Pas de support
 * multi-ligne quoted cells.
 */
function splitCsvLine(line: string, delimiter: "," | ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((c) => c.trim());
}

type ParserFn = (cells: string[], raw: string) => ParsedTransaction | null;

function getParserForBank(hint: BankHint, headers: string[]): ParserFn {
  const idx = (...names: string[]) => {
    for (const name of names) {
      const i = headers.findIndex((h) => h === name || h.includes(name));
      if (i >= 0) return i;
    }
    return -1;
  };

  switch (hint) {
    case "neon": {
      const iDate = idx("date");
      const iAmount = idx("amount");
      const iCurrency = idx("original currency", "currency");
      const iDesc = idx("subject", "description");
      return (cells) => {
        const date = parseDate(cells[iDate]);
        const amount = parseAmount(cells[iAmount]);
        if (!date || amount === null) return null;
        return {
          date,
          amount,
          currency: (cells[iCurrency] ?? "CHF").toUpperCase() || "CHF",
          label: cells[iDesc] ?? "",
          raw: cells.join(" | "),
        };
      };
    }
    case "revolut": {
      const iDate = idx("completed date", "started date");
      const iAmount = idx("amount");
      const iCurrency = idx("currency");
      const iDesc = idx("description");
      const iState = idx("state");
      return (cells) => {
        // Skip états non finaux
        if (iState >= 0 && cells[iState] && cells[iState].toLowerCase() !== "completed") {
          return null;
        }
        const date = parseDate(cells[iDate]);
        const amount = parseAmount(cells[iAmount]);
        if (!date || amount === null) return null;
        return {
          date,
          amount,
          currency: (cells[iCurrency] ?? "CHF").toUpperCase() || "CHF",
          label: cells[iDesc] ?? "",
          raw: cells.join(" | "),
        };
      };
    }
    case "postfinance":
    case "yuh": {
      const iDate = idx("date");
      const iDebit = idx("débit", "debit");
      const iCredit = idx("crédit", "credit");
      const iDesc = idx("description", "type", "libellé");
      return (cells) => {
        const date = parseDate(cells[iDate]);
        if (!date) return null;
        const debit = iDebit >= 0 ? parseAmount(cells[iDebit]) : null;
        const credit = iCredit >= 0 ? parseAmount(cells[iCredit]) : null;
        let amount: number | null = null;
        if (credit !== null && credit > 0) amount = credit;
        else if (debit !== null && debit > 0) amount = -debit;
        else if (debit !== null && debit < 0) amount = debit;
        if (amount === null) return null;
        return {
          date,
          amount,
          currency: "CHF",
          label: cells[iDesc] ?? "",
          raw: cells.join(" | "),
        };
      };
    }
    case "ubs": {
      const iDate = idx("date de transaction", "date");
      const iDebit = idx("débit", "debit");
      const iCredit = idx("crédit", "credit");
      const iDesc = idx("description", "libellé");
      return (cells) => {
        const date = parseDate(cells[iDate]);
        if (!date) return null;
        const debit = iDebit >= 0 ? parseAmount(cells[iDebit]) : null;
        const credit = iCredit >= 0 ? parseAmount(cells[iCredit]) : null;
        let amount: number | null = null;
        if (credit !== null && credit > 0) amount = credit;
        else if (debit !== null && debit > 0) amount = -debit;
        if (amount === null) return null;
        return {
          date,
          amount,
          currency: "CHF",
          label: cells[iDesc] ?? "",
          raw: cells.join(" | "),
        };
      };
    }
    case "raiffeisen":
    case "bcv": {
      const iDate = idx("date");
      const iAmount = idx("montant en chf", "montant");
      const iDebit = idx("débit");
      const iCredit = idx("crédit");
      const iDesc = idx("libellé", "description");
      return (cells) => {
        const date = parseDate(cells[iDate]);
        if (!date) return null;
        let amount: number | null = null;
        if (iAmount >= 0) {
          amount = parseAmount(cells[iAmount]);
        } else {
          const debit = iDebit >= 0 ? parseAmount(cells[iDebit]) : null;
          const credit = iCredit >= 0 ? parseAmount(cells[iCredit]) : null;
          if (credit !== null && credit > 0) amount = credit;
          else if (debit !== null && debit > 0) amount = -debit;
        }
        if (amount === null) return null;
        return {
          date,
          amount,
          currency: "CHF",
          label: cells[iDesc] ?? "",
          raw: cells.join(" | "),
        };
      };
    }
    default: {
      // Générique : essaye amount/montant, sinon débit/crédit.
      const iDate = idx("date");
      const iAmount = idx("amount", "montant");
      const iDebit = idx("débit", "debit");
      const iCredit = idx("crédit", "credit");
      const iDesc = idx("description", "label", "libellé", "subject");
      return (cells) => {
        const date = parseDate(cells[iDate]);
        if (!date) return null;
        let amount: number | null = null;
        if (iAmount >= 0) {
          amount = parseAmount(cells[iAmount]);
        } else {
          const debit = iDebit >= 0 ? parseAmount(cells[iDebit]) : null;
          const credit = iCredit >= 0 ? parseAmount(cells[iCredit]) : null;
          if (credit !== null && credit > 0) amount = credit;
          else if (debit !== null && debit > 0) amount = -debit;
        }
        if (amount === null) return null;
        return {
          date,
          amount,
          currency: "CHF",
          label: cells[iDesc] ?? "",
          raw: cells.join(" | "),
        };
      };
    }
  }
}

/** Parse une date au format ISO YYYY-MM-DD ou DD.MM.YYYY ou DD/MM/YYYY. */
export function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // ISO
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  // DD.MM.YYYY ou DD/MM/YYYY
  const ddMmMatch = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (ddMmMatch) {
    const day = ddMmMatch[1].padStart(2, "0");
    const month = ddMmMatch[2].padStart(2, "0");
    let year = ddMmMatch[3];
    if (year.length === 2) year = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    return `${year}-${month}-${day}`;
  }
  return null;
}

/**
 * Parse un montant en gérant les formats CH :
 *  - "1'234.56" (apostrophe milliers)
 *  - "1.234,56" (point milliers, virgule décimale — format DE)
 *  - "1234.56" (US)
 *  - "1'234.56-" ou "-1234.56" (négatif)
 *  - "" → null
 */
export function parseAmount(raw: string | undefined): number | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;
  // Negatif "1234.56-"
  let negative = false;
  if (s.endsWith("-")) {
    negative = true;
    s = s.slice(0, -1).trim();
  }
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1).trim();
  }
  // Apostrophe ou espace = séparateur millier
  s = s.replace(/[' ]/g, "");
  // Détermine quel séparateur est décimal :
  //  - si . et , présents : le plus à DROITE est décimal (DE/CH "1.234,56"
  //    → ,56 décimal ; US "1,234.56" → .56 décimal)
  //  - si seul , présent : c'est le décimal (FR/CH)
  //  - si seul . présent : c'est le décimal (US par défaut)
  if (s.includes(".") && s.includes(",")) {
    const lastPoint = s.lastIndexOf(".");
    const lastComma = s.lastIndexOf(",");
    if (lastComma > lastPoint) {
      // DE/CH : "1.234,56" → enlever points (séparateurs millier) + virgule décimal
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      // US : "1,234.56" → enlever virgules (séparateurs millier)
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  }
  const num = parseFloat(s);
  if (!Number.isFinite(num)) return null;
  return negative ? -num : num;
}

/**
 * Catégorisation simple par regex sur le label. Retourne null si pas
 * de match clair → user doit catégoriser à la main.
 *
 * Le set de patterns vise les catégories CH les plus fréquentes vues
 * sur les relevés bancaires :
 */
const CATEGORY_PATTERNS: Array<{ category: string; patterns: RegExp[] }> = [
  {
    category: "food",
    patterns: [
      /coop/i, /migros/i, /aldi/i, /lidl/i, /denner/i, /manor.*food/i,
      /spar\b/i, /globus/i, /restaurant/i, /resto/i, /pizza/i, /sushi/i,
      /mcdonald/i, /burger king/i, /starbucks/i, /café/i, /bistro/i,
    ],
  },
  {
    category: "transport",
    patterns: [
      /cff\b/i, /sbb\b/i, /vbz/i, /tpg\b/i, /tl\b/i, /uber/i, /taxi/i,
      /shell/i, /migrol/i, /coop pronto/i, /agrola/i, /tamoil/i,
      /esso\b/i, /bp\s/i, /avec\b/i, /parking/i,
    ],
  },
  {
    category: "housing",
    patterns: [/loyer/i, /miete/i, /rent\b/i, /hypothèque/i, /hypothek/i],
  },
  {
    category: "utilities",
    patterns: [
      /swisscom/i, /salt\b/i, /sunrise/i, /upc/i, /m-budget/i,
      /électrique/i, /electric/i, /sig\b/i, /ewz\b/i, /elektra/i,
      /eau\b/i, /gas\b/i, /chauffage/i,
    ],
  },
  {
    category: "insurance",
    patterns: [
      /assurance/i, /versicherung/i, /css\b/i, /helsana/i, /swica/i,
      /sanitas\b/i, /assura/i, /groupe mutuel/i, /allianz/i, /axa\b/i,
      /generali/i, /zurich\b/i, /smile direct/i, /mobi\b/i,
    ],
  },
  {
    category: "subscriptions",
    patterns: [
      /netflix/i, /spotify/i, /apple\b/i, /icloud/i, /google\b/i,
      /youtube/i, /amazon prime/i, /disney/i, /openai/i, /chatgpt/i,
      /github\b/i, /adobe/i, /microsoft/i,
    ],
  },
  {
    category: "leisure",
    patterns: [
      /cinéma/i, /pathe/i, /arena cinemas/i, /kitag/i, /fitness/i,
      /migros fitness/i, /salle de sport/i, /bar\b/i, /pub\b/i,
    ],
  },
  {
    category: "shopping",
    patterns: [
      /h&m/i, /zara/i, /uniqlo/i, /amazon\.(?!prime)/i, /digitec/i,
      /galaxus/i, /interdiscount/i, /melectronics/i, /fnac/i, /ikea/i,
      /jumbo\b/i, /obi\b/i, /jysk/i,
    ],
  },
  {
    category: "health",
    patterns: [
      /pharmacie/i, /apotheke/i, /amavita/i, /sun store/i, /coop vitality/i,
      /médecin/i, /dentiste/i, /hôpital/i, /hospital/i,
    ],
  },
];

export function suggestCategory(label: string): string | null {
  for (const { category, patterns } of CATEGORY_PATTERNS) {
    if (patterns.some((re) => re.test(label))) return category;
  }
  return null;
}

/**
 * Hash de dédup côté serveur. Volontairement DÉTERMINISTE :
 * sha256(userId || date || amount.toFixed(2) || labelNormalized).
 * Le même fichier importé 2x ne crée pas de doublons.
 */
export function buildDedupSeed(
  userId: string,
  date: string,
  amount: number,
  label: string,
): string {
  const labelNorm = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 80);
  return `${userId}|${date}|${amount.toFixed(2)}|${labelNorm}`;
}
