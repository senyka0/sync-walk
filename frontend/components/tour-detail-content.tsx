"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { API_URL } from "@/lib/api";
import { ArrowLeft, Clock, MapPin, Navigation } from "lucide-react";
import Link from "next/link";
import { MapboxRouteMap } from "@/components/mapbox-route-map";

export function TourDetailContent() {
  const params = useParams();
  const router = useRouter();
  const demoAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isDemoPlaying, setIsDemoPlaying] = useState(false);
  const {
    fetchTourById,
    currentTour,
    purchasedAccess,
    isAuthenticated,
    language,
  } = useAppStore();
  const dict = useI18n();

  useEffect(() => {
    if (params.id) fetchTourById(params.id as string);
  }, [params.id, fetchTourById]);

  useEffect(() => {
    const audio = demoAudioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsDemoPlaying(false);
  }, [currentTour?.id, language]);

  if (!currentTour) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-coral border-t-transparent animate-spin" />
      </div>
    );
  }

  const tour = currentTour;
  const access = isAuthenticated ? purchasedAccess[tour.id] : undefined;
  const authHref = `/auth/login?next=${encodeURIComponent(`/tours/${tour.id}`)}`;
  const groupBuyHref = isAuthenticated
    ? `/pay/${tour.id}?type=group`
    : authHref;
  const soloBuyHref = isAuthenticated
    ? `/pay/${tour.id}?type=individual`
    : authHref;
  const localizedTitle =
    language === "uk" ? (tour.titleUk ?? tour.title) : tour.title;
  const localizedDescription =
    language === "uk"
      ? (tour.descriptionUk ?? tour.description)
      : tour.description;
  const startPoint = tour.points[0];
  const directionsUrl = startPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${startPoint.latitude},${startPoint.longitude}&travelmode=walking`
    : null;
  const sourceAudioPath =
    language === "uk" && startPoint?.audioUrlUk
      ? startPoint.audioUrlUk
      : (startPoint?.audioUrl ?? "");
  const demoAudioPath = sourceAudioPath
    ? /-\d+\.mp3$/i.test(sourceAudioPath)
      ? sourceAudioPath.replace(/-\d+\.mp3$/i, "-description.mp3")
      : sourceAudioPath.replace(/\.mp3$/i, "-description.mp3")
    : "";
  const demoAudioUrl = demoAudioPath
    ? `${API_URL.replace(/\/$/, "")}${demoAudioPath.startsWith("/") ? demoAudioPath : `/${demoAudioPath}`}`
    : "";
  const cityLabel =
    language === "uk"
      ? tour.city === "kyiv"
        ? "Київ"
        : "Харків"
      : tour.city === "kyiv"
        ? "Kyiv"
        : "Kharkiv";

  const toggleDemoAudio = async () => {
    const audio = demoAudioRef.current;
    if (!audio) return;
    if (isDemoPlaying) {
      audio.pause();
      audio.currentTime = 0;
      setIsDemoPlaying(false);
      return;
    }
    audio.currentTime = 0;
    try {
      await audio.play();
      setIsDemoPlaying(true);
    } catch {}
  };

  return (
    <div className="flex flex-col pb-36">
      <div className="relative h-72 shrink-0">
        <img
          src={tour.coverImage}
          alt={localizedTitle}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-navy via-navy/30 to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-10 h-10 rounded-full glass flex items-center justify-center active-scale"
          aria-label={dict.common.back}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full bg-coral text-white text-[10px] font-bold uppercase tracking-wider">
              {cityLabel}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white text-balance leading-tight">
            {localizedTitle}
          </h1>
        </div>
      </div>
      <div className="px-5 pt-5 flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm">
              {tour.durationMin} {dict.common.min}
            </span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-sm">
              {tour.points.length} {dict.common.stops}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2">
          {demoAudioUrl ? (
            <button
              type="button"
              onClick={toggleDemoAudio}
              aria-label={
                isDemoPlaying ? dict.roomLive.stop : dict.roomLive.play
              }
              className="mt-0.5 shrink-0 w-7 h-7 rounded-full bg-coral text-white text-[11px] font-bold inline-flex items-center justify-center active-scale"
            >
              {isDemoPlaying ? "■" : "▶"}
            </button>
          ) : null}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {localizedDescription}
          </p>
          {demoAudioUrl ? (
            <audio
              ref={demoAudioRef}
              preload="none"
              src={demoAudioUrl}
              onEnded={() => setIsDemoPlaying(false)}
              className="hidden"
            />
          ) : null}
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">
            {dict.tour.routeOverview}
          </h2>
          <div className="w-full h-44 rounded-2xl bg-secondary/10 border border-border relative overflow-hidden">
            <MapboxRouteMap points={tour.points} className="w-full h-full" />
          </div>
          {directionsUrl ? (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-foreground active-scale"
            >
              <Navigation className="w-4 h-4 text-coral" />
              <span>{dict.tour.getToStartPoint}</span>
            </a>
          ) : null}
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground mb-3">
            {dict.tour.tourStops}
          </h2>
          <div className="flex flex-col gap-2">
            {tour.points.map((point, index) => (
              <div
                key={point.id}
                className="flex items-start gap-3 bg-card rounded-2xl p-4 border border-border"
              >
                <div className="shrink-0 w-7 h-7 rounded-full bg-coral flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground leading-tight">
                    {language === "uk"
                      ? (point.titleUk ?? point.title)
                      : point.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                    {language === "uk"
                      ? (point.descriptionUk ?? point.description)
                      : point.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-linear-to-t from-background via-background/95 to-transparent safe-bottom">
        <div className="px-4 pb-4 pt-2">
          {access === "group" ? (
            <div className="flex flex-row gap-2">
              <Link
                href={`/room/solo/${tour.id}/live`}
                className="w-full min-w-0 sm:flex-1 inline-flex items-center justify-between gap-3 rounded-2xl bg-coral text-white px-4 py-3.5 shadow-lg active-scale"
              >
                <div className="flex min-w-0 flex-col items-start">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-white/80">
                    {dict.tour.listenSolo}
                  </span>
                  <span className="text-xs font-medium text-white/80 wrap-break-word">
                    {dict.tour.continueTour}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-2 text-xs font-semibold bg-white/15 rounded-full px-3 py-1">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{dict.common.start}</span>
                </div>
              </Link>
              <Link
                href={`/room/create/${tour.id}`}
                className="w-full min-w-0 sm:flex-1 inline-flex items-center justify-between gap-3 rounded-2xl bg-primary text-white px-4 py-3.5 shadow-lg active-scale"
              >
                <div className="flex min-w-0 flex-col items-start">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-white/80">
                    {dict.tour.startGroup}
                  </span>
                  <span className="text-xs font-medium text-white/80 wrap-break-word">
                    {dict.tour.upToPeople.replace(
                      "{count}",
                      String(tour.maxParticipants),
                    )}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-2 text-xs font-semibold bg-coral/15 rounded-full px-3 py-1">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{dict.common.start}</span>
                </div>
              </Link>
            </div>
          ) : access === "solo" ? (
            <div className="flex flex-row gap-2">
              <Link
                href={`/room/solo/${tour.id}/live`}
                className="flex-1 min-w-0 inline-flex items-center justify-between gap-2 rounded-2xl bg-coral text-white px-3 py-3.5 shadow-lg active-scale"
              >
                <div className="flex min-w-0 flex-col items-start">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-white/80">
                    {dict.tour.listenSolo}
                  </span>
                  <span className="text-xs font-medium text-white/80 wrap-break-word">
                    {dict.tour.ownSoloAccess}
                  </span>
                </div>
                <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-white/15 rounded-full px-2.5 py-1">
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{dict.common.start}</span>
                </div>
              </Link>
              <Link
                href={groupBuyHref}
                className="flex-1 min-w-0 inline-flex items-center justify-between gap-2 rounded-2xl bg-primary text-primary-foreground px-3 py-3.5 shadow-md border border-white/5 active-scale"
              >
                <div className="flex min-w-0 flex-col items-start">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-primary-foreground/70">
                    {dict.tour.upgradeToGroup}
                  </span>
                  <span className="text-base font-bold leading-tight text-primary-foreground">
                    ₴{tour.groupPrice}
                  </span>
                </div>
                <div className="shrink-0 flex flex-col items-end text-[10px] font-medium text-primary-foreground/80">
                  <span>
                    {dict.tour.upToPeople.replace(
                      "{count}",
                      String(tour.maxParticipants),
                    )}
                  </span>
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                href={soloBuyHref}
                className="flex-1 inline-flex items-center justify-between gap-3 rounded-2xl bg-coral text-white px-4 py-3.5 shadow-lg active-scale"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-white/80">
                    {dict.tour.soloAccess}
                  </span>
                  <span className="text-lg font-bold leading-tight">
                    ₴{tour.individualPrice}
                  </span>
                </div>
              </Link>
              <Link
                href={groupBuyHref}
                className="flex-1 inline-flex items-center justify-between gap-3 rounded-2xl bg-primary text-primary-foreground px-4 py-3.5 shadow-md border border-white/5 active-scale"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[10px] uppercase font-semibold tracking-wide text-primary-foreground/70">
                    {dict.tour.groupTour}
                  </span>
                  <span className="text-lg font-bold leading-tight">
                    ₴{tour.groupPrice}
                  </span>
                </div>
                <div className="flex flex-col items-end text-[10px] font-medium text-primary-foreground/80">
                  <span>
                    {dict.tour.upToPeople.replace(
                      "{count}",
                      String(tour.maxParticipants),
                    )}
                  </span>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
