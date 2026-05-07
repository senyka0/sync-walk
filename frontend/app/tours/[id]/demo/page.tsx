import AppShell from "@/components/app-shell";
import { TourDemoContent } from "@/components/tour-demo-content";

export default function TourDemoPage() {
  return (
    <AppShell>
      <main className="page-enter">
        <TourDemoContent />
      </main>
    </AppShell>
  );
}
