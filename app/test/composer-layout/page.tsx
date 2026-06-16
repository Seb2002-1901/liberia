"use client";

/**
 * Sprint Iris — fixture de régression composer sticky.
 *
 * Cette route reproduit la structure layout EXACTE de /coach/[id]/page.tsx
 * (sidebar 280 + topbar + main grid 1fr × 2 cols + ChatColumn) avec une
 * conversation de 120 messages synthétiques. Permet à Playwright de
 * valider que le composer reste en bas du viewport quelle que soit la
 * longueur du thread, sur desktop ET mobile.
 *
 * Pas de Supabase, pas d'Anthropic, pas d'auth — accessible directement
 * sur preview pour le test de régression.
 */

import * as React from "react";

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#F2F4F8",
  textDark: "#0F172A",
  textMuted: "#64748B",
  assistantBubble: "#F4F6FB",
};

const SHADOW = {
  card: "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)",
};

const MESSAGES = Array.from({ length: 120 }, (_, i) => ({
  id: `msg-${i}`,
  role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
  content:
    i % 2 === 0
      ? `User message #${i} — ceci est un message utilisateur de longueur moyenne pour reproduire un thread réel.`
      : `Réponse Iris #${i} — analyse, recommandation et action concrète. Iris recommande d'orienter X CHF vers le fonds d'urgence cette semaine.`,
}));

export default function ComposerLayoutFixture() {
  return (
    <>
      <style>{`
        body { margin: 0; }
        @media (max-width: 999px) {
          [data-cl-sidebar] { display: none !important; }
          [data-cl-content] { margin-left: 0 !important; }
          [data-cl-main] { grid-template-columns: 1fr !important; padding: 0 16px 16px 16px !important; }
          [data-cl-rail] { display: none !important; }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          height: "100vh",
          minHeight: "100dvh",
          maxHeight: "100dvh",
          overflow: "hidden",
          backgroundColor: C.pageBg,
          fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        }}
      >
        <aside
          data-cl-sidebar
          data-testid="cl-sidebar"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: 280,
            height: "100vh",
            background: C.cardBg,
            borderRight: `1px solid ${C.borderGhost}`,
          }}
        />
        <div
          data-cl-content
          data-testid="cl-content"
          style={{
            marginLeft: 280,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <header
            data-testid="cl-topbar"
            style={{
              height: 64,
              flexShrink: 0,
              padding: "0 24px",
              borderBottom: `1px solid ${C.borderGhost}`,
              background: C.cardBg,
              display: "flex",
              alignItems: "center",
            }}
          >
            <h1 style={{ margin: 0, fontSize: 14 }}>Test fixture composer</h1>
          </header>
          <main
            data-cl-main
            data-testid="cl-main"
            style={{
              flex: 1,
              minHeight: 0,
              padding: "0 32px 16px 32px",
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) 320px",
              gridTemplateRows: "1fr",
              gap: 24,
              maxWidth: 1440,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <ChatColumn />
            <div
              data-cl-rail
              data-testid="cl-rail"
              style={{ background: C.cardBg, borderRadius: 12 }}
            />
          </main>
        </div>
      </div>
    </>
  );
}

function ChatColumn() {
  return (
    <div
      data-testid="cl-chatcolumn"
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        gap: 12,
      }}
    >
      <div
        data-testid="cl-hero"
        style={{
          padding: "12px 16px",
          background: C.cardBg,
          borderRadius: 12,
          boxShadow: SHADOW.card,
          flexShrink: 0,
        }}
      >
        <strong>Conversation fixture</strong>
      </div>
      <ConversationClient />
      <footer
        data-testid="cl-footer"
        style={{
          fontSize: 11,
          color: C.textMuted,
          textAlign: "center",
          padding: 8,
          flexShrink: 0,
        }}
      >
        © Test fixture
      </footer>
    </div>
  );
}

function ConversationClient() {
  const [value, setValue] = React.useState("");
  return (
    <div
      data-testid="cl-conv-root"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        flex: 1,
        gap: 12,
      }}
    >
      <div
        data-testid="cl-thread"
        style={{
          flex: 1,
          minHeight: 0,
          padding: "20px 22px",
          backgroundColor: C.cardBg,
          borderRadius: 18,
          boxShadow: SHADOW.card,
          overflowY: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
            maxWidth: 760,
            margin: "0 auto",
          }}
        >
          {MESSAGES.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} />
          ))}
        </div>
      </div>
      <form
        data-testid="cl-composer"
        style={{
          backgroundColor: C.cardBg,
          borderRadius: 16,
          boxShadow: SHADOW.card,
          padding: "12px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingBottom: "max(12px, env(safe-area-inset-bottom))",
          flexShrink: 0,
        }}
      >
        <textarea
          data-testid="cl-textarea"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Tape un message…"
          rows={1}
          style={{
            width: "100%",
            border: "none",
            outline: "none",
            resize: "none",
            fontSize: 16,
            lineHeight: 1.4,
            padding: "6px 4px",
            minHeight: 24,
            maxHeight: 160,
            fontFamily: "inherit",
            backgroundColor: "transparent",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            data-testid="cl-send"
            type="button"
            style={{
              padding: "8px 16px",
              backgroundColor: C.navy,
              color: "white",
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 9,
              border: "none",
              cursor: "pointer",
            }}
          >
            Envoyer
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  if (role === "user") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          style={{
            maxWidth: 480,
            padding: "11px 16px",
            backgroundColor: C.navy,
            color: "white",
            borderRadius: "14px 4px 14px 14px",
            fontSize: 13.5,
            lineHeight: 1.55,
          }}
        >
          {content}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: "flex", justifyContent: "flex-start" }}>
      <div
        style={{
          maxWidth: 540,
          padding: "11px 16px",
          backgroundColor: C.assistantBubble,
          color: C.textDark,
          borderRadius: "4px 14px 14px 14px",
          fontSize: 13.5,
          lineHeight: 1.55,
        }}
      >
        {content}
      </div>
    </div>
  );
}
