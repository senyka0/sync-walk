"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  MapPin,
  Navigation,
  Pause,
  Play,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { api } from "@/lib/api";
import { buildApiAudioUrl, getAudioPathForLanguage } from "@/lib/audio";
import { getFeedbackClientContext } from "@/lib/feedback";
import { MapboxRouteMap } from "@/components/mapbox-route-map";
import { Slider, SliderThumb, SliderTrack } from "react-aria-components";

const DEMO_RADIUS_METERS = 100;

type GeoState = "loading" | "granted" | "denied" | "unsupported";

function distanceMeters(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getDemoAudioPath(sourcePath: string | null | undefined): string {
  if (!sourcePath) return "";
  if (/-\d+\.mp3$/i.test(sourcePath)) {
    return sourcePath.replace(/-\d+\.mp3$/i, "-demo.mp3");
  }
  return sourcePath.replace(/\.mp3$/i, "-demo.mp3");
}

export function TourDemoContent() {
  const params = useParams();
  const router = useRouter();
  const dict = useI18n();
  const {
    fetchTourById,
    currentTour,
    language,
    purchasedAccess,
    isAuthenticated,
  } = useAppStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [totalDurationMs, setTotalDurationMs] = useState(0);
  const [scrubMs, setScrubMs] = useState<number | null>(null);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [demoFinished, setDemoFinished] = useState(false);
  const [exitSurveyOpen, setExitSurveyOpen] = useState(false);
  const [exitSurveySubmitting, setExitSurveySubmitting] = useState(false);

  const [geoState, setGeoState] = useState<GeoState>("loading");
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    if (params.id) fetchTourById(params.id as string);
  }, [params.id, fetchTourById]);

  const stopGeoWatch = useCallback(() => {
    if (watchIdRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = null;
  }, []);

  const startGeoWatch = useCallback(() => {
    if (!navigator.geolocation) return;
    stopGeoWatch();
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoState("granted");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGeoState("denied");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }, [stopGeoWatch]);

  const requestGeo = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }
    setGeoState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGeoState("granted");
        startGeoWatch();
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoState("denied");
        } else {
          setGeoState("denied");
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }, [startGeoWatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setGeoState("unsupported");
      return;
    }

    let cancelled = false;
    const permissionsApi = (
      navigator as Navigator & {
        permissions?: {
          query: (descriptor: { name: string }) => Promise<{
            state: PermissionState;
            addEventListener?: (type: "change", listener: () => void) => void;
            onchange?: (() => void) | null;
          }>;
        };
      }
    ).permissions;

    const handlePermissionState = (state: PermissionState) => {
      if (cancelled) return;
      if (state === "granted") {
        setGeoState("granted");
        startGeoWatch();
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (cancelled) return;
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => {},
          { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
        );
      } else if (state === "denied") {
        setGeoState("denied");
      } else {
        requestGeo();
      }
    };

    if (permissionsApi?.query) {
      permissionsApi
        .query({ name: "geolocation" })
        .then((result) => {
          handlePermissionState(result.state);
          const onChange = () => handlePermissionState(result.state);
          if (result.addEventListener) {
            result.addEventListener("change", onChange);
          } else {
            result.onchange = onChange;
          }
        })
        .catch(() => {
          requestGeo();
        });
    } else {
      requestGeo();
    }

    return () => {
      cancelled = true;
      stopGeoWatch();
    };
  }, [requestGeo, startGeoWatch, stopGeoWatch]);

  const tour = currentTour;
  const firstPoint = tour?.points?.[0] ?? null;
  const sourceAudioPath = getAudioPathForLanguage(firstPoint, language);
  const demoAudioPath = getDemoAudioPath(sourceAudioPath);
  const demoAudioUrl = buildApiAudioUrl(demoAudioPath) ?? "";

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTimeMs(0);
    setTotalDurationMs(0);
    setIsAudioReady(false);
    setDemoFinished(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [demoAudioUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = isMuted;
  }, [isMuted]);

  const distanceToPointMeters =
    userLocation && firstPoint
      ? distanceMeters(
          userLocation.latitude,
          userLocation.longitude,
          firstPoint.latitude,
          firstPoint.longitude,
        )
      : Infinity;

  const isInRadius =
    geoState === "granted" && distanceToPointMeters <= DEMO_RADIUS_METERS;

  const canPlay = isInRadius && Boolean(demoAudioUrl) && isAudioReady;

  const localizedTitle = tour
    ? language === "uk"
      ? (tour.titleUk ?? tour.title)
      : tour.title
    : "";
  const localizedPointTitle = firstPoint
    ? language === "uk"
      ? (firstPoint.titleUk ?? firstPoint.title)
      : firstPoint.title
    : "";
  const localizedPointDescription = firstPoint
    ? language === "uk"
      ? (firstPoint.descriptionUk ?? firstPoint.description)
      : firstPoint.description
    : "";

  const handlePlayPause = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!canPlay) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    try {
      if (demoFinished) {
        audio.currentTime = 0;
        setCurrentTimeMs(0);
        setDemoFinished(false);
      }
      await audio.play();
      setIsPlaying(true);
    } catch {}
  }, [canPlay, demoFinished, isPlaying]);

  useEffect(() => {
    if (!isInRadius && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  }, [isInRadius, isPlaying]);

  const directionsUrl = firstPoint
    ? `https://www.google.com/maps/dir/?api=1&destination=${firstPoint.latitude},${firstPoint.longitude}&travelmode=walking`
    : null;

  const tourId = (params.id as string) ?? "";
  const buyHref = `/tours/${tourId}`;
  const access = isAuthenticated ? purchasedAccess[tourId] : undefined;
  const authHref = `/auth/login?next=${encodeURIComponent(`/tours/${tourId}`)}`;
  const soloHref = access ? `/room/solo/${tourId}/live` : authHref;
  const groupHref = access === "group" ? `/room/create/${tourId}` : authHref;
  const blueCtaClass = "bg-[#005BBB] text-white shadow-lg active-scale";
  const yellowCtaClass =
    "bg-[#FFD500] text-[#0B1320] shadow-md border border-[#E6C000] active-scale";
  const exitSurveyOptions = [
    {
      reason: "too_expensive",
      signal: "review_price",
      label: dict.tourDemo.exitReasonTooExpensive,
    },
    {
      reason: "technical_issues",
      signal: "bugs",
      label: dict.tourDemo.exitReasonTechnicalIssues,
    },
    {
      reason: "uninteresting_content",
      signal: "change_script",
      label: dict.tourDemo.exitReasonUninterestingContent,
    },
    {
      reason: "walking_solo",
      signal: "not_target_audience",
      label: dict.tourDemo.exitReasonWalkingSolo,
    },
  ];

  const handleBackToTour = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
    setExitSurveyOpen(true);
  };

  const handleExitSurveySelect = async (reason: string, signal: string) => {
    if (exitSurveySubmitting) return;
    setExitSurveySubmitting(true);
    await api
      .submitFeedback({
        source: "demo_exit",
        choice: reason,
        signal,
        tourId,
        tourTitle: localizedTitle,
        client: getFeedbackClientContext(),
      })
      .catch(() => undefined);
    router.push(buyHref);
  };

  const effectiveTimeMs = scrubMs ?? currentTimeMs;
  const progressPercent =
    totalDurationMs > 0 ? (effectiveTimeMs / totalDurationMs) * 100 : 0;

  if (!tour) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 rounded-full border-2 border-coral border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <div className="relative h-[45svh] w-full shrink-0 overflow-hidden bg-secondary">
        <MapboxRouteMap
          points={tour.points}
          currentIndex={0}
          userLocation={userLocation}
          className="w-full h-full"
        />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <button
            onClick={() => router.push(buyHref)}
            className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center active-scale"
            aria-label={dict.common.back}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1 bg-coral rounded-full px-3 py-1">
            <span className="text-white text-[10px] font-bold uppercase tracking-wider">
              {dict.tourDemo.headerBadge}
            </span>
          </div>
        </div>

        {geoState === "granted" && firstPoint ? (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-coral" />
              <span className="text-white text-xs font-medium">
                {isInRadius
                  ? dict.tourDemo.youAreHere
                  : dict.tourDemo.distanceAway.replace(
                      "{distance}",
                      formatDistance(distanceToPointMeters),
                    )}
              </span>
            </div>
            {!isInRadius && directionsUrl ? (
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-coral rounded-full px-3 py-1.5 text-white text-xs font-semibold active-scale"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{dict.tourDemo.directions}</span>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background px-5">
        <div className="pt-5 pb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-coral/20 text-coral text-[10px] font-bold rounded-full uppercase tracking-wider">
              {dict.tourDemo.stopLabel}
            </span>
            <span className="text-[11px] text-muted-foreground line-clamp-1">
              {localizedTitle}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground leading-tight text-balance">
            {localizedPointTitle || dict.common.loading}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-3">
            {localizedPointDescription || dict.tourDemo.subtitle}
          </p>
        </div>

        {geoState === "loading" ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <div className="w-5 h-5 rounded-full border-2 border-coral border-t-transparent animate-spin" />
            <span className="text-sm text-muted-foreground">
              {dict.common.loading}
            </span>
          </div>
        ) : null}

        {geoState === "denied" ? (
          <GeoWarning
            title={dict.tourDemo.geoBlockedTitle}
            description={dict.tourDemo.geoBlockedHint}
            ctaLabel={dict.tourDemo.retryLocation}
            onRetry={requestGeo}
          />
        ) : null}

        {geoState === "unsupported" ? (
          <GeoWarning
            title={dict.tourDemo.geoUnsupportedTitle}
            description={dict.tourDemo.geoUnsupportedHint}
          />
        ) : null}

        {geoState === "granted" && !isInRadius ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 mt-1">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {dict.tourDemo.farFromPointTitle}
                </p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {dict.tourDemo.farFromPointHint
                    .replace("{radius}", `${DEMO_RADIUS_METERS} m`)
                    .replace("{point}", localizedPointTitle)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {geoState === "granted" && isInRadius && !demoFinished ? (
          <p className="text-xs text-emerald-500 font-medium text-center pb-1">
            {dict.tourDemo.readyToPlay}
          </p>
        ) : null}

        {demoFinished ? (
          <div className="rounded-2xl bg-coral/10 border border-coral/30 p-4 mt-1">
            <p className="text-sm font-bold text-foreground">
              {dict.tourDemo.demoComplete}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {dict.tourDemo.demoCompleteHint}
            </p>
          </div>
        ) : null}

        <div className="py-3">
          <div className="relative h-10">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-muted dark:bg-white/20 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-[#005BBB] rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {totalDurationMs > 0 ? (
              <Slider
                aria-label={dict.roomLive.seekAudio}
                minValue={0}
                maxValue={totalDurationMs}
                value={[effectiveTimeMs]}
                onChange={(v) => setScrubMs(v[0] ?? 0)}
                onChangeEnd={(v) => {
                  const next = v[0] ?? 0;
                  if (audioRef.current) {
                    audioRef.current.currentTime = next / 1000;
                  }
                  setCurrentTimeMs(next);
                  setScrubMs(null);
                }}
                isDisabled={!canPlay}
                className="absolute inset-0 w-full touch-none"
              >
                <SliderTrack className="relative w-full h-10 cursor-pointer">
                  <SliderThumb className="absolute top-1/2 w-5 h-5 rounded-full bg-[#FFD500] shadow-xl shadow-[#FFD500]/30 ring-2 ring-white/70 dark:ring-white/70" />
                </SliderTrack>
              </Slider>
            ) : null}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted-foreground dark:text-white/40">
              {formatMs(effectiveTimeMs)}
            </span>
            <span className="text-xs text-muted-foreground dark:text-white/40">
              {formatMs(totalDurationMs)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={handlePlayPause}
            disabled={!canPlay}
            className={`w-16 h-16 rounded-full flex items-center justify-center active-scale shadow-xl transition-opacity ${
              canPlay
                ? "bg-[#005BBB] shadow-[#005BBB]/30"
                : "bg-[#005BBB]/40 shadow-none cursor-not-allowed"
            }`}
            aria-label={isPlaying ? dict.roomLive.pause : dict.roomLive.play}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 text-white" />
            ) : (
              <Play className="w-7 h-7 text-white ml-1" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className="w-11 h-11 rounded-full bg-[#FFD500] text-[#0B1320] flex items-center justify-center active-scale shadow-md"
            aria-label={isMuted ? dict.roomLive.unmute : dict.roomLive.mute}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </button>
        </div>

        {demoAudioUrl ? (
          <audio
            ref={audioRef}
            preload="metadata"
            src={demoAudioUrl}
            onLoadedMetadata={(e) => {
              const audio = e.currentTarget;
              const ms = Number.isFinite(audio.duration)
                ? Math.round(audio.duration * 1000)
                : 0;
              setTotalDurationMs(ms);
              setIsAudioReady(true);
            }}
            onTimeUpdate={(e) => {
              if (scrubMs != null) return;
              setCurrentTimeMs(Math.round(e.currentTarget.currentTime * 1000));
            }}
            onEnded={() => {
              setIsPlaying(false);
              setDemoFinished(true);
              setCurrentTimeMs(totalDurationMs);
            }}
            onError={() => setIsAudioReady(false)}
            className="hidden"
          />
        ) : null}

        <div className="mt-auto pt-5 pb-5 flex flex-col gap-2 safe-bottom">
          <div className="flex gap-2">
            <Link
              href={soloHref}
              className={`w-full inline-flex items-center justify-between gap-2 rounded-2xl px-3 py-3.5 ${blueCtaClass}`}
            >
              <div className="flex min-w-0 flex-col items-start">
                <span className="text-[10px] uppercase font-semibold tracking-wide text-white/80">
                  {dict.tour.listenSolo}
                </span>
                <span className="text-xs font-medium text-white/80">
                  {access ? dict.common.start : dict.tourDemo.buyTour}
                </span>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-white/15 rounded-full px-2.5 py-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>{access ? dict.common.start : dict.auth.signIn}</span>
              </div>
            </Link>
            <Link
              href={groupHref}
              className={`w-full inline-flex items-center justify-between gap-2 rounded-2xl px-3 py-3.5 ${yellowCtaClass}`}
            >
              <div className="flex min-w-0 flex-col items-start">
                <span className="text-[10px] uppercase font-semibold tracking-wide text-[#0B1320]/75">
                  {dict.tour.startGroup}
                </span>
                <span className="text-xs font-medium text-[#0B1320]/75">
                  {access === "group"
                    ? dict.common.start
                    : dict.tourDemo.buyTour}
                </span>
              </div>
              <div className="shrink-0 flex items-center gap-1.5 text-xs font-semibold bg-[#0B1320]/10 rounded-full px-2.5 py-1">
                <Users className="w-3.5 h-3.5" />
                <span>
                  {access === "group" ? dict.common.start : dict.auth.signIn}
                </span>
              </div>
            </Link>
          </div>
          <button
            type="button"
            onClick={handleBackToTour}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card text-foreground px-4 py-3 active-scale"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">
              {dict.tourDemo.backToTour}
            </span>
          </button>
        </div>
      </div>
      {exitSurveyOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 px-4 pb-4 sm:items-center sm:pb-0">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-exit-survey-title"
            className="w-full max-w-md rounded-3xl border border-border bg-card p-5 shadow-2xl"
          >
            <h2
              id="demo-exit-survey-title"
              className="text-lg font-black text-foreground"
            >
              {dict.tourDemo.exitSurveyQuestion}
            </h2>
            <div className="mt-4 grid gap-2">
              {exitSurveyOptions.map((option) => (
                <button
                  key={option.reason}
                  type="button"
                  disabled={exitSurveySubmitting}
                  onClick={() =>
                    handleExitSurveySelect(option.reason, option.signal)
                  }
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm font-semibold text-foreground active-scale disabled:opacity-70"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GeoWarning({
  title,
  description,
  ctaLabel,
  onRetry,
}: {
  title: string;
  description: string;
  ctaLabel?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-2xl border border-coral/30 bg-coral/10 p-4 mt-1">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-coral shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
          {onRetry && ctaLabel ? (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-coral text-white px-3 py-1.5 text-xs font-semibold active-scale"
            >
              {ctaLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
