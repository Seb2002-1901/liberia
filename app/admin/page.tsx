import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Sparkles, XCircle } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { isAdminUser } from "@/lib/admin";
import { getAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getReadinessSummary } from "@/lib/readiness";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("app.admin.metadata");
  return {
    title: t("title"),
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

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
  success: "#10A37F",
  successBg: "#ECFDF5",
  amber: "#F59E0B",
  amberBg: "#FEF3C7",
  danger: "#DC2626",
};
const FONT_DISPLAY = "Outfit, Inter, system-ui";
const FONT_STACK = "Inter, system-ui, -apple-system, sans-serif";
const SHADOW_CARD =
  "0 1px 2px rgb(15 23 42 / 0.03), 0 12px 32px -10px rgb(15 23 42 / 0.06)";

/**
 * Minimal admin analytics surface — refonte V3 charte navy inline.
 * Logique data-loading (getAdminClient + Promise.all count queries)
 * intacte. Gated 404 si non admin.
 */
export default async function AdminPage() {
  if (!isSupabaseConfigured() || !isAdminConfigured()) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdminUser(user?.id)) notFound();

  const [stats, t, locale] = await Promise.all([
    loadStats(),
    getTranslations("app.admin"),
    getLocale(),
  ]);
  const readiness = getReadinessSummary();
  const numberFormatter = new Intl.NumberFormat(locale);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: C.pageBg,
        fontFamily: FONT_STACK,
        color: C.textDark,
      }}
    >
      <style>{`
        @media (max-width: 640px) {
          [data-admin-grid] { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
      `}</style>
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "40px 24px 64px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              alignSelf: "flex-start",
              padding: "5px 12px",
              borderRadius: 999,
              backgroundColor: C.primaryBg,
              color: C.primary,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <Sparkles width={11} height={11} />
            {t("eyebrow")}
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: FONT_DISPLAY,
              fontSize: 28,
              fontWeight: 700,
              color: C.textDark,
              letterSpacing: "-0.02em",
              lineHeight: 1.15,
            }}
          >
            {t("pageTitle")}
          </h1>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: 13.5,
              color: C.textMuted,
              lineHeight: 1.55,
            }}
          >
            {t("intro")}
          </p>
        </header>

        {/* Readiness card */}
        <section
          style={{
            padding: "20px 22px",
            backgroundColor: readiness.productionReady ? C.successBg : C.amberBg,
            border: `1px solid ${
              readiness.productionReady
                ? "rgba(16, 163, 127, 0.22)"
                : "rgba(245, 158, 11, 0.22)"
            }`,
            borderRadius: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <h2
              style={{
                margin: 0,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: C.textDark,
                fontFamily: FONT_DISPLAY,
              }}
            >
              <Sparkles width={15} height={15} style={{ color: C.primary }} />
              {t("readiness.title")}
            </h2>
            <span
              style={{
                padding: "5px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                backgroundColor: readiness.productionReady ? C.success : C.amber,
                color: "white",
                letterSpacing: "0.02em",
              }}
            >
              {readiness.productionReady
                ? t("readiness.ready")
                : t("readiness.missing", {
                    count: readiness.counts.missingRequired,
                  })}
            </span>
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            {readiness.checks.map((c) => (
              <li
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "8px 10px",
                  fontSize: 12.5,
                  backgroundColor: C.cardBg,
                  borderRadius: 8,
                }}
              >
                <span style={{ flexShrink: 0, marginTop: 1 }}>
                  {c.ok ? (
                    <CheckCircle2 width={14} height={14} style={{ color: C.success }} />
                  ) : c.status === "required" ? (
                    <XCircle width={14} height={14} style={{ color: C.danger }} />
                  ) : (
                    <Circle width={14} height={14} style={{ color: C.textLight }} />
                  )}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 600, color: C.textDark }}>{c.label}</span>
                    <span
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.14em",
                        color: C.textMuted,
                      }}
                    >
                      {c.status}
                    </span>
                  </div>
                  {!c.ok && c.hint && (
                    <p style={{ margin: "3px 0 0 0", fontSize: 11.5, color: C.textMuted, lineHeight: 1.45 }}>
                      {c.hint}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <p style={{ margin: "12px 0 0 0", fontSize: 10.5, color: C.textMuted }}>
            {t("readiness.envNote")}
          </p>
        </section>

        <Section title={t("sections.acquisition")}>
          <Stat label={t("stats.totalUsers")} value={stats.totalUsers} formatter={numberFormatter} />
          <Stat
            label={t("stats.onboardedUsers")}
            value={stats.onboardedUsers}
            formatter={numberFormatter}
            hint={pctHint(stats.onboardedUsers, stats.totalUsers, t)}
          />
        </Section>

        <Section title={t("sections.subscription")}>
          <Stat label={t("stats.trialingSubs")} value={stats.trialingSubs} formatter={numberFormatter} tone="primary" />
          <Stat label={t("stats.activeSubs")} value={stats.activeSubs} formatter={numberFormatter} tone="success" />
          <Stat label={t("stats.warningSubs")} value={stats.warningSubs} formatter={numberFormatter} tone="amber" />
          <Stat label={t("stats.canceledSubs")} value={stats.canceledSubs} formatter={numberFormatter} />
        </Section>

        <Section title={t("sections.coach")}>
          <Stat label={t("stats.aiConversations")} value={stats.aiConversations} formatter={numberFormatter} />
          <Stat
            label={t("stats.aiMessagesLast7d")}
            value={stats.aiMessagesLast7d}
            formatter={numberFormatter}
            hint={t("stats.aiMessagesLast7dHint")}
          />
          <Stat label={t("stats.financialPlans")} value={stats.financialPlans} formatter={numberFormatter} />
          <Stat label={t("stats.planStepsCompleted")} value={stats.planStepsCompleted} formatter={numberFormatter} />
        </Section>

        <Section title={t("sections.goals")}>
          <Stat label={t("stats.totalGoals")} value={stats.totalGoals} formatter={numberFormatter} />
          <Stat
            label={t("stats.completedGoals")}
            value={stats.completedGoals}
            formatter={numberFormatter}
          />
        </Section>

        <section
          style={{
            padding: "18px 20px",
            backgroundColor: C.cardBg,
            borderRadius: 14,
            boxShadow: SHADOW_CARD,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 12.5,
              fontWeight: 700,
              color: C.textDark,
              letterSpacing: "-0.01em",
            }}
          >
            {t("notesTitle")}
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            <p style={{ margin: 0, fontSize: 11.5, color: C.textMuted, lineHeight: 1.55 }}>
              <ArrowRight width={11} height={11} style={{ display: "inline", marginRight: 4, color: C.primary, verticalAlign: -1 }} />
              <span dangerouslySetInnerHTML={{ __html: t.raw("note1") as string }} />
            </p>
            <p style={{ margin: 0, fontSize: 11.5, color: C.textMuted, lineHeight: 1.55 }}>
              <ArrowRight width={11} height={11} style={{ display: "inline", marginRight: 4, color: C.primary, verticalAlign: -1 }} />
              {t("note2")}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2
        style={{
          margin: 0,
          fontSize: 10.5,
          fontWeight: 700,
          color: C.primary,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </h2>
      <div
        data-admin-grid
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {children}
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  formatter,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "neutral" | "primary" | "success" | "amber";
  formatter: Intl.NumberFormat;
}) {
  const valueColor =
    tone === "primary"
      ? C.primary
      : tone === "success"
        ? C.success
        : tone === "amber"
          ? C.amber
          : C.textDark;
  return (
    <div
      style={{
        padding: "14px 14px",
        backgroundColor: C.cardBg,
        border: `1px solid ${C.borderGhost}`,
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 10,
          fontWeight: 600,
          color: C.textMuted,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "4px 0 0 0",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: FONT_DISPLAY,
          fontVariantNumeric: "tabular-nums",
          color: valueColor,
          lineHeight: 1.1,
        }}
      >
        {formatter.format(value)}
      </p>
      {hint && (
        <p style={{ margin: "2px 0 0 0", fontSize: 10.5, color: C.textMuted }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function pctHint(
  n: number,
  d: number,
  t: (key: string, values?: Record<string, string | number>) => string,
): string | undefined {
  if (d === 0) return undefined;
  return t("pctHint", { pct: Math.round((n / d) * 100) });
}

type Stats = {
  totalUsers: number;
  onboardedUsers: number;
  trialingSubs: number;
  activeSubs: number;
  warningSubs: number;
  canceledSubs: number;
  aiConversations: number;
  aiMessagesLast7d: number;
  financialPlans: number;
  planStepsCompleted: number;
  totalGoals: number;
  completedGoals: number;
};

async function loadStats(): Promise<Stats> {
  const admin = getAdminClient();
  const SEVEN_DAYS_AGO = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const toCount = (r: { count: number | null }): number => r.count ?? 0;

  const [
    totalUsers,
    onboardedUsers,
    trialingSubs,
    activeSubs,
    pastDueSubs,
    unpaidSubs,
    pausedSubs,
    canceledSubs,
    aiConversations,
    aiMessagesLast7d,
    financialPlans,
    planStepsCompleted,
    totalGoals,
    completedGoals,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }).then(toCount),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("onboarding_completed", true)
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "trialing")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "past_due")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "unpaid")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "paused")
      .then(toCount),
    admin
      .from("subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("status", "canceled")
      .then(toCount),
    admin.from("ai_conversations").select("id", { count: "exact", head: true }).then(toCount),
    admin
      .from("ai_messages")
      .select("id", { count: "exact", head: true })
      .gte("created_at", SEVEN_DAYS_AGO)
      .then(toCount),
    admin.from("financial_plans").select("id", { count: "exact", head: true }).then(toCount),
    admin
      .from("financial_plan_steps")
      .select("id", { count: "exact", head: true })
      .eq("is_completed", true)
      .then(toCount),
    admin.from("goals").select("id", { count: "exact", head: true }).then(toCount),
    admin
      .from("goals")
      .select("id", { count: "exact", head: true })
      .eq("is_completed", true)
      .then(toCount),
  ]);

  return {
    totalUsers,
    onboardedUsers,
    trialingSubs,
    activeSubs,
    warningSubs: pastDueSubs + unpaidSubs + pausedSubs,
    canceledSubs,
    aiConversations,
    aiMessagesLast7d,
    financialPlans,
    planStepsCompleted,
    totalGoals,
    completedGoals,
  };
}
