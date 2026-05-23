"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

interface ExpenseBreakdownProps {
  data: Array<{ category: string; total: number }>;
  currency?: string;
}

const COLORS = [
  "hsl(40, 50%, 65%)",
  "hsl(35, 30%, 50%)",
  "hsl(220, 14%, 60%)",
  "hsl(280, 10%, 55%)",
  "hsl(160, 25%, 55%)",
  "hsl(200, 20%, 50%)",
  "hsl(20, 25%, 55%)",
  "hsl(340, 25%, 60%)",
  "hsl(60, 20%, 55%)",
  "hsl(0, 0%, 55%)",
];

export function ExpenseBreakdown({ data, currency = "EUR" }: ExpenseBreakdownProps) {
  const labelFor = (id: string) =>
    EXPENSE_CATEGORIES.find((c) => c.id === id)?.label ?? id;

  const chartData = data
    .filter((d) => d.total > 0)
    .map((d) => ({ name: labelFor(d.category), value: d.total }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Répartition des dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            Pas encore de dépenses enregistrées.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Répartition des dépenses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={92}
                paddingAngle={2}
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={2}
              >
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                }}
                formatter={(value: number) => formatCurrency(value, currency)}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
