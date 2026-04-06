"use client";

import {
  Download,
  Ellipsis,
  Home,
  PlusSquare,
  Smartphone,
  X,
} from "lucide-react";

import { usePWAInstall } from "@/hooks/use-pwa-install";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function PWAInstallBanner() {
  const { deviceType, shouldShowPrompt, promptInstall, dismissPrompt } =
    usePWAInstall();
  const dict = useI18n();

  if (!shouldShowPrompt) {
    return null;
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 rounded-2xl border border-slate-700 bg-slate-900/95 p-5 text-white shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:w-md">
      <button
        type="button"
        onClick={dismissPrompt}
        className="absolute right-3 top-3 rounded p-1 text-slate-300 transition hover:bg-slate-800 hover:text-white"
        aria-label={dict.pwa.dismiss}
      >
        <X className="h-4 w-4" />
      </button>
      <div>
        <div className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-cyan-300" />
          <p className="text-xl font-semibold leading-none">{dict.pwa.title}</p>
        </div>
        {deviceType === "android" ? (
          <>
            <p className="mt-3 text-base text-slate-200">
              {dict.pwa.androidHint}
            </p>
            <Button
              className="mt-4 h-11 px-5 text-base"
              onClick={promptInstall}
            >
              <Download className="h-4 w-4" />
              {dict.pwa.installApp}
            </Button>
          </>
        ) : (
          <div className="mt-4 space-y-3 rounded-xl bg-slate-800/70 p-3">
            <p className="text-sm font-medium uppercase tracking-wide text-cyan-300">
              {dict.pwa.iosTitle}
            </p>
            <div className="flex items-center gap-2 text-base text-slate-100">
              <Ellipsis className="h-5 w-5 shrink-0 text-cyan-300" />
              <p>
                <span className="font-semibold">1.</span> {dict.pwa.step1}
              </p>
            </div>
            <div className="flex items-center gap-2 text-base text-slate-100">
              <span
                aria-hidden="true"
                className="h-5 w-5 shrink-0 bg-cyan-300"
                style={{
                  WebkitMaskImage: 'url("/share-apple.svg")',
                  maskImage: 'url("/share-apple.svg")',
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
              <p>
                <span className="font-semibold">2.</span> {dict.pwa.step2}
              </p>
            </div>
            <div className="flex items-center gap-2 text-base text-slate-100">
              <span
                aria-hidden="true"
                className="h-5 w-5 shrink-0 bg-cyan-300"
                style={{
                  WebkitMaskImage: 'url("/down-arrow-svgrepo-com.svg")',
                  maskImage: 'url("/down-arrow-svgrepo-com.svg")',
                  WebkitMaskRepeat: "no-repeat",
                  maskRepeat: "no-repeat",
                  WebkitMaskPosition: "center",
                  maskPosition: "center",
                  WebkitMaskSize: "contain",
                  maskSize: "contain",
                }}
              />
              <p>
                <span className="font-semibold">3.</span> {dict.pwa.step3}
              </p>
            </div>
            <div className="flex items-center gap-2 text-base text-slate-100">
              <PlusSquare className="h-5 w-5 shrink-0 text-cyan-300" />

              <p>
                <span className="font-semibold">4.</span> {dict.pwa.step4}
              </p>
            </div>
            <div className="flex items-center gap-2 text-base text-slate-100">
              <Home className="h-5 w-5 shrink-0 text-cyan-300" />
              <p>
                <span className="font-semibold">5.</span> {dict.pwa.step5}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
