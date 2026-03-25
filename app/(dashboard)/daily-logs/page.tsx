"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Plus, Trash2, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Suggestion {
  description: string;
  type: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface DailyTransaction {
  id: string;
  type: string;
  description: string | null;
  amount: number;
  quantity: number;
  rate: number | null;
  categoryId: string | null;
  account: { id: string; name: string; currency: string };
  category: { id: string; name: string; color: string; type: string } | null;
}

interface LogRow {
  _key: string; // stable React key
  description: string;
  quantity: string;
  rate: string;
  categoryId: string;
}

let keyCounter = 0;
function nextKey(): string {
  return `row-${++keyCounter}`;
}

function emptyRow(): LogRow {
  return { _key: nextKey(), description: "", quantity: "1", rate: "", categoryId: "" };
}

function rowTotal(row: LogRow): number {
  const q = parseFloat(row.quantity);
  const r = parseFloat(row.rate);
  if (!isFinite(q) || !isFinite(r) || q <= 0 || r <= 0) return 0;
  return q * r;
}

function txnToRow(t: DailyTransaction): LogRow {
  return {
    _key: nextKey(),
    description: t.description ?? "",
    quantity: String(t.quantity ?? 1),
    rate: t.rate != null ? String(t.rate) : String(t.amount),
    categoryId: t.categoryId ?? "",
  };
}

function toLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ---------------------------------------------------------------------------
// Autocomplete Input
// ---------------------------------------------------------------------------
interface AutocompleteInputProps {
  value: string;
  suggestions: string[];
  onChange: (val: string) => void;
  onSuggestionSelect: (val: string) => void;
  placeholder?: string;
  "aria-label"?: string;
}

