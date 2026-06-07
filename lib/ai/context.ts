import "server-only";
import { aggregateMonthlyByCategory } from "@/lib/calculations/aggregate";
import {
  calculateExpenseRatio,
  calculateFinancialStress,
  calculateNetCashflow,
  calculateRunway,
  calculateSavingsRate,
  calculateStabilityScore,
  getStabilityTier,
} from "@/lib/calculations/finance";
import { EXPENSE_CATEGORIES, GOAL_TYPES, INCOME_CATEGORIES } from "@/lib/constants";
import { totalMonthly } from "@/lib/services/finance";
import { formatCurrency, formatPercent } from "@/lib/utils";
import {
  buildBudgetStatus,
  buildCategoryBreakdown,
  buildCategoryHistory,
} from "@/lib/calculations/analytics";
import { computeDisciplineScore } from "@/lib/calculations/discipline";
import {
  detectOpportunities,
  type Opportunity,
} from "@/lib/calculations/opportunities";
import {
  computeBudgetProgress,
  computeGoalAchievementScore,
  computePotentialSavings,
} from "@/lib/calculations/budget-goals";
import {
  computeFinancialCompleteness,
  type MissingArea,
} from "@/lib/calculations/completeness";
import {
  detectAnomalies,
  type Anomaly,
} from "@/lib/calculations/anomalies";
import { computeAdviceConfidence } from "@/lib/calculations/advice-confidence";
import { renderHealthSection } from "@/lib/ai/health-context";
import type { DrawerData } from "@/lib/calculations/health/types";
import type { FinanceData } from "@/lib/services/finance";
import type { UserMemoryEntry } from "@/types/database";

export interface FinanceContextOptions {
  /**
   * Memory entries with kind='goal'. Merged into the "Objectifs
   * actuels" section so the coach treats DB goals AND conversation-
   * extracted goals as a single source of truth. Without this, the
   * coach claimed "aucun objectif actif" even after the user had
   * stated an objective in chat (now persisted in
   * user_memory_entries) — see Phase 2.5 fix.
   */
  memoryGoals?: readonly UserMemoryEntry[];
  /**
   * Phase 3.2 — Financial Health Score snapshot. When provided, a
   * dedicated section is rendered between the existing analytics and
   * the per-axis breakdown. When omitted, the section is silently
   * skipped (backward compatible with callers that don't compute the
   * FHS, e.g. /plans action).
   *
   * The coach is instructed to cite EXACTLY the score that appears
   * here — which is the same one the dashboard ring shows. Single
   * source of truth across UI and conversation.
   */
  drawerData?: DrawerData | null;
}

/**
 * Renders the user's finance snapshot as a stable, deterministic markdown
 * block. Goes inside the `system` array right after the static system
 * prompt so the whole block can be cached together when its size crosses
 * the per-model minimum.
 */
