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
import { useCompanyName } from "@/lib/use-company-name";

export default function SettingsPage() {
  const { user } = useAuth();
  const companyName = useCompanyName();
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
    // Poll nhẹ (30s) thay vì chỉ load 1 lần lúc mount — trước đây HDV chỉ biết
    // mất kết nối Zalo (session bị kick từ điện thoại, hoặc lỗi socket) khi tự
    // vào lại trang này hoặc khi 1 lần gửi tin thật bị lỗi. Giờ zalo-bridge đã
    // cập nhật state ngay khi mất kết nối (xem zalo-bridge/src/zaloClient.js),
    // poll ở đây giúp badge phản ánh đúng mà không cần reload trang.
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
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
      <div className="flex items-center justify-between lg:hidden">
        <span className="text-lg font-semibold text-primary">{companyName}</span>
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
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <span className="h-2 w-2 rounded-full bg-destructive" /> Mất kết nối
              </span>
              <Link href="/login?next=/settings">
                <Button size="sm">Kết nối lại qua QR</Button>
              </Link>
            </div>
            {status?.error && (
              // Lỗi thật đến từ zca-js (thư viện Zalo không chính thức) —
              // nguyên văn thường là tiếng Anh kỹ thuật (vd "Cannot get scan
              // result"), lạc tông giữa UI tiếng Việt và không giúp HDV biết
              // cần làm gì. Hiện thông báo chung dễ hiểu, giữ lỗi gốc ở
              // `title` để debug khi cần (hover/inspect), không xoá hẳn.
              <p className="text-xs text-muted-foreground" title={status.error}>
                Không lấy được kết quả quét QR — thử quét lại.
              </p>
            )}
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        <Link href="/settings/profile" className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted">
          <span className="flex items-center gap-3">
            <span>🧑‍💼</span>
            Hồ sơ cá nhân
          </span>
          <span className="text-muted-foreground">›</span>
        </Link>
        {user?.role === "admin" && (
          <Link
            href="/settings/system"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted"
          >
            <span className="flex items-center gap-3">
              <span>🔒</span>
              Cài đặt hệ thống
            </span>
            <span className="flex items-center gap-1.5">
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                Admin
              </span>
              <span className="text-muted-foreground">›</span>
            </span>
          </Link>
        )}
        <Link href="/notifications" className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted">
          <span className="flex items-center gap-3">
            <span>🔔</span>
            Thông báo
          </span>
          <span className="text-muted-foreground">›</span>
        </Link>
        <Link href="/help" className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted">
          <span className="flex items-center gap-3">
            <span>❓</span>
            Trợ giúp
          </span>
          <span className="text-muted-foreground">›</span>
        </Link>
        <Link
          href="/settings/about"
          className="flex items-center justify-between px-4 py-3 text-sm hover:bg-muted"
        >
          <span className="flex items-center gap-3">
            <span>ℹ️</span>
            Về ứng dụng
          </span>
          <span className="text-muted-foreground">›</span>
        </Link>
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
