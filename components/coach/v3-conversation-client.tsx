"use client";

/**
 * Client component de conversation Coach IA — langage visuel V3 strict.
 *
 * Reprend la totalité de la logique de <CoachChat> existante (state,
 * fetch SSE, scroll multi-stage, expense confirm cards, abort sur
 * unmount, premium gate serveur) mais rend en langage V3 :
 *
 *  - Pas de classes shadcn / Tailwind à l'intérieur
 *  - Tokens C / SHADOW inline (alignés sur coach-v3 landing)
 *  - Bulles AssistantMessage : avatar navy + Sparkles blanc, bulle
 *    #F4F6FB (assistantBubble), border-radius 4/14/14/14
 *  - Bulles UserMessage : navy bg + white text, border-radius
 *    14/4/14/14
 *  - Composer : card V3 (cardBg + SHADOW.card + radius 16), textarea
 *    sans bordure, bouton Envoyer navy
 *  - Suggestions chips : pills V3 (borderGhost + cardBg)
 *  - Empty state V3 (centré, Sparkles navy)
 *  - PrivacyFooter V3 (textLight, cadenas SVG)
 *
 * Aucune modification du backend : /api/ai/chat reste la source de
 * vérité, /app/actions/coach-actions confirmProposedExpenseAction
 * reste utilisée via <ExpenseConfirmCard>.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Markdown } from "@/components/coach/markdown";
import {
  ExpenseConfirmCard,
  type PendingExpense,
} from "@/components/coach/expense-confirm-card";
import type { CoachMessage } from "@/lib/services/coach";

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#F2F4F8",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  assistantBubble: "#F4F6FB",
  success: "#10A37F",
  successBg: "#ECFDF5",
  gold: "#FBBF24",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
  flat: "0 1px 2px rgb(15 23 42 / 0.03)",
};

interface CoachConversationV3Props {
  conversationId: string;
  initialMessages: CoachMessage[];
  isDemo: boolean;
  suggestions?: readonly string[];
}

export function CoachConversationV3Client({
  conversationId,
  initialMessages,
  isDemo,
  suggestions,
}: CoachConversationV3Props) {
  const t = useTranslations("app.coach.chat");
  const router = useRouter();
  const defaultSuggestions = (t.raw("suggestions.default") as string[]) ?? [];
  const promptList =
    suggestions && suggestions.length > 0 ? suggestions : defaultSuggestions;

  const [messages, setMessages] =
    React.useState<CoachMessage[]>(initialMessages);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const [streamedText, setStreamedText] = React.useState("");
  const [pendingByMessage, setPendingByMessage] = React.useState<
    Record<string, PendingExpense[]>
  >({});

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const bottomRef = React.useRef<HTMLDivElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Reset local buffer only on conversation switch — preserves optimistic
  // messages across router.refresh().
  React.useEffect(() => {
    setMessages(initialMessages);
    setStreamedText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const scrollToBottom = React.useCallback((force: boolean) => {
    const el = scrollRef.current;
    if (!el) return;
    if (!force) {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distance > 120) return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, []);

  // Multi-stage scroll-to-bottom on mount (rAF, double rAF, 100ms, 300ms)
  // + focus textarea on non-touch devices. Same trick as CoachChat.
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

  React.useEffect(() => {
    scrollToBottom(false);
  }, [messages, streamedText, scrollToBottom]);

  // Abort in-flight stream on unmount / conversation switch.
  React.useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, [conversationId]);

  const disabled = streaming || isDemo;

  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!content.trim() || disabled) return;

      const optimisticUser: CoachMessage = {
        id: `local-${
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`
        }`,
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

      const pendingFromStream: PendingExpense[] = [];

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
              } else if (event === "propose_expense") {
                if (
                  typeof parsed.toolUseId === "string" &&
                  typeof parsed.amount === "number" &&
                  typeof parsed.currency === "string" &&
                  typeof parsed.label === "string" &&
                  typeof parsed.category === "string" &&
                  (parsed.expense_type === "variable_one_time" ||
                    parsed.expense_type === "fixed_recurring") &&
                  ["one_time", "monthly", "weekly", "yearly"].includes(
                    parsed.frequency,
                  )
                ) {
                  pendingFromStream.push({
                    toolUseId: parsed.toolUseId,
                    expense_type: parsed.expense_type,
                    frequency: parsed.frequency,
                    amount: parsed.amount,
                    currency: parsed.currency,
                    label: parsed.label,
                    category: parsed.category,
                    notes:
                      typeof parsed.notes === "string" ? parsed.notes : null,
                  });
                }
              } else if (event === "error" && typeof parsed.message === "string") {
                throw new Error(parsed.message);
              }
            } catch (err) {
              if (err instanceof Error && event === "error") throw err;
            }
          }
        }

        const newAsstId = `local-asst-${
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`
        }`;
        setMessages((prev) => [
          ...prev,
          {
            id: newAsstId,
            role: "assistant",
            content: assembled,
            created_at: new Date().toISOString(),
          },
        ]);
        if (pendingFromStream.length > 0) {
          setPendingByMessage((prev) => ({
            ...prev,
            [newAsstId]: pendingFromStream,
          }));
        }
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

  const onExpenseResolved = React.useCallback(
    (toolUseId: string, action: "confirmed" | "cancelled") => {
      if (action === "confirmed") router.refresh();
      setPendingByMessage((prev) => {
        const next: Record<string, PendingExpense[]> = {};
        for (const [msgId, list] of Object.entries(prev)) {
          const filtered = list.filter((p) => p.toolUseId !== toolUseId);
          if (filtered.length > 0) next[msgId] = filtered;
        }
        return next;
      });
    },
    [router],
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

  const onTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-grow up to ~6 lines
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  const isEmpty = messages.length === 0 && !streamedText;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1, gap: 12 }}>
      {/* ═══ Thread ═══ */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          padding: "20px 22px",
          backgroundColor: C.cardBg,
          borderRadius: 18,
          boxShadow: SHADOW.card,
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 760, margin: "0 auto" }}>
          {isEmpty && (
            <EmptyState
              isDemo={isDemo}
              suggestions={promptList}
              onPick={(s) => sendMessage(s)}
              disabled={disabled}
            />
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              pendingExpenses={
                m.role === "assistant" ? pendingByMessage[m.id] ?? [] : []
              }
              onExpenseResolved={onExpenseResolved}
            />
          ))}
          {streamedText && (
            <MessageBubble role="assistant" content={streamedText} pending />
          )}
          {streaming && !streamedText && <TypingIndicator label={t("thinking")} />}
          <div ref={bottomRef} aria-hidden />
        </div>
      </div>

      {/* ═══ Composer V3 ═══ */}
      <form
        onSubmit={onSubmit}
        style={{
          backgroundColor: C.cardBg,
          borderRadius: 16,
          boxShadow: SHADOW.card,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={onTextareaInput}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={isDemo ? t("placeholderDemo") : t("placeholder")}
          disabled={disabled}
          aria-label={t("placeholder")}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: 13.5,
            color: C.textDark,
            lineHeight: 1.5,
            padding: "6px 4px",
            minHeight: 24,
            maxHeight: 160,
            fontFamily: "inherit",
            backgroundColor: "transparent",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button
            type="submit"
            aria-label={t("sendAriaLabel")}
            disabled={disabled || !input.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "8px 16px",
              backgroundColor: disabled || !input.trim() ? "#94A3B8" : C.navy,
              color: "white",
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 9,
              border: "none",
              cursor: disabled || !input.trim() ? "not-allowed" : "pointer",
              opacity: disabled && !streaming ? 0.6 : 1,
              transition: "background-color 0.15s",
            }}
          >
            {streaming ? "Envoi…" : "Envoyer"}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

/* ═══════════════ BUBBLES V3 ═══════════════ */

function MessageBubble({
  role,
  content,
  pending,
  pendingExpenses,
  onExpenseResolved,
}: {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
  pendingExpenses?: PendingExpense[];
  onExpenseResolved?: (
    toolUseId: string,
    action: "confirmed" | "cancelled",
  ) => void;
}) {
  if (role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ maxWidth: 480, minWidth: 0 }}>
          <div
            style={{
              padding: "11px 16px",
              backgroundColor: C.navy,
              color: "white",
              borderRadius: "14px 4px 14px 14px",
              fontSize: 13.5,
              lineHeight: 1.55,
              wordBreak: "break-word",
            }}
          >
            {content}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 999,
          backgroundColor: C.navy,
          marginTop: 2,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
        </svg>
      </span>
      <div style={{ maxWidth: 580, minWidth: 0, flex: 1 }}>
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: C.assistantBubble,
            borderRadius: "4px 14px 14px 14px",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: C.textDark,
            wordBreak: "break-word",
          }}
        >
          <Markdown text={content} />
          {pending && (
            <span
              aria-hidden
              style={{
                marginLeft: 4,
                display: "inline-block",
                width: 6,
                height: 12,
                backgroundColor: C.textMuted,
                opacity: 0.5,
                verticalAlign: "baseline",
                animation: "coach-pulse 1s ease-in-out infinite",
              }}
            />
          )}
        </div>
        {pendingExpenses && pendingExpenses.length > 0 && onExpenseResolved && (
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingExpenses.map((p) => (
              <ExpenseConfirmCard
                key={p.toolUseId}
                pending={p}
                onResolved={onExpenseResolved}
              />
            ))}
          </div>
        )}
      </div>
      <style>{`@keyframes coach-pulse { 0%, 100% { opacity: 0.2; } 50% { opacity: 0.7; } }`}</style>
    </div>
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          borderRadius: 999,
          backgroundColor: C.navy,
          marginTop: 2,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
        </svg>
      </span>
      <div>
        <div
          aria-label={label}
          style={{
            padding: "12px 16px",
            backgroundColor: C.assistantBubble,
            borderRadius: "4px 14px 14px 14px",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Dot delay="0s" />
          <Dot delay="0.16s" />
          <Dot delay="0.32s" />
        </div>
      </div>
      <style>{`@keyframes coach-typing { 0%, 80%, 100% { opacity: 0.3; transform: translateY(0); } 40% { opacity: 1; transform: translateY(-2px); } }`}</style>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: 999,
        backgroundColor: C.textMuted,
        animation: "coach-typing 1.2s ease-in-out infinite",
        animationDelay: delay,
      }}
    />
  );
}

