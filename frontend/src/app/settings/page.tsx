"use client";

// Cài đặt — theo thiết kế Stitch "Cài đặt (Settings)". Khối "Kết nối Zalo cá
// nhân" bên dưới là tài khoản Zalo DÙNG ĐỂ GỬI TIN (zca-js), khác tài khoản
// đăng nhập app thật (Admin/HDV, xem lib/auth.tsx) — 2 khái niệm khác nhau,
// đừng nhầm "Ngắt kết nối Zalo" ở đây với "Đăng xuất" app (nút đó nằm ở
// AppChrome, luôn hiện trên mọi trang).
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ZaloLoginStatus } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

const COMING_SOON_ITEMS = [
  { label: "Thông báo", icon: "🔔" },
  { label: "Trợ giúp", icon: "❓" },
  { label: "Về ứng dụng", icon: "ℹ️" },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ZaloLoginStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setStatus(await api.getZaloLoginStatus());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDisconnect() {
    setBusy(true);
    setError(null);
    try {
      setStatus(await api.logoutZalo());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const connected = status?.status === "success";

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-primary">VietTour Agent</span>
      </div>

      <h1 className="text-xl font-bold">Cài đặt</h1>

      {/* Hồ sơ — tài khoản app đang đăng nhập thật (JWT, xem lib/auth.tsx) */}
      {user && (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl">🧑‍💼</div>
          <div>
            <p className="font-semibold">{user.full_name}</p>
            <p className="text-xs text-muted-foreground">
              {user.email} · {user.role === "admin" ? "Admin" : "Hướng dẫn viên"}
            </p>
          </div>
        </div>
      )}

      {/* Trạng thái kết nối Zalo — dữ liệu thật từ zca-js */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold">Kết nối Zalo cá nhân</p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Đang kiểm tra...</p>
        ) : connected ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-success">
              <span className="h-2 w-2 rounded-full bg-success" /> Đã kết nối
              {status?.display_name ? ` — ${status.display_name}` : ""}
            </span>
            <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={busy}>
              {busy ? "Đang ngắt..." : "Ngắt kết nối"}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <span className="h-2 w-2 rounded-full bg-destructive" /> Mất kết nối
            </span>
            <Link href="/login?next=/settings">
              <Button size="sm">Kết nối lại qua QR</Button>
            </Link>
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {user?.role === "admin" ? (
          <Link
            href="/settings/system"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted"
          >
            <span className="flex items-center gap-3">
              <span>🔒</span>
              Cài đặt hệ thống (AI, Telegram)
            </span>
            <span className="text-muted-foreground">›</span>
          </Link>
        ) : (
          <div className="flex items-center justify-between px-4 py-3 text-sm opacity-60">
            <span className="flex items-center gap-3">
              <span>🔒</span>
              Cài đặt hệ thống
            </span>
            <span className="text-xs text-muted-foreground">Chỉ Admin</span>
          </div>
        )}
        {/* Các mục chưa triển khai — ghi rõ "Sắp có", không giả vờ hoạt động */}
        {COMING_SOON_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center justify-between px-4 py-3 text-sm opacity-60">
            <span className="flex items-center gap-3">
              <span>{item.icon}</span>
              {item.label}
            </span>
            <span className="text-xs text-muted-foreground">Sắp có</span>
          </div>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={handleDisconnect}
        disabled={busy || !connected}
        className="text-destructive hover:bg-destructive/10"
      >
        Ngắt kết nối Zalo
      </Button>
    </div>
  );
}
