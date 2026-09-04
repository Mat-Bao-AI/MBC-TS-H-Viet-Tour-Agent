// Fetch phía SERVER (Server Component/generateMetadata) — CHỈ dùng ở đây,
// không import vào file "use client". Khác lib/api.ts (dùng NEXT_PUBLIC_API_URL,
// URL public cho trình duyệt): gọi thẳng hostname nội bộ Docker network
// (service "backend", xem docker-compose.yml) vì NEXT_PUBLIC_API_URL (thường
// là localhost hoặc domain public) không resolve được từ BÊN TRONG container
// frontend lúc render server-side.
import { CompanyInfo, PublicTourView } from "@/lib/api";

const INTERNAL_API_BASE = process.env.API_INTERNAL_URL || "http://backend:8000";

export async function getPublicTourServer(id: string): Promise<PublicTourView | null> {
  try {
    const res = await fetch(`${INTERNAL_API_BASE}/api/v1/public/tours/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicTourView;
  } catch {
    // Best-effort — generateMetadata không được phép throw (làm hỏng cả
    // trang), trang public thật vẫn tự fetch lại phía client (lib/api.ts) dù
    // metadata rơi về mặc định.
    return null;
  }
}

export async function getCompanyInfoServer(): Promise<CompanyInfo | null> {
  try {
    const res = await fetch(`${INTERNAL_API_BASE}/api/v1/company/info`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as CompanyInfo;
  } catch {
    return null;
  }
}
