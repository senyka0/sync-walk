"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { Headphones, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";

export function RoomJoinContent() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const { joinRoom, roomStatus, currentRoom, isAuthenticated, user } =
    useAppStore();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);
  const dict = useI18n();
  const isLoggedInWithName = isAuthenticated && Boolean(user?.name?.trim());

  useSocket(currentRoom?.id ?? null);

  useEffect(() => {
    if (joined && roomStatus === "active") {
      router.push(`/room/${code}/live`);
    }
  }, [roomStatus, joined, code, router]);

  const handleJoin = async () => {
    const participantName = isLoggedInWithName
      ? user!.name.trim()
      : name.trim();
    if (!participantName) {
      toast.error(dict.roomJoin.nameRequired);
      return;
    }
    setLoading(true);
    try {
      await joinRoom(code, participantName);
      setJoined(true);
      toast.success(dict.roomJoin.joinedRoom.replace("{code}", code));
    } catch {
      toast.error(dict.roomJoin.joinFailed);
    } finally {
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-5 gap-6 page-enter">
        <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
          <Headphones className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground">
            {dict.roomJoin.waitingTitle}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            {dict.roomJoin.codeLabel} {code}
          </p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 w-full text-center">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{dict.roomJoin.waitingSubtitle}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {dict.roomJoin.waitingHint}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-primary px-5 page-enter">
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 bg-coral rounded-2xl flex items-center justify-center shadow-xl">
            <Headphones className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              {dict.roomJoin.title}
            </h1>
            <p className="text-white/60 text-sm">
              {dict.roomJoin.codeLabel}: {code}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-6 shadow-xl">
          {!isLoggedInWithName ? (
            <h2 className="text-lg font-bold text-foreground mb-4">
              {dict.roomJoin.nameQuestion}
            </h2>
          ) : null}
          <div className="flex flex-col gap-4">
            {!isLoggedInWithName ? (
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={dict.roomJoin.namePlaceholder}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coral/40"
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
            ) : null}
            <button
              onClick={handleJoin}
              disabled={loading}
              className="w-full bg-coral text-white rounded-xl py-3.5 font-bold text-sm active-scale disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {dict.roomJoin.joinButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
