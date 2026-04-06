import AppShell from "@/components/app-shell"
import { PaymentContent } from "@/components/payment-content"

export default function PayPage() {
  return (
    <AppShell>
      <main className="page-enter">
        <PaymentContent />
      </main>
    </AppShell>
  )
}
