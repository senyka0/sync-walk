"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/app-shell";

export default function RoomEnterCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const handleContinue = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/room/${trimmed}`);
  };

  return (
    <AppShell>
      <main className="flex flex-col min-h-screen bg-primary px-5 page-enter">
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">Join Group Tour</h1>
            <p className="text-white/70 text-sm mt-1">
              Enter the room code shared by your host.
            </p>
          </div>
          <div className="bg-card rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col gap-4">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ROOM CODE"
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-center tracking-[0.3em] text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-coral/40"
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                maxLength={8}
              />
              <button
                onClick={handleContinue}
                className="w-full bg-coral text-white rounded-xl py-3.5 font-bold text-sm active-scale disabled:opacity-70"
                disabled={!code.trim()}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
