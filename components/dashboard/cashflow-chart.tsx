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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface CashflowChartProps {
  income: number;
  expenses: number;
  currency?: string;
}

export function CashflowChart({ income, expenses, currency = "CHF" }: CashflowChartProps) {
  // Phase 1: lissage déterministe à des fins d'illustration tant que
  // l'historique mensuel n'est pas collecté. Remplacé par la série réelle
  // dès que les transactions horodatées seront accumulées.
  const months = ["−5 mois", "−4 mois", "−3 mois", "−2 mois", "−1 mois", "Ce mois"];
  const data = months.map((m, i) => {
    const wobble = Math.sin(i * 0.7) * 0.05;
    return {
      name: m,
      Revenus: Math.round(income * (1 + wobble)),
      Dépenses: Math.round(expenses * (1 - wobble * 0.6)),
    };
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Flux mensuel</CardTitle>
        <Badge variant="secondary" className="font-normal">Aperçu lissé</Badge>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="liberiaIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="liberiaExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border) / 0.5)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
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
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                }}
                formatter={(value: number) => formatCurrency(value, currency)}
              />
              <Area
                type="monotone"
                dataKey="Revenus"
                stroke="hsl(var(--gold))"
                strokeWidth={2}
                fill="url(#liberiaIncome)"
              />
              <Area
                type="monotone"
                dataKey="Dépenses"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={2}
                fill="url(#liberiaExpense)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
