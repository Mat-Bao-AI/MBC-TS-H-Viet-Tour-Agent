const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const V1 = `${API_BASE}/api/v1`;
// NEXT_PUBLIC_* bị inline vào bundle trình duyệt lúc build — key này KHÔNG bí
// mật với người mở DevTools trên trang. Chỉ chặn truy cập ngẫu nhiên từ ngoài,
// không phải auth thật (xem app/core/security.py ở backend).
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

export type TourStatus = "draft" | "parsing" | "review" | "dispatched" | "failed";
export type DispatchGuestStatus = "pending" | "sent" | "read" | "confirmed" | "failed";

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
  seat_number: string | null;
  room_number: string | null;
  dietary_note: string | null;
  dispatch_status: DispatchGuestStatus;
  last_dispatched_at: string | null;
};

export type TourListItem = {
  id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  status: TourStatus;
  created_at: string;
};

export type TourDetail = TourListItem & {
  process_error: string | null;
  source_filename: string | null;
  guest_list_filename: string | null;
  guests: Guest[];
  timeline_events: TimelineEvent[];
  updated_at: string;
};

export type ZaloLoginStatus = {
  status: "idle" | "qr_pending" | "qr_scanned" | "success" | "error";
  qr_data_url: string | null;
  display_name: string | null;
  error: string | null;
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

  listTours: () => request<TourListItem[]>("/tours"),

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
};
