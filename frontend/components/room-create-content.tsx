"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { Copy, CheckCheck, Play, Crown, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import { socketManager } from "@/lib/socket";

export function RoomCreateContent() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.tourId as string;
  const { createRoom, currentRoom, participants, setRoomStatus, tours } =
    useAppStore();
  const { language } = useAppStore();
  const dict = useI18n();
  const createFailedText = dict.roomCreate.createFailed;
  const [copied, setCopied] = useState(false);
  const createdRef = useRef(false);

  const tour = tours.find((t) => t.id === tourId);
  const localizedTourTitle =
    language === "uk" ? (tour?.titleUk ?? tour?.title ?? "") : (tour?.title ?? "");

  useSocket(currentRoom?.id ?? null);

  useEffect(() => {
    if (createdRef.current) return;
    createdRef.current = true;
    let active = true;
    createRoom(tourId).catch(() => {
      if (!active) return;
      toast.error(createFailedText);
      router.push("/profile/tours");
    });
    return () => {
      active = false;
    };
  }, [tourId, createRoom, router, createFailedText]);

  const handleCopy = () => {
    if (!currentRoom) return;
    navigator.clipboard.writeText(currentRoom.accessCode).catch(() => {});
    setCopied(true);
    toast.success(dict.roomCreate.copiedSuccess);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartTour = () => {
    setRoomStatus("active");
    if (currentRoom) {
      socketManager.startTour(currentRoom.id);
    }
    router.push(`/room/${currentRoom?.accessCode}/live`);
  };

  const otherParticipants = participants.filter((p) => p.role !== "host");
  const canStart = otherParticipants.length >= 1;

  if (!currentRoom) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-coral border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen px-5 page-enter">
      <div className="flex items-center gap-3 pt-4 pb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center active-scale"
          aria-label={dict.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="flex flex-col min-h-screen">
        <div className="px-5 pt-6 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
            {dict.roomCreate.groupTour}
          </p>
          <h1 className="text-2xl font-bold text-foreground text-balance">
            {localizedTourTitle || dict.common.loading}
          </h1>
        </div>

        <div className="flex flex-col items-center gap-4 py-6 bg-primary mx-5 rounded-2xl shadow-lg">
          <div className="flex flex-col items-center gap-1">
            <p className="text-white/60 text-xs font-medium">
              {dict.roomCreate.roomCode}
            </p>
            <span className="text-4xl font-black text-white tracking-[0.2em]">
              {currentRoom.accessCode}
            </span>
          </div>
        </div>

        <div className="px-5 mt-4">
          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 bg-card border border-border rounded-xl py-3 text-sm font-semibold active-scale"
          >
            {copied ? (
              <CheckCheck className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-coral" />
            )}
            {copied ? dict.roomCreate.copied : dict.roomCreate.copyCode}
          </button>
        </div>

        <div className="px-5 mt-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-foreground">
              {dict.roomCreate.whoIsHere.replace(
                "{count}",
                String(participants.length),
              )}
            </h2>
          </div>

          <div className="flex flex-col gap-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-coral flex items-center justify-center text-white font-bold text-sm">
                    {p.name[0]}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                      p.isOnline ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {p.name}
                  </p>
                  <div className="flex items-center gap-1">
                    {p.role === "host" && (
                      <Crown className="w-3 h-3 text-amber-500" />
                    )}
                    <span className="text-xs text-muted-foreground capitalize">
                      {p.role === "host"
                        ? dict.roomCreate.host
                        : dict.roomCreate.listener}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-5 mt-6">
          <button
            onClick={handleStartTour}
            disabled={!canStart}
            className={`w-full rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active-scale transition-all ${
              canStart
                ? "bg-coral text-white shadow-lg"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            <Play className="w-5 h-5" />
            {canStart
              ? dict.roomCreate.startTour
              : dict.roomCreate.waitingParticipants}
          </button>
          {!canStart && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              {dict.roomCreate.minParticipants}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
