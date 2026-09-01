"use client";

// Sidebar desktop — thay BottomNav khi màn hình rộng (lg: trở lên, xem
// app-chrome.tsx). Dựng theo đúng screen thật lấy từ Stitch MCP (project
// 8575116696704742662, screen "Dashboard (Desktop)" —
// projects/.../screens/2d31fc623f0449cb85a7766b33acc999): icon Material
// Symbols, pill active state, badge "Admin" cam cho mục Cài đặt hệ thống.
//
// 1 chỗ CHỦ ĐỘNG khác bản Stitch gốc: avatar dùng vòng tròn initials thay vì
// ảnh chân dung — hệ thống chưa có tính năng upload ảnh đại diện, không giả
// ảnh người dùng. Dòng phụ dưới tên dùng vai trò thật (Admin/HDV) thay vì
// nhãn tĩnh "Hồ sơ cá nhân" — chưa có trang hồ sơ để link tới (Phase 3).
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserOut } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: "dashboard" },
  { href: "/", label: "Chuyến đi", icon: "explore" },
  { href: "/settings", label: "Cài đặt", icon: "settings" },
] as const;

export function Sidebar({ user, onLogout }: { user: UserOut; onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-card px-3 py-6 lg:flex">
      <div className="mb-6 px-3">
        <span className="text-lg font-bold text-primary">VietTour Agent</span>
        <p className="mt-1 text-xs text-muted-foreground">Trợ lý điều hành tour</p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
              >
                {icon}
              </span>
              {label}
            </Link>
          );
        })}

        {user.role === "admin" && (
          <>
            <div className="my-2 border-t border-border" />
            <Link
              href="/settings/system"
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-semibold transition-colors",
                pathname === "/settings/system" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="material-symbols-outlined text-xl">lock</span>
              <span className="flex-1">Cài đặt hệ thống</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                Admin
              </span>
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
          {initials(user.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role === "admin" ? "Admin" : "Hướng dẫn viên"}</p>
        </div>
        <button
          onClick={onLogout}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </div>
    </aside>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts[0]?.[0] ?? "";
  return (first + last).toUpperCase();
}
