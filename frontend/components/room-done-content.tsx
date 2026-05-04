"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { buildFeedbackMessage, getTelegramFeedbackUrl } from "@/lib/feedback";
import { Home, ThumbsDown, ThumbsUp, Trophy } from "lucide-react";
import { toast } from "sonner";

export function RoomDoneContent() {
  const router = useRouter();
  const { currentRoom, tours, leaveRoom, language } = useAppStore();
  const dict = useI18n();
  const [recommendation, setRecommendation] = useState<"yes" | "no" | null>(
    null,
  );
  const [improvement, setImprovement] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const tour = tours.find((t) => t.id === currentRoom?.tourId) ?? tours[0];
  const tourTitle =
    language === "uk"
      ? (tour?.titleUk ?? tour?.title ?? "")
      : (tour?.title ?? "");
  const cityLabel =
    language === "uk"
      ? tour?.city === "kyiv"
        ? "Київ"
        : "Харків"
      : tour?.city === "kyiv"
        ? "Kyiv"
        : "Kharkiv";

  const canSubmit =
    recommendation === "yes" ||
    (recommendation === "no" && improvement.trim().length > 0);

  const handleSubmit = async () => {
    if (!recommendation) {
      toast.error(dict.roomDone.chooseAnswer);
      return;
    }

    const feedback = buildFeedbackMessage(
      recommendation === "yes"
        ? dict.roomDone.recommendYesMessage
        : improvement,
      {
        source: "tour_complete",
        tourTitle,
        roomCode: currentRoom?.accessCode,
        vote: recommendation,
      },
    );

    await navigator.clipboard?.writeText(feedback).catch(() => undefined);
    window.open(
      getTelegramFeedbackUrl(feedback),
      "_blank",
      "noopener,noreferrer",
    );
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
          {dict.roomDone.recommendQuestion}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRecommendation("yes")}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold active-scale ${
              recommendation === "yes"
                ? "border-coral bg-coral text-white"
                : "border-border bg-background text-foreground"
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            {dict.roomDone.recommendYes}
          </button>
          <button
            type="button"
            onClick={() => setRecommendation("no")}
            className={`flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold active-scale ${
              recommendation === "no"
                ? "border-coral bg-coral text-white"
                : "border-border bg-background text-foreground"
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            {dict.roomDone.recommendNo}
          </button>
        </div>
        {recommendation === "yes" && (
          <p className="mt-4 rounded-xl bg-coral/10 px-4 py-3 text-sm text-coral">
            {dict.roomDone.recommendationThanks}
          </p>
        )}
        {recommendation === "no" && (
          <div className="mt-4">
            <label className="mb-2 block text-sm font-bold text-foreground">
              {dict.roomDone.improvementQuestion}
            </label>
            <textarea
              value={improvement}
              onChange={(e) => setImprovement(e.target.value)}
              placeholder={dict.roomDone.improvementPlaceholder}
              rows={3}
              className="w-full bg-white border border-border rounded-xl px-4 py-3 text-sm text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-coral/40 resize-none"
            />
          </div>
        )}
      </div>
      <button
        onClick={handleSubmit}
        disabled={submitted || !canSubmit}
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
