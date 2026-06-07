import "server-only";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildFirstCoachMessage,
  WELCOME_MESSAGE_MODEL_TAG,
} from "@/lib/coach/first-message";
import { buildFirstMission } from "@/lib/calculations/first-mission";
import { getFinanceData } from "@/lib/services/finance";
import { computeFinancialCompleteness } from "@/lib/calculations/completeness";
import { calculateRunway } from "@/lib/calculations/finance";
import {
  gatherExtraSignals,
  getOrSealDrawerData,
} from "@/lib/services/health-writer";

/**
 * Phase 4.0 J5 — injection idempotente du premier message coach.
 *
 * Appelée juste après la création d'une nouvelle conversation. Si
 * l'utilisateur n'a JAMAIS reçu de message de bienvenue (détection
 * via `model = WELCOME_MESSAGE_MODEL_TAG` sur ai_messages), on
 * compose un message déterministe à partir de la mission du moment
 * (même moteur que la FirstSessionMissionCard du dashboard) et on
 * l'insère comme premier message assistant de la conversation.
 *
 * Garanties :
 *   - 0 appel LLM
 *   - 0 hallucination : tout vient de templates i18n + payload
 *   - Idempotent : un seul message de bienvenue par utilisateur, jamais
 *     dupliqué même si on relance le flow.
 *   - Best-effort : un échec ici ne doit JAMAIS empêcher la création
 *     de la conversation (catch côté caller).
 */

const MAJOR_AREAS = ["income", "housing", "insurance", "food", "transport"] as const;

interface InjectInput {
  userId: string;
  conversationId: string;
}

interface InjectResult {
  inserted: boolean;
}

export async function maybeInjectFirstCoachMessage(
  input: InjectInput,
): Promise<InjectResult> {
  const supabase = await createClient();

  // 1. Idempotence : un seul message de bienvenue par user, jamais
  //    dupliqué. La colonne `model` sert de discriminant stable.
  const { data: existing, error: existingErr } = await supabase
    .from("ai_messages")
    .select("id")
    .eq("user_id", input.userId)
    .eq("model", WELCOME_MESSAGE_MODEL_TAG)
    .limit(1)
    .maybeSingle();
  if (existingErr) {
    console.error("[first-coach-message] idempotence check failed", existingErr);
    return { inserted: false };
  }
  if (existing) return { inserted: false };

  // 2. Calcule la mission du moment à partir des primitives finance
  //    + completeness + recommandation FHS (mêmes calculs que le
  //    dashboard, sans recalcul de formule).
  const data = await getFinanceData();

  const fixedExpenses =
    data.expenseBuckets.fixed || data.financialProfile?.monthly_expenses || 0;
  const variableExpenses = data.expenseBuckets.variable;
  const totalExpenses = fixedExpenses + variableExpenses;
  const currentSavings = data.financialProfile?.current_savings ?? 0;
  const runway = calculateRunway({
    currentSavings,
    monthlyExpenses: totalExpenses,
  });

  const completeness = computeFinancialCompleteness({
    incomes: data.incomes,
    expenses: data.expenses,
    goals: data.goals,
    categoryBudgets: data.categoryBudgets,
  });
  const filledMajorSet = new Set<string>(completeness.detected);
  const filledMajorAreasCount = MAJOR_AREAS.filter((a) =>
    filledMajorSet.has(a),
  ).length;
  const firstMissingMajor =
    MAJOR_AREAS.find((a) => !filledMajorSet.has(a)) ?? null;
  const activeGoalsCount = data.goals.filter((g) => !g.is_completed).length;

  // Recommandation FHS : best-effort. En mode dégradé on continue
  // sans recommandation (la priorité tombera sur 'none' au pire).
  let recommendation = null;
  try {
    const extras = await gatherExtraSignals({
      userId: input.userId,
      financeData: data,
      accountCreatedAt: null,
    });
    const drawerData = await getOrSealDrawerData({
      userId: input.userId,
      financeData: data,
      extras,
    });
    recommendation = drawerData?.recommendation ?? null;
  } catch (err) {
    console.error("[first-coach-message] FHS recommendation skipped", err);
  }

  const mission = buildFirstMission({
    goalsCount: activeGoalsCount,
    runwayMonths: Number.isFinite(runway) ? runway : 999,
    hasCurrentSavings: currentSavings > 0,
    filledMajorAreasCount,
    missingMajorArea: firstMissingMajor,
    recommendation,
  });

  // 3. Rendu i18n. Les 4 chunks sont rendus côté serveur via
  //    next-intl ; le helper pur fait la concaténation.
  const t = await getTranslations("app.coach.firstMessage");
  const firstName = data.profile.full_name?.split(" ")[0]?.trim() || "toi";

  const greeting = t("greeting", { firstName });
  const reflection = t("reflection");
  const priorityLine = t(`priorityLine.${mission.priority}`);
  const invitation = t("invitation");

  const content = buildFirstCoachMessage({
    greeting,
    reflection,
    priorityLine,
    invitation,
  });

  // 4. Insertion. On utilise WELCOME_MESSAGE_MODEL_TAG comme tag pour
  //    rendre l'opération idempotente à vie pour ce user.
  const { error: insertErr } = await supabase.from("ai_messages").insert({
    conversation_id: input.conversationId,
    user_id: input.userId,
    role: "assistant",
    content,
    model: WELCOME_MESSAGE_MODEL_TAG,
  });
  if (insertErr) {
    console.error("[first-coach-message] insert failed", insertErr);
    return { inserted: false };
  }

  return { inserted: true };
}
