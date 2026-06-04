"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
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
   * Falls back to the localised default list when absent.
   */
  suggestions?: readonly string[];
}

export function CoachChat({
  conversationId,
  initialMessages,
  isDemo,
  suggestions,
}: CoachChatProps) {
  const t = useTranslations("app.coach.chat");
  const router = useRouter();
  const defaultSuggestions =
    (t.raw("suggestions.default") as string[]) ?? [];
  const promptList =
    suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;
  const [messages, setMessages] = React.useState<CoachMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [streamedText, setStreamedText] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
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

  // Single source of truth for scrolling the message log to the bottom.
  //
  // We target scrollRef DIRECTLY (scrollTo on the known container)
  // instead of bottomRef.scrollIntoView. scrollIntoView walks every
  // scrollable ancestor — including <body> when the app shell's outer
  // padding makes the document a few rems taller than the viewport —
  // and the browser ends up adjusting body scroll instead of (or in
  // addition to) the chat container, which left the textarea below
  // the fold and the first message pinned at the top of the visible
  // area. scrollTo on scrollRef.current is unambiguous: it scrolls
  // exactly the element we mean.
  //
  // `force=true` (mount / conversation switch): always go to the
  // bottom regardless of current scroll position.
  // `force=false` (during streaming / new message): only follow if
  // the user is already near the bottom — never yank them back down
  // mid-reread of an earlier message.
  const scrollToBottom = React.useCallback((force: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    if (!force) {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom > 120) return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, []);

  // First-paint scroll-to-bottom + focus the input on desktop.
  //
  // Why a multi-stage retry (rAF, double rAF, 100ms, 300ms):
  //   - On mount, React commits the message list synchronously but
  //     the browser hasn't laid out / painted yet. Measuring
  //     scrollHeight in the same tick returns the OLD value (often 0).
  //   - Double requestAnimationFrame catches the first post-paint
  //     frame when scrollHeight is settled.
  //   - 100ms covers the webfont swap repaint (Inter/system fallback
  //     swap pushes message heights by a few pixels).
  //   - 300ms covers slow markdown reflow on very long conversations
  //     and the iOS Safari case where dvh recomputes after the URL
  //     bar collapses.
  //
  // We always pass force=true here so the bottom is reached even if
  // the browser restored an old scroll position on this container.
  //
  // Skip focus on touch devices so iOS / Android don't pop the IME
  // and obscure the conversation behind the keyboard.
  React.useEffect(() => {
    const go = () => scrollToBottom(true);

    let raf2: number | null = null;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(go);
    });
    const t100 = window.setTimeout(go, 100);
    const t300 = window.setTimeout(go, 300);

    if (typeof window !== "undefined") {
      const isTouch =
        window.matchMedia?.("(hover: none) and (pointer: coarse)").matches ??
        false;
      if (!isTouch) textareaRef.current?.focus({ preventScroll: true });
    }

    return () => {
      window.cancelAnimationFrame(raf1);
      if (raf2 !== null) window.cancelAnimationFrame(raf2);
      window.clearTimeout(t100);
      window.clearTimeout(t300);
    };
  }, [conversationId, scrollToBottom]);

  // Follow the conversation as new chunks arrive, but only if the user
  // is already near the bottom. force=false preserves the user's
  // scroll position when they've scrolled up to re-read history.
  React.useEffect(() => {
    scrollToBottom(false);
  }, [messages, streamedText, scrollToBottom]);

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
          throw new Error(data?.error ?? t("fallbackError"));
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
          err instanceof Error ? err.message : t("fallbackError");
        toast.error(message);
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        setStreamedText("");
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [conversationId, disabled, router, t],
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
    <div className="flex h-full min-h-0 flex-col">
      {/*
        min-h-0 on the outer flex column AND on the scrollRef child is
        a defensive guard against the classic flexbox "auto min-size"
        trap. Per spec, a flex item with overflow other than `visible`
        gets `min-height: 0` automatically — but in deeply nested flex
        chains (we have 4 levels here: section > slot > chat > scroll),
        the auto rule can fail in older Chromium / iOS Safari builds,
        letting the scroll container grow to its content height and
        pushing the textarea below the visible viewport. Explicit
        min-h-0 forces the constraint in every browser.
      */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto pb-6"
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
              {t("thinking")}
            </div>
          )}

          {/*
            Sentinel for scroll-to-bottom. Kept as the LAST child of the
            scroll container so scrollIntoView({ block: "end" }) lands on
            the true bottom even after late layout shifts (font swap,
            markdown reflow, streaming bubble height change).
          */}
          <div ref={bottomRef} aria-hidden />
        </div>
      </div>

      <div
        className="border-t border-border/60 bg-background/60 backdrop-blur-md"
        // env(safe-area-inset-bottom) keeps the textarea above the iOS
        // home indicator. The mobile bottom nav of the app shell is
        // already cleared by the layout's height calc; this guards the
        // final pixels on devices with a notch.
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <form onSubmit={onSubmit} className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={
                isDemo ? t("placeholderDemo") : t("placeholder")
              }
              disabled={disabled}
              className="min-h-[44px] max-h-40 flex-1 resize-none"
            />
            <Button
              type="submit"
              variant="gold"
              size="icon"
              disabled={disabled || !input.trim()}
              aria-label={t("sendAriaLabel")}
            >
              {streaming ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("disclaimer")}
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
  const t = useTranslations("app.coach.chat");
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
          {t("emptyTitle")}
        </h2>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          {t("emptyBody")}
        </p>
      </div>

      {isDemo && (
        <div className="mx-auto max-w-md rounded-xl border border-[hsl(var(--gold)/0.3)] bg-[hsl(var(--gold)/0.06)] p-4 text-xs text-[hsl(var(--gold))]">
          {t("demoBanner")}
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
