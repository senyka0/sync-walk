export type City = "kyiv" | "kharkiv";
export type RoomStatus = "waiting" | "active" | "finished";
export type SyncStatus = "synced" | "behind" | "reconnecting";
export type PaymentStatus = "idle" | "processing" | "success" | "failed";
export type PurchasedAccess = "solo" | "group";
export type Language = "en" | "uk";
export type AudioByLanguage = {
  en: string | null;
  uk: string | null;
};

export interface TourPoint {
  id: string;
  orderIndex: number;
  title: string;
  titleUk?: string | null;
  description: string;
  descriptionUk?: string | null;
  latitude: number;
  longitude: number;
  audioByLanguage: AudioByLanguage;
  audioDurationMs?: number;
}

export interface Tour {
  id: string;
  city: City;
  title: string;
  titleUk?: string | null;
  description: string;
  descriptionUk?: string | null;
  coverImage: string;
  durationMin: number;
  individualPrice: number;
  groupPrice: number;
  maxParticipants: number;
  stopsCount: number;
  points: TourPoint[];
}

export interface Room {
  id: string;
  tourId: string;
  accessCode: string;
  hostName: string;
}

export interface Participant {
  id: string;
  name: string;
  role: "host" | "listener";
  isOnline: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
}