export function buildFinanceContext(
  data: FinanceData,
  options: FinanceContextOptions = {},
): string {
  const currency = data.profile.currency || "CHF";
  const monthlyIncome =
    totalMonthly(data.incomes) || data.financialProfile?.monthly_income || 0;
  const monthlyExpenses =
    totalMonthly(data.expenses) || data.financialProfile?.monthly_expenses || 0;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const monthlyDebt = data.financialProfile?.monthly_debt ?? 0;
  const dti = monthlyIncome > 0 ? (monthlyDebt / monthlyIncome) * 100 : 0;

  const cashflow = calculateNetCashflow({ monthlyIncome, monthlyExpenses });
  const savingsRate = calculateSavingsRate({ monthlyIncome, monthlyExpenses });
  const runway = calculateRunway({ currentSavings, monthlyExpenses });
  const expenseRatio = calculateExpenseRatio({ monthlyIncome, monthlyExpenses });
  const stability = calculateStabilityScore({
    monthlyIncome,
    monthlyExpenses,
    currentSavings,
    hasEmergencyFund: data.financialProfile?.has_emergency_fund ?? false,
    debtToIncomeRatio: dti,
  });
  const stress = calculateFinancialStress({
    perceivedStress: data.financialProfile?.perceived_stress ?? 3,
    expenseRatio,
    runwayMonths: runway,
    cashflow,
  });
  // For the AI context we still want a short qualitative tier — we
  // keep a frozen FR mapping here because Anthropic reads the prompt;
  // user-facing dashboards translate the same `tier.color` via
  // `dashboard.stability.tiers.*`.
  const tier = getStabilityTier(stability);
  const tierLabel = {
    danger: "Tendu",
    warning: "Fragile",
    neutral: "En progression",
    success: "Stable",
    gold: "Solide",
  }[tier.color];

  const fmt = (n: number) => formatCurrency(n, currency);

  const expenseByCategory = aggregateMonthlyByCategory(data.expenses)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((row) => {
      const label =
        EXPENSE_CATEGORIES.find((c) => c.id === row.category)?.label ?? row.category;
      const pct = monthlyExpenses > 0 ? (row.total / monthlyExpenses) * 100 : 0;
      return `- ${label} : ${fmt(row.total)} (${pct.toFixed(0)}%)`;
    })
    .join("\n");

  const incomeByLabel = data.incomes
    .slice(0, 6)
    .map((i) => {
      const cat =
        INCOME_CATEGORIES.find((c) => c.id === i.category)?.label ?? i.category;
      return `- ${i.label} (${cat}, ${i.frequency}) : ${fmt(i.amount)}`;
    })
    .join("\n");

  // Phase 3.1.12 — inject the WHY behind expenses. Top 8 most recent
  // expenses with a non-empty note. Notes carry the story the coach
  // needs to be a real adviser ("cadeau anniversaire mère" vs just
  // "200 CHF Loisirs"). Truncated for prompt budget.
  const expenseNotes = [...data.expenses]
    .filter((e) => e.notes && e.notes.trim().length > 0)
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 8)
    .map((e) => {
      const cat =
        EXPENSE_CATEGORIES.find((c) => c.id === e.category)?.label ?? e.category;
      const note = e.notes!.trim().slice(0, 120);
      return `- ${e.label} (${cat}, ${fmt(e.amount)}) — ${note}`;
    })
    .join("\n");

  const goalsList = data.goals
    .slice(0, 6)
    .map((g) => {
      const typeLabel = GOAL_TYPES.find((t) => t.id === g.type)?.label ?? g.type;
      const progress = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
      return `- ${g.title} (${typeLabel}) : ${fmt(g.current_amount)} / ${fmt(g.target_amount)} — ${progress.toFixed(0)}%${
        g.is_completed ? " — terminé" : ""
      } [source: /goals]`;
    })
    .join("\n");

  // Merge memory-extracted goals into the same section. The coach now
  // sees ONE list of objectives whether they live in the goals table
  // (formal, with amounts and deadlines) or in user_memory_entries
  // (mentioned in conversation but not yet formalised). Both are
  // legitimate user objectives — distinguishing them was the
  // confusing prompt anti-pattern that triggered "aucun objectif
  // actif" responses despite the memory clearly containing goals.
  const memoryGoalsList = (options.memoryGoals ?? [])
    .map((g) => {
      const detail = g.detail ? ` — ${g.detail}` : "";
      return `- ${g.summary}${detail} [source: mémoire conversation, à formaliser dans /goals quand prêt]`;
    })
    .join("\n");

  const goalsSection =
    [goalsList, memoryGoalsList].filter(Boolean).join("\n") ||
    "Aucun objectif actif.";

  // Phase 3.1.2 — surface the user's per-category budgets and their
  // current status so the coach can answer "ai-je respecté mon
  // budget X ce mois ?". Categories without a budget configured are
  // not listed — keeps the prompt short and signals to the model that
  // "no budget set" is a legitimate state, not data missing.
  const budgetRows = buildBudgetStatus(
    data.expenses,
    data.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
  );
  const budgetsSection =
    budgetRows.length === 0
      ? "Aucun budget par catégorie défini."
      : budgetRows
          .map((b) => {
            const label =
              EXPENSE_CATEGORIES.find((c) => c.id === b.category)?.label ??
              b.category;
            const tag =
              b.status === "over"
                ? "DÉPASSÉ"
                : b.status === "warning"
                  ? "PROCHE LIMITE"
                  : "OK";
            const pct = Math.round(b.ratio * 100);
            const remain =
              b.remaining >= 0
                ? `${fmt(b.remaining)} restant`
                : `${fmt(-b.remaining)} de dépassement`;
            return `- ${label} : ${fmt(b.spent)} / ${fmt(b.limit)} (${pct}%) — ${tag}, ${remain}`;
          })
          .join("\n");

  // Phase 3.1.3 — top categories this month (by total), 3-month
  // rolling trend per category, opportunities engine, and discipline
  // score. Each block is small enough to keep the prompt cacheable
  // and answers the brief's bullets: "quelles sont mes trois plus
  // grosses dépenses ?", "quelle catégorie augmente le plus ?",
  // "que dois-je optimiser en priorité ?".
  const categoryIds = EXPENSE_CATEGORIES.map((c) => c.id);
  const monthBreakdown = buildCategoryBreakdown(
    data.expenses,
    "month",
    categoryIds,
  );
  const topCategoriesSection = monthBreakdown
    .filter((r) => r.total > 0)
    .slice(0, 3)
    .map((r, idx) => {
      const label =
        EXPENSE_CATEGORIES.find((c) => c.id === r.category)?.label ??
        r.category;
      return `${idx + 1}. ${label} : ${fmt(r.total)} (${Math.round(r.share * 100)}% du total${
        r.transactions > 0 ? `, ${r.transactions} tx ponctuelle(s)` : ""
      })`;
    })
    .join("\n");

  const history = buildCategoryHistory(data.expenses, 3, categoryIds);
  const trendsSection = history
    .filter((r) => r.total > 0 && r.trend !== "flat")
    .slice(0, 4)
    .map((r) => {
      const label =
        EXPENSE_CATEGORIES.find((c) => c.id === r.category)?.label ??
        r.category;
      const arrow = r.trend === "up" ? "↑" : "↓";
      const verb = r.trend === "up" ? "en hausse" : "en baisse";
      return `- ${label} ${arrow} ${verb} (moyenne ${fmt(r.average)}/mois sur 3 mois)`;
    })
    .join("\n");

  const opportunities = detectOpportunities({
    expenseBuckets: data.expenseBuckets,
    budgetStatus: budgetRows,
    categoryBreakdown: monthBreakdown,
    monthlyIncome,
    runwayMonths: runway,
    // Phase 3.1.4 — the engine can now flag low_savings_rate; we
    // pass the canonical decimal computed above.
    savingsRate,
  });
  const opportunitiesSection = opportunities.length === 0
    ? "Aucune opportunité d'optimisation prioritaire détectée."
    : opportunities
        .map((o) => renderOpportunity(o, fmt))
        .join("\n");

  // Phase 3.1.4 — budget goals: per-budget progress, achievement
  // score, and aggregate potential savings. All three derive from
  // primitives the dashboard / analytics reuse, so the coach NEVER
  // contradicts what the user sees on those surfaces.
  const budgetProgress = computeBudgetProgress(
    data.categoryBudgets.map((b) => ({
      category: b.category,
      monthly_limit: b.monthly_limit,
    })),
    data.expenses,
  );
  const achievement = computeGoalAchievementScore(budgetProgress);
  // Phase 3.1.5 + 3.1.6 — completeness computed BEFORE savings so
  // the savingsSection can gate on canEstimateSavings.
  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  const savings = computePotentialSavings(opportunities);
  const budgetProgressSection =
    budgetProgress.length === 0
      ? "Aucun objectif budgétaire défini par l'utilisateur."
      : budgetProgress
          .map((p) => {
            const label = categoryLabel(p.category);
            const tag =
              p.status === "OVER_LIMIT"
                ? "DÉPASSÉ"
                : p.status === "WARNING"
                  ? "ATTENTION"
                  : "OK";
            const pct = Math.round(p.percentage * 100);
            const detail =
              p.overrun > 0
                ? `dépassement ${fmt(p.overrun)}`
                : `restant ${fmt(p.remaining)}`;
            return `- ${label} : ${fmt(p.currentSpent)} / ${fmt(p.targetAmount)} (${pct}%) — ${tag}, ${detail}`;
          })
          .join("\n");

  const achievementSection =
    achievement.total === 0
      ? "Score budgétaire non applicable (aucun budget défini)."
      : `Objectifs respectés : ${achievement.respected} / ${achievement.total} — Score ${Math.round(achievement.score * 100)}%`;

  const savingsSection = !completeness.canEstimateSavings
    ? "MASQUÉ — la complétude détaillée est en dessous du seuil de fiabilité (70%). Aucune projection d'économie ne peut être faite tant que le profil n'est pas plus rempli. Ne JAMAIS citer un montant ici, propose plutôt à l'utilisateur de compléter ses données via la carte « Complétude financière » du dashboard."
    : savings.monthly <= 0
      ? "Aucune économie chiffrable détectée. (Certaines opportunités sont qualitatives — voir Opportunités d'optimisation.)"
      : `Total cumulé sur l'ensemble des opportunités : ${fmt(savings.monthly)} / mois (${fmt(savings.yearly)} / an).\nDont haute priorité : ${fmt(savings.byPriority.high.monthly)} / mois (${fmt(savings.byPriority.high.yearly)} / an).\nDont priorité moyenne : ${fmt(savings.byPriority.medium.monthly)} / mois.\nDont priorité basse : ${fmt(savings.byPriority.low.monthly)} / mois.`;

  const discipline = computeDisciplineScore({
    budgetStatus: budgetRows,
    savingsRate,
    runwayMonths: runway,
    monthlyTransactions: data.expenseBuckets.transactions,
  });

  // Phase 3.1.10 — coach confidence gate. Determines the assertive
  // tone the coach is allowed to use. See the rule block below for
  // the language conventions per tier.
  const adviceConfidence = computeAdviceConfidence({
    completeness,
    hasBudgets: data.categoryBudgets.length > 0,
    hasGoals: data.goals.length > 0,
    memoryEntriesCount: 0, // memory entries are loaded by the chat
    // route — we don't double-fetch here; the coach reads the same
    // signals from the "Mémoire personnelle" + budget sections so
    // this client-side fallback skews towards LOW which is the
    // safer default.
    hasPersonalityNotes: false,
  });
  const adviceConfidenceLabel =
    adviceConfidence.level === "HIGH"
      ? "ÉLEVÉE — tu peux parler avec assurance, citer des chiffres et proposer des actions concrètes."
      : adviceConfidence.level === "MEDIUM"
        ? "MOYENNE — tu peux suggérer des pistes mais avec un ton conditionnel (\"je peux te proposer\", \"une piste serait\").  Annonce clairement la donnée qui manque pour aller plus loin."
        : "FAIBLE — tu manques encore d'informations clés. Tu dois calmer toute affirmation, poser des questions, et inviter à compléter le profil avant de chiffrer quoi que ce soit.";

  const completenessSection =
    completeness.missing.length === 0
      ? "Profil financier complet (100% sur tous les axes)."
      : [
          `Structurelle : ${completeness.structurelle}/100 (revenus, logement, assurances, alimentation, transport).`,
          `Détaillée    : ${completeness.detaillee}/100 (+ télécoms, abonnements, loisirs).`,
          `Optimale     : ${completeness.optimale}/100 (+ objectif défini, budgets par catégorie).`,
          "",
          "Catégories absentes :",
          ...completeness.missing.map(
            (m) => `- ${areaLabel(m.area)} (sévérité ${severityLabel(m.severity)})`,
          ),
        ].join("\n");
  const reliabilitySection = [
    `Confiance globale (structurelle) : ${reliabilityLabel(completeness.reliability)}.`,
    completeness.canEstimateSavings
      ? "Projections d'économies : AUTORISÉES (détaillée ≥ 70%)."
      : "Projections d'économies : MASQUÉES (détaillée < 70% — la donnée n'est pas assez profonde pour publier un chiffre crédible).",
  ].join("\n");

  // Phase 3.1.6 — anomaly detector. Pure signals; the coach is
  // INSTRUCTED to ask the user to confirm a flagged number before
  // drawing any conclusion from it. Never a judgement.
  const anomalies = detectAnomalies({
    expenses: data.expenses,
    expenseBuckets: data.expenseBuckets,
    monthlyIncome,
    currentSavings,
    runwayMonths: runway,
  });
  const anomaliesSection =
    anomalies.length === 0
      ? "Aucune anomalie de saisie détectée."
      : anomalies.map((a) => renderAnomaly(a, fmt)).join("\n");

  // Phase 3.2 — Financial Health Score block. Only rendered when the
  // caller passes a drawerData ; same numbers the dashboard ring
  // shows so the coach never speaks a different score than the UI.
  const healthSection = options.drawerData
    ? "\n\n" + renderHealthSection(options.drawerData)
    : "";

  return `# Contexte financier de l'utilisateur

Devise : ${currency}
Mode : ${data.isDemo ? "démo (données fictives)" : "réel"}

## Indicateurs clés
- Revenus mensuels : ${fmt(monthlyIncome)}
- Dépenses fixes (récurrent normalisé mensuel) : ${fmt(data.expenseBuckets.fixed)}
- Dépenses variables (transactions ponctuelles ce mois) : ${fmt(data.expenseBuckets.variable)}
- Dépenses totales ce mois : ${fmt(data.expenseBuckets.total)}
- Transactions ponctuelles ce mois : ${data.expenseBuckets.transactions}
- Reste à vivre (sur la base des dépenses récurrentes) : ${fmt(cashflow)}
- Taux d'épargne : ${formatPercent(savingsRate)}
- Ratio dépenses / revenus : ${formatPercent(expenseRatio)}
- Épargne disponible : ${fmt(currentSavings)}
- Fonds d'urgence : ${Number.isFinite(runway) ? `${runway.toFixed(1)} mois de dépenses` : "couvert au-delà de 12 mois"}
- Remboursement crédit mensuel : ${fmt(monthlyDebt)} (DTI ${formatPercent(dti)})
- Score de stabilité : ${stability}/100 — ${tierLabel}
- Stress financier perçu : ${stress}/100${healthSection}

## Top dépenses mensuelles
${expenseByCategory || "Aucune dépense enregistrée."}

## Revenus déclarés
${incomeByLabel || "Aucun revenu enregistré."}

## Notes récentes sur les dépenses (contexte que l'utilisateur a écrit)
${expenseNotes || "Aucune note ajoutée sur les dépenses récentes."}

## Objectifs actuels
${goalsSection}

## Budgets par catégorie (ce mois)
${budgetsSection}

## Top catégories de dépense (ce mois)
${topCategoriesSection || "Aucune dépense enregistrée ce mois."}

## Tendances 3 mois (catégories en mouvement)
${trendsSection || "Aucune variation marquée détectée."}

## Opportunités d'optimisation détectées
${opportunitiesSection}

## Objectifs budgétaires (ce mois)
${budgetProgressSection}

## Score budgétaire (objectifs respectés)
${achievementSection}

## Économies potentielles (issues des opportunités ci-dessus)
${savingsSection}

## Discipline budgétaire
Score : ${discipline.score}/100 — ${disciplineTierLabel(discipline.tier)}
Détail : budgets ${discipline.breakdown.budget}/35 · épargne ${discipline.breakdown.savings}/30 · urgence ${discipline.breakdown.emergency}/25 · suivi ${discipline.breakdown.tracking}/10

## Complétude financière (V2)
${completenessSection}

## Fiabilité des analyses
${reliabilitySection}

## Anomalies de saisie potentielles
${anomaliesSection}

## Confiance du conseil
Niveau : ${adviceConfidenceLabel}
Si le niveau est FAIBLE, ta toute première phrase invite l'utilisateur à compléter son profil avant d'avancer un chiffre. Si MOYEN, utilise des formulations conditionnelles. Si ÉLEVÉ, tu peux être affirmatif.

## Règles importantes
- Si tu cites un montant, prends-le dans la liste ci-dessus. N'invente pas.
- Si une donnée manque, demande-la avant d'extrapoler.
- Garde un ton calme et concret.
- "Objectifs actuels" est la source de vérité COMPLÈTE des objectifs : tu y trouves les objectifs formalisés dans /goals ET ceux mentionnés en conversation (étiquetés "source: mémoire conversation"). Ne dis JAMAIS "aucun objectif actif" si cette section liste au moins un élément. Quand un objectif vient de la mémoire sans être encore dans /goals, propose à l'utilisateur de le formaliser (montant cible, échéance) sans le lui imposer.
- Dépenses : utilise toujours "Dépenses totales ce mois" pour comparer au revenu et juger du reste à vivre RÉEL. "Dépenses fixes" couvre seulement le récurrent (loyer, abonnements, assurances…) ; "Dépenses variables" couvre les transactions ponctuelles du mois en cours (courses, restaurants, achats imprévus). NE confonds JAMAIS les deux et NE prétends JAMAIS que les "dépenses mensuelles" sont uniquement les fixes — le total est ce qui compte pour l'utilisateur.
- "Opportunités d'optimisation détectées" et "Top catégories" sont calculées automatiquement à partir des données réelles. Tu peux les citer telles quelles ("ton budget restau est dépassé de 60 CHF ce mois", "tes trois plus grosses catégories sont logement, alimentation, transport") sans inventer de chiffres. Si l'utilisateur demande "où puis-je économiser ?", commence par la première opportunité haute priorité de la liste. Si l'utilisateur demande "quelle catégorie augmente le plus ?", cite la section "Tendances 3 mois". Reste prudent sur les conseils réglementés : suggère "il peut être utile de comparer les primes / d'auditer les abonnements", JAMAIS "tu dois changer d'assureur pour X".
- "Discipline budgétaire" résume ta vision de la santé budgétaire courante. Tu peux la mentionner ("ton score de discipline est à 82/100 — très bon contrôle") pour rassurer ou pointer le composant le plus faible, sans en faire un objet de stress.
- "Objectifs budgétaires" est la liste complète des limites mensuelles que l'utilisateur s'est fixées par catégorie, avec leur statut OK / ATTENTION / DÉPASSÉ. Pour répondre à "quels objectifs ai-je dépassés ?", liste les statuts DÉPASSÉ en citant le couple dépensé / cible. Pour "quels budgets sont respectés ?", cite les OK. Ne réinvente jamais ces chiffres : ils viennent directement de la table category_budgets.
- "Score budgétaire" exprime la proportion d'objectifs SUCCESS sur le total défini. Un score 4/5 = 80 % signifie que 4 budgets sur 5 sont sous 80 % de leur cible. Tu peux dire "tu respectes 4 budgets sur 5 ce mois — bien joué" sans paraphraser inutilement.
- "Économies potentielles" agrège l'impact mensuel et annuel des opportunités ci-dessus. Pour "combien puis-je économiser sur une année ?", cite la ligne "Total cumulé sur l'ensemble des opportunités" en montrant l'annuel (la projection 12 × mensuel parle plus). Précise toujours qu'il s'agit d'une ESTIMATION basée sur les heuristiques (10-20 % de réduction sur les leviers identifiés), pas d'une garantie : "tu pourrais viser environ X par an si tu agis sur les leviers haute priorité — c'est un ordre de grandeur, pas une promesse".
- "Complétude financière (V2)" et "Fiabilité des analyses" sont CRUCIAUX. Tu lis trois scores :
   * Structurelle (revenus + logement + assurances + alimentation + transport) — c'est CE score qui décide si tu peux te montrer affirmatif sur des chiffres. Confiance globale : HAUTE ≥ 90, MOYENNE 70-89, BASSE < 70.
   * Détaillée — gate les projections d'économies. Si "Projections d'économies : MASQUÉES", tu ne donnes AUCUN chiffre d'économies (ni en mensuel ni en annuel). Tu réponds : "L'estimation n'est pas disponible pour l'instant : complète d'abord tes données (assurances, télécoms, abonnements…) pour obtenir une projection fiable. Sinon le chiffre serait probablement inexact."
   * Optimale — bonus.
   Quand la confiance est BASSE, ta toute première phrase invite l'utilisateur à compléter son profil (carte Complétude financière sur le dashboard) avant tout chiffre.

- INTERDICTION ABSOLUE : tu ne dis JAMAIS "il manque X CHF", "tu perds X CHF" ou "X CHF qui disparaissent". Ces formulations sont FAUSSES : la différence revenus − dépenses peut être épargnée, investie, en cash, ou simplement non encore catégorisée. Reformule en : "Une partie importante de tes flux financiers n'est pas encore catégorisée — peux-tu vérifier où va cette différence ? Épargne, investissement, dépenses non saisies ?". Cette règle est non-négociable.

- Section "Anomalies de saisie potentielles" : ce sont des SIGNAUX, jamais des accusations. Ton script : "Un point à vérifier : [anomalie]. Est-ce le bon montant / la bonne catégorie / la bonne fréquence ?". Tu ne tires AUCUNE conclusion d'un chiffre flaggé tant que l'utilisateur n'a pas confirmé. Si l'utilisateur confirme, tu peux ensuite t'en servir comme contexte normal.

- COACH ORIENTÉ SOLUTION : pour toute analyse, propose ENSUITE :
   1. La meilleure prochaine action en 1 phrase ("Ta meilleure action maintenant : …").
   2. Si pertinent, un plan en 3 étapes courtes.
   3. L'impact potentiel chiffré SEULEMENT si "Projections d'économies : AUTORISÉES".
   4. Le niveau de priorité (haute / moyenne / basse).
   5. Ce qu'il faut compléter dans le profil pour aller plus loin.
   Toujours rester un coach pédagogique : pas de conseil financier réglementé, pas de promesse de rendement, pas de recommandation d'un produit ou fournisseur précis. Quand l'utilisateur évoque investissement, idée business, achat immobilier, optimisation d'assurance : donne le CADRE général (questions à se poser, hiérarchie classique fonds d'urgence → dette coûteuse → épargne longue), JAMAIS un choix spécifique.

- STRUCTURE D'UNE RÉPONSE TYPE (Phase 3.1.10) : pour toute analyse non triviale, structure ta réponse en 4 temps clairement nommés :
   1. Constat : ce que tu observes dans les données, factuel, court.
   2. Pourquoi : explication brève du mécanisme ou de la cause probable, en termes compréhensibles.
   3. Action recommandée : la prochaine étape, formulée à l'impératif doux ("compare", "programme", "bloque"), sans jargon.
   4. Impact attendu : chiffré quand la fiabilité le permet, qualitatif sinon ("libère de la marge mensuelle", "améliore ta sérénité"). Ce schéma s'applique aux réponses d'optimisation, pas aux salutations ou Q&A factuelles.

- MÉMOIRE PERSONNELLE — bloc "# Mémoire utilisateur" : ce bloc contient le prénom, la situation déclarée, l'objectif principal, le profil comportemental, le style de coaching attendu (ex : "calme", "direct", "structuré", "gentle"), les difficultés récurrentes, les déclencheurs de dépense, le style de motivation préféré, la personnalité financière, les notes personnelles et éventuellement le dernier résumé du coach. Tu DOIS adapter ton ton et tes conseils à ces signaux :
   * Style "calme" → phrases longues et posées, tu ne brusque pas, tu utilises beaucoup de "tranquillement", "à ton rythme".
   * Style "direct" → phrases courtes, recommandations claires sans préambule.
   * Style "structuré" → numérotation, listes nettes, plan en étapes.
   * Style "gentle" → forte empathie, rappels des progrès, jamais culpabilisant.
   * Difficultés récurrentes et déclencheurs → cite-les naturellement dans tes recommandations quand c'est pertinent ("je sais que les sorties imprévues sont souvent un déclencheur pour toi") mais SANS condescendance.
   * Notes personnelles → c'est ce que l'utilisateur t'a dit. Réfère-y au moins une fois quand la conversation rappelle un sujet qu'il a mentionné.

- ANTI-RÉPÉTITION : tu vois l'historique de la conversation (messages ci-dessus). Si tu as DÉJÀ proposé une action concrète ("compare tes assurances", "ajoute tes télécoms") dans tes 5 derniers tours et que l'utilisateur n'a pas encore agi, ne la répète PAS textuellement. Passe à l'opportunité suivante OU reformule en angle nouveau ("je sais qu'on a déjà parlé d'assurances ; aujourd'hui je remarque autre chose : …"). Ne fais une exception que si l'utilisateur reformule directement la même question ("et les assurances, comment je fais ?").

- CONFIANCE — la section "Confiance du conseil" t'indique à quel point tu peux être affirmatif. ÉLEVÉE = chiffres et impératifs. MOYENNE = formulations conditionnelles ("je peux te suggérer", "une piste serait"). FAIBLE = questions et invitations à compléter le profil, jamais d'affirmations chiffrées. Cette règle prévaut sur toutes les autres : même si une opportunité est listée avec un impact, tu n'avances pas son chiffre quand la confiance est FAIBLE.`;
}

