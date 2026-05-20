import AppShell from "@/components/app-shell";
import { ProfileContent } from "@/components/profile-content";

export default function ProfilePage() {
  return (
    <AppShell>
      <main className="page-enter">
        <ProfileContent />
      </main>
    </AppShell>
  );
}
