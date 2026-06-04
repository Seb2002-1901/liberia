import "server-only";
import { getAnthropic } from "@/lib/ai/client";
import type { MemoryEntryKind } from "@/types/database";

/**
 * Phase 2 — premium memory extractor.
 *
 * After the main Sonnet reply finishes, we run this lightweight Haiku
 * call against the (user message, assistant reply) pair and ask it to
 * extract 0 or more long-term facts worth remembering. The list is
 * upserted into user_memory_entries.
 *
 * Why a SEPARATE call instead of tool-use on the main turn:
 *   - The main Sonnet response is streamed; injecting a tool_use mid-
 *     stream complicates the SSE pipeline (would need a tool_result
 *     round-trip with the same model just to continue the prose).
 *   - Cost stays predictable: Haiku 4.5 at ~$1/M input / $5/M output,
 *     and our prompt is ~600 tokens in, ~150 tokens out per call.
 *     Roughly $0.0015/turn — invisible at any reasonable usage.
 *   - The extractor is async and fire-and-forget: a failure here
 *     never blocks the user's reply, never returns an error to the
 *     client, just gets logged to stderr for ops.
 *
 * Hard constraints, enforced in this module:
 *   - At most MAX_EXTRACTIONS entries per call (defends against
 *     runaway extractor behaviour).
 *   - Empty array when the exchange has nothing memorable (the
 *     "Merci !" / acknowledgement case).
 *   - Strict schema validation — anything that doesn't parse cleanly
 *     is dropped silently rather than corrupting the memory store.
 */

const EXTRACTOR_MODEL = "claude-haiku-4-5-20251001";
const EXTRACTOR_MAX_TOKENS = 400;
const MAX_EXTRACTIONS = 3;

/** Skip extraction entirely below these character thresholds. */
const MIN_USER_CHARS = 30;
const MIN_ASSISTANT_CHARS = 100;

export interface ExtractedEntry {
  kind: MemoryEntryKind;
  key: string;
  summary: string;
  detail: string | null;
  importance: number;
  confidence: number;
  expiresInDays: number | null;
}

export interface ExtractInput {
  userMessage: string;
  assistantReply: string;
  locale: string;
  fullName?: string | null;
}

/**
 * Decide whether the exchange is worth running the extractor on at
 * all. Short messages / short replies almost never contain new long-
 * term facts ("Merci", "OK", "Continue"), so we skip them and save
 * the round-trip.
 *
 * Exported for unit testing.
 */
export function shouldRunExtraction(input: ExtractInput): boolean {
  return (
    input.userMessage.trim().length >= MIN_USER_CHARS &&
    input.assistantReply.trim().length >= MIN_ASSISTANT_CHARS
  );
}

export async function extractMemoryEntries(
  input: ExtractInput,
): Promise<ExtractedEntry[]> {
  if (!shouldRunExtraction(input)) return [];

  const claude = getAnthropic();
  const userBlock = truncate(input.userMessage, 1500);
  const assistantBlock = truncate(input.assistantReply, 1500);

  const response = await claude.messages.create({
    model: EXTRACTOR_MODEL,
    max_tokens: EXTRACTOR_MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `User locale: ${input.locale}`,
              input.fullName ? `User first name: ${input.fullName.split(" ")[0]}` : null,
              "",
              "=== USER MESSAGE ===",
              userBlock,
              "",
              "=== ASSISTANT REPLY ===",
              assistantBlock,
              "",
              "Now produce the JSON array. Return [] if nothing is worth remembering.",
            ]
              .filter(Boolean)
              .join("\n"),
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find(
    (b): b is Extract<typeof response.content[number], { type: "text" }> =>
      b.type === "text",
  );
  if (!textBlock) return [];
  return parseAndValidate(textBlock.text);
}

/**
 * Pure parser — exported for unit testing without an Anthropic call.
 * Accepts a free-form text response, tries to find a JSON array, and
 * returns the validated subset. Invalid entries are dropped silently.
 */
export function parseAndValidate(rawText: string): ExtractedEntry[] {
  const trimmed = rawText.trim();
  if (!trimmed || trimmed === "[]") return [];

  // The model sometimes wraps JSON in ```json fences or prose. Find
  // the outermost [...] and parse only that.
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  const jsonSlice = trimmed.slice(start, end + 1);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonSlice);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  const valid: ExtractedEntry[] = [];
  for (const raw of parsed) {
    const entry = validateEntry(raw);
    if (entry) valid.push(entry);
    if (valid.length >= MAX_EXTRACTIONS) break;
  }
  return valid;
}

