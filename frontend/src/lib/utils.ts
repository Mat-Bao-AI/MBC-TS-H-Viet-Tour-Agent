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
