export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown,
    message?: string,
  ) {
    super(message || `API Error ${status}`);
    this.name = "ApiError";
  }
}

export function getApiErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (error instanceof ApiError) {
    if (typeof error.data === "string" && error.data.trim()) {
      return error.data;
    }
    if (error.data && typeof error.data === "object") {
      const payload = error.data as Record<string, unknown>;
      const detail = payload.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }
      if (Array.isArray(detail) && detail.length > 0) {
        const first = detail[0];
        if (
          first &&
          typeof first === "object" &&
          typeof (first as Record<string, unknown>).msg === "string"
        ) {
          return (first as Record<string, string>).msg;
        }
      }
      if (typeof payload.message === "string" && payload.message.trim()) {
        return payload.message;
      }
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    };

    if (!this.token && typeof window !== "undefined") {
      try {
        const persisted = window.localStorage.getItem("syncwalk-store");
        if (persisted) {
          const parsed = JSON.parse(persisted) as {
            state?: { authToken?: string | null };
          };
          const persistedToken = parsed.state?.authToken ?? null;
          if (persistedToken) {
            this.token = persistedToken;
          }
        }
      } catch {}
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const contentType = res.headers.get("content-type") || "";
    const hasJsonBody = contentType.includes("application/json");

    if (!res.ok) {
      const data = hasJsonBody
        ? await res.json().catch(() => ({}))
        : await res.text().catch(() => "");
      const message =
        typeof data === "string"
          ? data || `API Error ${res.status}`
          : `API Error ${res.status}`;
      throw new ApiError(res.status, data, message);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    if (hasJsonBody) {
      return res.json() as Promise<T>;
    }

    return (await res.text()) as T;
  }

  async register(name: string, email: string, password: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      user: { id: string; name: string; email: string };
    }>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      user: { id: string; name: string; email: string };
    }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async loginWithGoogle(idToken: string) {
    return this.request<{
      access_token: string;
      refresh_token: string;
      user: { id: string; name: string; email: string };
    }>("/api/v1/auth/google", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
  }

  async getMe() {
    return this.request<{ id: string; name: string; email: string }>(
      "/api/v1/auth/me",
    );
  }

  async getTours(city?: string) {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    const qs = params.toString();
    return this.request<
      Array<{
        id: string;
        city: string;
        title: string;
        title_uk?: string | null;
        description: string;
        description_uk?: string | null;
        cover_image_url: string;
        duration_min: number;
        individual_price: number;
        group_price: number;
        max_participants: number;
      }>
    >(`/api/v1/tours${qs ? `?${qs}` : ""}`);
  }

  async getTourById(id: string) {
    return this.request<{
      id: string;
      city: string;
      title: string;
      title_uk?: string | null;
      description: string;
      description_uk?: string | null;
      cover_image_url: string;
      duration_min: number;
      individual_price: number;
      group_price: number;
      max_participants: number;
      points: Array<{
        id: string;
        order_index: number;
        title: string;
        title_uk?: string | null;
        description: string;
        description_uk?: string | null;
        latitude: number;
        longitude: number;
        audio_url: string;
        audio_url_en?: string | null;
        audio_url_uk?: string | null;
        audio_by_language?: {
          en?: string | null;
          uk?: string | null;
        } | null;
      }>;
    }>(`/api/v1/tours/${id}`);
  }

  async createPayment(tourId: string, groupType: string) {
    return this.request<{
      payment_url: string;
      return_url: string;
      service_url: string;
      merchant_auth_type: string;
      merchant_transaction_secure_type: string;
      order_timeout: number;
      language: string;
      order_reference: string;
      merchant_account: string;
      merchant_domain_name: string;
      order_date: number;
      amount: number;
      currency: string;
      product_name: string[];
      product_count: number[];
      product_price: number[];
      merchant_signature: string;
    }>("/api/v1/payments/create", {
      method: "POST",
      body: JSON.stringify({ tour_id: tourId, group_type: groupType }),
    });
  }

  async getPaymentByOrder(orderReference: string) {
    return this.request<{
      id: string;
      tour_id: string;
      order_reference: string;
      amount: number;
      currency: string;
      status: string;
      group_type: string;
    }>(`/api/v1/payments/order/${encodeURIComponent(orderReference)}`);
  }

  async getMyPayments() {
    return this.request<
      Array<{
        id: string;
        tour_id: string;
        order_reference: string;
        amount: number;
        currency: string;
        status: string;
        group_type: string;
      }>
    >("/api/v1/payments/my");
  }

  async createRoom(tourId: string) {
    return this.request<{
      id: string;
      tour_id: string;
      access_code: string;
      host_name: string;
    }>("/api/v1/rooms/create", {
      method: "POST",
      body: JSON.stringify({ tour_id: tourId }),
    });
  }

  async getRoomByCode(accessCode: string) {
    return this.request<{
      id: string;
      tour_id: string;
      access_code: string;
      host_name: string;
      status: string;
    }>(`/api/v1/rooms/${accessCode}`);
  }

  async getRoomParticipants(accessCode: string) {
    return this.request<
      Array<{
        id: string;
        user_name: string;
        role: string;
        is_online: boolean;
      }>
    >(`/api/v1/rooms/${accessCode}/participants`);
  }

  async transferHost(roomId: string, newHostId: string) {
    return this.request("/api/v1/rooms/transfer-host", {
      method: "POST",
      body: JSON.stringify({ room_id: roomId, new_host_id: newHostId }),
    });
  }

  async finishRoom(roomId: string) {
    return this.request(`/api/v1/rooms/${roomId}/finish`, {
      method: "POST",
    });
  }
}

export const api = new ApiClient();
export { ApiError };
