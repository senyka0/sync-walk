"use client";

import * as React from "react";

type DeviceType = "android" | "ios" | "other";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function getDeviceType(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();

  if (ua.includes("android")) {
    return "android";
  }

  const isIOS = /iphone|ipad|ipod/.test(ua);
  if (isIOS) {
    return "ios";
  }

  return "other";
}

function isStandaloneMode(): boolean {
  const isStandaloneDisplayMode = window.matchMedia(
    "(display-mode: standalone)",
  ).matches;
  const isIosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
    true;
  return isStandaloneDisplayMode || isIosStandalone;
}

export function usePWAInstall() {
  const [deviceType, setDeviceType] = React.useState<DeviceType>("other");
  const [deferredPrompt, setDeferredPrompt] =
    React.useState<BeforeInstallPromptEvent | null>(null);
  const [isDismissed, setIsDismissed] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(true);

  React.useEffect(() => {
    const platform = getDeviceType(window.navigator.userAgent);
    const installed = isStandaloneMode();

    setDeviceType(platform);
    setIsInstalled(installed);

    if (installed || platform !== "android") {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const dismissPrompt = React.useCallback(() => {
    setIsDismissed(true);
  }, []);

  const promptInstall = React.useCallback(async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const shouldShowPrompt =
    !isInstalled &&
    !isDismissed &&
    (deviceType === "ios" ||
      (deviceType === "android" && Boolean(deferredPrompt)));

  return {
    deviceType,
    shouldShowPrompt,
    promptInstall,
    dismissPrompt,
  };
}
