import AppShell from "@/components/app-shell"
import { RoomCreateContent } from "@/components/room-create-content"

export default function RoomCreatePage() {
  return (
    <AppShell>
      <main className="page-enter">
        <RoomCreateContent />
      </main>
    </AppShell>
  )
}
