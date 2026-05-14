import { Suspense } from "react";
import AppShell from "@/components/app-shell";
import { PaymentContent } from "@/components/payment-content";

export default function PayPage() {
  return (
    <AppShell>
      <main className="page-enter">
        <Suspense
          fallback={
            <div className="flex min-h-[50vh] items-center justify-center px-5">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
            </div>
          }
        >
          <PaymentContent />
        </Suspense>
      </main>
    </AppShell>
  );
}
