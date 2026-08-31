"use client";

// Chỉ hiện bottom nav ở 3 trang tab chính (đúng thiết kế Stitch) — các trang
// con (tạo tour, chi tiết tour, đăng nhập Zalo) có back button riêng, không
// có bottom nav (khớp screen "Đăng nhập Zalo" và "Tạo Tour mới" trên Stitch).
//
// ⚠️ QUY ƯỚC — đọc trước khi thêm route mới: nếu path KHÔNG nằm trong
// TAB_PAGES, AppChrome sẽ KHÔNG tự vẽ bất kỳ cách quay lại nào (không bottom
// nav, không back button) — trang đó TỰ chịu trách nhiệm thêm nút "←"
// (router.back()) ở đầu trang, xem /login, /tours/create, /tours/[id]/review,
// /tours/[id]/dispatch làm ví dụ. Thiếu bước này = user bị kẹt tại màn hình
// (bug thật đã gặp ở review/dispatch — không có nút back lẫn bottom nav).
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { LlmProviderBanner } from "@/components/llm-provider-banner";

const TAB_PAGES = ["/", "/dashboard", "/settings"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showBottomNav = TAB_PAGES.includes(pathname);

  // Trang lịch trình công khai (/t/[id]) là trải nghiệm RIÊNG cho khách bên
  // ngoài — không phải app HDV, không dùng khung mobile-app (max-w-md, bottom
  // nav). Tự vẽ layout đầy đủ chiều rộng riêng, xem app/t/[id]/page.tsx.
  if (pathname.startsWith("/t/")) {
    return <>{children}</>;
  }

  return (
    <>
      <LlmProviderBanner />
      <main className={`mx-auto flex max-w-md flex-col gap-4 px-4 pt-4 ${showBottomNav ? "pb-20" : "pb-6"}`}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </>
  );
}
