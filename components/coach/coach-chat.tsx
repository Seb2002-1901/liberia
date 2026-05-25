"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/coach/markdown";
import { cn } from "@/lib/utils";
import type { CoachMessage } from "@/lib/services/coach";

interface CoachChatProps {
  conversationId: string;
  initialMessages: CoachMessage[];
  isDemo: boolean;
  /**
   * Persona-aware prompt suggestions surfaced on the empty state.
   * Computed server-side from the user's memory + financial snapshot.
   * Falls back to `DEFAULT_SUGGESTIONS` when absent.
   */
  suggestions?: readonly string[];
}

const DEFAULT_SUGGESTIONS = [
  "Que dois-je faire cette semaine ?",
  "Comment réduire mon stress financier ?",
  "Quelle dépense dois-je surveiller ?",
  "Aide-moi à tenir mon plan.",
];

export function CoachChat({
  conversationId,
  initialMessages,
  isDemo,
  suggestions,
}: CoachChatProps) {
  const router = useRouter();
  const promptList = suggestions && suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS;
  const [messages, setMessages] = React.useState<CoachMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [streamedText, setStreamedText] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Reset the local message buffer ONLY when the user navigates to a
  // different conversation. We deliberately do NOT depend on
  // `initialMessages`: it gets a new array reference on every parent
  // re-render (including router.refresh()), which would wipe optimistic
  // messages the user just typed while the previous stream's refresh
  // raced through. The user's local state is the source of truth for
  // the active session; multi-tab sync requires a manual refresh.
  React.useEffect(() => {
    setMessages(initialMessages);
    setStreamedText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Auto-scroll the chat to the bottom, but ONLY when the user is
  // already near the bottom — otherwise yanking them back down would
  // interrupt them mid-reread of an earlier message. 120px slack handles
  // small over-scroll and minor layout shift from the streaming cursor.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 120) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages, streamedText]);

  // Abort in-flight stream if the component unmounts or the user switches
  // conversation. Otherwise the SSE fetch keeps Anthropic tokens running
  // even though the UI is gone — and the assistant message still persists
  // server-side on completion.
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [conversationId]);

  // The coach is always reachable when not in demo: the server picks
  // between the real LLM (when ANTHROPIC_API_KEY is set) and the local
  // deterministic fallback. The premium gate is enforced server-side.
  const disabled = streaming || isDemo;

  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!content.trim() || disabled) return;

      const optimisticUser: CoachMessage = {
        id: `local-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);
      setInput("");
      setStreamedText("");
      setStreaming(true);

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, content }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(data?.error ?? "Le coach n'a pas pu répondre.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let assembled = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let idx = buffer.indexOf("\n\n");
          while (idx !== -1) {
            const raw = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            idx = buffer.indexOf("\n\n");

            const lines = raw.split("\n");
            let event = "message";
            let dataLine = "";
            for (const line of lines) {
              if (line.startsWith("event:")) event = line.slice(6).trim();
              else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
            }
            if (!dataLine) continue;
            try {
              const parsed = JSON.parse(dataLine);
              if (event === "delta" && typeof parsed.text === "string") {
                assembled += parsed.text;
                setStreamedText(assembled);
              } else if (event === "error" && typeof parsed.message === "string") {
                throw new Error(parsed.message);
              }
            } catch (err) {
              if (err instanceof Error && event === "error") throw err;
            }
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `local-asst-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`,
            role: "assistant",
            content: assembled,
            created_at: new Date().toISOString(),
          },
        ]);
        setStreamedText("");
        router.refresh();
      } catch (err) {
        if ((err as { name?: string } | null)?.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Le coach n'a pas pu répondre.";
        toast.error(message);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        setStreamedText("");
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, disabled, router],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto pb-6"
      >
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          {messages.length === 0 && !streamedText && (
            <EmptyCoachState
              onPick={(s) => sendMessage(s)}
              disabled={disabled}
              isDemo={isDemo}
              suggestions={promptList}
            />
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} role={m.role} content={m.content} />
          ))}

          {streamedText && (
            <MessageBubble role="assistant" content={streamedText} pending />
          )}

          {streaming && !streamedText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Le coach réfléchit…
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/60 backdrop-blur-md">
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                isDemo
                  ? "Mode démo : crée un compte pour discuter avec le coach."
                  : "Pose une question à ton coach…"
              }
              disabled={disabled}
              className="min-h-[44px] max-h-40 flex-1 resize-none"
            />
            <Button
              type="submit"
              variant="gold"
              size="icon"
              disabled={disabled || !input.trim()}
              aria-label="Envoyer"
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Le coach LIBERIA est informatif. Aucune information n'est un conseil financier réglementé.
          </p>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  pending,
}: {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md border border-border/60 bg-secondary/40 px-4 py-2.5 text-sm">
          {content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3">
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[hsl(var(--gold)/0.4)] to-[hsl(var(--gold-muted)/0.2)] text-[hsl(var(--gold))]"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <Markdown text={content} />
        {pending && (
          <span className="ml-1 inline-block h-3 w-1.5 animate-pulse rounded bg-foreground/40 align-baseline" />
        )}
      </div>
    </div>
  );
}

function EmptyCoachState({
  onPick,
  disabled,
  isDemo,
  suggestions,
}: {
  onPick: (s: string) => void;
  disabled: boolean;
  isDemo: boolean;
  suggestions: readonly string[];
}) {
  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2 text-center">
        <span
          aria-hidden
          className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[hsl(var(--gold)/0.35)] to-transparent text-[hsl(var(--gold))]"
        >
          <Sparkles className="h-5 w-5" />
        </span>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Ton coach financier
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Pose-lui une question concrète sur ta situation, tes dépenses ou tes objectifs.
          Il s&apos;appuie sur tes données réelles et propose des actions étape par étape.
        </p>
      </div>

      {isDemo && (
        <div className="mx-auto max-w-md rounded-xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.06)] p-4 text-xs text-[hsl(var(--gold))]">
          Mode démo : la conversation s&apos;active après création d&apos;un compte.
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            disabled={disabled}
            className={cn(
              "rounded-xl border border-border/60 bg-card/40 p-3 text-left text-sm transition-colors",
              disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:border-[hsl(var(--gold)/0.4)] hover:bg-card/60",
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
