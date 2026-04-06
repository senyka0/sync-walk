import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  User,
  Tour,
  Room,
  Participant,
  City,
  RoomStatus,
  SyncStatus,
  PaymentStatus,
  PurchasedAccess,
  Language,
} from "./types";
import { api, getApiErrorMessage } from "@/lib/api";
import { socketManager } from "@/lib/socket";
import { mapTour, mapUser, mapRoom, mapParticipant } from "@/lib/mappers";
import { audioManager } from "@/lib/audio-manager";

interface AuthSlice {
  user: User | null;
  isAuthenticated: boolean;
  authToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrateAuth: () => Promise<void>;
}

interface ToursSlice {
  tours: Tour[];
  selectedCity: City;
  currentTour: Tour | null;
  setCity: (city: City) => void;
  fetchTours: () => Promise<void>;
  fetchTourById: (id: string) => Promise<void>;
}

interface PaymentSlice {
  paymentStatus: PaymentStatus;
  purchasedAccess: Record<string, PurchasedAccess>;
  syncPurchasedAccess: () => Promise<void>;
  createPayment: (
    tourId: string,
    groupType: "individual" | "group",
  ) => Promise<{
    paymentUrl: string;
    returnUrl: string;
    serviceUrl: string;
    merchantAuthType: string;
    merchantTransactionSecureType: string;
    orderTimeout: number;
    language: string;
    orderReference: string;
    merchantAccount: string;
    merchantDomainName: string;
    orderDate: number;
    amount: number;
    currency: string;
    productName: string[];
    productCount: number[];
    productPrice: number[];
    merchantSignature: string;
  }>;
  checkPaymentStatus: (
    orderReference: string,
    tourId: string,
    groupType: "individual" | "group",
  ) => Promise<PaymentStatus>;
  resetPayment: () => void;
}

interface RoomSlice {
  currentRoom: Room | null;
  participants: Participant[];
  isHost: boolean;
  roomStatus: RoomStatus;
  createRoom: (tourId: string) => Promise<void>;
  joinRoom: (accessCode: string, name: string) => Promise<void>;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (id: string) => void;
  transferHost: (newHostId: string) => void;
  leaveRoom: () => void;
  setRoomStatus: (status: RoomStatus) => void;
}

interface PlayerSlice {
  isPlaying: boolean;
  isAudioReady: boolean;
  currentTrackIndex: number;
  currentTimeMs: number;
  totalDurationMs: number;
  isMuted: boolean;
  syncStatus: SyncStatus;
  play: () => void;
  pause: () => void;
  seek: (timeMs: number) => void;
  syncWithHost: () => void;
  toggleMute: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  setCurrentTime: (ms: number) => void;
  setTotalDuration: (ms: number) => void;
  setIsAudioReady: (ready: boolean) => void;
}

interface SettingsSlice {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

type AppStore = AuthSlice &
  ToursSlice &
  PaymentSlice &
  RoomSlice &
  PlayerSlice &
  SettingsSlice;

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      authToken: null,

      login: async (email: string, password: string) => {
        try {
          const res = await api.login(email, password);
          api.setToken(res.access_token);
          const user = mapUser(res.user as unknown as Record<string, unknown>);
          set({ user, isAuthenticated: true, authToken: res.access_token });
          try {
            await get().syncPurchasedAccess();
          } catch {}
        } catch (error) {
          throw new Error(getApiErrorMessage(error, "Invalid credentials"));
        }
      },

      register: async (name: string, email: string, password: string) => {
        try {
          const res = await api.register(name, email, password);
          api.setToken(res.access_token);
          const user = mapUser(res.user as unknown as Record<string, unknown>);
          set({ user, isAuthenticated: true, authToken: res.access_token });
          try {
            await get().syncPurchasedAccess();
          } catch {}
        } catch (error) {
          throw new Error(getApiErrorMessage(error, "Registration failed"));
        }
      },

      logout: () => {
        api.setToken(null);
        socketManager.disconnect();
        set({ user: null, isAuthenticated: false, authToken: null });
      },

      hydrateAuth: async () => {
        const token = get().authToken;
        if (!token) return;
        api.setToken(token);
        try {
          const raw = await api.getMe();
          const user = mapUser(raw as unknown as Record<string, unknown>);
          set({ user, isAuthenticated: true });
          try {
            await get().syncPurchasedAccess();
          } catch {}
        } catch {
          api.setToken(null);
          set({ user: null, isAuthenticated: false, authToken: null });
        }
      },

      tours: [],
      selectedCity: "kyiv",
      currentTour: null,

      setCity: (city: City) => set({ selectedCity: city }),

      fetchTours: async () => {
        const { selectedCity } = get();
        try {
          const raw = await api.getTours(selectedCity);
          const tours = (raw as unknown as Record<string, unknown>[]).map(
            mapTour,
          );
          set({ tours });
        } catch {
          set({ tours: [] });
        }
      },

