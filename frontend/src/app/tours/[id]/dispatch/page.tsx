"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

  async function loadGuests() {
    try {
      setGuests(await api.dispatchStatus(tourId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    loadGuests();
    api.getZaloLoginStatus().then(setLoginStatus).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

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
              Cần kết nối tài khoản Zalo cá nhân trước khi gửi thông báo cho khách.
            </p>
          </CardHeader>
          <CardContent>
            <Link href={`/login?next=/tours/${tourId}/dispatch`}>
              <Button>Kết nối Zalo qua QR</Button>
            </Link>
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
