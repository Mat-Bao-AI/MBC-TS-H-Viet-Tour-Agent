"use client";

// Sidebar desktop — thay BottomNav khi màn hình rộng (lg: trở lên, xem
// app-chrome.tsx). Cùng bộ icon/nav item với BottomNav (Dashboard/Tours/
// Settings) để 2 layout không lệch nhau, chỉ khác hình dạng (rail dọc thay
// vì thanh ngang). Thêm mục "Cài đặt hệ thống" (chỉ Admin) và khối tài
// khoản + đăng xuất ở đáy — trên mobile 2 thứ này nằm ở thanh trên cùng của
// AppChrome, trên desktop gộp hẳn vào đây cho gọn, tránh lặp 2 nơi.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserOut } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Tổng quan", icon: DashboardIcon },
  { href: "/", label: "Chuyến đi", icon: ToursIcon },
  { href: "/settings", label: "Cài đặt", icon: SettingsIcon },
] as const;

export function Sidebar({ user, onLogout }: { user: UserOut; onLogout: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="px-5 py-5">
        <span className="text-lg font-bold text-primary">VietTour Agent</span>
      </div>

      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon active={active} />
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
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === "/settings/system" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-3">
                <LockIcon active={pathname === "/settings/system"} />
                Cài đặt hệ thống
              </span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                Admin
              </span>
            </Link>
          </>
        )}
      </nav>

      <div className="mt-auto flex items-center gap-3 border-t border-border px-4 py-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials(user.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">{user.role === "admin" ? "Admin" : "HDV"}</p>
        </div>
        <button
          onClick={onLogout}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <LogoutIcon />
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

function DashboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "opacity-100" : "opacity-70"}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" fill="currentColor" opacity="0.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

function ToursIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "opacity-100" : "opacity-70"}>
      <path d="M4 19V7a2 2 0 0 1 2-2h5l2 2h5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "opacity-100" : "opacity-70"}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3v2m0 14v2m9-9h-2M5 12H3m14.5-6.5-1.4 1.4M6.9 17.1l-1.4 1.4m13-1.4-1.4-1.4M6.9 6.9 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={active ? "opacity-100" : "opacity-70"}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
