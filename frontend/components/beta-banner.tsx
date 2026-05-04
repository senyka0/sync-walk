"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { BugReportDialog } from "@/components/bug-report-dialog";
import { useI18n } from "@/lib/i18n";

export function BetaBanner() {
  const dict = useI18n();
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 pointer-events-none">
      <div className="pointer-events-auto flex items-start gap-2 border-b border-coral/30 bg-background/95 px-3 py-2 pr-10 text-xs text-foreground shadow-lg shadow-black/10 backdrop-blur">
        <div className="min-w-0 flex-1">
          <span className="font-medium">{dict.feedback.betaBannerText} </span>
          <BugReportDialog
            context={{ source: "beta_banner" }}
            triggerClassName="text-xs font-bold text-coral underline underline-offset-4"
          >
            {dict.feedback.betaBannerCta}
          </BugReportDialog>
        </div>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={dict.feedback.dismissBetaBanner}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
