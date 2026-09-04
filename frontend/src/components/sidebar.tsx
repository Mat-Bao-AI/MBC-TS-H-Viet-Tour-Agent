"use client";

// Sidebar desktop — thay BottomNav khi màn hình rộng (lg: trở lên, xem
// app-chrome.tsx). Dựng theo đúng screen thật lấy từ Stitch MCP (project
// 8575116696704742662, screen "Dashboard (Desktop)" —
// projects/.../screens/2d31fc623f0449cb85a7766b33acc999): icon Material
// Symbols, pill active state, badge "Admin" cam cho mục Cài đặt hệ thống.
//
// Avatar dùng ảnh thật đã upload (UserAvatar tự fallback initials nếu chưa
// có, xem components/user-avatar.tsx) — link tới /settings/profile để sửa.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api, API_BASE, CompanyInfo, UserOut } from "@/lib/api";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: "dashboard", tourId: "nav-dashboard-desktop" },
  { href: "/", label: "Chuyến đi", icon: "explore", tourId: "nav-tours-desktop" },
  { href: "/settings", label: "Cài đặt", icon: "settings", tourId: "nav-settings-desktop" },
] as const;

export function Sidebar({ user, onLogout }: { user: UserOut; onLogout: () => void }) {
  const pathname = usePathname();
  const [company, setCompany] = useState<CompanyInfo | null>(null);

  useEffect(() => {
    api.getCompanyInfo().then(setCompany).catch(() => {});
  }, []);

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-card px-3 py-6 lg:flex">
      <div className="mb-6 flex items-center gap-2 px-3">
        {company?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`${API_BASE}${company.logo_url}`} alt="" className="h-8 w-8 rounded object-contain" />
        )}
        <div>
          <span className="text-lg font-bold text-primary">{company?.name ?? "VietTour Agent"}</span>
          <p className="mt-1 text-xs text-muted-foreground">Trợ lý điều hành tour</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon, tourId }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              data-tour={tourId}
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

      <Link
        href="/settings/profile"
        className="mt-auto flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 hover:bg-muted"
      >
        <UserAvatar userId={user.id} fullName={user.full_name} hasAvatar={user.has_avatar} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.full_name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role === "admin" ? "Admin" : "Hướng dẫn viên"}</p>
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            onLogout();
          }}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <span className="material-symbols-outlined text-xl">logout</span>
        </button>
      </Link>
    </aside>
  );
}
