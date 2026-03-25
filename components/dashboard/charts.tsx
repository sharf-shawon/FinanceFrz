"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

interface CategoryEntry { id: string; name: string; color: string; total: number }
interface AnalyticsSummary {
  categoryBreakdown: CategoryEntry[];
  timeSeries: { date: string; income: number; expense: number }[];
}

export function DashboardCharts() {
  const t = useTranslations("dashboard");
  const [data, setData] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      .toISOString()
      .slice(0, 10);
    fetch(`/api/analytics?dateFrom=${from}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json) setData(json);
      })
      .catch(() => null);
  }, []);

  if (!data) return null;

  // Aggregate timeSeries by month (YYYY-MM) for a cleaner chart
  const monthlyMap = new Map<string, { income: number; expense: number }>();
  for (const entry of data.timeSeries) {
    const month = entry.date.slice(0, 7);
    const existing = monthlyMap.get(month) ?? { income: 0, expense: 0 };
    existing.income += entry.income;
    existing.expense += entry.expense;
    monthlyMap.set(month, existing);
  }
  const monthly = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, d]) => ({ month, ...d }));

  const topCategories = data.categoryBreakdown.slice(0, 6);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Monthly Income vs Expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("monthlyTrend")}</CardTitle>
        </CardHeader>
        <CardContent>
          {monthly.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">{t("noChartData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" radius={[2, 2, 0, 0]} />
                <Bar dataKey="expense" fill="#ef4444" name="Expense" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Spending by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("spendingByCategory")}</CardTitle>
        </CardHeader>
        <CardContent>
          {topCategories.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">{t("noChartData")}</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={topCategories}
                    dataKey="total"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    labelLine={false}
                  >
                    {topCategories.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1.5">
                {topCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <span className="font-medium ml-2">{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