/* ═══════════════ EMPTY STATE V3 ═══════════════ */

function EmptyState({
  isDemo,
  suggestions,
  onPick,
  disabled,
}: {
  isDemo: boolean;
  suggestions: readonly string[];
  onPick: (s: string) => void;
  disabled: boolean;
}) {
  const t = useTranslations("app.coach.chat");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "24px 0", textAlign: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: C.navy,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M13 2L4.09 12.97 12 14l-1 8 8.91-10.97L13 12l1-10z" />
          </svg>
        </span>
        <h2
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: C.textDark,
            fontFamily: "Outfit, Inter, system-ui",
            letterSpacing: "-0.02em",
          }}
        >
          {t("emptyTitle")}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: C.textMuted,
            maxWidth: 420,
            lineHeight: 1.5,
          }}
        >
          {t("emptyBody")}
        </p>
      </div>

      {isDemo && (
        <div
          style={{
            display: "inline-flex",
            alignSelf: "center",
            alignItems: "center",
            gap: 8,
            padding: "8px 14px",
            borderRadius: 999,
            backgroundColor: C.primaryBg,
            color: C.primary,
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          {t("demoBanner")}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 8,
          marginTop: 4,
        }}
      >
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            disabled={disabled}
            style={{
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${C.borderGhost}`,
              backgroundColor: C.cardBg,
              fontSize: 12.5,
              fontWeight: 500,
              color: C.textDark,
              textAlign: "left",
              cursor: disabled ? "not-allowed" : "pointer",
              opacity: disabled ? 0.6 : 1,
              boxShadow: SHADOW.flat,
              transition: "transform 0.12s, box-shadow 0.12s",
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
