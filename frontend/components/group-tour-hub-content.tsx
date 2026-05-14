"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Navigation, Users } from "lucide-react";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";

export function GroupTourHubContent() {
  const params = useParams();
  const router = useRouter();
  const tourId = params.id as string;
  const dict = useI18n();
  const {
    fetchTourById,
    currentTour,
    purchasedAccess,
    isAuthenticated,
    language,
  } = useAppStore();

  useEffect(() => {
    if (tourId) void fetchTourById(tourId);
  }, [tourId, fetchTourById]);

  if (!currentTour || currentTour.id !== tourId) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-coral border-t-transparent animate-spin" />
      </div>
    );
  }

  const tour = currentTour;
  const access = isAuthenticated ? purchasedAccess[tour.id] : undefined;
  const hasGroup = access === "group";
  const authPayNext = `/auth/login?next=${encodeURIComponent(`/pay/${tour.id}?type=group`)}`;
  const payHref = isAuthenticated ? `/pay/${tour.id}?type=group` : authPayNext;
  const createHref = `/room/create/${tour.id}`;
  const localizedTitle =
    language === "uk" ? (tour.titleUk ?? tour.title) : tour.title;
  const blueCtaClass = "bg-[#005BBB] text-white shadow-lg active-scale";
  const yellowCtaClass =
    "bg-[#FFD500] text-[#0B1320] shadow-md border border-[#E6C000] active-scale";
  const maxStr = String(tour.maxParticipants);

  return (
    <div className="flex flex-col min-h-screen pb-40">
      <div className="px-5 pt-4 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active-scale"
          aria-label={dict.common.back}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
      <div className="px-5 flex-1 flex flex-col gap-5">
        <div>
          <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1">
            {dict.tour.groupHub.pageEyebrow}
          </p>
          <h1 className="text-2xl font-bold text-foreground text-balance leading-tight">
            {localizedTitle}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {dict.tour.groupHub.intro}
        </p>
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Users className="w-4 h-4 text-coral shrink-0" />
              {dict.tour.groupHub.whenHostTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {dict.tour.groupHub.whenHostBody.replace("{count}", maxStr)}
            </p>
          </div>
          <div className="border-t border-border pt-4">
            <h2 className="text-sm font-bold text-foreground">
              {dict.tour.groupHub.whenJoinTitle}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {dict.tour.groupHub.whenJoinBody}
            </p>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-linear-to-t from-background via-background/95 to-transparent safe-bottom">
        <div className="px-4 pb-4 pt-2 flex flex-row gap-2">
          <Link
            href="/room/join"
            className={`w-full min-w-0 sm:flex-1 inline-flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 ${blueCtaClass}`}
          >
            <div className="flex min-w-0 flex-col items-start">
              <span className="text-[10px] uppercase font-semibold tracking-wide text-white/80">
                {dict.tour.groupHub.joinGroupLine}
              </span>
              <span className="text-xs font-medium text-white/80 wrap-break-word">
                {dict.tour.groupHub.joinGroupHint}
              </span>
            </div>
          </Link>
          <Link
            href={hasGroup ? createHref : payHref}
            className={`w-full min-w-0 sm:flex-1 inline-flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 ${yellowCtaClass}`}
          >
            <div className="flex min-w-0 flex-col items-start">
              <span className="text-[10px] uppercase font-semibold tracking-wide text-[#0B1320]/75">
                {hasGroup
                  ? dict.tour.groupHub.startGroupLine
                  : dict.tour.groupHub.buyGroupLine}
              </span>
              <span
                className={
                  hasGroup
                    ? "text-xs font-medium text-[#0B1320]/75 wrap-break-word"
                    : "text-lg font-bold leading-tight text-[#0B1320]"
                }
              >
                {hasGroup
                  ? dict.tour.upToPeople.replace("{count}", maxStr)
                  : `₴${tour.groupPrice}`}
              </span>
            </div>
            <div className="shrink-0 flex flex-col items-end text-[10px] font-medium text-[#0B1320]/80">
              {hasGroup ? (
                <div className="shrink-0 flex items-center gap-2 text-xs font-semibold bg-[#0B1320]/10 rounded-full px-3 py-1">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{dict.common.start}</span>
                </div>
              ) : (
                <span>{dict.tour.upToPeople.replace("{count}", maxStr)}</span>
              )}
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
