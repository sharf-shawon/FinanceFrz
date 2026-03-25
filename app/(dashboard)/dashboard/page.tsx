import { requireVerifiedAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "@/components/dashboard/charts";

export default async function DashboardPage() {
  const user = await requireVerifiedAuth();
  const t = await getTranslations("dashboard");
  const tnav = await getTranslations("nav");
  const ttxn = await getTranslations("transactions");

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [transactions, accounts, recentTxns] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id, date: { gte: firstOfMonth, lte: lastOfMonth } },
    }),
    prisma.account.findMany({ where: { userId: user.id } }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      include: {
        category: { select: { name: true, color: true } },
        account: { select: { name: true, currency: true } },
      },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);

  const income = transactions.filter((t) => t.type === "income").reduce((s: number, t) => s + t.amount, 0);
  const expense = transactions.filter((t) => t.type === "expense").reduce((s: number, t) => s + t.amount, 0);
  const net = income - expense;
  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle", { month: monthLabel })}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalIncome")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(income)}</div>
            <p className="text-xs text-muted-foreground">{t("thisMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("totalExpenses")}</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(expense)}</div>
            <p className="text-xs text-muted-foreground">{t("thisMonth")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("netBalance")}</CardTitle>
            <DollarSign className={`h-4 w-4 ${net >= 0 ? "text-green-500" : "text-red-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(net)}
            </div>
            <p className="text-xs text-muted-foreground">{t("incomeMinusExpenses")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t("accounts")}</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">{t("activeAccounts")}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("recentTransactions")}</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">{t("viewAll")}</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTxns.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">{t("noTransactions")}</p>
            ) : (
              <div className="space-y-2">
                {recentTxns.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: txn.category?.color ?? "#6b7280" }}
                      />
                      <div>
                        <p className="text-sm font-medium">{txn.description ?? txn.category?.name ?? ttxn("uncategorized")}</p>
                        <p className="text-xs text-muted-foreground">
                          {txn.account.name} · {new Date(txn.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${txn.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount, txn.account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("quickLinks")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { href: "/transactions", label: tnav("transactions") },
              { href: "/accounts", label: tnav("accounts") },
              { href: "/categories", label: tnav("categories") },
              { href: "/analytics", label: tnav("analytics") },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="outline" className="w-full text-sm">{item.label}</Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <DashboardCharts />
    </div>
  );
}
