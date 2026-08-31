const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const V1 = `${API_BASE}/api/v1`;

// Token JWT lấy lúc đăng nhập (xem lib/auth.tsx) — lưu localStorage, gắn vào
// mọi request /api/v1/* qua header Authorization: Bearer. Đọc trực tiếp mỗi
// lần gọi (không cache biến module) để luôn phản ánh đúng trạng thái đăng
// nhập hiện tại, kể cả sau khi login/logout mà không reload trang.
const TOKEN_STORAGE_KEY = "vta_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export type UserRole = "admin" | "user";

export type UserOut = {
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  role: UserRole;
  facebook_url: string | null;
  zalo_link: string | null;
  telegram_username: string | null;
  is_active: boolean;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: UserOut;
};

export type TourStatus = "draft" | "parsing" | "review" | "dispatched" | "failed";
export type DispatchGuestStatus = "pending" | "sent" | "read" | "confirmed" | "failed";
// Kênh gửi thông báo — mỗi khách chọn 1 kênh (không multi-channel/khách, xem
// backend/app/services/notification/). "telegram" chưa có UI chọn (Phase 4).
export type NotificationChannel = "zalo" | "telegram";

export type TimelineEvent = {
  day_index: number;
  start_time: string;
  title: string;
  location: string | null;
  notes: string | null;
};

export type Guest = {
  id: string;
  full_name: string;
  phone_number: string | null;
  zalo_id: string | null;
  telegram_chat_id: string | null;
  notification_channel: NotificationChannel;
  seat_number: string | null;
  room_number: string | null;
  dietary_note: string | null;
  dispatch_status: DispatchGuestStatus;
  last_dispatched_at: string | null;
  dispatch_error: string | null;
};

export type TourListItem = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: TourStatus;
  created_at: string;
  guests_total: number;
  guests_sent: number;
};

export type DashboardActivity = {
  type: "tour_created" | "guest_dispatched" | "tour_failed" | string;
  text: string;
  timestamp: string;
};

export type DashboardSummary = {
  active_tour: TourListItem | null;
  recent_activities: DashboardActivity[];
};

export type TourDetail = TourListItem & {
  process_error: string | null;
  source_filename: string | null;
  guest_list_filename: string | null;
  guests: Guest[];
  timeline_events: TimelineEvent[];
  updated_at: string;
  zalo_group_id: string | null;
};

export type ZaloLoginStatus = {
  status: "idle" | "qr_pending" | "qr_scanned" | "success" | "error";
  qr_data_url: string | null;
  display_name: string | null;
  error: string | null;
};

export type EventWeather = {
  day_index: number;
  location: string;
  date: string;
  temp_min: number;
  temp_max: number;
  description: string;
  icon: string;
  // true = dự báo thật (Open-Meteo forecast, ≤16 ngày tới). false = trung
  // bình nhiều năm (Open-Meteo Archive, dữ liệu khí hậu quá khứ) — tham
  // khảo khi tour ngoài phạm vi dự báo, KHÔNG phải dự báo chính xác.
  is_forecast: boolean;
};

export type PublicTourView = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  ready: boolean;
  timeline_events: TimelineEvent[];
  weather: EventWeather[];
};

export type TelegramInfo = {
  configured: boolean;
  bot_username: string | null;
};

export type AIProviderStatus = {
  provider: "gemini" | "azure_openai";
  label: string;
  configured: boolean;
  source: "db" | "env" | "none";
};

export type SystemSettings = {
  ai_providers: AIProviderStatus[];
  llm_primary_provider: string;
  effective_primary_provider: string | null;
  telegram_configured: boolean;
  telegram_source: "db" | "env" | "none";
};

