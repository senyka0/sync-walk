"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";

export default function RoomEnterCodePage() {
  const router = useRouter();
  const dict = useI18n();
  const [code, setCode] = useState("");

  const handleContinue = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    router.push(`/room/${trimmed}`);
  };

  return (
    <main className="mx-auto max-w-md flex flex-col min-h-screen bg-background px-5 page-enter">
      <div className="pt-4 pb-3">
        <button
          onClick={() => router.push("/")}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active-scale"
          aria-label={dict.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">
            {dict.roomJoin.enterCodeTitle}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {dict.roomJoin.enterCodeSubtitle}
          </p>
        </div>
        <div className="bg-card rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col gap-4">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={dict.roomJoin.codePlaceholder}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-center tracking-[0.3em] text-lg font-bold text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-coral/40"
              onKeyDown={(e) => e.key === "Enter" && handleContinue()}
              maxLength={8}
            />
            <button
              onClick={handleContinue}
              className="w-full bg-primary text-primary-foreground rounded-xl py-3.5 font-bold text-sm active-scale disabled:opacity-70"
              disabled={!code.trim()}
            >
              {dict.roomJoin.continueButton}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
