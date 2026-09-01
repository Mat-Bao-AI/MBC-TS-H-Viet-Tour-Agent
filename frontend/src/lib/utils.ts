import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Backend (FastAPI/SQLAlchemy DateTime không timezone) trả datetime dạng ISO
 * KHÔNG có hậu tố 'Z'/offset (vd "2026-08-31T03:52:50") nhưng giờ lưu thật
 * là UTC. `new Date(...)` của JS lại hiểu chuỗi thiếu timezone là GIỜ LOCAL
 * của trình duyệt — gây lệch đúng bằng offset múi giờ (vd lệch 7h ở
 * Asia/Ho_Chi_Minh). Ép thêm 'Z' trước khi parse để luôn đúng là UTC.
 */
export function parseApiDate(iso: string): Date {
  const hasTimezone = /[zZ]|[+-]\d\d:\d\d$/.test(iso);
  return new Date(hasTimezone ? iso : `${iso}Z`);
}

export type TripPhase = "ongoing" | "upcoming" | "done";

/**
 * Trạng thái tour theo thời gian THẬT (start_date/end_date) — khác
 * TourStatus (trạng thái xử lý tài liệu: draft/parsing/review/...). Tour
 * chưa xác định ngày (agent chưa trích được, hoặc vừa tạo) xếp "upcoming".
 * Dùng chung cho page.tsx (danh sách tour) và dashboard/page.tsx (badge
 * overlay trên card tour đang làm).
 */
export function tripPhase(tour: { start_date: string | null; end_date: string | null }): TripPhase {
  if (!tour.start_date || !tour.end_date) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(tour.start_date);
  const end = new Date(tour.end_date);
  if (today < start) return "upcoming";
  if (today > end) return "done";
  return "ongoing";
}

export const TRIP_PHASE_LABEL: Record<TripPhase, string> = {
  ongoing: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  done: "Đã hoàn thành",
};
