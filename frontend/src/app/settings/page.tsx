"use client";

// Cài đặt — theo thiết kế Stitch "Cài đặt (Settings)". Không có bảng
// user/profile riêng (Phase 1 chưa có multi-user auth, xem app/api/v1/auth.py)
// nên "hồ sơ" ở đây LÀ tài khoản Zalo cá nhân đang kết nối — display_name lấy
// thật từ zca-js qua GET /auth/zalo/login/status, không phải tên giả định.
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, ZaloLoginStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";

const COMING_SOON_ITEMS = [
  { label: "Thông báo", icon: "🔔" },
  { label: "Bảo mật & API key", icon: "🔒" },
  { label: "Trợ giúp", icon: "❓" },
  { label: "Về ứng dụng", icon: "ℹ️" },
];

export default function SettingsPage() {
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

      {/* Hồ sơ — phản chiếu tài khoản Zalo đang kết nối, không có field bịa */}
      <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-xl">
          {connected ? "🧑‍💼" : "👤"}
        </div>
        <div>
          <p className="font-semibold">{connected ? status?.display_name || "Tài khoản Zalo" : "Chưa kết nối"}</p>
          <p className="text-xs text-muted-foreground">Hướng dẫn viên</p>
        </div>
      </div>

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

      {/* Các mục chưa triển khai ở Phase 1 — ghi rõ "Sắp có", không giả vờ hoạt động */}
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
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
        variant="destructive"
        onClick={handleDisconnect}
        disabled={busy || !connected}
        className="bg-transparent text-destructive hover:bg-destructive/10"
      >
        Đăng xuất
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Phase 1 chưa có tài khoản HDV riêng — "Đăng xuất" hiện ngắt kết nối Zalo cá nhân.
      </p>
    </div>
  );
}
