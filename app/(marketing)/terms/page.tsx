import type { Metadata } from "next";
import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";

const C = {
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
};
const FONT_DISPLAY = "Outfit, Inter, system-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.terms.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

type Section = { heading: string; html: string };

export default async function TermsPage() {
  const t = await getTranslations("marketing.terms");
  const locale = await getLocale();
  const sections = t.raw("sections") as Section[];
  const date = new Date().toLocaleDateString(locale);

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
          margin: "14px 0 6px 0",
          fontFamily: FONT_DISPLAY,
          fontSize: 36,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {t("title")}
      </h1>
      <p style={{ margin: 0, fontSize: 13, color: C.textMuted }}>
        {t("lastUpdatedLabel", { date })}
      </p>
      <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 22 }}>
        {sections.map((s, i) => (
          <Fragment key={i}>
            <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h2
                style={{
                  margin: 0,
                  fontFamily: FONT_DISPLAY,
                  fontSize: 19,
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
    </article>
  );
}
