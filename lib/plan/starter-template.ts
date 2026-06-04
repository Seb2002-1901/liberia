/**
 * Starter 90-day plan — deterministic, curated by `situation` tier.
 *
 * Surfaced on /plan when the user has no AI-generated plan yet (because
 * ANTHROPIC_API_KEY isn't configured, or they haven't generated one).
 * Gives the sensation that LIBERIA is already accompanying them, without
 * requiring an LLM call.
 *
 * Text content lives in `messages/{locale}/app.json` under
 * `app.plan.starter.content.*`. The structure here only carries the
 * stable IDs, week numbers and categories — the caller passes a scoped
 * translator so the output renders in the user's locale.
 */

export type StarterStep = {
  week_number: number;
  focus: string;
  title: string;
  description: string;
  category: "review" | "habit" | "save" | "debt_payoff" | "income_boost";
};

export type StarterPlan = {
  title: string;
  summary: string;
  steps: StarterStep[];
};

export type StarterTranslator = ((
  key: string,
  values?: Record<string, string | number>,
) => string) & {
  raw: (key: string) => unknown;
};

type Situation = "struggling" | "tight" | "stable" | "comfortable";

type StepDef = {
  id: string;
  week_number: number;
  category: StarterStep["category"];
};

// IDs are underscore-separated. next-intl rejects "." in JSON keys
// (INVALID_KEY at message initialisation), so we keep the IDs in lock-step
// with the actual JSON property names under app.plan.starter.content.steps.
const COMMON_DEFS: StepDef[] = [
  { id: "common_w1_s1", week_number: 1, category: "review" },
  { id: "common_w1_s2", week_number: 1, category: "review" },
  { id: "common_w2_s1", week_number: 2, category: "habit" },
  { id: "common_w3_s1", week_number: 3, category: "save" },
  { id: "common_w4_s1", week_number: 4, category: "save" },
];

const STRUGGLING_DEFS: StepDef[] = [
  { id: "struggling_w5_s1", week_number: 5, category: "debt_payoff" },
  { id: "struggling_w6_s1", week_number: 6, category: "review" },
  { id: "struggling_w7_s1", week_number: 7, category: "habit" },
  { id: "struggling_w8_s1", week_number: 8, category: "review" },
  { id: "struggling_w9_s1", week_number: 9, category: "income_boost" },
  { id: "struggling_w10_s1", week_number: 10, category: "income_boost" },
  { id: "struggling_w11_s1", week_number: 11, category: "save" },
  { id: "struggling_w12_s1", week_number: 12, category: "review" },
];

const TIGHT_DEFS: StepDef[] = [
  { id: "tight_w5_s1", week_number: 5, category: "review" },
  { id: "tight_w6_s1", week_number: 6, category: "habit" },
  { id: "tight_w7_s1", week_number: 7, category: "save" },
  { id: "tight_w8_s1", week_number: 8, category: "save" },
  { id: "tight_w9_s1", week_number: 9, category: "debt_payoff" },
  { id: "tight_w10_s1", week_number: 10, category: "debt_payoff" },
  { id: "tight_w11_s1", week_number: 11, category: "habit" },
  { id: "tight_w12_s1", week_number: 12, category: "review" },
];

const STABLE_DEFS: StepDef[] = [
  { id: "stable_w5_s1", week_number: 5, category: "save" },
  { id: "stable_w6_s1", week_number: 6, category: "review" },
  { id: "stable_w7_s1", week_number: 7, category: "save" },
  { id: "stable_w8_s1", week_number: 8, category: "save" },
  { id: "stable_w9_s1", week_number: 9, category: "review" },
  { id: "stable_w10_s1", week_number: 10, category: "review" },
  { id: "stable_w11_s1", week_number: 11, category: "save" },
  { id: "stable_w12_s1", week_number: 12, category: "review" },
];

const COMFORTABLE_DEFS: StepDef[] = [
  { id: "comfortable_w5_s1", week_number: 5, category: "review" },
  { id: "comfortable_w6_s1", week_number: 6, category: "review" },
  { id: "comfortable_w7_s1", week_number: 7, category: "save" },
  { id: "comfortable_w8_s1", week_number: 8, category: "review" },
  { id: "comfortable_w9_s1", week_number: 9, category: "save" },
  { id: "comfortable_w10_s1", week_number: 10, category: "save" },
  { id: "comfortable_w11_s1", week_number: 11, category: "income_boost" },
  { id: "comfortable_w12_s1", week_number: 12, category: "review" },
];

const DEFS_BY_SITUATION: Record<Situation, StepDef[]> = {
  struggling: STRUGGLING_DEFS,
  tight: TIGHT_DEFS,
  stable: STABLE_DEFS,
  comfortable: COMFORTABLE_DEFS,
};

export function getStarterPlan(
  situation: Situation,
  t: StarterTranslator,
): StarterPlan {
  const defs = [...COMMON_DEFS, ...DEFS_BY_SITUATION[situation]];
  // Step IDs are flat underscore-separated keys so they survive the
  // next-intl INVALID_KEY guard (dots are reserved for nesting). Pull
  // the whole table at once via raw() so we control the lookup.
  const stepsTable = t.raw("steps") as Record<
    string,
    { focus: string; title: string; description: string }
  >;
  return {
    title: t(`titles.${situation}`),
    summary: t(`summaries.${situation}`),
    steps: defs.map((d) => {
      const s = stepsTable[d.id];
      return {
        week_number: d.week_number,
        focus: s.focus,
        title: s.title,
        description: s.description,
        category: d.category,
      };
    }),
  };
}
