import { NextResponse } from "next/server";
import { after } from "next/server";
import { COACH_MAX_TOKENS, COACH_MODEL, getAnthropic } from "@/lib/ai/client";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildFinanceContext } from "@/lib/ai/context";
import { generateLocalCoachReply } from "@/lib/coach/local";
import { getTranslations } from "next-intl/server";
import { normalizeCoachReply } from "@/lib/ai/normalize";
import { truncateMessagesForBudget } from "@/lib/ai/budget";
import {
  MAX_CONVERSATION_TURNS,
  chatMessageSchema,
  looksLikeAbuse,
} from "@/lib/ai/safety";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getFinanceData, totalMonthly } from "@/lib/services/finance";
import { getMyUserMemory } from "@/lib/services/memory";
import {
  selectEntriesForPrompt,
  touchMemoryEntries,
  upsertMemoryEntry,
} from "@/lib/services/memory-entries";
import { buildMemoryEntriesBlock } from "@/lib/ai/memory-context";
import { extractMemoryEntries } from "@/lib/ai/memory-extractor";
import { requirePremiumAccess } from "@/lib/services/access";
import {
  PROPOSE_EXPENSE_TOOL,
  PROPOSE_EXPENSE_TOOL_NAME,
  type ProposeExpenseInput,
} from "@/lib/coach/tools";
import { isAnthropicConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLanguageEnglishName } from "@/lib/locale/languages";
import { getActionErrors } from "@/lib/i18n/action-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby caps Node functions at 10s by default. Bump to 60s so a
// thinking-heavy answer can stream to the end. Pro plans support up to 300s.
export const maxDuration = 60;

const HISTORY_LIMIT = MAX_CONVERSATION_TURNS; // last N turns kept in context

