export type City = "kyiv" | "kharkiv";
export type RoomStatus = "waiting" | "active" | "finished";
export type SyncStatus = "synced" | "behind" | "reconnecting";
export type PaymentStatus = "idle" | "processing" | "success" | "failed";
export type PurchasedAccess = "solo" | "group";
export type Language = "en" | "uk";

export interface TourPoint {
  id: string;
  orderIndex: number;
  title: string;
  titleUk?: string | null;
  description: string;
  descriptionUk?: string | null;
  latitude: number;
  longitude: number;
  audioUrlEn: string | null;
  audioUrlUk: string | null;
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

export type FeedbackSource =
  | "beta_banner"
  | "player"
  | "tour_complete"
  | "demo_exit"
  | "bug_report";

export interface FeedbackClientContext {
  visitorId?: string | null;
  url?: string | null;
  userAgent?: string | null;
  browserBrands?: string | null;
  platform?: string | null;
  mobile?: boolean | null;
  language?: string | null;
  viewport?: string | null;
  screen?: string | null;
  timeZone?: string | null;
}

export interface FeedbackPayload {
  source: FeedbackSource;
  message?: string | null;
  choice?: string | null;
  signal?: string | null;
  tourId?: string | null;
  tourTitle?: string | null;
  roomCode?: string | null;
  vote?: "yes" | "no" | null;
  client?: FeedbackClientContext | null;
}
