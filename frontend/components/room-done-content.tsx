"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { Clock, MapPin, Home, Trophy } from "lucide-react";
import { toast } from "sonner";

export function RoomDoneContent() {
  const router = useRouter();
  const { currentRoom, tours, leaveRoom, language } = useAppStore();
  const dict = useI18n();
  const [review, setReview] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const tour = tours.find((t) => t.id === currentRoom?.tourId) ?? tours[0];
  const cityLabel =
    language === "uk"
      ? tour?.city === "kyiv"
        ? "Київ"
        : "Харків"
      : tour?.city === "kyiv"
        ? "Kyiv"
        : "Kharkiv";

  const handleSubmit = () => {
    // TODO: Replace with POST /api/reviews
    setSubmitted(true);
    toast.success(dict.roomDone.reviewSubmitted);
    setTimeout(() => {
      leaveRoom();
      router.push("/");
    }, 1500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background px-5 page-enter">
      <div className="flex flex-col items-center pt-14 pb-8 gap-4">
        <div className="relative w-28 h-28 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-coral/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-coral/30" />
          <div className="w-20 h-20 rounded-full bg-coral flex items-center justify-center shadow-2xl">
            <Trophy className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-foreground">
            {dict.roomDone.title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-balance">
            {dict.roomDone.subtitle.replace("{city}", cityLabel)}
          </p>
        </div>
      </div>
      <div className="bg-card rounded-2xl p-5 border border-border mb-5">
        <h2 className="text-base font-bold text-foreground mb-3">
          {dict.roomDone.howWasIt}
        </h2>
        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder={dict.roomDone.reviewPlaceholder}
          rows={3}
          className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-coral/40 resize-none"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitted}
        className="w-full bg-coral text-white rounded-2xl py-4 font-bold text-base active-scale shadow-lg disabled:opacity-70 flex items-center justify-center gap-2 mb-3"
      >
        <Home className="w-5 h-5" />
        {submitted ? dict.roomDone.redirecting : dict.roomDone.submitAndHome}
      </button>

      <button
        onClick={() => {
          leaveRoom();
          router.push("/");
        }}
        className="w-full text-muted-foreground text-sm font-medium py-2 active-scale"
      >
        {dict.roomDone.skipReview}
      </button>
    </div>
  );
}
