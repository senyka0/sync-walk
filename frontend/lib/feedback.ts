type FeedbackSource = "beta_banner" | "player" | "tour_complete";

type FeedbackContext = {
  source: FeedbackSource;
  tourTitle?: string;
  roomCode?: string;
  vote?: "yes" | "no";
};

type NavigatorWithUserAgentData = Navigator & {
  userAgentData?: {
    brands?: Array<{ brand: string; version: string }>;
    mobile?: boolean;
    platform?: string;
  };
};

const supportTelegramUrl =
  process.env.NEXT_PUBLIC_SUPPORT_TELEGRAM_URL ||
  "https://t.me/SyncWalkSupportBot";

const sourceLabels: Record<FeedbackSource, string> = {
  beta_banner: "Beta banner",
  player: "Player",
  tour_complete: "Tour complete",
};

export function getTechnicalDetails(): string[] {
  if (typeof window === "undefined") return [];

  const nav = window.navigator as NavigatorWithUserAgentData;
  const brands =
    nav.userAgentData?.brands
      ?.map((brand) => `${brand.brand} ${brand.version}`)
      .join(", ") || "unknown";

  return [
    `URL: ${window.location.href}`,
    `User agent: ${nav.userAgent}`,
    `Browser brands: ${brands}`,
    `Platform: ${nav.userAgentData?.platform || nav.platform || "unknown"}`,
    `Mobile: ${String(nav.userAgentData?.mobile ?? "unknown")}`,
    `Language: ${nav.language}`,
    `Viewport: ${window.innerWidth}x${window.innerHeight}`,
    `Screen: ${window.screen.width}x${window.screen.height}`,
    `Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
  ];
}

export function buildFeedbackMessage(
  message: string,
  context: FeedbackContext,
): string {
  const lines = [
    "SyncWalk beta feedback",
    `Source: ${sourceLabels[context.source]}`,
  ];

  if (context.tourTitle) lines.push(`Tour: ${context.tourTitle}`);
  if (context.roomCode) lines.push(`Room: ${context.roomCode}`);
  if (context.vote) lines.push(`Would recommend: ${context.vote}`);

  lines.push("", "Message:", message.trim() || "(empty)", "", "Tech details:");
  lines.push(...getTechnicalDetails());

  return lines.join("\n");
}

export function getTelegramFeedbackUrl(message: string): string {
  const url = new URL("https://t.me/share/url");
  const pageUrl = typeof window === "undefined" ? "" : window.location.href;

  url.searchParams.set("url", pageUrl);
  url.searchParams.set("text", message);

  return url.toString();
}

export function getSupportTelegramUrl(): string {
  return supportTelegramUrl;
}
