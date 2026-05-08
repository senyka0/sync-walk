import type { FeedbackClientContext } from "@/store/types";

const visitorIdKey = "syncwalk-visitor-id";

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>;
    mobile?: boolean;
    platform?: string;
  };
};

export function getFeedbackClientContext(): FeedbackClientContext {
  if (typeof window === "undefined") return {};

  let visitorId: string | null = null;
  try {
    visitorId = window.localStorage.getItem(visitorIdKey);
    if (!visitorId) {
      visitorId =
        window.crypto?.randomUUID?.() ??
        `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      window.localStorage.setItem(visitorIdKey, visitorId);
    }
  } catch {}

  const nav = window.navigator as NavigatorWithUserAgentData;
  const brands =
    nav.userAgentData?.brands
      ?.map((brand) => `${brand.brand} ${brand.version}`)
      .join(", ") || "unknown";

  return {
    visitorId,
    url: window.location.href,
    userAgent: nav.userAgent,
    browserBrands: brands,
    platform: nav.userAgentData?.platform || nav.platform || "unknown",
    mobile: nav.userAgentData?.mobile ?? null,
    language: nav.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen.width}x${window.screen.height}`,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}
