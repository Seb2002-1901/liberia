import * as React from "react";
import { cn } from "@/lib/utils";

const C = {
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  primary: "#2563EB",
  primaryBg: "#EDF2FD",
  success: "#10A37F",
  successBg: "#ECFDF5",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  pageBg: "#F9FAFD",
};

interface StatCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "positive" | "negative" | "gold";
  hint?: string;
  className?: string;
}

/**
 * Sprint S1 — refonte V3 navy. `gold` mappé sur primary navy/blue (charte V3).
 */
export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  hint,
  className,
}: StatCardProps) {
  const iconStyle = (() => {
    if (tone === "positive") return { backgroundColor: C.successBg, color: C.success };
    if (tone === "negative") return { backgroundColor: C.dangerBg, color: C.danger };
    if (tone === "gold") return { backgroundColor: C.primaryBg, color: C.primary };
    return { backgroundColor: C.pageBg, color: C.textMuted };
  })();
  const valueColor = tone === "negative" ? C.danger : C.textDark;
  return (
    <div
      className={cn("rounded-2xl", className)}
      style={{
        backgroundColor: C.cardBg,
        border: `1px solid ${C.borderGhost}`,
        padding: 20,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
          {label}
        </p>
        {icon && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 8,
              ...iconStyle,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      <p
        style={{
          margin: "12px 0 0 0",
          fontFamily: "Outfit, Inter, system-ui",
          fontSize: 28,
          fontWeight: 700,
          color: valueColor,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {hint && (
        <p style={{ margin: "6px 0 0 0", fontSize: 12, color: C.textMuted, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
}
