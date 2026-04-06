"use client";

import { useEffect, useRef, useState } from "react";

type WakeLockStatus = "inactive" | "active" | "unsupported";

export function useScreenWakeLock(enabled: boolean): WakeLockStatus {
  const lockRef = useRef<WakeLockSentinel | null>(null);
  const [status, setStatus] = useState<WakeLockStatus>("inactive");

  useEffect(() => {
    let isMounted = true;

    const releaseLock = async () => {
      const lock = lockRef.current;
      lockRef.current = null;
      if (!lock || lock.released) return;
      try {
        await lock.release();
      } catch {}
    };

    const requestLock = async () => {
      if (!enabled) return;
      if (!window.isSecureContext || !("wakeLock" in navigator)) {
        if (isMounted) setStatus("unsupported");
        return;
      }
      if (document.visibilityState !== "visible") return;

      try {
        const lock = await navigator.wakeLock.request("screen");
        if (!isMounted) {
          await lock.release();
          return;
        }
        lockRef.current = lock;
        setStatus("active");
        lock.addEventListener("release", () => {
          if (isMounted) setStatus("inactive");
          lockRef.current = null;
        });
      } catch {
        if (isMounted) setStatus("unsupported");
      }
    };

    const onVisibilityChange = () => {
      if (!enabled) return;
      if (document.visibilityState === "visible") {
        requestLock();
      }
    };

    if (enabled) {
      requestLock();
    } else {
      setStatus("inactive");
      releaseLock();
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", onVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", onVisibilityChange);
      releaseLock();
    };
  }, [enabled]);

  return status;
}
