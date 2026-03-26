"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, ArrowLeftRight, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  description: string | null;
  account: { id: string; name: string; currency: string };
  category: { id: string; name: string; color: string; type: string } | null;
}

interface Account { id: string; name: string; currency: string }
interface Category { id: string; name: string; type: string; color: string }

const PAGE_SIZE = 20;

export default function TransactionsPage() {
  const t = useTranslations("transactions");
  const tc = useTranslations("common");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [form, setForm] = useState({
    accountId: "", categoryId: "" as string | null, type: "expense" as "income" | "expense",
    amount: "", date: new Date().toISOString().slice(0, 10), description: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Filters
  const [filterAccount, setFilterAccount] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page), limit: String(PAGE_SIZE),
      sortBy, sortDir,
    });
    if (filterAccount) params.set("accountId", filterAccount);
    if (filterCategory) params.set("categoryId", filterCategory);
    if (filterType) params.set("type", filterType);
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);

    const res = await fetch(`/api/transactions?${params}`);
    if (res.ok) {
      const data = await res.json();
      setTransactions(data.transactions);
      setTotal(data.total);
    }
    setLoading(false);
  }, [page, sortBy, sortDir, filterAccount, filterCategory, filterType, filterDateFrom, filterDateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    fetch("/api/accounts").then(r => r.json()).then(setAccounts).catch(() => {});
    fetch("/api/categories").then(r => r.json()).then(setCategories).catch(() => {});
  }, []);

  function openCreate() {
    setEditTxn(null);
    setForm({ accountId: accounts[0]?.id ?? "", categoryId: null, type: "expense", amount: "", date: new Date().toISOString().slice(0, 10), description: "" });
    setError("");
    setOpen(true);
  }

  function openEdit(txn: Transaction) {
    setEditTxn(txn);
    setForm({
      accountId: txn.account.id, categoryId: txn.category?.id ?? null, type: txn.type as "income" | "expense",
      amount: String(txn.amount), date: txn.date.slice(0, 10), description: txn.description ?? ""
    });
    setError("");
    setOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editTxn ? `/api/transactions/${editTxn.id}` : "/api/transactions";
      const method = editTxn ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          categoryId: form.categoryId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to save"); return; }
      setOpen(false);
      fetchData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("deleteConfirm"))) return;
    await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    fetchData();
  }

  function toggleSort(field: string) {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
    setPage(1);
  }

  const filteredCategories = categories.filter(c => !form.type || c.type === form.type);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Compute running balance for current page (sorted by date asc for accumulation)
  const runningBalances = (() => {
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    const map: Record<string, number> = {};
    for (const t of sorted) {
      balance += t.type === "income" ? t.amount : -t.amount;
      map[t.id] = balance;
    }
    return map;
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle", { total })}</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t("addTransaction")}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={filterAccount} onValueChange={(v) => { setFilterAccount(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder={t("allAccounts")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allAccounts")}</SelectItem>
                {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={(v) => { setFilterCategory(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder={t("allCategories")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCategories")}</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(v) => { setFilterType(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder={t("allTypes")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allTypes")}</SelectItem>
                <SelectItem value="income">{t("income")}</SelectItem>
                <SelectItem value="expense">{t("expense")}</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <Label className="sr-only">Date From</Label>
              <Input type="date" value={filterDateFrom} onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="sr-only">Date To</Label>
              <Input type="date" value={filterDateTo} onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">{tc("loading")}</div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowLeftRight className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">{t("noTransactions")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("date")}>
                      {t("date")} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("account")}</TableHead>
                  <TableHead className="text-right">
                    <button className="flex items-center gap-1 hover:text-foreground ml-auto" onClick={() => toggleSort("amount")}>
                      {t("amount")} <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">{t("runningBalance")}</TableHead>
                  <TableHead className="text-right">{t("actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-sm">{new Date(txn.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{txn.description ?? "—"}</TableCell>
                    <TableCell>
                      {txn.category ? (
                        <div className="flex items-center gap-1.5">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: txn.category.color }} />
                          <span className="text-sm">{txn.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground italic">{t("uncategorized")}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{txn.account.name}</TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${txn.type === "income" ? "text-green-600" : "text-red-600"}`}>
                        {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount, txn.account.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`text-sm font-medium ${(runningBalances[txn.id] ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {formatCurrency(runningBalances[txn.id] ?? 0, txn.account.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(txn)} aria-label={tc("edit")}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(txn.id)} aria-label={tc("delete")}
                        className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editTxn ? t("editTransaction") : t("addTransaction")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave}>
            <div className="space-y-4 py-2">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>{t("type")}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "income" | "expense", categoryId: null })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">{t("income")}</SelectItem>
                      <SelectItem value="expense">{t("expense")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">{t("amount")}</Label>
                  <Input id="amount" type="number" step="0.01" min="0.01" value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("account")}</Label>
                <Select value={form.accountId} onValueChange={(v) => setForm({ ...form, accountId: v })}>
                  <SelectTrigger><SelectValue placeholder={t("selectAccount")} /></SelectTrigger>
                  <SelectContent>
                    {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("category")}</Label>
                <Select
                  value={form.categoryId ?? "none"}
                  onValueChange={(v) => setForm({ ...form, categoryId: v === "none" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder={t("selectCategory")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("uncategorized")}</SelectItem>
                    {filteredCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="txn-date">{t("date")}</Label>
                <Input id="txn-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="txn-desc">{tc("descriptionOptional")}</Label>
                <Textarea id="txn-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{tc("cancel")}</Button>
              <Button type="submit" disabled={saving}>{saving ? tc("saving") : tc("save")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
