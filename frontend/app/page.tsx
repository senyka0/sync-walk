import AppShell from "@/components/app-shell"
import { HomeContent } from "@/components/home-content"

export default function HomePage() {
  return (
    <AppShell>
      <main className="page-enter">
        <HomeContent />
      </main>
    </AppShell>
  )
}
