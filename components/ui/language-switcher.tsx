"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const LOCALES = [
  { code: "en", label: "EN", fullLabel: "English" },
  { code: "es", label: "ES", fullLabel: "Español" },
];

interface LanguageSwitcherProps {
  currentLocale: string;
}

export function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const router = useRouter();

  async function switchLocale(locale: string) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1" aria-label={t("language")}>
      {LOCALES.map(({ code, label, fullLabel }) => (
        <Button
          key={code}
          variant={currentLocale === code ? "default" : "ghost"}
          size="sm"
          className="h-7 w-8 p-0 text-xs font-semibold"
          title={fullLabel}
          onClick={() => switchLocale(code)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