function AutocompleteInput({
  value,
  suggestions,
  onChange,
  onSuggestionSelect,
  placeholder,
  "aria-label": ariaLabel,
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );
  const showDropdown = open && filtered.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      onSuggestionSelect(filtered[activeIdx]);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {showDropdown && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {filtered.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === activeIdx}
              className={`cursor-pointer px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground ${
                i === activeIdx ? "bg-accent text-accent-foreground" : ""
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                onSuggestionSelect(s);
                setOpen(false);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function DailyLogsPage() {
  const t = useTranslations("dailyLogs");
  const tc = useTranslations("common");

  const [currentDate, setCurrentDate] = useState<string>(() => toLocalDate(new Date()));
  const [previousBalance, setPreviousBalance] = useState<number>(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  const [incomeRows, setIncomeRows] = useState<LogRow[]>([emptyRow()]);
  const [expenseRows, setExpenseRows] = useState<LogRow[]>([emptyRow()]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Modal states
  const [navGuardOpen, setNavGuardOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const currency = "BDT";

  // ---------------------------------------------------------------------------
  // Derived totals (all computed in real-time)
  // ---------------------------------------------------------------------------
  const totalIncome = incomeRows.reduce((s, r) => s + rowTotal(r), 0);
  const totalExpense = expenseRows.reduce((s, r) => s + rowTotal(r), 0);
  const netBalance = previousBalance + totalIncome - totalExpense;

  // ---------------------------------------------------------------------------
  // Load data for the selected date
  // ---------------------------------------------------------------------------
  const loadData = useCallback(
    async (date: string) => {
      setLoading(true);
      setSaveError("");
      try {
        const res = await fetch(`/api/daily-logs?date=${date}`);
        if (!res.ok) return;
        const data = await res.json();
        setPreviousBalance(data.previousBalance ?? 0);
        setSuggestions(data.suggestions ?? []);

        const dayTxns: DailyTransaction[] = data.transactions ?? [];

        const inc = dayTxns.filter((t) => t.type === "income").map(txnToRow);
        const exp = dayTxns.filter((t) => t.type === "expense").map(txnToRow);

        setIncomeRows(inc.length ? inc : [emptyRow()]);
        setExpenseRows(exp.length ? exp : [emptyRow()]);
        setIsDirty(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Initial load
  useEffect(() => {
    async function bootstrap() {
      await loadData(currentDate);
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when date changes (but not on first mount — handled above)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return; }
    loadData(currentDate);
  }, [currentDate, loadData]);

  // ---------------------------------------------------------------------------
  // beforeunload guard
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isDirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  // Intercept in-page navigation link clicks when dirty
  useEffect(() => {
    if (!isDirty) return;
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      // Only intercept same-origin internal navigation
      if (target.hostname && target.hostname !== window.location.hostname) return;
      e.preventDefault();
      setPendingHref(href);
      setNavGuardOpen(true);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [isDirty]);

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------
  function navigateDate(delta: number) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    setCurrentDate(toLocalDate(d));
  }

  // ---------------------------------------------------------------------------
  // Row mutations
  // ---------------------------------------------------------------------------
  function markDirty() { setIsDirty(true); }

  function updateRow(
    setRows: React.Dispatch<React.SetStateAction<LogRow[]>>,
    key: string,
    field: keyof LogRow,
    value: string
  ) {
    setRows((rows) =>
      rows.map((r) => (r._key === key ? { ...r, [field]: value } : r))
    );
    markDirty();
  }

  function applySuggestion(
    type: "income" | "expense",
    setRows: React.Dispatch<React.SetStateAction<LogRow[]>>,
    key: string,
    description: string
  ) {
    const match = suggestions.find(
      (s) =>
        s.description.toLowerCase() === description.toLowerCase() &&
        s.type === type
    );
    setRows((rows) =>
      rows.map((r) => {
        if (r._key !== key) return r;
        if (match) {
          return {
            ...r,
            description,
            quantity: String(match.quantity),
            rate: String(match.rate),
          };
        }
        return { ...r, description };
      })
    );
    markDirty();
  }

  function addRow(setRows: React.Dispatch<React.SetStateAction<LogRow[]>>) {
    setRows((rows) => [...rows, emptyRow()]);
    markDirty();
  }

  function deleteRow(
    setRows: React.Dispatch<React.SetStateAction<LogRow[]>>,
    key: string
  ) {
    setRows((rows) => {
      const next = rows.filter((r) => r._key !== key);
      return next.length ? next : [emptyRow()];
    });
    markDirty();
  }

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------
  function rowsToPayload(rows: LogRow[], type: "income" | "expense") {
    return rows
      .filter((r) => r.description.trim() && parseFloat(r.rate) > 0)
      .map((r) => ({
        type,
        description: r.description.trim(),
        quantity: parseFloat(r.quantity) || 1,
        rate: parseFloat(r.rate),
        categoryId: r.categoryId || null,
      }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        date: currentDate,
        rows: [
          ...rowsToPayload(incomeRows, "income"),
          ...rowsToPayload(expenseRows, "expense"),
        ],
      };
      const res = await fetch("/api/daily-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setSaveError(data.error ?? tc("error"));
        return;
      }
      setIsDirty(false);
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    loadData(currentDate);
  }

  // ---------------------------------------------------------------------------
  // Nav guard modal actions
  // ---------------------------------------------------------------------------
  async function guardSaveAndNavigate() {
    await handleSave();
    setNavGuardOpen(false);
    if (pendingHref) window.location.href = pendingHref;
  }

  function guardDiscardAndNavigate() {
    setIsDirty(false);
    setNavGuardOpen(false);
    if (pendingHref) window.location.href = pendingHref;
  }

  function guardCancel() {
    setNavGuardOpen(false);
    setPendingHref(null);
  }

  // ---------------------------------------------------------------------------
  // Suggestion lists per type
  // ---------------------------------------------------------------------------
  const incomeSuggestionLabels = [
    ...new Set(
      suggestions.filter((s) => s.type === "income").map((s) => s.description)
    ),
  ];
  const expenseSuggestionLabels = [
    ...new Set(
      suggestions.filter((s) => s.type === "expense").map((s) => s.description)
    ),
  ];

  const displayDate = new Date(currentDate + "T00:00:00").toLocaleDateString(
    undefined,
    { weekday: "long", year: "numeric", month: "long", day: "numeric" }
  );

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  function renderRows(
    rows: LogRow[],
    type: "income" | "expense",
    setRows: React.Dispatch<React.SetStateAction<LogRow[]>>,
    suggLabels: string[]
  ) {
    const incomeType = type === "income";
    return rows.map((row, idx) => (
      <div
        key={row._key}
        className="grid grid-cols-[1fr_80px_80px_90px_36px] gap-2 items-center"
        data-testid={`${type}-row`}
      >
        <AutocompleteInput
          value={row.description}
          suggestions={suggLabels}
          placeholder={t("descriptionPlaceholder")}
          aria-label={`${type} row ${idx + 1} description`}
          onChange={(v) => updateRow(setRows, row._key, "description", v)}
          onSuggestionSelect={(v) => applySuggestion(type, setRows, row._key, v)}
        />
        <Input
          type="number"
          min="0.001"
          step="any"
          value={row.quantity}
          aria-label={`${type} row ${idx + 1} quantity`}
          onChange={(e) => updateRow(setRows, row._key, "quantity", e.target.value)}
          className="text-right"
        />
        <Input
          type="number"
          min="0"
          step="any"
          value={row.rate}
          placeholder={t("ratePlaceholder")}
          aria-label={`${type} row ${idx + 1} rate`}
          onChange={(e) => updateRow(setRows, row._key, "rate", e.target.value)}
          className="text-right"
        />
        <div
          className={`text-right text-sm font-semibold tabular-nums ${
            incomeType ? "text-green-600" : "text-red-600"
          }`}
          aria-label={`${type} row ${idx + 1} total`}
        >
          {rowTotal(row) > 0 ? formatCurrency(rowTotal(row), currency) : "—"}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => deleteRow(setRows, row._key)}
          aria-label={`Delete ${type} row ${idx + 1}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ));
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Unsaved changes banner */}
      {isDirty && (
        <div
          className="flex items-center gap-3 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-800 dark:text-yellow-300"
          role="alert"
          data-testid="unsaved-banner"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t("unsavedChanges")}</span>
          <Button size="sm" variant="outline" onClick={handleDiscard} disabled={saving}>
            {t("discard")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </div>
      )}

      {saveError && (
        <p className="text-sm text-destructive" role="alert">
          {saveError}
        </p>
      )}

      {/* Date navigation */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate(-1)}
              aria-label={t("previousDay")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[220px] text-center font-medium">{displayDate}</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate(1)}
              aria-label={t("nextDay")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Previous balance */}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2 text-sm">
            <span className="text-muted-foreground">{t("previousBalance")}</span>
            <span
              className={`font-semibold ${previousBalance >= 0 ? "text-green-600" : "text-red-600"}`}
              data-testid="previous-balance"
            >
              {formatCurrency(previousBalance, currency)}
            </span>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">{tc("loading")}</div>
      ) : (
        <>
          {/* Income section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-green-600">{t("income")}</CardTitle>
              {/* Column labels */}
              <div className="grid grid-cols-[1fr_80px_80px_90px_36px] gap-2 text-xs text-muted-foreground mt-1">
                <span>{t("description")}</span>
                <span className="text-right">{t("qty")}</span>
                <span className="text-right">{t("rate")}</span>
                <span className="text-right">{t("total")}</span>
                <span />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderRows(incomeRows, "income", setIncomeRows, incomeSuggestionLabels)}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => addRow(setIncomeRows)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("addIncome")}
              </Button>
              <div className="flex justify-end border-t pt-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{t("totalIncome")}</span>
                  <span
                    className="font-semibold text-green-600 tabular-nums"
                    data-testid="total-income"
                  >
                    {formatCurrency(totalIncome, currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expense section */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-red-600">{t("expense")}</CardTitle>
              <div className="grid grid-cols-[1fr_80px_80px_90px_36px] gap-2 text-xs text-muted-foreground mt-1">
                <span>{t("description")}</span>
                <span className="text-right">{t("qty")}</span>
                <span className="text-right">{t("rate")}</span>
                <span className="text-right">{t("total")}</span>
                <span />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {renderRows(expenseRows, "expense", setExpenseRows, expenseSuggestionLabels)}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={() => addRow(setExpenseRows)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("addExpense")}
              </Button>
              <div className="flex justify-end border-t pt-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{t("totalExpense")}</span>
                  <span
                    className="font-semibold text-red-600 tabular-nums"
                    data-testid="total-expense"
                  >
                    {formatCurrency(totalExpense, currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer summary */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("previousBalance")}</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(previousBalance, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ {t("totalIncome")}</span>
                  <span className="tabular-nums font-medium text-green-600">
                    {formatCurrency(totalIncome, currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">- {t("totalExpense")}</span>
                  <span className="tabular-nums font-medium text-red-600">
                    {formatCurrency(totalExpense, currency)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">{t("netBalance")}</span>
                  <span
                    className={`tabular-nums font-bold text-base ${
                      netBalance >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                    data-testid="net-balance"
                  >
                    {formatCurrency(netBalance, currency)}
                  </span>
                </div>
              </div>

              {/* Save / Discard actions */}
              <div className="mt-4 flex justify-end gap-2">
                {isDirty && (
                  <Button variant="outline" onClick={handleDiscard} disabled={saving}>
                    {t("discard")}
                  </Button>
                )}
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? tc("saving") : tc("save")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Nav-guard modal */}
      <Dialog open={navGuardOpen} onOpenChange={(o) => !o && guardCancel()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("unsavedChangesTitle")}</DialogTitle>
            <DialogDescription>{t("unsavedChangesDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={guardCancel}>
              {t("stayOnPage")}
            </Button>
            <Button variant="outline" onClick={guardDiscardAndNavigate}>
              {t("discard")}
            </Button>
            <Button onClick={guardSaveAndNavigate} disabled={saving}>
              {saving ? tc("saving") : tc("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
