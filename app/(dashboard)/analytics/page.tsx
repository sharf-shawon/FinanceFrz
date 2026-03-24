"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";

interface AnalyticsData {
  summary: { totalIncome: number; totalExpense: number; net: number };
  categoryBreakdown: { id: string; name: string; color: string; total: number }[];
  timeSeries: { date: string; income: number; expense: number }[];
}

function getPresetDates(preset: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this_month": return { from: new Date(y, m, 1), to: new Date(y, m + 1, 0) };
    case "last_month": return { from: new Date(y, m - 1, 1), to: new Date(y, m, 0) };
    case "last_3_months": return { from: new Date(y, m - 2, 1), to: new Date(y, m + 1, 0) };
    case "ytd": return { from: new Date(y, 0, 1), to: now };
    default: return null;
  }
}

export default function AnalyticsPage() {
  const t = useTranslations("analytics");
  const tc = useTranslations("common");

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("this_month");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      let from = dateFrom;
      let to = dateTo;
      if (preset !== "custom") {
        const dates = getPresetDates(preset);
        if (dates) {
          from = dates.from.toISOString().slice(0, 10);
          to = dates.to.toISOString().slice(0, 10);
        }
      }
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      const res = await fetch(`/api/analytics?${params}`);
      if (!cancelled) {
        if (res.ok) setData(await res.json());
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [preset, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label>{t("period")}</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">{t("thisMonth")}</SelectItem>
                  <SelectItem value="last_month">{t("lastMonth")}</SelectItem>
                  <SelectItem value="last_3_months">{t("last3Months")}</SelectItem>
                  <SelectItem value="ytd">{t("ytd")}</SelectItem>
                  <SelectItem value="custom">{t("custom")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" && (
              <>
                <div className="space-y-1.5">
                  <Label>{t("from")}</Label>
                  <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
                </div>
                <div className="space-y-1.5">
                  <Label>{t("to")}</Label>
                  <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{tc("loadingAnalytics")}</div>
      ) : !data ? (
        <div className="py-12 text-center text-muted-foreground">{tc("noData")}</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("totalIncome")}</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(data.summary.totalIncome)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("totalExpenses")}</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(data.summary.totalExpense)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{t("netBalance")}</CardTitle>
                <DollarSign className={`h-4 w-4 ${data.summary.net >= 0 ? "text-green-500" : "text-red-500"}`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${data.summary.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatCurrency(data.summary.net)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("incomeVsExpense")}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.timeSeries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t("noData")}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
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

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("expenseBreakdown")}</CardTitle>
              </CardHeader>
              <CardContent>
                {data.categoryBreakdown.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">{t("noExpenseData")}</p>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={data.categoryBreakdown}
                          dataKey="total"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {data.categoryBreakdown.map((entry) => (
                            <Cell key={entry.id} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full space-y-1.5">
                      {data.categoryBreakdown.slice(0, 5).map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span>{cat.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(cat.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
