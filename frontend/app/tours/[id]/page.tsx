import AppShell from "@/components/app-shell";
import { TourDetailContent } from "@/components/tour-detail-content";

export default function TourDetailPage() {
  return (
    <AppShell>
      <main className="page-enter">
        <TourDetailContent />
      </main>
    </AppShell>
  );
}
