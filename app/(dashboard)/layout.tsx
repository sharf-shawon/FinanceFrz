import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getLocale } from "next-intl/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerifiedAt) redirect("/verify-email?pending=1");

  const locale = await getLocale();

  return (
    <DashboardShell user={{ name: user.name, email: user.email }} locale={locale}>
      {children}
    </DashboardShell>
  );
}