      fetchTourById: async (id: string) => {
        try {
          const raw = await api.getTourById(id);
          const tour = mapTour(raw as unknown as Record<string, unknown>);
          set({ currentTour: tour });
        } catch {
          const tour = get().tours.find((t) => t.id === id) ?? null;
          set({ currentTour: tour });
        }
      },

      paymentStatus: "idle",
      purchasedAccess: {},

      syncPurchasedAccess: async () => {
        try {
          const payments = await api.getMyPayments();
          const nextAccess: Record<string, PurchasedAccess> = {};
          for (const payment of payments) {
            const status = String(payment.status ?? "").toLowerCase();
            if (status !== "approved" && status !== "refunded") continue;
            const tourId = String(payment.tour_id);
            const current = nextAccess[tourId];
            if (payment.group_type === "group") {
              nextAccess[tourId] = "group";
            } else {
              nextAccess[tourId] = current === "group" ? "group" : "solo";
            }
          }
          set({ purchasedAccess: nextAccess });
        } catch {}
      },

      createPayment: async (
        tourId: string,
        groupType: "individual" | "group",
      ) => {
        set({ paymentStatus: "processing" });
        try {
          const response = await api.createPayment(tourId, groupType);
          return {
            paymentUrl: response.payment_url,
            returnUrl: response.return_url,
            serviceUrl: response.service_url,
            merchantAuthType: response.merchant_auth_type,
            merchantTransactionSecureType:
              response.merchant_transaction_secure_type,
            orderTimeout: response.order_timeout,
            language: response.language,
            orderReference: response.order_reference,
            merchantAccount: response.merchant_account,
            merchantDomainName: response.merchant_domain_name,
            orderDate: response.order_date,
            amount: response.amount,
            currency: response.currency,
            productName: response.product_name,
            productCount: response.product_count,
            productPrice: response.product_price,
            merchantSignature: response.merchant_signature,
          };
        } catch {
          set({ paymentStatus: "failed" });
          throw new Error("Payment initialization failed");
        }
      },

      checkPaymentStatus: async (
        orderReference: string,
        tourId: string,
        groupType: "individual" | "group",
      ) => {
        try {
          const payment = await api.getPaymentByOrder(orderReference);
          const status = String(payment.status ?? "").toLowerCase();
          if (status === "approved" || status === "refunded") {
            set((state) => {
              const current = state.purchasedAccess[tourId];
              const next =
                groupType === "group"
                  ? "group"
                  : current === "group"
                    ? "group"
                    : "solo";
              return {
                paymentStatus: "success",
                purchasedAccess: {
                  ...state.purchasedAccess,
                  [tourId]: next,
                },
              };
            });
            return "success";
          }
          if (status === "declined") {
            set({ paymentStatus: "failed" });
            return "failed";
          }
          set({ paymentStatus: "processing" });
          return "processing";
        } catch {
          set({ paymentStatus: "failed" });
          return "failed";
        }
      },

      resetPayment: () => set({ paymentStatus: "idle" }),

      currentRoom: null,
      participants: [],
      isHost: false,
      roomStatus: "waiting",

      createRoom: async (tourId: string) => {
        const user = get().user;
        if (!get().authToken) {
          throw new Error("Authentication required to create group room");
        }
        const raw = await api.createRoom(tourId);
        const room = mapRoom(raw as unknown as Record<string, unknown>);
        const hostParticipant: Participant = {
          id: user?.id ?? "host-1",
          name: user?.name ?? "Host",
          role: "host",
          isOnline: true,
        };
        set({
          currentRoom: room,
          participants: [hostParticipant],
          isHost: true,
          roomStatus: "waiting",
        });
        socketManager.connect();
        socketManager.joinRoom(room.id, user?.name ?? "Host");
      },

      joinRoom: async (accessCode: string, name: string) => {
        const raw = await api.getRoomByCode(accessCode);
        const room = mapRoom(raw as unknown as Record<string, unknown>);
        const self: Participant = {
          id: `listener-${Date.now()}`,
          name,
          role: "listener",
          isOnline: true,
        };
        set({
          currentRoom: room,
          participants: [self],
          isHost: false,
          roomStatus: raw.status as RoomStatus,
        });
        socketManager.connect();
        socketManager.joinRoom(room.id, name);
      },

      addParticipant: (participant: Participant) => {
        set((state) => {
          const existing = state.participants.find((p) => p.id === participant.id);
          if (existing) {
            return {
              participants: state.participants.map((p) =>
                p.id === participant.id ? { ...p, ...participant } : p,
              ),
            };
          }
          return {
            participants: [...state.participants, participant],
          };
        });
      },

      removeParticipant: (id: string) => {
        set((state) => ({
          participants: state.participants.filter((p) => p.id !== id),
        }));
      },

