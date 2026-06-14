"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

/**
 * Page erreur globale — charte navy V3 inline.
 * Affichée par Next.js sur exception runtime non capturée.
 */

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
};

const FONT_DISPLAY = "Outfit, Inter, system-ui";
const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("common.errorPages.global");

  useEffect(() => {
    console.error("[LIBERIA] runtime error:", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.pageBg,
        fontFamily: FONT_STACK,
        color: C.textDark,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ padding: "24px 32px" }}>
        <Link
          href="/"
          aria-label="LIBERIA"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 30,
              height: 30,
              backgroundColor: C.navy,
              borderRadius: 8,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 20V6" />
              <path d="M4 20h14" />
              <path d="M8 14l4-4 3 3 5-6" />
            </svg>
          </span>
          <span
            style={{
              color: C.navy,
              letterSpacing: "0.16em",
              fontSize: 15,
              fontWeight: 700,
            }}
          >
            LIBERIA
          </span>
        </Link>
      </header>
      <main
        style={{
          flex: 1,
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 16,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: 999,
            backgroundColor: C.dangerBg,
            color: C.danger,
            marginBottom: 4,
          }}
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            color: C.danger,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
          }}
        >
          {t("eyebrow")}
        </p>
        <h1
          style={{
            margin: 0,
            fontFamily: FONT_DISPLAY,
            fontSize: 30,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: C.textDark,
            lineHeight: 1.15,
          }}
        >
          {t("title")}
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 14.5,
            color: C.textMuted,
            lineHeight: 1.55,
            maxWidth: 420,
          }}
        >
          {t("body")}
        </p>
        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "13px 22px",
              backgroundColor: C.navy,
              color: "white",
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 11,
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "13px 22px",
              backgroundColor: C.cardBg,
              color: C.textDark,
              fontSize: 14,
              fontWeight: 500,
              borderRadius: 11,
              border: `1px solid #E5E9F0`,
              textDecoration: "none",
            }}
          >
            {t("home")}
          </Link>
        </div>
      </main>
    </div>
  );
}
