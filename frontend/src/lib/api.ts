export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
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
  is_active: boolean;
  has_avatar: boolean;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  user: UserOut;
};

export type TourStatus = "draft" | "parsing" | "review" | "ready_to_send" | "dispatched" | "failed";
export type TourType = "tourism" | "business_trip" | "event";
export const TOUR_TYPE_LABEL: Record<TourType, string> = {
  tourism: "Du lịch",
  business_trip: "Công tác",
  event: "Sự kiện",
};
export type DispatchGuestStatus = "pending" | "sent" | "read" | "confirmed" | "failed";

export type AgendaItem = {
  time: string | null;
  content: string;
  speaker: string | null;
};

export type EventProgram = {
  organizer: string | null;
  attendees: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  agenda: AgendaItem[];
  suggestions: string[];
};

export type TimelineEvent = {
  day_index: number;
  start_time: string;
  title: string;
  location: string | null;
  notes: string | null;
  // Chỉ có khi AI nhận diện mốc này là sự kiện chính có chương trình chi
  // tiết riêng (hội thảo/họp) trong tài liệu nguồn — xem timeline_agent.py.
  program?: EventProgram | null;
};

export type Guest = {
  id: string;
  full_name: string;
  phone_number: string | null;
  zalo_id: string | null;
  age: number | null;
  travel_group: string | null;
  room_type_id: string | null;
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
  tour_type: TourType;
  created_at: string;
  guests_total: number;
  guests_sent: number;
  cover_image_url: string | null;
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

export type ChangelogEntry = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export type RoomType = {
  id: string;
  name: string;
  capacity: number;
  quantity: number;
};

export type AssignedGroup = {
  group_label: string;
  guest_ids: string[];
  room_type_id: string;
  room_type_name: string;
};

export type UnassignedGroup = {
  group_label: string;
  guest_ids: string[];
  group_size: number;
  reason: string;
};

export type AutoAssignRoomsResponse = {
  assigned: AssignedGroup[];
  unassigned: UnassignedGroup[];
};

export type TourDetail = TourListItem & {
  summary: string | null;
  process_error: string | null;
  source_filenames: string[];
  guest_list_filename: string | null;
  guests: Guest[];
  timeline_events: TimelineEvent[];
  updated_at: string;
  zalo_group_id: string | null;
  has_cover_image: boolean;
  source_url: string | null;
  source_title: string | null;
  map_points: MapPoint[];
};

export type MapPoint = {
  day_index: number;
  title: string;
  location: string;
  latitude: number;
  longitude: number;
  display_name: string | null;
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
  tour_type: TourType;
  summary: string | null;
  start_date: string | null;
  end_date: string | null;
  ready: boolean;
  timeline_events: TimelineEvent[];
  weather: EventWeather[];
  cover_image_url: string | null;
  map_points: MapPoint[];
};

export type AIProviderStatus = {
  provider: string;
  label: string;
  configured: boolean;
  source: "db" | "env" | "none";
};

export type SystemSettings = {
  ai_providers: AIProviderStatus[];
  brave_search: AIProviderStatus;
  llm_primary_provider: string;
  effective_primary_provider: string | null;
};

export type CompanyInfo = {
  name: string;
  logo_url: string | null;
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

export type UrlValidationResult = {
  valid: boolean;
  title: string | null;
  message: string;
  destinations: string[];
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
    let message = text;
    try {
      const payload = JSON.parse(text) as { detail?: string };
      message = payload.detail || message;
    } catch {
      // Keep plain-text server errors as-is.
    }
    throw new Error(message || "Không thể thực hiện yêu cầu.");
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

  // File .xlsx nhị phân, không phải JSON — không dùng chung request() (luôn
  // res.json()). Vẫn cần header Authorization (route nằm trong api_router,
  // yêu cầu JWT ở mọi route) nên không thể dùng <a href> link thô.
  downloadGuestListTemplate: async (): Promise<Blob> => {
    const token = getStoredToken();
    const res = await fetch(`${V1}/tours/guest-list-template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error(`Tải file mẫu lỗi ${res.status}`);
    return res.blob();
  },

  getDashboard: () => request<DashboardSummary>("/dashboard"),

  listChangelog: () => request<ChangelogEntry[]>("/changelog"),

  createChangelogEntry: (payload: { title: string; description?: string }) =>
    request<ChangelogEntry>("/changelog", { method: "POST", body: JSON.stringify(payload) }),

  updateChangelogEntry: (entryId: string, payload: Partial<{ title: string; description: string }>) =>
    request<ChangelogEntry>(`/changelog/${entryId}`, { method: "PUT", body: JSON.stringify(payload) }),

  deleteChangelogEntry: (entryId: string) => request<void>(`/changelog/${entryId}`, { method: "DELETE" }),

  getActivities: (limit = 100) => request<DashboardActivity[]>(`/dashboard/activities?limit=${limit}`),

  createTour: (formData: FormData) =>
    request<{ id: string; status: TourStatus; message: string }>("/tours", {
      method: "POST",
      body: formData,
    }),

  validateTourUrl: (sourceUrl: string) =>
    request<UrlValidationResult>("/tours/validate-url", {
      method: "POST",
      body: JSON.stringify({ source_url: sourceUrl }),
    }),

  createTourFromUrl: (payload: {
    source_url: string;
    start_date: string;
    end_date: string;
    confirm_same_day: boolean;
  }) => request<{ id: string; status: TourStatus; message: string }>("/tours/from-url", { method: "POST", body: JSON.stringify(payload) }),

  getTour: (id: string) => request<TourDetail>(`/tours/${id}`),

  setCoverImage: (tourId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<void>(`/tours/${tourId}/cover-image`, { method: "PUT", body: formData });
  },

  clearCoverImage: (tourId: string) => request<void>(`/tours/${tourId}/cover-image`, { method: "DELETE" }),

  deleteTour: (tourId: string) => request<void>(`/tours/${tourId}`, { method: "DELETE" }),

  reprocessTour: (id: string) =>
    request<{ id: string; status: TourStatus; message: string }>(`/tours/${id}/reprocess`, {
      method: "POST",
    }),

  updateTimeline: (id: string, events: TimelineEvent[]) =>
    request<TourDetail>(`/tours/${id}/timeline`, {
      method: "PUT",
      body: JSON.stringify({ events }),
    }),

  confirmTimeline: (id: string) => request<TourDetail>(`/tours/${id}/confirm`, { method: "POST" }),

  reopenTimeline: (id: string) => request<TourDetail>(`/tours/${id}/reopen`, { method: "POST" }),

  updateGuest: (tourId: string, guestId: string, payload: Partial<Guest>) =>
    request<Guest>(`/tours/${tourId}/guests/${guestId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  addGuest: (
    tourId: string,
    payload: {
      full_name: string;
      phone_number?: string;
      age?: number;
      travel_group?: string;
      seat_number?: string;
      room_number?: string;
      dietary_note?: string;
    }
  ) =>
    request<Guest>(`/tours/${tourId}/guests`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listRoomTypes: (tourId: string) => request<RoomType[]>(`/tours/${tourId}/room-types`),

  createRoomType: (tourId: string, payload: { name: string; capacity: number; quantity: number }) =>
    request<RoomType>(`/tours/${tourId}/room-types`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateRoomType: (
    tourId: string,
    roomTypeId: string,
    payload: Partial<{ name: string; capacity: number; quantity: number }>
  ) =>
    request<RoomType>(`/tours/${tourId}/room-types/${roomTypeId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteRoomType: (tourId: string, roomTypeId: string) =>
    request<void>(`/tours/${tourId}/room-types/${roomTypeId}`, { method: "DELETE" }),

  autoAssignRooms: (tourId: string) =>
    request<AutoAssignRoomsResponse>(`/tours/${tourId}/auto-assign-rooms`, { method: "POST" }),

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

  updateMe: (payload: Partial<{ full_name: string; phone_number: string; facebook_url: string; zalo_link: string }>) =>
    request<UserOut>("/auth/me", { method: "PUT", body: JSON.stringify(payload) }),

  setMyAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<void>("/auth/me/avatar", { method: "PUT", body: formData });
  },

  clearMyAvatar: () => request<void>("/auth/me/avatar", { method: "DELETE" }),

  // Avatar yêu cầu đăng nhập (không public như logo công ty/ảnh bìa tour —
  // ảnh nhân sự nội bộ) nên KHÔNG dùng <img src> trực tiếp được (trình duyệt
  // không tự gắn header Authorization). Trả về Blob, nơi gọi tự tạo object
  // URL — cùng cách downloadGuestListTemplate đã làm.
  getUserAvatarBlob: async (userId: string): Promise<Blob | null> => {
    const token = getStoredToken();
    const res = await fetch(`${V1}/users/${userId}/avatar`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return res.blob();
  },

  // Cài đặt hệ thống (AI provider key) — CHỈ Admin, backend tự trả 403 cho
  // User thường (xem app/api/v1/admin_settings.py).
  getSystemSettings: () => request<SystemSettings>("/admin/settings"),

  // Public — không cần đăng nhập (dùng ở /signin trước khi có token, và
  // trang public /t/[id]) — vẫn qua request() bình thường, request() chỉ
  // GẮN THÊM Authorization nếu có token sẵn, không BẮT BUỘC phải có.
  getCompanyInfo: () => request<CompanyInfo>("/company/info"),

  setCompanyInfo: (name: string) =>
    request<void>("/company/info", { method: "PUT", body: JSON.stringify({ name }) }),

  setCompanyLogo: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<void>("/company/logo", { method: "PUT", body: formData });
  },

  clearCompanyLogo: () => request<void>("/company/logo", { method: "DELETE" }),

  listUsers: () => request<UserOut[]>("/admin/users"),

  createUser: (payload: { email: string; password: string; full_name: string; phone_number?: string; role: UserRole }) =>
    request<UserOut>("/admin/users", { method: "POST", body: JSON.stringify(payload) }),

  updateUser: (
    userId: string,
    payload: Partial<{ full_name: string; phone_number: string; role: UserRole; is_active: boolean }>
  ) => request<UserOut>(`/admin/users/${userId}`, { method: "PUT", body: JSON.stringify(payload) }),

  resetUserPassword: (userId: string, newPassword: string) =>
    request<void>(`/admin/users/${userId}/password`, {
      method: "PUT",
      body: JSON.stringify({ new_password: newPassword }),
    }),

  deleteUser: (userId: string) => request<void>(`/admin/users/${userId}`, { method: "DELETE" }),

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

  setBraveSearchConfig: (apiKey: string) =>
    request<void>("/admin/settings/brave-search", { method: "PUT", body: JSON.stringify({ api_key: apiKey }) }),
  clearBraveSearchConfig: () => request<void>("/admin/settings/brave-search", { method: "DELETE" }),
  testBraveSearch: () => request<{ ok: boolean; message: string }>("/admin/settings/brave-search/test", { method: "POST" }),

  setLlmPrimaryProvider: (provider: string) =>
    request<void>("/admin/settings/llm-primary-provider", {
      method: "PUT",
      body: JSON.stringify({ provider }),
    }),

  testAiProvider: (provider: string) =>
    request<{ ok: boolean; message: string }>(`/admin/settings/ai-providers/${provider}/test`, { method: "POST" }),

};
