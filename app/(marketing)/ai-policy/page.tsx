import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/constants";

const C = {
  navy: "#011E5F",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
};
const FONT_DISPLAY = "Outfit, Inter, system-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.aiPolicy.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

type Section = { heading: string; html: string };

export default async function AiPolicyPage() {
  const t = await getTranslations("marketing.aiPolicy");
  const sections = t.raw("sections") as Section[];

  return (
    <article
      className="container"
      style={{
        maxWidth: 800,
        padding: "64px 24px",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
        color: C.textDark,
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
          margin: "14px 0 0 0",
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
          margin: "14px 0 0 0",
          fontSize: 15,
          color: C.textMuted,
          lineHeight: 1.6,
          maxWidth: 640,
        }}
      >
        {t("intro")}
      </p>

      <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 26 }}>
        {sections.map((s, i) => (
          <Fragment key={i}>
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 22,
                  fontWeight: 700,
                  color: C.textDark,
                  letterSpacing: "-0.01em",
                }}
              >
                {s.heading}
              </h2>
              <div
                style={{
                  fontSize: 14.5,
                  color: C.textMuted,
                  lineHeight: 1.65,
                }}
                dangerouslySetInnerHTML={{ __html: s.html }}
              />
            </section>
          </Fragment>
        ))}
      </div>

      <div style={{ marginTop: 48, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href={ROUTES.security}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "13px 22px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 11,
            textDecoration: "none",
          }}
        >
          <Sparkles width={14} height={14} />
          {t("ctaSecurity")}
        </Link>
        <Link
          href={ROUTES.privacy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "13px 22px",
            backgroundColor: C.cardBg,
            color: C.textDark,
            fontSize: 14,
            fontWeight: 500,
            borderRadius: 11,
            textDecoration: "none",
            border: `1px solid ${C.borderGhost}`,
          }}
        >
          {t("ctaPrivacy")}
        </Link>
      </div>
    </article>
  );
}
