import { API_URL } from "@/lib/api";
import type { Language, TourPoint } from "@/store/types";

export function getAudioPathForLanguage(
  point: TourPoint | null | undefined,
  language: Language,
): string {
  if (!point) return "";
  if (language === "uk") {
    return point.audioUrlUk ?? point.audioUrlEn ?? "";
  }
  return point.audioUrlEn ?? point.audioUrlUk ?? "";
}

export function buildApiAudioUrl(
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL.replace(/\/$/, "")}${normalizedPath}`;
}
