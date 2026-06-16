"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { getStabilityTier, type ScoreTierColor } from "@/lib/calculations/finance";

const C = {
  navy: "#011E5F",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  success: "#10A37F",
  amber: "#F59E0B",
  danger: "#DC2626",
  pageBg: "#F9FAFD",
};

interface StabilityCardProps {
  score: number;
  className?: string;
}

/**
 * Sprint S1 — refonte V3 navy. Plus de palette gold/var(--secondary).
 * Score Ring V3 avec navy/primary/success/amber/danger selon tier.
 */
export function StabilityCard({ score, className }: StabilityCardProps) {
  const t = useTranslations("dashboard.stability");
  const tier = getStabilityTier(score);
  const angle = (Math.min(Math.max(score, 0), 100) / 100) * 360;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("relative overflow-hidden rounded-2xl", className)}
      style={{
        backgroundColor: C.cardBg,
        border: `1px solid ${C.borderGhost}`,
        padding: 24,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 100% 0%, rgba(37, 99, 235, 0.06) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 24 }}>
        <ScoreRing score={score} angle={angle} color={tier.color} />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              color: C.textMuted,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            {t("label")}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span
              style={{
                fontFamily: "Outfit, Inter, system-ui",
                fontSize: 36,
                fontWeight: 700,
                color: C.navy,
                lineHeight: 1,
                letterSpacing: "-0.02em",
              }}
            >
              {score}
            </span>
            <span style={{ fontSize: 13, color: C.textMuted }}>/ 100</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: C.textDark }}>
            {t(`tiers.${tier.color}.label`)}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
            {t(`tiers.${tier.color}.description`)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ScoreRing({
  score,
  angle,
  color: tierColor,
}: {
  score: number;
  angle: number;
  color: ScoreTierColor;
}) {
  const color =
    tierColor === "gold"
      ? C.primary
      : tierColor === "success"
        ? C.success
        : tierColor === "warning"
          ? C.amber
          : tierColor === "danger"
            ? C.danger
            : C.textDark;

  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 999,
          background: `conic-gradient(${color} ${angle}deg, ${C.pageBg} 0deg)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 6,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          backgroundColor: C.cardBg,
        }}
      >
        <span
          style={{
            fontFamily: "Outfit, Inter, system-ui",
            fontSize: 20,
            fontWeight: 700,
            color: C.textDark,
            letterSpacing: "-0.02em",
          }}
        >
          {score}
        </span>
      </div>
    </div>
  );
}
