import { requireVerifiedAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const user = await requireVerifiedAuth();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview for {now.toLocaleString("default", { month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(income)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(expense)}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <DollarSign className={`h-4 w-4 ${net >= 0 ? "text-green-500" : "text-red-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(net)}
            </div>
            <p className="text-xs text-muted-foreground">Income − Expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Accounts</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Transactions</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm">View all</Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentTxns.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">No transactions yet</p>
            ) : (
              <div className="space-y-2">
                {recentTxns.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: t.category.color }}
                      />
                      <div>
                        <p className="text-sm font-medium">{t.description ?? t.category.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.account.name} · {new Date(t.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                      {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount, t.account.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { href: "/transactions", label: "Transactions" },
              { href: "/accounts", label: "Accounts" },
              { href: "/categories", label: "Categories" },
              { href: "/analytics", label: "Analytics" },
            ].map((item) => (
              <Link key={item.href} href={item.href}>
                <Button variant="outline" className="w-full text-sm">{item.label}</Button>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
