import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic } from "@/lib/ai/client";
import { planSchema, type PlanInput } from "@/lib/ai/plan-schema";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts";

/**
 * Generates a structured financial plan via Anthropic tool-use.
 *
 * We declare a single custom tool, `submit_plan`, with `tool_choice`
 * forcing Claude to call it exactly once. The tool's input_schema is
 * the JSON-schema mirror of `planSchema`. We don't execute the tool —
 * the call IS the payload. After receiving the `tool_use` block we
 * validate via Zod (defense against the model returning a slightly
 * off-schema payload) and return the parsed plan.
 */
const PLAN_TOOL_NAME = "submit_plan";

// JSON Schema mirror of planSchema. Hand-written so Claude sees clear,
// minimal types — auto-converting Zod → JSON Schema would add noise
// (refinements, defaults) that the model doesn't need. Typed loosely so
// Anthropic SDK's strict InputSchema typing (mutable arrays) accepts it.
const planToolSchema: Anthropic.Tool.InputSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Titre court du plan (max 80 caractères). Exemple : « Stabilité financière sur 90 jours ».",
    },
    summary: {
      type: "string",
      description:
        "Résumé en 2-4 phrases (max 800 caractères) qui explique la philosophie du plan et la priorité numéro 1 pour cette personne. Cite les chiffres réels du contexte (revenus, fonds d'urgence actuel, etc.).",
    },
    steps: {
      type: "array",
      minItems: 3,
      maxItems: 40,
      items: {
        type: "object",
        properties: {
          week_number: {
            type: "integer",
            minimum: 1,
            maximum: 13,
            description: "Numéro de la semaine du plan (1 = première semaine).",
          },
          focus: {
            type: "string",
            description:
              "Le grand thème de cette semaine (ex. : « Consolider le fonds d'urgence », « Réduire les abonnements »).",
          },
          title: {
            type: "string",
            description:
              "L'action concrète. Commence par un verbe à l'infinitif ou à l'impératif. Précise un montant (dans la devise du contexte utilisateur, CHF par défaut) ou un délai quand c'est possible. Ex. : « Bloque un virement automatique de 50 CHF chaque vendredi vers ton fonds d'urgence ».",
          },
          description: {
            type: "string",
            description:
              "Explication courte (1-3 phrases) du POURQUOI de cette action et du COMMENT la rendre facile. Ne dépasse pas 600 caractères.",
          },
          category: {
            type: "string",
            enum: [
              "reduce_expense",
              "build_emergency",
              "debt_payoff",
              "automate_saving",
              "habit",
              "income_boost",
              "review",
              "other",
            ],
            description: "Type d'action — utilisé pour les filtres et icônes côté UI.",
          },
          expected_impact_eur: {
            type: ["number", "null"],
            minimum: 0,
            description:
              "Impact attendu sur le reste à vivre, en euros par mois. Null si non chiffrable.",
          },
        },
        required: ["week_number", "focus", "title", "category"],
      },
    },
  },
  required: ["title", "summary", "steps"],
};

const PLAN_SYSTEM_PROMPT = `${COACH_SYSTEM_PROMPT}

# Mission spécifique : générer un plan financier structuré

Tu vas appeler EXACTEMENT UNE FOIS l'outil \`submit_plan\` avec un plan personnalisé pour cette personne, basé sur son contexte financier fourni ci-dessous.

# Règles strictes du plan

- **3 à 40 étapes au total**, réparties sur les semaines indiquées par l'utilisateur (30 jours = semaines 1-4, 60 jours = semaines 1-9, 90 jours = semaines 1-13).
- Étale les étapes logiquement : commence par les actions à faible effort / haut impact (audit des abonnements, automatisation d'une petite épargne), construis vers les actions plus structurelles (fonds d'urgence, remboursement de dette, augmentation de revenus).
- Au moins UNE action par semaine couverte. Pas de semaine vide.
- Chaque action doit citer un MONTANT ou DÉLAI concret quand possible, basé sur les chiffres du contexte (jamais inventer).
- Les revenus potentiels supplémentaires (\`income_boost\`) doivent rester réalistes (jamais "doubler tes revenus", jamais crypto/trading/levier/affiliation MLM/dropshipping miraculeux). Privilégie : freelance dans le métier de la personne, missions ponctuelles, valorisation de matériel non-utilisé, négociation salariale.
- Aucune promesse de richesse. Aucun conseil d'investissement réglementé (allocations spécifiques, achat de titres, ETF spécifiques). Pour la partie "que faire de l'épargne", reste sur les grands principes (livret A → assurance-vie → diversification de long terme), JAMAIS de produit nommé.
- Le \`summary\` rappelle calmement la philosophie : reprendre le contrôle, étape par étape, sans culpabilisation.
- Pas d'emojis dans les contenus du plan.

# Garde-fous obligatoires

Si la situation est tendue (cashflow négatif persistant, stress élevé, dette lourde), priorise :
1. Stabiliser le cashflow (réduire au moins 1 dépense réductible significative).
2. Construire un mini fonds d'urgence (1 mois de dépenses) avant tout investissement.
3. Renégocier les dettes coûteuses si applicable.
4. Demander de l'aide professionnelle pour les situations vraiment difficiles (mention d'un conseiller social, CCAS, médiateur de la consommation si pertinent).

N'appelle PAS l'outil avec des actions qui contredisent ces règles.`;

export type GeneratePlanArgs = {
  horizonDays: 30 | 60 | 90;
  financeContext: string;
  model: string;
  maxTokens?: number;
};

export async function generatePlan({
  horizonDays,
  financeContext,
  model,
  maxTokens = 4096,
}: GeneratePlanArgs): Promise<{
  plan: PlanInput;
  tokensIn: number;
  tokensOut: number;
}> {
  const client = getAnthropic();

  const horizonWeeks = horizonDays === 30 ? 4 : horizonDays === 60 ? 9 : 13;
  const userInstruction = `Génère un plan financier sur **${horizonDays} jours** (semaines 1 à ${horizonWeeks}) personnalisé pour cette personne. Appuie-toi sur le contexte ci-dessous pour chiffrer chaque action.

${financeContext}

Appelle maintenant l'outil \`${PLAN_TOOL_NAME}\` avec le plan complet.`;

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    system: PLAN_SYSTEM_PROMPT,
    tools: [
      {
        name: PLAN_TOOL_NAME,
        description:
          "Soumet le plan financier structuré généré pour la personne. Doit être appelé exactement une fois.",
        input_schema: planToolSchema,
      },
    ],
    tool_choice: { type: "tool", name: PLAN_TOOL_NAME },
    messages: [{ role: "user", content: userInstruction }],
  });

  const toolUse = response.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> =>
      block.type === "tool_use" && block.name === PLAN_TOOL_NAME,
  );
  if (!toolUse) {
    throw new Error("Le modèle n'a pas généré de plan structuré.");
  }

  const parsed = planSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(
      `Plan invalide reçu du modèle : ${parsed.error.issues[0]?.message ?? "schema mismatch"}`,
    );
  }

  // Clip steps to the horizon. Some models propose week_number beyond the
  // requested horizon despite the prompt — silently drop those.
  const safeSteps = parsed.data.steps.filter(
    (s) => s.week_number <= horizonWeeks,
  );
  if (safeSteps.length < 3) {
    throw new Error("Plan trop court après filtrage de l'horizon.");
  }

  return {
    plan: { ...parsed.data, steps: safeSteps },
    tokensIn: response.usage.input_tokens ?? 0,
    tokensOut: response.usage.output_tokens ?? 0,
  };
}