const ALLOWED_KINDS: ReadonlySet<MemoryEntryKind> = new Set([
  "goal",
  "preference",
  "event",
  "blocker",
]);

function validateEntry(raw: unknown): ExtractedEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const kind = r.kind;
  if (typeof kind !== "string" || !ALLOWED_KINDS.has(kind as MemoryEntryKind)) {
    return null;
  }
  const key = typeof r.key === "string" ? slug(r.key) : "";
  if (!key) return null;
  const summary = typeof r.summary === "string" ? r.summary.trim() : "";
  if (!summary) return null;
  const detail = typeof r.detail === "string" ? r.detail.trim() : null;
  const importance = clampInt(r.importance, 1, 5, 3);
  const confidence = clampInt(r.confidence, 1, 5, 3);
  const expiresInDays =
    typeof r.expires_in_days === "number" && Number.isFinite(r.expires_in_days)
      ? Math.max(1, Math.round(r.expires_in_days))
      : null;
  return {
    kind: kind as MemoryEntryKind,
    key,
    summary: summary.slice(0, 280),
    detail: detail ? detail.slice(0, 1000) : null,
    importance,
    confidence,
    expiresInDays,
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}

/** Slug-ify the extractor's key so upsert collisions work as intended. */
function slug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max) + "…";
}

const SYSTEM_PROMPT = `You extract durable, long-term memory entries from a single coach/user exchange in a personal finance coaching app (LIBERIA).

Your output is consumed by code. Return ONLY a JSON array — no prose, no code fences. Empty array [] when nothing is worth remembering.

Schema for each item:
{
  "kind": "goal" | "preference" | "event" | "blocker",
  "key": "snake_case_slug",          // stable across rephrasings, max 80 chars
  "summary": "concise one-sentence statement in the user's locale", // max 280 chars
  "detail": "optional context" | null,                              // max 1000 chars
  "importance": 1-5,                  // 1 trivia, 5 core life goal
  "confidence": 1-5,                  // 1 inferred, 5 user said it plainly
  "expires_in_days": number | null   // null = evergreen
}

Kinds:
- goal       — long-term financial objective the user has stated (buy a house, build emergency fund, retire at 55).
- preference — how the user wants to be coached (likes concrete plans, prefers conservative advice, wants weekly check-ins, native language).
- event      — material life event affecting finances (salary increase, job change, move, marriage, birth, inheritance).
- blocker    — recurring psychological / behavioural obstacle (impulsive spending, money anxiety, conflict with partner about money).

Hard rules:
- Output AT MOST 3 entries. Quality > quantity. Most exchanges yield 0.
- Never extract one-shot questions ("How much can I save?"), greetings, acknowledgements, or coach-generated content reflected back.
- Never invent facts not present in the exchange. Confidence = 1 only when strongly implied.
- Write summary in the same language as the user's message.
- Keys must be stable: "buy_house" not "house_purchase_2024_q2". Reuse keys across calls so upserts merge naturally.
- For "event" kind, set expires_in_days to a reasonable horizon (90-180 days) — events fade in relevance over time.
- Goals and preferences default to expires_in_days = null (evergreen).
- Return [] when uncertain. Empty is always safer than wrong.`;