      transferHost: (newHostId: string) => {
        const { currentRoom } = get();
        if (currentRoom) {
          if (
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              newHostId,
            )
          ) {
            api.transferHost(currentRoom.id, newHostId).catch(() => {});
          }
          socketManager.transferHost(currentRoom.id, newHostId);
        }
        set((state) => ({
          participants: state.participants.map((p) =>
            p.id === newHostId
              ? { ...p, role: "host" as const }
              : { ...p, role: "listener" as const },
          ),
          isHost: false,
        }));
      },

      leaveRoom: () => {
        const { currentRoom } = get();
        if (currentRoom) {
          socketManager.leaveRoom(currentRoom.id);
        }
        socketManager.disconnect();
        set({
          currentRoom: null,
          participants: [],
          isHost: false,
          roomStatus: "waiting",
          isPlaying: false,
          currentTrackIndex: 0,
          currentTimeMs: 0,
        });
      },

      setRoomStatus: (status: RoomStatus) => set({ roomStatus: status }),

      isPlaying: false,
      isAudioReady: false,
      currentTrackIndex: 0,
      currentTimeMs: 0,
      totalDurationMs: 300000,
      isMuted: false,
      syncStatus: "synced",

      play: () => {
        const { currentRoom, isHost, currentTimeMs } = get();
        if (currentRoom && !isHost) return;
        if (isHost && currentRoom) {
          socketManager.cmdPlay(currentRoom.id, currentTimeMs);
        }
        set({ isPlaying: true });
      },

      pause: () => {
        const { currentRoom, isHost, currentTimeMs } = get();
        if (currentRoom && !isHost) return;
        if (isHost && currentRoom) {
          socketManager.cmdPause(currentRoom.id, currentTimeMs);
        }
        set({ isPlaying: false });
      },

      seek: (timeMs: number) => {
        const { currentRoom, isHost, totalDurationMs } = get();
        if (currentRoom && !isHost) return;
        const epsilon = 250;
        const safeMax = Math.max(0, totalDurationMs - epsilon);
        const clamped = Math.min(Math.max(0, timeMs), safeMax);
        if (isHost && currentRoom) {
          socketManager.cmdSeek(currentRoom.id, clamped);
        }
        audioManager.seekTo(clamped);
        set({ currentTimeMs: clamped });
      },

      syncWithHost: () => {
        const { currentRoom } = get();
        set({ syncStatus: "reconnecting" });
        if (currentRoom) {
          socketManager.requestSync(currentRoom.id);
        }
        setTimeout(() => set({ syncStatus: "synced" }), 1500);
      },

      toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),

      nextTrack: () => {
        const { currentTrackIndex, currentRoom, tours, currentTour, isHost } =
          get();
        if (currentRoom && !isHost) return;

        let tour: Tour | null = currentTour;

        if (!tour && currentRoom?.tourId) {
          tour = tours.find((t) => t.id === currentRoom.tourId) ?? null;
        }

        if (!tour && tours.length > 0) {
          tour = tours[0] ?? null;
        }

        if (!tour || !tour.points || tour.points.length === 0) return;
        const maxIndex = tour.points.length - 1;
        if (currentTrackIndex < maxIndex) {
          const nextIndex = currentTrackIndex + 1;
          if (isHost && currentRoom) {
            socketManager.cmdNextTrack(currentRoom.id, nextIndex);
          }
          set({
            isPlaying: false,
            currentTrackIndex: nextIndex,
            currentTimeMs: 0,
            totalDurationMs: 0,
          });
        }
      },

      prevTrack: () => {
        const { currentTrackIndex, currentRoom, tours, currentTour, isHost } =
          get();
        if (currentRoom && !isHost) return;

        let tour: Tour | null = currentTour;

        if (!tour && currentRoom?.tourId) {
          tour = tours.find((t) => t.id === currentRoom.tourId) ?? null;
        }

        if (!tour && tours.length > 0) {
          tour = tours[0] ?? null;
        }

        if (!tour || !tour.points || tour.points.length === 0) return;
        if (currentTrackIndex > 0) {
          const prevIndex = currentTrackIndex - 1;
          if (isHost && currentRoom) {
            socketManager.cmdNextTrack(currentRoom.id, prevIndex);
          }
          set({
            isPlaying: false,
            currentTrackIndex: prevIndex,
            currentTimeMs: 0,
            totalDurationMs: 0,
          });
        }
      },

      setCurrentTime: (ms: number) => set({ currentTimeMs: ms }),
      setTotalDuration: (ms: number) => set({ totalDurationMs: ms }),
      setIsAudioReady: (ready: boolean) => set({ isAudioReady: ready }),

      isDarkMode: false,
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      language: "uk",
      setLanguage: (lang: Language) => set({ language: lang }),
    }),
    {
      name: "syncwalk-store",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        authToken: state.authToken,
        purchasedAccess: state.purchasedAccess,
        selectedCity: state.selectedCity,
        isDarkMode: state.isDarkMode,
        language: state.language,
      }),
    },
  ),
);
