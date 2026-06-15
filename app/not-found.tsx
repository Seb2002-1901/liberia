import Link from "next/link";
import { getTranslations } from "next-intl/server";

/**
 * Page 404 globale — charte navy V3 inline.
 * Visible quand un user tape une URL inexistante.
 */

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
};

const FONT_DISPLAY = "Outfit, Inter, system-ui";
const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";

export default async function NotFound() {
  const t = await getTranslations("common.errorPages.notFound");
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
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            color: C.primary,
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
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: C.textDark,
            lineHeight: 1.1,
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
        <Link
          href="/"
          style={{
            marginTop: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            padding: "13px 22px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 11,
            textDecoration: "none",
          }}
        >
          {t("cta")}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </Link>
      </main>
    </div>
  );
}
