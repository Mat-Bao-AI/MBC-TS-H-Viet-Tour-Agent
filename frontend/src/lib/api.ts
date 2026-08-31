const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const V1 = `${API_BASE}/api/v1`;
// NEXT_PUBLIC_* bị inline vào bundle trình duyệt lúc build — key này KHÔNG bí
// mật với người mở DevTools trên trang. Chỉ chặn truy cập ngẫu nhiên từ ngoài,
// không phải auth thật (xem app/core/security.py ở backend).
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

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
  const headers: Record<string, string> = { "X-API-Key": API_KEY };
  if (!(init?.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${V1}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const text = await res.text();
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

  // Trang lịch trình công khai (/t/[id]) — endpoint này KHÔNG cần X-API-Key
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
};
