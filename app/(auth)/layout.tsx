import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <Image
              src="/icons/apple-icon.png"
              alt="FinanceFrz logo"
              width={48}
              height={48}
              className="rounded-full"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold">FinanceFrz</h1>
          <p className="text-muted-foreground text-sm mt-1">Personal Finance Tracker</p>
        </div>
        {children}
      </div>
    </div>
  );
}
