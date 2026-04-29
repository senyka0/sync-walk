"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { useI18n } from "@/lib/i18n";
import { getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";

type GoogleAuthButtonProps = {
  successMessage: string;
};

export function GoogleAuthButton({ successMessage }: GoogleAuthButtonProps) {
  const router = useRouter();
  const { loginWithGoogle } = useAppStore();
  const dict = useI18n();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const initializeGoogle = () => {
      const google = (window as Window & {
        google?: {
          accounts?: {
            id?: {
              initialize: (config: {
                client_id: string;
                callback: (response: { credential?: string }) => void;
              }) => void;
              renderButton: (
                element: HTMLElement,
                options: {
                  theme: "outline" | "filled_blue" | "filled_black";
                  size: "large" | "medium" | "small";
                  shape: "rectangular" | "pill" | "circle" | "square";
                  text: "signin_with" | "signup_with" | "continue_with" | "signin";
                  width?: string | number;
                },
              ) => void;
            };
          };
        };
      }).google;

      const googleId = google?.accounts?.id;
      if (!googleId || !googleButtonRef.current) return;

      googleId.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          const idToken = response.credential;
          if (!idToken) {
            toast.error(dict.auth.googleLoginFailed);
            return;
          }
          setGoogleLoading(true);
          try {
            await loginWithGoogle(idToken);
            toast.success(successMessage);
            router.push("/");
          } catch (error) {
            toast.error(getApiErrorMessage(error, dict.auth.googleLoginFailed));
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      googleButtonRef.current.innerHTML = "";
      googleId.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "rectangular",
        text: "continue_with",
        width: "320",
      });
      setGoogleReady(true);
    };

    const existing = document.querySelector(
      'script[data-google-identity="true"]',
    ) as HTMLScriptElement | null;
    if (existing) {
      if ((window as Window & { google?: unknown }).google) {
        initializeGoogle();
      } else {
        existing.addEventListener("load", initializeGoogle);
      }
      return () => {
        existing.removeEventListener("load", initializeGoogle);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => initializeGoogle();
    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, [googleClientId, loginWithGoogle, router, dict.auth.googleLoginFailed, successMessage]);

  if (!googleClientId) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        <div className="h-px flex-1 bg-border" />
        <span>{dict.auth.orContinueWith}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex justify-center">
        <div ref={googleButtonRef} />
      </div>
      {!googleReady ? (
        <button
          type="button"
          disabled
          className="w-full mt-2 border border-border rounded-xl py-3 text-sm text-muted-foreground"
        >
          {googleLoading ? dict.common.loading : dict.auth.googleLoading}
        </button>
      ) : null}
    </div>
  );
}
