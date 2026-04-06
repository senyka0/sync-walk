"use client";

import { useEffect, useRef } from "react";
import { audioManager } from "@/lib/audio-manager";
import { useAppStore } from "@/store";

export function useAudio(audioUrl: string | null) {
  const loadedUrlRef = useRef<string | null>(null);

  const isPlaying = useAppStore((s) => s.isPlaying);
  const isMuted = useAppStore((s) => s.isMuted);
  const setCurrentTime = useAppStore((s) => s.setCurrentTime);
  const setTotalDuration = useAppStore((s) => s.setTotalDuration);
  const setIsAudioReady = useAppStore((s) => s.setIsAudioReady);
  const nextTrack = useAppStore((s) => s.nextTrack);

  useEffect(() => {
    if (!audioUrl || audioUrl === loadedUrlRef.current) return;

    setIsAudioReady(false);

    audioManager
      .load(audioUrl)
      .then(() => {
        const store = useAppStore.getState();
        loadedUrlRef.current = audioUrl;
        setTotalDuration(audioManager.getDurationMs());
        setIsAudioReady(true);
        audioManager.setOnTimeUpdate((ms) => setCurrentTime(ms));
        audioManager.setOnEnded(() => nextTrack());
        audioManager.seekTo(store.currentTimeMs);
        if (store.isPlaying) {
          audioManager.play().catch(() => {});
        }
      })
      .catch(() => {
        loadedUrlRef.current = null;
        setIsAudioReady(false);
      });

    return () => {
      audioManager.dispose();
      loadedUrlRef.current = null;
      setIsAudioReady(false);
    };
  }, [audioUrl, setCurrentTime, setTotalDuration, setIsAudioReady, nextTrack]);

  useEffect(() => {
    if (isPlaying) {
      audioManager.play().catch(() => {});
    } else {
      audioManager.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    audioManager.setMuted(isMuted);
  }, [isMuted]);
}
