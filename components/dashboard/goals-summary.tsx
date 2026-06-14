import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatCurrency } from "@/lib/utils";
import { ROUTES, GOAL_TYPES } from "@/lib/constants";
import type { Goal } from "@/types/database";

const C = {
  navy: "#011E5F",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  pageBg: "#F9FAFD",
};

/**
 * Sprint S1 — refonte V3 navy. Progress bar gold → primary navy gradient.
 */
export async function GoalsSummary({
  goals,
  currency = "CHF",
}: {
  goals: Goal[];
  currency?: string;
}) {
  const t = await getTranslations("dashboard.goalsSummary");
  const tGoals = await getTranslations("onboarding.goals");
  if (!goals.length) {
    return (
      <div
        style={{
          backgroundColor: C.cardBg,
          border: `1px solid ${C.borderGhost}`,
          borderRadius: 16,
          padding: 20,
        }}
      >
        <h3
          style={{
            margin: 0,
            fontFamily: "Outfit, Inter, system-ui",
            fontSize: 16,
            fontWeight: 700,
            color: C.textDark,
            letterSpacing: "-0.01em",
          }}
        >
          {t("title")}
        </h3>
        <div
          style={{
            marginTop: 14,
            padding: "20px 16px",
            backgroundColor: C.pageBg,
            borderRadius: 12,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            textAlign: "center",
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: C.primaryBg,
              color: C.primary,
            }}
          >
            <Target width={18} height={18} />
          </span>
          <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: C.textDark }}>
            {t("emptyTitle")}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.5, maxWidth: 280 }}>
            {t("emptyDescription")}
          </p>
          <Link
            href={ROUTES.goals}
            style={{
              marginTop: 4,
              display: "inline-flex",
              alignItems: "center",
              padding: "8px 14px",
              backgroundColor: C.navy,
              color: "white",
              fontSize: 12.5,
              fontWeight: 600,
              borderRadius: 9,
              textDecoration: "none",
            }}
          >
            {t("emptyCta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: C.cardBg,
        border: `1px solid ${C.borderGhost}`,
        borderRadius: 16,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "Outfit, Inter, system-ui",
            fontSize: 16,
            fontWeight: 700,
            color: C.textDark,
            letterSpacing: "-0.01em",
          }}
        >
          {t("active")}
        </h3>
        <Link
          href={ROUTES.goals}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "4px 8px",
            fontSize: 12,
            color: C.primary,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          {t("all")}
          <ArrowRight width={13} height={13} />
        </Link>
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 18 }}>
        {goals.slice(0, 3).map((g) => {
          const ratio = g.target_amount
            ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
            : 0;
          const known = GOAL_TYPES.find((tp) => tp.id === g.type);
          const typeLabel = known ? tGoals(known.id) : g.type;
          return (
            <div key={g.id} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: C.textDark,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.title}
                  </p>
                  <p style={{ margin: "2px 0 0 0", fontSize: 11, color: C.textMuted }}>
                    {typeLabel}
                  </p>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12.5,
                    color: C.textMuted,
                    fontVariantNumeric: "tabular-nums",
                    flexShrink: 0,
                  }}
                >
                  {formatCurrency(g.current_amount, currency)}{" "}
                  <span style={{ color: C.textDark }}>
                    / {formatCurrency(g.target_amount, currency)}
                  </span>
                </p>
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: C.pageBg,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${ratio}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${C.primary}, ${C.navy})`,
                    borderRadius: 999,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