/**
 * Render one opportunity as a single line for the coach prompt. The
 * Anthropic call ALWAYS receives French copy regardless of the user's
 * locale (the system prompt's language directive handles output
 * locale); only the user-visible UI is translated. We embed the
 * priority tag so the coach can grade its tone.
 */
function renderOpportunity(
  o: Opportunity,
  fmt: (n: number) => string,
): string {
  const tag = o.priority === "high"
    ? "HAUTE"
    : o.priority === "medium"
      ? "MOYENNE"
      : "BASSE";
  const impact =
    o.monthlyImpact > 0
      ? ` (impact mensuel estimé : ${fmt(o.monthlyImpact)}, soit ${fmt(o.yearlyImpact)} sur l'année)`
      : "";
  switch (o.kind) {
    case "budget_over": {
      const label = categoryLabel(o.payload.category as string);
      return `- [${tag}] Budget ${label} dépassé de ${fmt(o.payload.amount as number)} ce mois (limite ${fmt(o.payload.limit as number)})${impact}`;
    }
    case "high_variable_share":
      return `- [${tag}] Dépenses variables élevées : ${o.payload.share}% du revenu ce mois${impact}`;
    case "low_emergency_fund":
      return `- [${tag}] Fonds d'urgence insuffisant : ${o.payload.months} mois de couverture (cible 3 mois)`;
    case "high_fixed_ratio":
      return `- [${tag}] Charges fixes très élevées : ${o.payload.share}% du revenu — bonne opportunité d'audit (assurances, abonnements, télécoms)`;
    case "high_insurance_share":
      return `- [${tag}] Assurances à ${o.payload.share}% du revenu (${fmt(o.payload.amount as number)}/mois) — il peut être utile de comparer les primes et vérifier la franchise${impact}`;
    case "high_subscriptions_share":
      return `- [${tag}] Abonnements à ${o.payload.share}% du revenu (${fmt(o.payload.amount as number)}/mois) — bon moment pour faire le tri${impact}`;
    case "audit_top_variable_category": {
      const label = categoryLabel(o.payload.category as string);
      return `- [${tag}] ${label} concentre une grosse part de tes dépenses ponctuelles (${fmt(o.payload.amount as number)} ce mois, ${o.payload.transactions} tx)${impact}`;
    }
    case "dominant_category": {
      const label = categoryLabel(o.payload.category as string);
      return `- [${tag}] ${label} représente ${o.payload.share}% de tes dépenses totales (${fmt(o.payload.amount as number)}/mois) — c'est le poste structurel à surveiller${impact}`;
    }
    case "low_savings_rate":
      return `- [${tag}] Taux d'épargne faible : ${o.payload.rate}% (cible de démarrage ${o.payload.target}%). Programmer un virement automatique mensuel est souvent suffisant pour amorcer${impact}`;
    default: {
      const _exhaust: never = o.kind;
      return `- [${tag}] ${_exhaust as string}`;
    }
  }
}

