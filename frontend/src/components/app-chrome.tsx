"use client";

// Chỉ hiện bottom nav ở 3 trang tab chính (đúng thiết kế Stitch) — các trang
// con (tạo tour, chi tiết tour, đăng nhập Zalo) có back button riêng, không
// có bottom nav (khớp screen "Đăng nhập Zalo" và "Tạo Tour mới" trên Stitch).
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

const TAB_PAGES = ["/", "/dashboard", "/settings"];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showBottomNav = TAB_PAGES.includes(pathname);

  return (
    <>
      <main className={`mx-auto flex max-w-md flex-col gap-4 px-4 pt-4 ${showBottomNav ? "pb-20" : "pb-6"}`}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </>
  );
}
