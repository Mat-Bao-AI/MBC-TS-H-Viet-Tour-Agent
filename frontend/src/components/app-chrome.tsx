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
//
// Auth (2026-08-31): mọi route TRỪ /signin và /t/[id] (trang công khai, xem
// bên dưới) đều yêu cầu đăng nhập app thật — chưa đăng nhập bị đưa về
// /signin?next=<path>.
//
// Web layout (Phase 2): từ breakpoint lg: trở lên, Sidebar (rail dọc cố định
// bên trái, xem components/sidebar.tsx) thay cho BottomNav + thanh user/đăng
// xuất trên cùng — 2 thứ đó gộp hẳn vào Sidebar cho gọn, không lặp lại ở 2
// nơi. Dưới lg: giữ nguyên khung mobile-app cũ (max-w-md, bottom nav).
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { LlmProviderBanner } from "@/components/llm-provider-banner";
import { OnboardingTour } from "@/components/onboarding-tour";
import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth";

const TAB_PAGES = ["/", "/dashboard", "/settings"];
const PUBLIC_ROUTES = ["/signin"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const showBottomNav = TAB_PAGES.includes(pathname);

  // Trang lịch trình công khai (/t/[id]) là trải nghiệm RIÊNG cho khách bên
  // ngoài — không phải app HDV, không dùng khung mobile-app (max-w-md, bottom
  // nav), và KHÔNG cần đăng nhập gì cả.
  const isPublicTourPage = pathname.startsWith("/t/");
  const isPublicRoute = isPublicTourPage || PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (isPublicRoute || loading || user) return;
    router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
  }, [isPublicRoute, loading, user, pathname, router]);

  if (isPublicTourPage) {
    return <>{children}</>;
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading || !user) {
    // Đang xác thực token đã lưu, hoặc vừa điều hướng sang /signin — tránh
    // loé nội dung cần đăng nhập ra trước khi kịp redirect.
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Đang tải...
      </div>
    );
  }

  return (
    <>
      <LlmProviderBanner />
      <OnboardingTour />
      <Sidebar user={user} onLogout={logout} />
      <div className="lg:pl-64">
        {/* Thanh user/đăng xuất — chỉ mobile, desktop đã có trong Sidebar */}
        <div className="mx-auto flex max-w-md items-center justify-between px-4 pt-3 text-xs text-muted-foreground lg:hidden">
          <span>
            {user.full_name} · {user.role === "admin" ? "Admin" : "HDV"}
          </span>
          <button onClick={logout} className="font-medium text-primary hover:underline">
            Đăng xuất
          </button>
        </div>
        {/* 3 trang tab chính (danh sách/tổng quan) tận dụng chiều rộng desktop
            (lg:max-w-6xl) — trang con (form tạo tour, chi tiết 1 tour...) giữ
            khung đọc vừa phải (lg:max-w-3xl), tránh 1 form/cột đơn kéo dài hết
            màn hình rộng trông rất xấu. */}
        <main
          className={`mx-auto flex max-w-md flex-col gap-4 px-4 pt-2 lg:px-8 lg:pt-8 ${
            showBottomNav ? "lg:max-w-6xl pb-20 lg:pb-8" : "lg:max-w-3xl pb-6 lg:pb-8"
          }`}
        >
          {children}
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </>
  );
}
