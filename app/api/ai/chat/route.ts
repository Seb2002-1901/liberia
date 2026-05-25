import { NextResponse } from "next/server";
import { COACH_MAX_TOKENS, COACH_MODEL, getAnthropic } from "@/lib/ai/client";
import { COACH_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildFinanceContext } from "@/lib/ai/context";
import {
  MAX_CONVERSATION_TURNS,
  chatMessageSchema,
  looksLikeAbuse,
} from "@/lib/ai/safety";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { getFinanceData } from "@/lib/services/finance";
import { requirePremiumAccess } from "@/lib/services/access";
import { isAnthropicConfigured } from "@/lib/env";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Vercel Hobby caps Node functions at 10s by default. Bump to 60s so a
// thinking-heavy answer can stream to the end. Pro plans support up to 300s.
export const maxDuration = 60;

const HISTORY_LIMIT = MAX_CONVERSATION_TURNS; // last N turns kept in context

export async function POST(request: Request) {
  if (!isAnthropicConfigured()) {
    return NextResponse.json(
      {
        error:
          "Coach IA non configuré. Renseigne ANTHROPIC_API_KEY pour activer.",
      },
      { status: 501 },
    );
  }
  if (!isAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Coach IA non configuré côté serveur. SUPABASE_SERVICE_ROLE_KEY requis pour persister les réponses.",
      },
      { status: 501 },
    );
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Authentification requise." },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const parsed = chatMessageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 },
    );
  }

  if (looksLikeAbuse(parsed.data.content)) {
    return NextResponse.json(
      {
        error:
          "Cette demande n'entre pas dans le cadre du coach LIBERIA. Reformule en parlant de ta situation financière.",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  }

  // Premium gate — calls to Anthropic cost real money. Free / lapsed
  // accounts can still read their existing conversations via the page
  // (lib/services/coach is RLS-bound, not gated), but they cannot send
  // new messages. 402 Payment Required is the right semantic.
  const access = await requirePremiumAccess(supabase, user.id);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 402 });
  }

  // Rate limit per-user across all coach traffic.
  const rate = await checkRateLimit("ai", user.id);
  if (!rate.success) {
    return NextResponse.json(
      {
        error:
          "Tu envoies trop de messages d'affilée. Attends quelques secondes et réessaye.",
      },
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
      { error: "Conversation introuvable." },
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

  // Build finance context (read-only per-request snapshot).
  const financeData = await getFinanceData();
  const financeContext = buildFinanceContext(financeData);

  // If this is the first user message, derive a short title for the
  // sidebar (do this fire-and-forget; failure must not block streaming).
  if (history.filter((m) => m.role === "user").length === 1) {
    const derivedTitle =
      parsed.data.content.slice(0, 60).replace(/\s+/g, " ").trim() ||
      "Nouvelle conversation";
    await supabase
      .from("ai_conversations")
      .update({ title: derivedTitle })
      .eq("id", conversation.id)
      .eq("user_id", user.id);
  }

  const claude = getAnthropic();

  // Stream the response back as Server-Sent Events.
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
        const apiMessages = (history ?? []).map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        }));

        const claudeStream = claude.messages.stream({
          model: COACH_MODEL,
          max_tokens: COACH_MAX_TOKENS,
          system: [
            {
              type: "text",
              text: COACH_SYSTEM_PROMPT,
            },
            {
              type: "text",
              text: financeContext,
              // Cache the system + finance context together. The whole block
              // typically lands above the 2048-token Sonnet 4.6 minimum once
              // the user has any data; below that, the cache silently no-ops.
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: apiMessages,
          thinking: { type: "adaptive" },
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

        // Persist the assistant turn via the service-role client. The
        // ai_messages RLS policy restricts user-session inserts to
        // role='user', so assistant turns only enter the table through
        // this server-controlled path — a user cannot forge an assistant
        // reply in their own conversation history (which would otherwise
        // poison the next model call).
        // Don't persist an empty reply (rare — model timeout or refusal
        // returning no text). The conversation stays clean and the user
        // can re-prompt.
        if (assistantBuffer.trim().length > 0) {
          await getAdminClient().from("ai_messages").insert({
            conversation_id: conversation.id,
            user_id: user.id,
            role: "assistant",
            content: assistantBuffer,
            model: COACH_MODEL,
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
        const message =
          err instanceof Error ? err.message : "Erreur du coach IA";
        send("error", { message });
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