export async function POST(request: Request) {
  const tErr = await getActionErrors();
  // Admin client is required either path — assistant messages can only
  // be written via service_role (the ai_messages RLS policy restricts
  // user-side INSERTs to role='user').
  if (!isAdminConfigured() || !isSupabaseConfigured()) {
    return NextResponse.json(
      { error: tErr("coachUnavailable") },
      { status: 501 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: tErr("invalidRequest") }, { status: 400 });
  }

  const parsed = chatMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: tErr("invalidData") }, { status: 400 });
  }

  if (looksLikeAbuse(parsed.data.content)) {
    return NextResponse.json(
      { error: tErr("outOfScope") },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: tErr("authRequired") }, { status: 401 });
  }

  // Premium gate — calls to Anthropic cost real money. Free / lapsed
  // accounts can still read their existing conversations via the page
  // (lib/services/coach is RLS-bound, not gated), but they cannot send
  // new messages. 402 Payment Required is the right semantic.
  const access = await requirePremiumAccess(supabase, user.id);
  if (!access.ok) {
    return NextResponse.json(
      { error: tErr(access.reasonKey) },
      { status: 402 },
    );
  }

  // Rate limit per-user across all coach traffic.
  const rate = await checkRateLimit("ai", user.id);
  if (!rate.success) {
    return NextResponse.json(
      { error: tErr("tooManyMessages") },
      { status: 429 },
    );
  }

  // Verify conversation belongs to user.
  const { data: conversation, error: convErr } = await supabase
    .from("ai_conversations")
    .select("id, title")
    .eq("id", parsed.data.conversationId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (convErr) {
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  }
  if (!conversation) {
    return NextResponse.json(
      { error: tErr("conversationNotFound") },
      { status: 404 },
    );
  }

  // Persist the user message before streaming so it survives a stream abort.
  const insertUser = await supabase
    .from("ai_messages")
    .insert({
      conversation_id: conversation.id,
      user_id: user.id,
      role: "user",
      content: parsed.data.content,
    })
    .select("id")
    .single();
  if (insertUser.error) {
    return NextResponse.json({ error: insertUser.error.message }, { status: 500 });
  }

  // Load conversation history (now including the new user message).
  // Fetch the MOST RECENT N turns ordered descending, then reverse for the
  // model — ordering ascending + limiting would silently drop the latest
  // turns once a conversation exceeded the cap.
  const { data: historyDesc, error: histErr } = await supabase
    .from("ai_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversation.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT * 2);
  if (histErr) {
    return NextResponse.json({ error: histErr.message }, { status: 500 });
  }
  const history = (historyDesc ?? []).slice().reverse();

  // Build finance + memory context (read-only per-request snapshot).
  // Premium memory: load the user's opt-out flag + top-N typed entries
  // in the same parallel block. selectEntriesForPrompt returns [] when
  // the user has no entries OR when admin client isn't configured.
  const [financeData, memory, memoryFlagRow, memoryEntries] = await Promise.all([
    getFinanceData(),
    getMyUserMemory(),
    supabase
      .from("profiles")
      .select("coach_memory_enabled")
      .eq("id", user.id)
      .maybeSingle(),
    selectEntriesForPrompt(user.id),
  ]);
  const memoryEnabled = memoryFlagRow.data?.coach_memory_enabled ?? true;
  // Split memory entries by kind. Goals merge into the finance
  // "Objectifs actuels" section so the coach sees ONE goal list; the
  // remaining kinds (preference / event / blocker) feed the
  // dedicated memory block. Without this split the coach would see
  // the same goal in two prompt sections AND treat the "Objectifs"
  // section as authoritative — claiming "aucun objectif actif" when
  // memory clearly contained one.
  const memoryGoals = memoryEnabled
    ? memoryEntries.filter((e) => e.kind === "goal")
    : [];
  const nonGoalMemoryEntries = memoryEnabled
    ? memoryEntries.filter((e) => e.kind !== "goal")
    : [];
  const memoryBlock = memoryEnabled
    ? buildMemoryEntriesBlock(nonGoalMemoryEntries)
    : null;
  console.log(
    `[memory] pre-prompt: enabled=${memoryEnabled} entriesSelected=${memoryEntries.length} goalEntries=${memoryGoals.length} nonGoalEntries=${nonGoalMemoryEntries.length} blockChars=${memoryBlock?.length ?? 0}`,
  );
  const financeContext = buildFinanceContext(financeData, { memoryGoals });
  const useLLM = isAnthropicConfigured();

  // If this is the first user message, derive a short title for the
  // sidebar (do this fire-and-forget; failure must not block streaming).
  if (history.filter((m) => m.role === "user").length === 1) {
    const derivedTitle =
      parsed.data.content.slice(0, 60).replace(/\s+/g, " ").trim() ||
      tErr("newConversationDefaultTitle");
    await supabase
      .from("ai_conversations")
      .update({ title: derivedTitle })
      .eq("id", conversation.id)
      .eq("user_id", user.id);
  }

  // Stream the response back as Server-Sent Events. Two paths share the
  // same SSE protocol so the client doesn't care which engine answered:
  //   - LLM path (Anthropic configured): real streaming tokens
  //   - Local fallback path: deterministic French response in one chunk
  // Both persist via the service-role admin client.
  const encoder = new TextEncoder();
  let assistantBuffer = "";
  let tokensIn = 0;
  let tokensOut = 0;
  let cacheRead = 0;
  let cacheWrite = 0;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let clientClosed = false;
      const send = (eventType: string, data: unknown) => {
        if (clientClosed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          // Client navigated away or aborted — keep draining the upstream
          // (Claude finishes generating, we still persist the result).
          clientClosed = true;
        }
      };

      try {
        if (useLLM) {
          try {
            const claude = getAnthropic();
            // Cost-control: cap aggregate history at SOFT_INPUT_BUDGET
            // (~30k tokens ≈ 0.10 CHF / call). The history query already
            // bounds count at 80; this bounds total tokens too. Drops
            // oldest turns first, ALWAYS keeps the latest user message.
            const { messages: budgetedHistory } = truncateMessagesForBudget(
              (history ?? []).map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
            );
            const apiMessages = budgetedHistory;

            // Language injection: appended as the last system block so it
            // takes precedence over any earlier nudge in the coach prompt
            // or finance context (both currently French). Sonnet honours
            // English meta-instructions reliably across locales.
            const userLanguageName = getLanguageEnglishName(
              financeData.profile.locale,
            );

            // Assemble system blocks. The memory block is OPTIONAL:
            // we only include it when the user has entries AND has
            // not disabled the feature. Skipping it keeps the cached
            // prefix stable for users without any memory yet.
            const systemBlocks: Array<{
              type: "text";
              text: string;
              cache_control?: { type: "ephemeral" };
            }> = [
              { type: "text", text: COACH_SYSTEM_PROMPT },
              {
                type: "text",
                text: financeContext,
                // Cache the system + finance context together. The whole
                // block typically lands above the 2048-token Sonnet 4.6
                // minimum once the user has any data; below that, the
                // cache silently no-ops.
                cache_control: { type: "ephemeral" },
              },
            ];
            if (memoryBlock) {
              systemBlocks.push({
                type: "text",
                text: memoryBlock,
                // Cache memory separately from finance — finance refreshes
                // when the user logs a new tx; memory refreshes when the
                // extractor stores a new entry. Different invalidation
                // cadences, so they share the prefix but live in their
                // own cache breakpoint.
                cache_control: { type: "ephemeral" },
              });
            }
            systemBlocks.push({
              type: "text",
              text: `Always respond exclusively in ${userLanguageName}. Match the user's tone in that language. Never switch to a different language even if the finance context above is in French — that is internal data, not a hint about the user's preferred language.`,
            });

            const claudeStream = claude.messages.stream({
              model: COACH_MODEL,
              max_tokens: COACH_MAX_TOKENS,
              system: systemBlocks,
              messages: apiMessages,
              thinking: { type: "adaptive" },
              // Phase 3.1 — coach can propose an expense to log. The
              // tool is a structured-output channel: the UI renders a
              // confirmation card from the validated input, the user
              // decides whether to persist. We never feed back a
              // tool_result; the next turn starts with text history
              // only (see persistence below) so no orphan handshake
              // is created.
              tools: [PROPOSE_EXPENSE_TOOL],
            });

            for await (const event of claudeStream) {
              if (
                event.type === "content_block_delta" &&
                event.delta.type === "text_delta"
              ) {
                assistantBuffer += event.delta.text;
                send("delta", { text: event.delta.text });
              }
            }

            const final = await claudeStream.finalMessage();
            tokensIn = final.usage.input_tokens ?? 0;
            tokensOut = final.usage.output_tokens ?? 0;
            cacheRead = final.usage.cache_read_input_tokens ?? 0;
            cacheWrite = final.usage.cache_creation_input_tokens ?? 0;

            // Phase 3.1 — if Sonnet decided this is a real expense
            // report, surface the structured suggestion to the client.
            // We pick the FIRST matching tool_use block and ignore any
            // subsequent ones (the prompt forbids double-calls; this
            // is a belt-and-braces guard). The SDK already validated
            // the input against PROPOSE_EXPENSE_TOOL.input_schema, so
            // we can pass it straight through.
            for (const block of final.content) {
              if (
                block.type === "tool_use" &&
                block.name === PROPOSE_EXPENSE_TOOL_NAME
              ) {
                const input = block.input as ProposeExpenseInput;
                console.log(
                  `[coach/propose_expense] amount=${input.amount} ${input.currency} label=${input.label} category=${input.category}`,
                );
                send("propose_expense", {
                  toolUseId: block.id,
                  amount: input.amount,
                  currency: input.currency,
                  label: input.label,
                  category: input.category,
                  notes: input.notes ?? null,
                });
                break;
              }
            }
          } catch (llmErr) {
            // Anthropic returned 5xx / network hiccupped / rate-limit
            // upstream. Don't break the conversation — fall back to the
            // local deterministic engine and surface to ops via stderr
            // (Vercel + Sentry pick it up). Reset any partial buffer so
            // we don't mix half-LLM half-local content.
            console.error(
              "[ai/chat] Anthropic stream failed, falling back to local engine:",
              llmErr instanceof Error
                ? `${llmErr.name}: ${llmErr.message}`
                : String(llmErr),
            );
            assistantBuffer = "";
            tokensIn = 0;
            tokensOut = 0;
            cacheRead = 0;
            cacheWrite = 0;
            const monthlyIncome =
              totalMonthly(financeData.incomes) ||
              financeData.financialProfile?.monthly_income ||
              0;
            const monthlyExpenses =
              totalMonthly(financeData.expenses) ||
              financeData.financialProfile?.monthly_expenses ||
              0;
            const localT = await getTranslations({
              locale: financeData.profile.locale ?? "fr",
              namespace: "app.coach.local",
            });
            const localReply = generateLocalCoachReply(
              {
                userMessage: parsed.data.content,
                history: history.map((m) => ({
                  role: m.role as "user" | "assistant",
                  content: m.content,
                })),
                fullName: financeData.profile.full_name,
                financialProfile: financeData.financialProfile,
                memory,
                monthlyIncome,
                monthlyExpenses,
                currentSavings: financeData.financialProfile?.current_savings ?? 0,
                monthlyDebt: financeData.financialProfile?.monthly_debt ?? 0,
                currency: financeData.profile.currency || "CHF",
                locale: financeData.profile.locale ?? "fr",
              },
              localT,
            );
            assistantBuffer = localReply;
            send("delta", { text: localReply });
          }
        } else {
          // Local fallback — deterministic, no LLM tokens, no external
          // call. Same SSE shape as the LLM path so the client renders
          // identically.
          const monthlyIncome =
            totalMonthly(financeData.incomes) ||
            financeData.financialProfile?.monthly_income ||
            0;
          const monthlyExpenses =
            totalMonthly(financeData.expenses) ||
            financeData.financialProfile?.monthly_expenses ||
            0;
          const localT = await getTranslations({
            locale: financeData.profile.locale ?? "fr",
            namespace: "app.coach.local",
          });
          const localReply = generateLocalCoachReply(
            {
              userMessage: parsed.data.content,
              history: history.map((m) => ({
                role: m.role as "user" | "assistant",
                content: m.content,
              })),
              fullName: financeData.profile.full_name,
              financialProfile: financeData.financialProfile,
              memory,
              monthlyIncome,
              monthlyExpenses,
              currentSavings: financeData.financialProfile?.current_savings ?? 0,
              monthlyDebt: financeData.financialProfile?.monthly_debt ?? 0,
              currency: financeData.profile.currency || "CHF",
              locale: financeData.profile.locale ?? "fr",
            },
            localT,
          );
          assistantBuffer = localReply;
          send("delta", { text: localReply });
        }

        // Persist the assistant turn via the service-role client. The
        // ai_messages RLS policy restricts user-session inserts to
        // role='user', so assistant turns only enter the table through
        // this server-controlled path — a user cannot forge an assistant
        // reply in their own conversation history (which would otherwise
        // poison the next model call).
        //
        // Normalize before persistence: trims excess whitespace, clamps
        // to MAX_COACH_REPLY_CHARS (well under the DB CHECK at 16k),
        // and scrubs any leaked credentials (sk-ant-*, sk_live_*,
        // whsec_*, JWT) — defense-in-depth against future LLM mistakes.
        //
        // Don't persist an empty reply (rare — model timeout or refusal
        // returning no text). The conversation stays clean and the user
        // can re-prompt.
        const normalized = normalizeCoachReply(assistantBuffer);
        if (normalized.length > 0) {
          await getAdminClient().from("ai_messages").insert({
            conversation_id: conversation.id,
            user_id: user.id,
            role: "assistant",
            content: normalized,
            model: useLLM ? COACH_MODEL : "liberia-local",
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            cache_read_tokens: cacheRead,
            cache_write_tokens: cacheWrite,
          });
        }

        // Touch the conversation so the sidebar re-sorts.
        await supabase
          .from("ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversation.id)
          .eq("user_id", user.id);

        // Premium memory: touch the entries we just injected so the
        // recency ranking keeps active ones near the top, AND schedule
        // the extractor to run AFTER the response is sent. We use
        // next/server `after()` here rather than `void promise` — on
        // Vercel serverless the function instance can be reclaimed
        // the moment the SSE stream closes, which silently kills any
        // in-flight fire-and-forget promises (root cause of the
        // "user_memory_entries stays empty after every conversation"
        // bug we shipped in d1bb576). `after()` keeps the function
        // alive until the callback resolves.
        console.log(
          `[memory] post-stream gate: enabled=${memoryEnabled} useLLM=${useLLM} assistantChars=${assistantBuffer.length} injectedEntries=${memoryEntries.length}`,
        );
        if (memoryEnabled) {
          const injectedIds = memoryEntries.map((e) => e.id);
          if (injectedIds.length > 0) {
            after(async () => {
              try {
                await touchMemoryEntries(user.id, injectedIds);
                console.log(
                  `[memory] touched ${injectedIds.length} injected entries`,
                );
              } catch (err) {
                console.error(
                  "[memory] touchMemoryEntries failed:",
                  err instanceof Error ? err.message : String(err),
                );
              }
            });
          }

          // Only run extraction when the LLM actually answered. The
          // local fallback is deterministic and recycles existing
          // context — no new memory to learn from it.
          if (useLLM && assistantBuffer) {
            after(async () => {
              await runExtractionInBackground({
                userId: user.id,
                conversationId: conversation.id,
                userMessage: parsed.data.content,
                assistantReply: assistantBuffer,
                locale: financeData.profile.locale ?? "fr",
                fullName: financeData.profile.full_name,
              });
            });
          } else {
            console.log(
              `[memory] extraction skipped — useLLM=${useLLM} hasBuffer=${Boolean(assistantBuffer)}`,
            );
          }
        }

        send("done", {
          tokens_in: tokensIn,
          tokens_out: tokensOut,
          cache_read_tokens: cacheRead,
        });
        try {
          controller.close();
        } catch {
          /* already closed by client */
        }
      } catch (err) {
        // Outer catch — survives only if persistence or the local
        // fallback itself failed. Log to stderr so Vercel + Sentry
        // capture the root cause; surface a translated, generic
        // message to the user (the original `err.message` may be a
        // technical Anthropic / Supabase error not safe to display).
        console.error(
          "[ai/chat] Stream pipeline failed:",
          err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        );
        send("error", { message: tErr("coachStreamError") });
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      // Client disconnected. Anthropic's stream will continue until the
      // response completes (we still want to persist it), but mark the
      // channel closed so we stop trying to write into it.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

interface RunExtractionInput {
  userId: string;
  conversationId: string;
  userMessage: string;
  assistantReply: string;
  locale: string;
  fullName: string | null;
}

/**
 * Fire-and-forget memory extraction. Runs the Haiku extractor on the
 * finished exchange and upserts any returned entries. All failures
 * are swallowed (logged to stderr) — this MUST NOT throw back into
 * the SSE stream or the user's reply silently fails to ship.
 *
 * Kept out of the request lifecycle: we don't await it from the route
 * handler, the Node runtime keeps the Function warm long enough for
 * the call to finish before the worker is recycled.
 */
async function runExtractionInBackground(
  input: RunExtractionInput,
): Promise<void> {
  const t0 = Date.now();
  console.log(
    `[memory] extractor start user=${input.userId.slice(0, 8)} conv=${input.conversationId.slice(0, 8)} userChars=${input.userMessage.length} asstChars=${input.assistantReply.length}`,
  );
  try {
    const extracted = await extractMemoryEntries({
      userMessage: input.userMessage,
      assistantReply: input.assistantReply,
      locale: input.locale,
      fullName: input.fullName,
    });
    const dt = Date.now() - t0;
    console.log(
      `[memory] extractor returned ${extracted.length} entries in ${dt}ms`,
    );
    if (extracted.length === 0) return;

    const now = Date.now();
    let written = 0;
    for (const entry of extracted) {
      const expiresAt = entry.expiresInDays
        ? new Date(now + entry.expiresInDays * 86400000).toISOString()
        : null;
      const result = await upsertMemoryEntry({
        userId: input.userId,
        kind: entry.kind,
        key: entry.key,
        summary: entry.summary,
        detail: entry.detail,
        importance: entry.importance,
        confidence: entry.confidence,
        source: "coach",
        conversationId: input.conversationId,
        expiresAt,
      });
      if (result) {
        written += 1;
        console.log(
          `[memory] upsert ok kind=${entry.kind} key=${entry.key} importance=${entry.importance}`,
        );
      } else {
        console.error(
          `[memory] upsert returned null kind=${entry.kind} key=${entry.key} — admin client unconfigured or query failed silently`,
        );
      }
    }
    console.log(`[memory] extraction done: ${written}/${extracted.length} written`);
  } catch (err) {
    console.error(
      "[memory] extraction failed:",
      err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err),
    );
  }
}
