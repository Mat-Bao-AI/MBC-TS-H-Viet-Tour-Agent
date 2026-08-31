"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, Guest, TourDetail, ZaloLoginStatus } from "@/lib/api";
import { RsvpGuestList } from "@/components/rsvp-guest-list";
import { ZaloGroupCard } from "@/components/zalo-group-card";
import { CopyPublicLinkButton } from "@/components/copy-public-link-button";
import { ZaloPreview } from "@/components/zalo-preview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DispatchTourPage() {
  const params = useParams<{ id: string }>();
  const tourId = params.id;

  const [loginStatus, setLoginStatus] = useState<ZaloLoginStatus | null>(null);
  const [tour, setTour] = useState<TourDetail | null>(null);
  const [guests, setGuests] = useState<Guest[] | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [previewGuestId, setPreviewGuestId] = useState<string | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [result, setResult] = useState<{ queued: number; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sau khi bấm gửi, "Đã xếp hàng gửi N tin" chỉ xác nhận đã QUEUE — chưa
  // biết thật sự thành công hay lỗi (Celery task chạy nền, mất vài giây tới
  // vài chục giây). Poll ngắn để HDV thấy đúng trạng thái cuối (sent/failed)
  // thay vì tưởng "đã gửi" xong biến mất, khách không nhận được mà không rõ
  // vì sao — bug thật phát hiện lúc user test.
  function startPollingAfterDispatch() {
    if (pollRef.current) clearInterval(pollRef.current);
    let ticks = 0;
    pollRef.current = setInterval(() => {
      ticks += 1;
      loadGuests();
      if (ticks >= 8 && pollRef.current) {
        // ~20s (8 x 2.5s) đủ cho phần lớn trường hợp kể cả có retry Celery
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 2500);
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function loadGuests() {
    try {
      setGuests(await api.dispatchStatus(tourId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadTour() {
    try {
      setTour(await api.getTour(tourId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    loadGuests();
    loadTour();
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

  async function handleDispatch(guestIds?: string[]) {
    setDispatching(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.dispatch(tourId, guestIds);
      setResult(res);
      await loadGuests();
      startPollingAfterDispatch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDispatching(false);
    }
  }

  const isLoggedIn = loginStatus?.status === "success";
  const pendingIds = guests?.filter((g) => g.dispatch_status === "pending").map((g) => g.id) ?? [];

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <h1 className="text-xl font-bold">Đoàn khách: {tour?.name ?? "..."}</h1>
        <p className="text-sm text-muted-foreground">Tổng cộng: {guests?.length ?? 0} khách</p>
      </div>

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

      {guests && (
        <RsvpGuestList
          tourId={tourId}
          guests={guests}
          selectedIds={selectedIds}
          onToggle={toggleGuest}
          onPreview={setPreviewGuestId}
          onGuestsChanged={loadGuests}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {result && (
        <p className="text-sm text-success">
          Đã xếp hàng gửi {result.queued} tin — đang cập nhật trạng thái thật bên dưới (vài giây)...
          {result.skipped.length > 0 && ` Bỏ qua ${result.skipped.length} khách thiếu SĐT/Zalo ID.`}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          disabled={dispatching || !isLoggedIn || pendingIds.length === 0}
          onClick={() => handleDispatch(pendingIds)}
        >
          📩 Gửi riêng khách chưa xem ({pendingIds.length})
        </Button>
        <Button disabled={dispatching || !isLoggedIn || !guests?.length} onClick={() => handleDispatch()}>
          {dispatching ? "Đang gửi..." : "▶ Gửi thông báo toàn đoàn"}
        </Button>
      </div>

      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-semibold">Lịch trình công khai</p>
        <p className="text-xs text-muted-foreground">
          Không cần đăng nhập gì — gửi link này qua bất kỳ kênh nào (SMS, email, in QR...) để khách tự xem lịch
          trình chung. Không hiển thị danh sách khách/số ghế/phòng riêng.
        </p>
        {tour && <CopyPublicLinkButton tourId={tour.id} />}
      </div>

      <ZaloGroupCard
        tourId={tourId}
        groupId={tour?.zalo_group_id ?? null}
        zaloConnected={isLoggedIn}
        onGroupCreated={loadTour}
      />

      {previewGuestId && (
        <ZaloPreview tourId={tourId} guestId={previewGuestId} onClose={() => setPreviewGuestId(null)} />
      )}
    </div>
  );
}
