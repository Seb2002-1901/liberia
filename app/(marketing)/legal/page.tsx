import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { getTranslations } from "next-intl/server";

const C = {
  navy: "#011E5F",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  amber: "#F59E0B",
  amberBg: "#FEF3C7",
};
const FONT_DISPLAY = "Outfit, Inter, system-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.legal.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LegalPage() {
  const t = await getTranslations("marketing.legal");
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

      <div
        style={{
          marginTop: 32,
          padding: "20px 22px",
          display: "flex",
          gap: 14,
          backgroundColor: C.amberBg,
          border: "1px solid rgba(245, 158, 11, 0.25)",
          borderRadius: 14,
        }}
      >
        <AlertTriangle
          width={20}
          height={20}
          style={{ color: C.amber, flexShrink: 0, marginTop: 2 }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: C.textDark }}>
            {t("headline")}
          </p>
          <p
            style={{ margin: 0, fontSize: 13.5, color: C.textMuted, lineHeight: 1.6 }}
            dangerouslySetInnerHTML={{ __html: t.raw("body1") as string }}
          />
          <p style={{ margin: 0, fontSize: 13.5, color: C.textMuted, lineHeight: 1.6 }}>
            {t("body2")}
          </p>
        </div>
      </div>
    </article>
  );
}
