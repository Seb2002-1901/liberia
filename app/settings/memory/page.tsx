/**
 * /settings/memory — gestion mémoire IA (MemoryEntriesPanel).
 * Refonte V3 Phase Hardening : zéro shadcn dans le header/info card.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BrainCircuit } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { MemoryEntriesPanel } from "@/components/settings/memory-entries-panel";
import {
  getCoachMemoryEnabled,
  listMyMemoryEntries,
} from "@/lib/services/memory-entries";
import { getFinanceData } from "@/lib/services/finance";
import { ROUTES } from "@/lib/constants";
import { V3Shell } from "@/components/layout/v3-shell";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.settings.memoryPage");
  return { title: t("metaTitle") };
}

const C = {
  navy: "#011E5F",
  pageBg: "#F9FAFD",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
};
const FONT_DISPLAY = "Outfit, Inter, system-ui";
const SHADOW_CARD =
  "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)";

export default async function MemorySettingsPage() {
  const t = await getTranslations("app.settings.memoryPage");
  const data = await getFinanceData();

  if (!data.isDemo && !data.profile.onboarding_completed) {
    redirect(ROUTES.onboarding);
  }

  const [entries, enabled] = await Promise.all([
    listMyMemoryEntries(),
    getCoachMemoryEnabled(),
  ]);

  const firstName =
    data.profile.full_name?.split(" ")[0]?.trim() || null;
  const fullName = data.profile.full_name ?? null;

  return (
    <V3Shell
      firstName={firstName}
      fullName={fullName}
      activeHref="/design-match/parametres-v3"
      topbarSubtitle="Pilotez la mémoire de votre conseiller IA."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <Link
          href={ROUTES.settings}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12.5,
            color: C.textMuted,
            textDecoration: "none",
            fontWeight: 500,
            alignSelf: "flex-start",
          }}
        >
          <ArrowLeft width={14} height={14} />
          {t("backToSettings")}
        </Link>

        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
              fontSize: 26,
              fontWeight: 700,
              color: C.textDark,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {t("title")}
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: C.textMuted,
              lineHeight: 1.55,
              maxWidth: 640,
            }}
          >
            {t("description")}
          </p>
        </header>

        <section
          style={{
            padding: "20px 22px",
            backgroundColor: C.cardBg,
            borderRadius: 14,
            boxShadow: SHADOW_CARD,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              aria-hidden
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: C.primaryBg,
                color: C.primary,
              }}
            >
              <BrainCircuit width={15} height={15} />
            </span>
            <h2
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: C.textDark,
                fontFamily: FONT_DISPLAY,
              }}
            >
              {t("howItWorksTitle")}
            </h2>
          </div>
          <p
            style={{
              margin: "10px 0 14px 0",
              fontSize: 12.5,
              color: C.textMuted,
              lineHeight: 1.55,
            }}
          >
            {t("howItWorksBody")}
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 7,
            }}
          >
            {[
              t("howItWorksGoal"),
              t("howItWorksPreference"),
              t("howItWorksEvent"),
              t("howItWorksBlocker"),
            ].map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 12.5,
                  color: C.textMuted,
                  lineHeight: 1.5,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    marginTop: 6,
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    backgroundColor: C.primary,
                    flexShrink: 0,
                  }}
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <MemoryEntriesPanel entries={entries} enabled={enabled} />
      </div>
    </V3Shell>
  );
}
