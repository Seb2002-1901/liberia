"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";
import { formatCurrency } from "@/lib/utils";

const C = {
  navy: "#011E5F",
  cardBg: "#FFFFFF",
  borderGhost: "#E5E9F0",
  textDark: "#0F172A",
  textMuted: "#64748B",
  textLight: "#94A3B8",
  primary: "#2563EB",
};

interface CashflowChartProps {
  income: number;
  expenses: number;
  currency?: string;
}

/**
 * Sprint S1 — refonte V3 navy. Plus de palette gold/var(--*). Charte
 * cohérente avec dashboard-v3 EvolutionCard.
 */
export function CashflowChart({ income, expenses, currency = "CHF" }: CashflowChartProps) {
  const t = useTranslations("dashboard.cashflowChart");
  const months = [
    t("monthsAgo", { n: 5 }),
    t("monthsAgo", { n: 4 }),
    t("monthsAgo", { n: 3 }),
    t("monthsAgo", { n: 2 }),
    t("monthsAgo", { n: 1 }),
    t("thisMonth"),
  ];
  const incomeLabel = t("income");
  const expensesLabel = t("expenses");
  const data = months.map((m, i) => {
    const wobble = Math.sin(i * 0.7) * 0.05;
    return {
      name: m,
      [incomeLabel]: Math.round(income * (1 + wobble)),
      [expensesLabel]: Math.round(expenses * (1 - wobble * 0.6)),
    };
  });

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
          {t("title")}
        </h3>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            backgroundColor: "#EDF2FD",
            color: C.primary,
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {t("preview")}
        </span>
      </div>
      <div style={{ marginTop: 16, height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="liberiaIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.primary} stopOpacity={0.4} />
                <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="liberiaExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.navy} stopOpacity={0.3} />
                <stop offset="100%" stopColor={C.navy} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={C.borderGhost} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              stroke={C.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke={C.textMuted}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v) =>
                v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`
              }
            />
            <Tooltip
              contentStyle={{
                background: C.cardBg,
                border: `1px solid ${C.borderGhost}`,
                borderRadius: 12,
                fontSize: 12,
                color: C.textDark,
              }}
              formatter={(value: number) => formatCurrency(value, currency)}
            />
            <Area
              type="monotone"
              dataKey={incomeLabel}
              stroke={C.primary}
              strokeWidth={2}
              fill="url(#liberiaIncome)"
            />
            <Area
              type="monotone"
              dataKey={expensesLabel}
              stroke={C.navy}
              strokeWidth={2}
              fill="url(#liberiaExpense)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
