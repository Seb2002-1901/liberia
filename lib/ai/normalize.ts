/**
 * Output sanitization for LIBERIA AI responses. Both the local
 * fallback and a future Anthropic stream go through these helpers so
 * the persisted text stays inside hard caps regardless of which
 * engine produced it.
 *
 * Why these exist:
 *  - the DB CHECK constraint on ai_messages.content caps at 16k chars
 *    (cost defense). Truncating client-side beats hitting a 23514
 *    constraint violation at insert time.
 *  - LLM outputs occasionally include leaked credentials when
 *    operator-side prompt experiments go wrong. The regex scrub here
 *    is belt-and-suspenders — the system prompt already forbids it.
 *  - keeping the wording calm + bounded matches the brand tone, even
 *    if a future model decides to ramble.
 */

const MAX_COACH_REPLY_CHARS = 6000; // ~1500 tokens, under DB cap + UX-friendly
const MAX_INSIGHT_BODY_CHARS = 600;
const MAX_PLAN_TITLE_CHARS = 120;
const MAX_PLAN_STEP_TITLE_CHARS = 200;
const MAX_PLAN_STEP_DESC_CHARS = 800;

/**
 * Removes accidentally-leaked credentials from LLM output. Defense in
 * depth — the system prompt instructs the model never to echo these,
 * but we strip them server-side just in case.
 *
 * Matches the most common formats. Anything stripped is replaced with
 * "[redacted]" so the user notices something happened rather than
 * silently receiving a broken paragraph.
 */
function scrubSecrets(s: string): string {
  return s
    .replace(/\bsk-ant-[A-Za-z0-9_-]{16,}/g, "[redacted]")
    .replace(/\bsk_(?:live|test)_[A-Za-z0-9]{16,}/g, "[redacted]")
    .replace(/\bwhsec_[A-Za-z0-9]{16,}/g, "[redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[redacted]"); // JWT pattern (header≥10, payload≥8, sig≥8)
}

/**
 * Truncate to a soft length boundary. Cuts on the nearest preceding
 * whitespace when possible so the text doesn't end mid-word.
 */
function softTrim(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max * 0.8) return cut.slice(0, lastSpace) + "…";
  return cut + "…";
}

/**
 * Canonical normalization for any text persisted to ai_messages.
 * Applied AFTER the LLM stream completes (or local generation
 * returns) and BEFORE the admin client INSERT.
 */
export function normalizeCoachReply(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  if (s.length === 0) return "";
  s = scrubSecrets(s);
  s = s.replace(/\n{3,}/g, "\n\n"); // collapse 3+ newlines to 2
  s = s.replace(/[ \t]{3,}/g, " "); // collapse big horizontal whitespace
  s = softTrim(s, MAX_COACH_REPLY_CHARS);
  return s;
}

export function normalizeInsightBody(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  if (s.length === 0) return "";
  s = scrubSecrets(s);
  s = s.replace(/\n{2,}/g, " ").replace(/\s{2,}/g, " ");
  s = softTrim(s, MAX_INSIGHT_BODY_CHARS);
  return s;
}

/**
 * Normalize a single line piece of text (titles, headlines). Single-
 * line: newlines collapse to spaces.
 */
function normalizeOneLine(raw: string | null | undefined, max: number): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim().replace(/\s+/g, " ");
  if (s.length === 0) return "";
  s = scrubSecrets(s);
  return softTrim(s, max);
}

export type RawPlanShape = {
  title?: string | null;
  summary?: string | null;
  steps?: Array<{
    week_number?: number;
    title?: string | null;
    description?: string | null;
    focus?: string | null;
    category?: string | null;
    expected_impact_eur?: number | null;
  }>;
};

export type NormalizedPlan = {
  title: string;
  summary: string;
  steps: Array<{
    week_number: number;
    title: string;
    description: string;
    focus: string;
    category: string;
    expected_impact_eur: number | null;
  }>;
};

/**
 * Sanitize an LLM-generated plan before persistence. Drops malformed
 * steps, clamps each text field, defaults the enum-ish fields so the
 * Postgres insert never blows up on a missing column.
 */
export function normalizePlan(raw: RawPlanShape): NormalizedPlan {
  const title = normalizeOneLine(raw.title, MAX_PLAN_TITLE_CHARS) || "Mon plan financier";
  const summary = normalizeInsightBody(raw.summary) || "";
  const steps = Array.isArray(raw.steps)
    ? raw.steps
        .filter((s): s is NonNullable<typeof s> => Boolean(s))
        .map((s) => ({
          week_number:
            typeof s.week_number === "number" && s.week_number >= 1 && s.week_number <= 13
              ? Math.floor(s.week_number)
              : 1,
          title: normalizeOneLine(s.title, MAX_PLAN_STEP_TITLE_CHARS) || "Étape",
          description:
            typeof s.description === "string"
              ? softTrim(scrubSecrets(s.description.trim()), MAX_PLAN_STEP_DESC_CHARS)
              : "",
          focus: normalizeOneLine(s.focus, MAX_PLAN_STEP_TITLE_CHARS) || "Action",
          category:
            typeof s.category === "string" && s.category.length > 0
              ? s.category.slice(0, 40)
              : "other",
          expected_impact_eur:
            typeof s.expected_impact_eur === "number" &&
            Number.isFinite(s.expected_impact_eur) &&
            s.expected_impact_eur >= 0
              ? s.expected_impact_eur
              : null,
        }))
    : [];
  return { title, summary, steps };
}
