"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  user: { name?: string | null; email: string };
  locale: string;
}

export function DashboardShell({ children, user, locale }: DashboardShellProps) {
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} theme={theme} onThemeToggle={toggleTheme} locale={locale} />
      <main className="md:pl-64">
        <div className="px-4 py-6 pt-16 md:pt-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
