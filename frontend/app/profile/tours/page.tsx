import AppShell from "@/components/app-shell"
import { MyToursContent } from "@/components/my-tours-content"

export default function MyToursPage() {
  return (
    <AppShell>
      <main className="page-enter">
        <MyToursContent />
      </main>
    </AppShell>
  )
}
