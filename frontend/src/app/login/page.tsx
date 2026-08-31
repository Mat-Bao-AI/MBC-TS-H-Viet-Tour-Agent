"use client";

// Đăng nhập Zalo cá nhân qua QR — tách thành route riêng theo đúng thiết kế
// Stitch (trước đây nhúng trong /tours/[id]/dispatch). Dùng lại nguyên vẹn
// luồng API thật (POST /auth/zalo/login/start, GET .../status) — QR là ảnh
// PNG thật do zca-js sinh ra, không phải ảnh placeholder.
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { api, ZaloLoginStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";

const STEPS = ["Mở Zalo trên điện thoại", "Vào phần Quét QR", "Quét mã trên màn hình này"];

// useSearchParams() bắt buộc phải nằm trong <Suspense> khi prerender (Next.js
// build lỗi "missing-suspense-with-csr-bailout" nếu không) — tách riêng phần
// đọc query string ra component con.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/settings";

  const [status, setStatus] = useState<ZaloLoginStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshStatus = useCallback(async () => {
    const s = await api.getZaloLoginStatus();
    setStatus(s);
    return s;
  }, []);

  const startLogin = useCallback(async () => {
    setError(null);
    try {
      const s = await api.startZaloLogin();
      setStatus(s);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        try {
          const polled = await refreshStatus();
          if (polled.status === "success") {
            if (pollRef.current) clearInterval(pollRef.current);
            router.push(nextPath);
          } else if (polled.status === "error") {
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [refreshStatus, router, nextPath]);

  useEffect(() => {
    refreshStatus()
      .then((s) => {
        if (s.status === "success") {
          router.replace(nextPath);
        } else {
          startLogin();
        }
      })
      .catch(() => startLogin());
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6 pt-2">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
          ←
        </button>
        <span className="font-semibold text-primary">VietTour Agent</span>
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="text-xl font-bold">Kết nối Zalo cá nhân</h1>
        <p className="text-sm text-muted-foreground">Vui lòng quét mã QR để đăng nhập</p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6">
        {status?.status === "qr_pending" && status.qr_data_url && (
          <Image src={status.qr_data_url} alt="Mã QR đăng nhập Zalo" width={220} height={220} unoptimized />
        )}
        {(!status || status.status === "idle") && (
          <div className="flex h-[220px] w-[220px] items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
            Đang tạo mã QR...
          </div>
        )}
        {status?.status === "qr_scanned" && (
          <p className="text-sm text-secondary-foreground">
            Đã quét — vui lòng xác nhận đăng nhập trên điện thoại...
          </p>
        )}
        {status?.status === "error" && <p className="text-sm text-destructive">{status.error}</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {(status?.status === "qr_pending" || status?.status === "qr_scanned") && (
          <p className="flex items-center gap-2 text-sm text-primary">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            Đang chờ quét mã...
          </p>
        )}
      </div>

      <ol className="flex flex-col gap-2">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {i + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>

      <Button variant="outline" onClick={startLogin} disabled={status?.status === "qr_pending"}>
        ↻ Làm mới mã QR
      </Button>
    </div>
  );
}
