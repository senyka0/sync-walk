"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  LogOut,
  Users,
  ChevronDown,
  Crown,
  Check,
  MapPin,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { useSocket } from "@/hooks/use-socket";
import { useAudio } from "@/hooks/use-audio";
import { useScreenWakeLock } from "@/hooks/use-screen-wake-lock";
import { buildApiAudioUrl, getAudioPathForLanguage } from "@/lib/audio";
import { useI18n } from "@/lib/i18n";
import { BugReportDialog } from "@/components/bug-report-dialog";
import { MapboxRouteMap } from "@/components/mapbox-route-map";
import { Slider, SliderThumb, SliderTrack } from "react-aria-components";

function formatMs(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

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

function SyncDot({
  status,
  synced,
  behind,
  reconnecting,
}: {
  status: "synced" | "behind" | "reconnecting";
  synced: string;
  behind: string;
  reconnecting: string;
}) {
  const color =
    status === "synced"
      ? "bg-emerald-500"
      : status === "behind"
        ? "bg-amber-400"
        : "bg-coral";
  const label =
    status === "synced" ? synced : status === "behind" ? behind : reconnecting;
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${color} animate-pulse`} />
      <span className="text-xs font-medium text-muted-foreground dark:text-white/60">
        {label}
      </span>
    </div>
  );
}

export function RoomLiveContent({ isSolo = false }: { isSolo?: boolean }) {
  const params = useParams();
  const router = useRouter();

  const code = params.code as string | undefined;
  const paramTourId = params.tourId as string | undefined;

  const {
    currentRoom,
    tours,
    currentTour,
    fetchTourById,
    isHost,
    participants,
    roomStatus,
    setRoomStatus,
    transferHost,
    leaveRoom,
    createRoom,
    isPlaying,
    currentTrackIndex,
    currentTimeMs,
    totalDurationMs,
    isAudioReady,
    isMuted,
    syncStatus,
    language,
    play,
    pause,
    seek,
    toggleMute,
    nextTrack,
    prevTrack,
    setCurrentTime,
    setTotalDuration,
  } = useAppStore();
  const dict = useI18n();
  const isHostView = isSolo || isHost;

  const [showManage, setShowManage] = useState(false);
  const [scrubMs, setScrubMs] = useState<number | null>(null);
  const [nearNextPoint, setNearNextPoint] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const inRadiusRef = useRef(false);
  const lastHintedNextIndexRef = useRef<number | null>(null);

  useSocket(isSolo ? null : (currentRoom?.id ?? null));

  useEffect(() => {
    if (!window.isSecureContext) return;
    if (!navigator.geolocation) return;

    const clearGeoWatch = () => {
      if (watchIdRef.current == null) return;
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    };

    const onPosition = (position: GeolocationPosition) => {
      setUserLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    };

    const startGeoWatch = () => {
      clearGeoWatch();
      watchIdRef.current = navigator.geolocation.watchPosition(
        onPosition,
        () => {},
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 20000,
        },
      );
    };

    navigator.geolocation.getCurrentPosition(onPosition, () => {}, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    });

    const onResume = () => {
      if (document.visibilityState === "visible") startGeoWatch();
    };

    startGeoWatch();
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("pageshow", onResume);

    return () => {
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("pageshow", onResume);
      clearGeoWatch();
    };
  }, []);

  useEffect(() => {
    if (isSolo && paramTourId && !currentRoom) {
      createRoom(paramTourId);
    }
  }, [isSolo, paramTourId, currentRoom, createRoom]);

  const tourId = isSolo ? paramTourId : currentRoom?.tourId;

  useEffect(() => {
    if (tourId) fetchTourById(tourId);
  }, [tourId, fetchTourById]);

  const tourFromList = tours.find((t) => t.id === tourId) ?? tours[0];
  const tour =
    currentTour &&
    currentTour.id === tourId &&
    (currentTour.points?.length ?? 0) > 0
      ? currentTour
      : tourFromList;
  const currentPoint = tour?.points[currentTrackIndex];
  const localizedTourTitle =
    language === "uk"
      ? (tour?.titleUk ?? tour?.title ?? "")
      : (tour?.title ?? "");
  const localizedPointTitle =
    language === "uk"
      ? (currentPoint?.titleUk ?? currentPoint?.title ?? "")
      : (currentPoint?.title ?? "");
  const localizedPointDescription =
    language === "uk"
      ? (currentPoint?.descriptionUk ?? currentPoint?.description ?? "")
      : (currentPoint?.description ?? "");
  const path = getAudioPathForLanguage(currentPoint, language);
  const audioUrl = buildApiAudioUrl(path);

  useAudio(audioUrl);
  useScreenWakeLock(isPlaying);

  useEffect(() => {
    const enterRadiusMeters = 80;
    const exitRadiusMeters = 120;
    const nextIndex = currentTrackIndex + 1;
    const nextPoint = tour?.points?.[nextIndex];
    if (!isHostView || !userLocation || !nextPoint) {
      inRadiusRef.current = false;
      setNearNextPoint(false);
      return;
    }
    const meters = distanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      nextPoint.latitude,
      nextPoint.longitude,
    );
    if (!inRadiusRef.current && meters <= enterRadiusMeters) {
      inRadiusRef.current = true;
      setNearNextPoint(true);
      if (lastHintedNextIndexRef.current !== nextIndex) {
        toast.info(dict.roomLive.nextPointHint);
        lastHintedNextIndexRef.current = nextIndex;
      }
      return;
    }
    if (inRadiusRef.current && meters >= exitRadiusMeters) {
      inRadiusRef.current = false;
      setNearNextPoint(false);
      return;
    }
    setNearNextPoint(inRadiusRef.current);
  }, [
    currentTrackIndex,
    dict.roomLive.nextPointHint,
    isHostView,
    tour,
    userLocation,
  ]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!audioUrl && isPlaying) {
      intervalRef.current = setInterval(() => {
        const { currentTimeMs: t, totalDurationMs: total } =
          useAppStore.getState();
        if (t >= total) {
          const store = useAppStore.getState();
          if (currentTrackIndex < (tour?.points.length ?? 1) - 1) {
            store.nextTrack();
          } else {
            store.pause();
            store.setRoomStatus("finished");
            const destCode = isSolo ? "solo" : (code ?? "solo");
            router.push(`/room/${destCode}/done`);
          }
        } else {
          setCurrentTime(t + 100);
        }
      }, 100);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    audioUrl,
    isPlaying,
    currentTrackIndex,
    tour,
    code,
    router,
    setCurrentTime,
    isSolo,
  ]);

  const handleLeave = () => {
    pause();
    leaveRoom();
    toast.info(dict.roomLive.leftSession);
    router.push("/profile/tours");
  };

  const handleEndTour = () => {
    pause();
    setRoomStatus("finished");
    const destCode = isSolo ? "solo" : (code ?? "solo");
    router.push(`/room/${destCode}/done`);
  };

  const effectiveTimeMs = scrubMs ?? currentTimeMs;
  const progressPercent =
    totalDurationMs > 0 ? (effectiveTimeMs / totalDurationMs) * 100 : 0;

  return (
    <div className="flex h-screen flex-col bg-background">
      <div className="relative h-[50svh] w-full shrink-0 overflow-hidden bg-secondary">
        <MapboxRouteMap
          points={tour?.points ?? []}
          currentIndex={currentTrackIndex}
          userLocation={userLocation}
          className="w-full h-full"
        />

        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <SyncDot
            status={syncStatus}
            synced={dict.roomLive.synced}
            behind={dict.roomLive.behind}
            reconnecting={dict.roomLive.reconnecting}
          />
          {!isSolo && (
            <div className="flex gap-1.5">
              {participants.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className="relative w-7 h-7 rounded-full bg-coral flex items-center justify-center text-white text-[10px] font-bold"
                >
                  {p.name[0]}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-secondary ${
                      p.isOnline ? "bg-emerald-500" : "bg-muted-foreground"
                    }`}
                  />
                </div>
              ))}
              {participants.length > 4 && (
                <div className="w-7 h-7 rounded-full bg-muted/70 dark:bg-white/20 flex items-center justify-center text-foreground dark:text-white text-[10px] font-bold">
                  +{participants.length - 4}
                </div>
              )}
            </div>
          )}
          {isSolo && (
            <div className="flex items-center gap-1 bg-muted/70 dark:bg-white/10 rounded-full px-3 py-1">
              <MapPin className="w-3 h-3 text-coral" />
              <span className="text-muted-foreground dark:text-white/70 text-xs font-medium">
                {dict.roomLive.soloMode}
              </span>
            </div>
          )}
        </div>

        <div className="absolute bottom-2 right-2 text-[10px] text-white/30 bg-black/20 px-2 py-0.5 rounded">
          {dict.common.map}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background px-5">
        <div className="pt-5 pb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 bg-coral/20 text-coral text-[10px] font-bold rounded-full uppercase tracking-wider">
              {dict.roomLive.stop} {currentTrackIndex + 1} /{" "}
              {tour?.points.length ?? 1}
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground leading-tight text-balance">
            {localizedPointTitle || dict.common.loading}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {localizedPointDescription}
          </p>
        </div>
        <div className="py-3">
          <div className="relative h-10">
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-muted dark:bg-white/20 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-coral rounded-full transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            {isHostView && totalDurationMs > 0 && (
              <Slider
                aria-label={dict.roomLive.seekAudio}
                minValue={0}
                maxValue={totalDurationMs}
                value={[effectiveTimeMs]}
                onChange={(v) => setScrubMs(v[0] ?? 0)}
                onChangeEnd={(v) => {
                  seek(v[0] ?? 0);
                  setScrubMs(null);
                }}
                isDisabled={!isAudioReady}
                className="absolute inset-0 w-full touch-none"
              >
                <SliderTrack className="relative w-full h-10 cursor-pointer">
                  <SliderThumb className="absolute top-1/2 w-5 h-5 rounded-full bg-coral shadow-xl shadow-coral/30 ring-2 ring-white/70 dark:ring-white/70" />
                </SliderTrack>
              </Slider>
            )}
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
        {isHostView ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-8">
              <button
                onClick={prevTrack}
                className="w-11 h-11 rounded-full bg-coral text-white dark:bg-coral flex items-center justify-center active-scale shadow-md"
                aria-label={dict.roomLive.previousStop}
              >
                <SkipBack className="w-5 h-5" />
              </button>

              <button
                onClick={isPlaying ? pause : play}
                className="w-16 h-16 rounded-full bg-coral flex items-center justify-center active-scale shadow-xl shadow-coral/30"
                aria-label={
                  isPlaying ? dict.roomLive.pause : dict.roomLive.play
                }
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-white" />
                ) : (
                  <Play className="w-7 h-7 text-white ml-1" />
                )}
              </button>

              <button
                onClick={nextTrack}
                className="w-11 h-11 rounded-full bg-coral text-white dark:bg-coral flex items-center justify-center active-scale shadow-md"
                aria-label={dict.roomLive.nextStop}
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="w-11 h-11 rounded-full bg-coral text-white dark:bg-coral flex items-center justify-center active-scale shadow-md"
                aria-label={isMuted ? dict.roomLive.unmute : dict.roomLive.mute}
              >
                {isMuted ? (
                  <VolumeX className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>
            </div>

            {!isSolo && (
              <button
                onClick={() => setShowManage(!showManage)}
                className="w-full flex items-center justify-center gap-2 bg-coral text-white dark:bg-coral rounded-xl py-3 text-sm font-semibold active-scale"
              >
                <Users className="w-4 h-4" />
                {dict.roomLive.manageGroup.replace(
                  "{count}",
                  String(participants.length),
                )}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showManage ? "rotate-180" : ""}`}
                />
              </button>
            )}

            {showManage && !isSolo && (
              <div className="bg-secondary rounded-2xl p-4 border border-white/10">
                <h3 className="text-sm font-bold text-white mb-3">
                  {dict.roomLive.participants}
                </h3>
                <div className="flex flex-col gap-2 mb-4">
                  {participants.map((p) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-coral flex items-center justify-center text-white text-xs font-bold">
                        {p.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">
                          {p.name}
                        </p>
                      </div>
                      {p.role !== "host" ? (
                        <button
                          onClick={() => {
                            transferHost(p.id);
                            toast.success(
                              dict.roomLive.newHost.replace("{name}", p.name),
                            );
                          }}
                          className="text-xs text-coral font-semibold px-2.5 py-1 border border-coral/30 rounded-lg active-scale"
                        >
                          {dict.roomLive.makeHost}
                        </button>
                      ) : (
                        <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleEndTour}
                  className="w-full py-2.5 bg-coral/20 text-coral rounded-xl text-sm font-bold active-scale border border-coral/20"
                >
                  {dict.roomLive.endTourForEveryone}
                </button>
              </div>
            )}

            <BugReportDialog
              context={{
                source: "player",
                tourTitle: localizedTourTitle,
                roomCode: code,
              }}
              triggerClassName="w-full bg-white text-black border border-border dark:bg-coral/10 dark:text-white dark:border-coral/30 rounded-xl py-3"
            />

            <button
              onClick={handleEndTour}
              className="w-full flex items-center justify-center gap-2 bg-coral text-white dark:bg-coral/25 dark:border-coral/40 border border-coral/40 rounded-xl py-3 text-sm font-semibold active-scale"
            >
              <Check className="w-4 h-4" />
              {isSolo ? dict.roomLive.endSoloTour : dict.roomLive.endTour}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-2 bg-coral text-white dark:bg-coral/20 rounded-xl px-4 py-3">
              <Wifi className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-white/90">
                {dict.roomLive.listeningWith.replace(
                  "{host}",
                  currentRoom?.hostName ?? dict.roomCreate.host,
                )}
              </span>
            </div>

            <button
              onClick={toggleMute}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold active-scale ${
                isMuted
                  ? "bg-white text-black border border-border dark:bg-coral/25 dark:text-white dark:border-coral/40"
                  : "bg-coral text-white dark:bg-coral dark:text-white"
              }`}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
              {isMuted ? dict.roomLive.unmute : dict.roomLive.mute}
            </button>

            <BugReportDialog
              context={{
                source: "player",
                tourTitle: localizedTourTitle,
                roomCode: code,
              }}
              triggerClassName="w-full bg-white text-black border border-border dark:bg-coral/10 dark:text-white dark:border-coral/30 rounded-xl py-3"
            />

            <button
              onClick={handleLeave}
              className="w-full flex items-center justify-center gap-2 bg-coral text-white dark:bg-coral/25 dark:border-coral/40 border border-coral/40 rounded-xl py-3 text-sm font-semibold active-scale"
            >
              <LogOut className="w-4 h-4" />
              {dict.roomLive.leaveGroup}
            </button>
          </div>
        )}
        <p className="text-xs text-muted-foreground dark:text-white/55 mt-auto pt-4 pb-4 text-center">
          {dict.roomLive.keepAwakeFallback}
        </p>
      </div>
    </div>
  );
}
