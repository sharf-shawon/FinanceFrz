"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CreditCard,
  Tags,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { cn } from "@/lib/utils";

interface SidebarProps {
  user: { name?: string | null; email: string };
  theme: string;
  onThemeToggle: () => void;
  locale: string;
}

interface NavContentProps {
  user: { name?: string | null; email: string };
  theme: string;
  onThemeToggle: () => void;
  locale: string;
  onMobileClose: () => void;
  showLogo?: boolean;
}

function NavContent({ user, theme, onThemeToggle, locale, onMobileClose, showLogo = true }: NavContentProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { href: "/dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/transactions", label: t("transactions"), icon: ArrowLeftRight },
    { href: "/analytics", label: t("analytics"), icon: BarChart3 },
    { href: "/calendar", label: t("calendar"), icon: Calendar },
    { href: "/accounts", label: t("accounts"), icon: CreditCard },
    { href: "/categories", label: t("categories"), icon: Tags },
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col">
      {showLogo && (
        <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
          <Image
            src="/icons/apple-icon.png"
            alt="FinanceFrz logo"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="font-semibold text-lg">FinanceFrz</span>
        </div>
      )}

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onMobileClose}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3 space-y-2">
        <div className="text-sm text-muted-foreground truncate">
          {user.name ?? user.email}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onThemeToggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <LanguageSwitcher currentLocale={locale} />
          <Button variant="ghost" size="sm" onClick={handleLogout} className="flex-1 justify-start gap-2">
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ user, theme, onThemeToggle, locale }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile top header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 bg-background border-b border-border md:hidden">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/apple-icon.png"
            alt="FinanceFrz logo"
            width={32}
            height={32}
            className="rounded-full"
          />
          <span className="font-semibold text-lg">FinanceFrz</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed top-16 inset-x-0 bottom-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <NavContent
          user={user}
          theme={theme}
          onThemeToggle={onThemeToggle}
          locale={locale}
          onMobileClose={() => setMobileOpen(false)}
          showLogo={false}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
        <NavContent
          user={user}
          theme={theme}
          onThemeToggle={onThemeToggle}
          locale={locale}
          onMobileClose={() => setMobileOpen(false)}
        />
      </aside>
    </>
  );
}
