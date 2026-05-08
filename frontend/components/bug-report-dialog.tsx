"use client";

import { useState } from "react";
import { Bug, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api, getApiErrorMessage } from "@/lib/api";
import { getFeedbackClientContext } from "@/lib/feedback";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { FeedbackSource } from "@/store/types";

type BugReportDialogProps = {
  children?: React.ReactNode;
  context: {
    source: FeedbackSource;
    tourTitle?: string;
    roomCode?: string;
    vote?: "yes" | "no";
  };
  triggerClassName?: string;
};

export function BugReportDialog({
  children,
  context,
  triggerClassName,
}: BugReportDialogProps) {
  const dict = useI18n();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.submitFeedback({
        source: context.source,
        message,
        tourTitle: context.tourTitle,
        roomCode: context.roomCode,
        vote: context.vote,
        client: getFeedbackClientContext(),
      });
      setOpen(false);
      setMessage("");
      toast.success(dict.feedback.reportPrepared);
    } catch (error) {
      toast.error(getApiErrorMessage(error, dict.feedback.reportFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold active-scale",
            triggerClassName,
          )}
        >
          {children ?? (
            <>
              <Bug className="w-4 h-4" />
              {dict.feedback.reportBug}
            </>
          )}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>{dict.feedback.reportTitle}</DialogTitle>
          <DialogDescription>
            {dict.feedback.reportDescription}
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={dict.feedback.reportPlaceholder}
          rows={4}
          className="min-h-28 resize-none"
        />
        <div className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
          {dict.feedback.techDataHint}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-coral text-white rounded-xl py-3 text-sm font-bold active-scale flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <Send className="w-4 h-4" />
          {submitting ? dict.feedback.sending : dict.feedback.openTelegram}
        </button>
      </DialogContent>
    </Dialog>
  );
}
