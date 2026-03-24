"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DayData {
  income: number;
  expense: number;
  transactions: {
    id: string;
    type: string;
    amount: number;
    description: string | null;
    category: { name: string; color: string };
    account: { name: string; currency: string };
  }[];
}

function getDayColor(income: number, expense: number): string {
  if (income === 0 && expense === 0) return "";
  const ratio = income / (income + expense);
  if (ratio > 0.6) return "bg-green-100 dark:bg-green-950/30";
  if (ratio < 0.4) return "bg-red-100 dark:bg-red-950/30";
  return "bg-yellow-50 dark:bg-yellow-950/20";
}

export default function CalendarPage() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [dayMap, setDayMap] = useState<Record<string, DayData>>({});
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const firstDay = new Date(year, month, 1).toISOString().slice(0, 10);
      const lastDay = new Date(year, month + 1, 0).toISOString().slice(0, 10);
      const params = new URLSearchParams({ dateFrom: firstDay, dateTo: lastDay, limit: "500" });
      const res = await fetch(`/api/transactions?${params}`);
      if (!cancelled && res.ok) {
        const data = await res.json();
        const map: Record<string, DayData> = {};
        for (const t of data.transactions) {
          const key = t.date.slice(0, 10);
          if (!map[key]) map[key] = { income: 0, expense: 0, transactions: [] };
          if (t.type === "income") map[key].income += t.amount;
          else map[key].expense += t.amount;
          map[key].transactions.push(t);
        }
        setDayMap(map);
      }
      if (!cancelled) setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const monthName = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedData = selectedDay ? dayMap[selectedDay] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">Daily income &amp; expense overview</p>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-green-100 dark:bg-green-950/30 border" /> More income
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-red-100 dark:bg-red-950/30 border" /> More expenses
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm bg-yellow-50 dark:bg-yellow-950/20 border" /> Balanced
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-3 rounded-sm border" /> No activity
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <Button variant="ghost" size="icon" onClick={prevMonth} aria-label="Previous month">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-base">{monthName}</CardTitle>
          <Button variant="ghost" size="icon" onClick={nextMonth} aria-label="Next month">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {weekdays.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
              {/* Empty cells for first week */}
              {Array.from({ length: firstWeekday }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const data = dayMap[key];
                const colorClass = data ? getDayColor(data.income, data.expense) : "";
                const isToday = new Date().toISOString().slice(0, 10) === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(key)}
                    className={`relative min-h-[56px] rounded-md border p-1.5 text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${colorClass} ${isToday ? "border-primary" : "border-border"}`}
                    aria-label={`${key}${data ? `: income ${formatCurrency(data.income)}, expense ${formatCurrency(data.expense)}` : ""}`}
                  >
                    <span className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>{day}</span>
                    {data && (
                      <div className="mt-0.5 space-y-0.5">
                        {data.income > 0 && (
                          <p className="text-[10px] text-green-700 dark:text-green-400 leading-tight truncate">+{formatCurrency(data.income)}</p>
                        )}
                        {data.expense > 0 && (
                          <p className="text-[10px] text-red-700 dark:text-red-400 leading-tight truncate">-{formatCurrency(data.expense)}</p>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day detail modal */}
      <Dialog open={!!selectedDay} onOpenChange={(o) => !o && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay && new Date(selectedDay + "T00:00:00").toLocaleDateString("default", {
                weekday: "long", year: "numeric", month: "long", day: "numeric"
              })}
            </DialogTitle>
          </DialogHeader>
          {selectedData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-green-50 dark:bg-green-950/30 p-3">
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="font-semibold text-green-700 dark:text-green-400">{formatCurrency(selectedData.income)}</p>
                </div>
                <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="font-semibold text-red-700 dark:text-red-400">{formatCurrency(selectedData.expense)}</p>
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedData.transactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.category.color }} />
                      <div>
                        <p className="text-sm font-medium">{t.description ?? t.category.name}</p>
                        <p className="text-xs text-muted-foreground">{t.account.name}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, t.account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No transactions on this day.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
