import { Suspense } from "react";
import { RegisterContent } from "@/components/register-content";

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
