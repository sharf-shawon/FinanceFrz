import { Suspense } from "react";
import VerifyEmailContent from "./content";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
