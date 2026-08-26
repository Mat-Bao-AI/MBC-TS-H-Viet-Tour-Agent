"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { api, Guest, ZaloLoginStatus } from "@/lib/api";
import { GuestSelector } from "@/components/guest-selector";
import { ZaloPreview } from "@/components/zalo-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DispatchTourPage() {
  const params = useParams<{ id: string }>();
  const tourId = params.id;

  const [loginStatus, setLoginStatus] = useState<ZaloLoginStatus | null>(null);
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewGuestId, setPreviewGuestId] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<{ queued: number; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadGuests() {
    try {
      setGuests(await api.dispatchStatus(tourId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshLoginStatus() {
    const status = await api.getZaloLoginStatus();
    setLoginStatus(status);
    return status;
  }

  useEffect(() => {
    loadGuests();
    refreshLoginStatus().catch(() => {});
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  async function handleStartLogin() {
    setError(null);
    try {
      const status = await api.startZaloLogin();
      setLoginStatus(status);
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const s = await refreshLoginStatus();
        if (s.status === "success" || s.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function toggleGuest(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (!guests) return;
    setSelectedIds((prev) => (prev.size === guests.length ? new Set() : new Set(guests.map((g) => g.id))));
  }

  async function handleDispatch() {
    setDispatching(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.dispatch(tourId, selectedIds.size ? Array.from(selectedIds) : undefined);
      setResult(res);
      await loadGuests();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDispatching(false);
    }
  }

  const isLoggedIn = loginStatus?.status === "success";

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Gửi thông báo Zalo</h1>

      {!isLoggedIn && (
        <Card>
          <CardHeader>
            <CardTitle>Đăng nhập Zalo cá nhân</CardTitle>
            <p className="text-sm text-muted-foreground">
              Quét mã QR bằng app Zalo trên điện thoại để kết nối tài khoản dùng gửi tin.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            {loginStatus?.status === "qr_pending" && loginStatus.qr_data_url && (
              <Image
                src={loginStatus.qr_data_url}
                alt="Mã QR đăng nhập Zalo"
                width={220}
                height={220}
                unoptimized
              />
            )}
            {loginStatus?.status === "qr_scanned" && (
              <p className="text-sm text-amber-700">Đã quét — vui lòng xác nhận đăng nhập trên điện thoại...</p>
            )}
            {loginStatus?.status === "error" && (
              <p className="text-sm text-destructive">{loginStatus.error}</p>
            )}
            <Button onClick={handleStartLogin} disabled={loginStatus?.status === "qr_pending"}>
              {loginStatus?.status === "qr_pending" ? "Đang chờ quét..." : "Bắt đầu đăng nhập"}
            </Button>
          </CardContent>
        </Card>
      )}

      {isLoggedIn && (
        <Card>
          <CardHeader>
            <CardTitle>Chọn khách để gửi</CardTitle>
            <p className="text-sm text-muted-foreground">
              Không chọn khách nào = gửi cho toàn bộ đoàn.
            </p>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {guests && (
              <GuestSelector
                tourId={tourId}
                guests={guests}
                selectedIds={selectedIds}
                onToggle={toggleGuest}
                onToggleAll={toggleAll}
                onPreview={setPreviewGuestId}
                onGuestsChanged={loadGuests}
              />
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {result && (
              <p className="text-sm text-green-700">
                Đã xếp hàng gửi {result.queued} tin.
                {result.skipped.length > 0 && ` Bỏ qua ${result.skipped.length} khách thiếu SĐT/Zalo ID.`}
              </p>
            )}

            <Button onClick={handleDispatch} disabled={dispatching} className="self-start">
              {dispatching ? "Đang gửi..." : "Gửi Zalo"}
            </Button>
          </CardContent>
        </Card>
      )}

      {previewGuestId && (
        <ZaloPreview tourId={tourId} guestId={previewGuestId} onClose={() => setPreviewGuestId(null)} />
      )}
    </div>
  );
}