function categoryLabel(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

function disciplineTierLabel(
  tier: "low" | "fair" | "good" | "excellent",
): string {
  switch (tier) {
    case "excellent":
      return "Excellente discipline";
    case "good":
      return "Bonne discipline";
    case "fair":
      return "Discipline correcte, axes d'amélioration clairs";
    case "low":
      return "Discipline fragile — premier levier à activer";
  }
}

function areaLabel(area: MissingArea["area"]): string {
  switch (area) {
    case "income":
      return "Revenus";
    case "housing":
      return "Logement";
    case "food":
      return "Alimentation";
    case "insurance":
      return "Assurances";
    case "transport":
      return "Transport";
    case "telecom":
      return "Télécommunications (factures & énergie)";
    case "subscriptions":
      return "Abonnements";
    case "leisure":
      return "Loisirs";
    case "goal":
      return "Objectifs définis";
    case "category_budget":
      return "Budgets par catégorie";
  }
}

function severityLabel(s: "low" | "medium" | "high"): string {
  return s === "high" ? "haute" : s === "medium" ? "moyenne" : "basse";
}

function reliabilityLabel(r: "low" | "medium" | "high"): string {
  return r === "high"
    ? "ÉLEVÉE — tu peux te baser sur ces chiffres avec confiance"
    : r === "medium"
      ? "MOYENNE — certaines catégories majeures manquent, calme les projections"
      : "FAIBLE — données très incomplètes, n'avance aucun chiffre agressif d'économies sans inviter à compléter le profil";
}

function renderAnomaly(a: Anomaly, fmt: (n: number) => string): string {
  const tag = a.severity === "warning" ? "À VÉRIFIER" : "SIGNAL";
  switch (a.kind) {
    case "housing_over_50pct_income":
      return `- [${tag}] Logement à ${a.payload.ratio}% du revenu (${fmt(a.payload.amount as number)}/mois). Vérifie le montant ou l'estimation du revenu avant toute conclusion.`;
    case "single_category_over_80pct":
      return `- [${tag}] Une seule catégorie (${categoryLabel(a.payload.category as string)}) pèse ${a.payload.share}% du total. Probablement signe que d'autres catégories sont absentes.`;
    case "unusual_high_one_time":
      return `- [${tag}] Transaction ponctuelle inhabituellement élevée : "${a.payload.label}" à ${fmt(a.payload.amount as number)} (médiane des autres : ${fmt(a.payload.median as number)}).`;
    case "fixed_expense_outlier":
      return `- [${tag}] Charge fixe "${a.payload.label}" à ${fmt(a.payload.monthly as number)}/mois (${a.payload.ratio}% du revenu) — vérifie la fréquence saisie (mensuel/hebdo/annuel).`;
    case "high_income_low_emergency":
      return `- [${tag}] Revenu élevé (${fmt(a.payload.income as number)}/mois) mais seulement ${a.payload.months} mois de couverture d'urgence — la question "où va le surplus ?" mérite d'être posée à l'utilisateur (épargne ? investissement ? non catégorisé ?).`;
    default: {
      const _exhaust: never = a.kind;
      return `- [${tag}] ${_exhaust as string}`;
    }
  }
}
