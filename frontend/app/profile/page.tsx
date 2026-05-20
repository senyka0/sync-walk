import AppShell from "@/components/app-shell";
import { BinotelChatWidget } from "@/components/binotel-chat-widget";
import { ProfileContent } from "@/components/profile-content";

export default function ProfilePage() {
  return (
    <AppShell>
      <main className="page-enter">
        <ProfileContent />
        <BinotelChatWidget />
      </main>
    </AppShell>
  );
}