export type HealthStatus = {
  status: string;
  environment: string;
  llm_providers: {
    configured: string[];
    primary: string | null;
    fallback_active: boolean;
  };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getStoredToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(init?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${V1}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text();
    // 401 = token thiếu/hết hạn/tài khoản bị khoá — AuthProvider (lib/auth.tsx)
    // bắt lỗi này ở message để tự đăng xuất + đưa về /signin, không phải lỗi
    // nghiệp vụ thường gặp nên tách message riêng thay vì lẫn vào text lỗi
    // chung chung.
    if (res.status === 401) throw new Error("UNAUTHORIZED");
    throw new Error(`API ${path} lỗi ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T; // vd DELETE — không có body để parse
  return res.json();
}

export const api = {
  // /health nằm ngoài prefix /api/v1 và không yêu cầu API key — gọi thẳng
  // API_BASE, không qua request() (khác path prefix với các API còn lại).
  getHealth: async (): Promise<HealthStatus> => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`API /health lỗi ${res.status}`);
    return res.json();
  },

  // Trang lịch trình công khai (/t/[id]) — endpoint này KHÔNG cần đăng nhập
  // (xem backend app/api/v1/public.py), nên gọi thẳng fetch, không qua
  // request() (vốn luôn đính kèm key cho các API nội bộ khác).
  getPublicTour: async (id: string): Promise<PublicTourView> => {
    const res = await fetch(`${V1}/public/tours/${id}`);
    if (!res.ok) {
      if (res.status === 404) throw new Error("NOT_FOUND");
      throw new Error(`API /public/tours/${id} lỗi ${res.status}`);
    }
    return res.json();
  },

  listTours: () => request<TourListItem[]>("/tours"),

  getDashboard: () => request<DashboardSummary>("/dashboard"),

  createTour: (formData: FormData) =>
    request<{ id: string; status: TourStatus; message: string }>("/tours", {
      method: "POST",
      body: formData,
    }),

  getTour: (id: string) => request<TourDetail>(`/tours/${id}`),

  reprocessTour: (id: string) =>
    request<{ id: string; status: TourStatus; message: string }>(`/tours/${id}/reprocess`, {
      method: "POST",
    }),

  updateTimeline: (id: string, events: TimelineEvent[]) =>
    request<TourDetail>(`/tours/${id}/timeline`, {
      method: "PUT",
      body: JSON.stringify({ events }),
    }),

  updateGuest: (tourId: string, guestId: string, payload: Partial<Guest>) =>
    request<Guest>(`/tours/${tourId}/guests/${guestId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  addGuest: (
    tourId: string,
    payload: { full_name: string; phone_number?: string; seat_number?: string; room_number?: string; dietary_note?: string }
  ) =>
    request<Guest>(`/tours/${tourId}/guests`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  deleteGuest: (tourId: string, guestId: string) =>
    request<void>(`/tours/${tourId}/guests/${guestId}`, { method: "DELETE" }),

  updateGuestStatus: (tourId: string, guestId: string, dispatch_status: DispatchGuestStatus) =>
    request<Guest>(`/tours/${tourId}/guests/${guestId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ dispatch_status }),
    }),

  importGuestList: (tourId: string, file: File) => {
    const formData = new FormData();
    formData.append("guest_list_file", file);
    return request<{ added: number; updated: number; guests: Guest[] }>(`/tours/${tourId}/guests/import`, {
      method: "POST",
      body: formData,
    });
  },

  startZaloLogin: () => request<ZaloLoginStatus>("/auth/zalo/login/start", { method: "POST" }),

  getZaloLoginStatus: () => request<ZaloLoginStatus>("/auth/zalo/login/status"),

  logoutZalo: () => request<ZaloLoginStatus>("/auth/zalo/logout", { method: "POST" }),

  previewMessage: (tourId: string, guestId: string) =>
    request<{ guest_id: string; guest_name: string; message_text: string }>(
      `/zalo/tours/${tourId}/preview/${guestId}`
    ),

  dispatch: (tourId: string, guestIds?: string[]) =>
    request<{ queued: number; skipped: string[] }>(`/zalo/tours/${tourId}/dispatch`, {
      method: "POST",
      body: JSON.stringify({ guest_ids: guestIds ?? null }),
    }),

  dispatchStatus: (tourId: string) => request<Guest[]>(`/zalo/tours/${tourId}/dispatch-status`),

  getTourWeather: (tourId: string) => request<EventWeather[]>(`/tours/${tourId}/weather`),

  quickUpdate: (tourId: string, message: string, guestIds?: string[]) =>
    request<{ queued: number; skipped: string[] }>(`/zalo/tours/${tourId}/quick-update`, {
      method: "POST",
      body: JSON.stringify({ message, guest_ids: guestIds ?? null }),
    }),

  createTourGroup: (tourId: string) =>
    request<{ group_id: string; added: number; failed: number; skipped: string[] }>(
      `/zalo/tours/${tourId}/group/create`,
      { method: "POST" }
    ),

  sendGroupMessage: (tourId: string, message: string) =>
    request<{ ok: boolean }>(`/zalo/tours/${tourId}/group/send`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  getTelegramInfo: () => request<TelegramInfo>("/telegram/info"),

  // /auth/login KHÔNG cần token (chicken-and-egg) nên gọi thẳng fetch, không
  // qua request() (vốn luôn gắn Authorization: Bearer từ token đã lưu).
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const res = await fetch(`${V1}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("Email hoặc mật khẩu không đúng.");
      throw new Error(`Đăng nhập lỗi ${res.status}`);
    }
    return res.json();
  },

  getMe: () => request<UserOut>("/auth/me"),

  // Cài đặt hệ thống (AI provider key, Telegram bot) — CHỈ Admin, backend tự
  // trả 403 cho User thường (xem app/api/v1/admin_settings.py).
  getSystemSettings: () => request<SystemSettings>("/admin/settings"),

  setGeminiConfig: (apiKey: string) =>
    request<void>("/admin/settings/ai-providers/gemini", {
      method: "PUT",
      body: JSON.stringify({ api_key: apiKey }),
    }),

  clearGeminiConfig: () => request<void>("/admin/settings/ai-providers/gemini", { method: "DELETE" }),

  setAzureOpenAIConfig: (payload: {
    endpoint: string;
    api_key: string;
    deployment: string;
    model: string;
    api_version: string;
  }) =>
    request<void>("/admin/settings/ai-providers/azure-openai", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  clearAzureOpenAIConfig: () => request<void>("/admin/settings/ai-providers/azure-openai", { method: "DELETE" }),

  setLlmPrimaryProvider: (provider: string) =>
    request<void>("/admin/settings/llm-primary-provider", {
      method: "PUT",
      body: JSON.stringify({ provider }),
    }),

  setTelegramConfig: (botToken: string, webhookSecret: string) =>
    request<void>("/admin/settings/telegram", {
      method: "PUT",
      body: JSON.stringify({ bot_token: botToken, webhook_secret: webhookSecret }),
    }),

  clearTelegramConfig: () => request<void>("/admin/settings/telegram", { method: "DELETE" }),
};
