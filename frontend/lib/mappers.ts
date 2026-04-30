import type { Tour, TourPoint, User, Room, Participant } from "@/store/types";

export function mapTourPoint(raw: Record<string, unknown>): TourPoint {
  const audioByLanguageRaw = (raw.audio_by_language ??
    null) as Record<string, unknown> | null;
  const enAudio =
    (raw.audio_url_en as string | null | undefined) ??
    (audioByLanguageRaw?.en as string | null | undefined) ??
    (raw.audio_url as string | null | undefined) ??
    null;
  const ukAudio =
    (raw.audio_url_uk as string | null | undefined) ??
    (audioByLanguageRaw?.uk as string | null | undefined) ??
    null;

  return {
    id: String(raw.id),
    orderIndex: raw.order_index as number,
    title: raw.title as string,
    titleUk: (raw.title_uk as string | null | undefined) ?? null,
    description: raw.description as string,
    descriptionUk: (raw.description_uk as string | null | undefined) ?? null,
    latitude: raw.latitude as number,
    longitude: raw.longitude as number,
    audioByLanguage: {
      en: enAudio,
      uk: ukAudio ?? enAudio,
    },
  };
}

export function mapTour(raw: Record<string, unknown>): Tour {
  const points = Array.isArray(raw.points)
    ? (raw.points as Record<string, unknown>[]).map(mapTourPoint)
    : [];

  return {
    id: String(raw.id),
    city: raw.city as Tour["city"],
    title: raw.title as string,
    titleUk: (raw.title_uk as string | null | undefined) ?? null,
    description: raw.description as string,
    descriptionUk: (raw.description_uk as string | null | undefined) ?? null,
    coverImage: raw.cover_image_url as string,
    durationMin: raw.duration_min as number,
    individualPrice: raw.individual_price as number,
    groupPrice: raw.group_price as number,
    maxParticipants: raw.max_participants as number,
    stopsCount: (raw.stops_count as number | undefined) ?? points.length,
    points,
  };
}

export function mapUser(raw: Record<string, unknown>): User {
  return {
    id: String(raw.id),
    name: raw.name as string,
    email: raw.email as string,
  };
}

export function mapRoom(raw: Record<string, unknown>): Room {
  return {
    id: String(raw.id),
    tourId: String(raw.tour_id),
    accessCode: raw.access_code as string,
    hostName: raw.host_name as string,
  };
}

export function mapParticipant(raw: Record<string, unknown>): Participant {
  return {
    id: String(raw.id),
    name: (raw.user_name ?? raw.name) as string,
    role: raw.role as "host" | "listener",
    isOnline: (raw.is_online ?? true) as boolean,
  };
}
