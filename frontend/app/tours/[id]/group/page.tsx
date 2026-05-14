import AppShell from "@/components/app-shell";
import { GroupTourHubContent } from "@/components/group-tour-hub-content";

export default function GroupTourHubPage() {
  return (
    <AppShell>
      <main className="page-enter">
        <GroupTourHubContent />
      </main>
    </AppShell>
  );
}
