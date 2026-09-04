// Server Component — CHỈ để export generateMetadata (Open Graph theo từng
// tour: tiêu đề + ảnh bìa, hiện đẹp khi dán link vào Zalo/Messenger). Toàn bộ
// UI tương tác thật nằm ở tour-public-client.tsx ("use client", không được
// export generateMetadata). Xem lib/server-api.ts cho lý do dùng fetch nội bộ
// riêng thay vì lib/api.ts.
import type { Metadata } from "next";
import { API_BASE } from "@/lib/api";
import { getCompanyInfoServer, getPublicTourServer } from "@/lib/server-api";
import { TourPublicClient } from "./tour-public-client";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const [tour, company] = await Promise.all([getPublicTourServer(id), getCompanyInfoServer()]);

  const title = tour ? `${tour.name} — Lịch trình tour` : "Lịch trình tour";
  const description = `Xem lịch trình chi tiết tour du lịch — ${company?.name ?? "VietTour Agent"}`;
  // cover_image_url từ backend là đường dẫn TƯƠNG ĐỐI — og:image bắt buộc
  // phải là URL tuyệt đối để crawler (Zalo/Messenger) tải được, ghép với
  // NEXT_PUBLIC_API_URL (URL public, khác API_INTERNAL_URL chỉ dùng nội bộ
  // lúc fetch ở trên).
  const imageUrl = tour?.cover_image_url ? `${API_BASE}${tour.cover_image_url}` : undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return <TourPublicClient tourId={id} />;
}
