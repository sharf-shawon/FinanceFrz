"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";

interface DashboardShellProps {
  children: React.ReactNode;
  user: { name?: string | null; email: string };
}

export function DashboardShell({ children, user }: DashboardShellProps) {
  const [theme, setTheme] = useState<string>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme") ?? "light";
    setTheme(stored);
    document.documentElement.classList.toggle("dark", stored === "dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar user={user} theme={theme} onThemeToggle={toggleTheme} />
      <main className="md:pl-64">
        <div className="px-4 py-6 pt-16 md:pt-6 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
