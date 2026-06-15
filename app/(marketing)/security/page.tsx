import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import {
  Database,
  HeartHandshake,
  KeyRound,
  Lock,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ROUTES } from "@/lib/constants";

const C = {
  navy: "#011E5F",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
};
const FONT_DISPLAY = "Outfit, Inter, system-ui";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketing.securityPage.metadata");
  return {
    title: t("title"),
    description: t("description"),
  };
}

const PILLAR_ICONS = [
  Lock,
  UserCheck,
  KeyRound,
  Database,
  ShieldCheck,
  HeartHandshake,
] as const;

type Pillar = { title: string; body: string };
type Section = { heading: string; html: string };

export default async function SecurityPage() {
  const t = await getTranslations("marketing.securityPage");
  const pillars = t.raw("pillars") as Pillar[];
  const sections = t.raw("sections") as Section[];

  return (
    <article
      className="container"
      style={{
        maxWidth: 880,
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

      <div
        style={{
          marginTop: 36,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}
      >
        {pillars.map((p, i) => {
          const Icon = PILLAR_ICONS[i] ?? Lock;
          return (
            <PillarCard
              key={i}
              icon={<Icon width={16} height={16} />}
              title={p.title}
              body={p.body}
            />
          );
        })}
      </div>

      <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 26 }}>
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
          href={ROUTES.privacy}
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "13px 22px",
            backgroundColor: C.navy,
            color: "white",
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 11,
            textDecoration: "none",
          }}
        >
          {t("ctaPrivacy")}
        </Link>
        <Link
          href={ROUTES.aiPolicy}
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
          {t("ctaAiPolicy")}
        </Link>
      </div>
    </article>
  );
}

function PillarCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div
      style={{
        padding: "20px 22px",
        backgroundColor: C.cardBg,
        border: `1px solid ${C.borderGhost}`,
        borderRadius: 14,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: C.primaryBg,
          color: C.primary,
        }}
      >
        {icon}
      </span>
      <p
        style={{
          margin: "14px 0 0 0",
          fontSize: 14,
          fontWeight: 600,
          color: C.textDark,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: "5px 0 0 0",
          fontSize: 12.5,
          color: C.textMuted,
          lineHeight: 1.55,
        }}
      >
        {body}
      </p>
    </div>
  );
}
