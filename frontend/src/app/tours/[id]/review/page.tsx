"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, EventWeather, RoomType, TimelineEvent, TOUR_TYPE_LABEL, TourDetail, ZaloLoginStatus } from "@/lib/api";
import { TimelineBuilder } from "@/components/timeline-builder";
import { TimelineView } from "@/components/timeline-view";
import { QuickUpdateSheet } from "@/components/quick-update-sheet";
import { GuestSelector } from "@/components/guest-selector";
import { CoverImageCard } from "@/components/cover-image-card";
import { RoomTypeManager } from "@/components/room-type-manager";
import { DeleteTourButton } from "@/components/delete-tour-button";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackIcon } from "@/components/navigation-icons";

export default function ReviewTourPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const tourId = params.id;

  const [tour, setTour] = useState<TourDetail | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [weather, setWeather] = useState<EventWeather[]>([]);
  const [zaloStatus, setZaloStatus] = useState<ZaloLoginStatus | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [showQuickUpdate, setShowQuickUpdate] = useState(false);

  async function load() {
    try {
      const data = await api.getTour(tourId);
      setTour(data);
      setEvents(data.timeline_events);
      if (data.start_date && (data.status === "review" || data.status === "ready_to_send" || data.status === "dispatched")) {
        api.getTourWeather(tourId).then(setWeather).catch(() => {});
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadRoomTypes() {
    try {
      setRoomTypes(await api.listRoomTypes(tourId));
    } catch {
      // best-effort — không chặn trang nếu lỗi, HDV vẫn xem/sửa lịch trình bình thường
    }
  }

  useEffect(() => {
    load();
    loadRoomTypes();
    api.getZaloLoginStatus().then(setZaloStatus).catch(() => {});
    // Poll trong lúc agent đang parse — dừng poll khi đã có kết quả (review/dispatched/failed)
    const interval = setInterval(() => {
      setTour((current) => {
        if (current && (current.status === "review" || current.status === "ready_to_send" || current.status === "dispatched" || current.status === "failed")) {
          return current;
        }
        load();
        return current;
      });
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourId]);

  async function handleSave() {
    setSaving(true);
    setSaveMessage(null);
    try {
      const updated = await api.updateTimeline(tourId, events);
      setTour(updated);
      setSaveMessage("Đã lưu timeline.");
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReprocess() {
    setError(null);
    try {
      await api.reprocessTour(tourId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleConfirm() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.confirmTimeline(tourId);
      setTour(updated);
      setEvents(updated.timeline_events);
      setSaveMessage("Đã xác nhận lịch trình. Có thể gửi thông báo cho khách.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleReopen() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.reopenTimeline(tourId);
      setTour(updated);
      setEvents(updated.timeline_events);
      setEditing(true);
      setSaveMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!tour) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  const isProcessing = tour.status === "draft" || tour.status === "parsing";
  const isReadyForTimeline = tour.status === "review" || tour.status === "ready_to_send" || tour.status === "dispatched";
  const zaloConnected = zaloStatus?.status === "success";

  return (
    <div className="relative flex flex-col gap-4 pb-16 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
          <BackIcon />
          </button>
          <div>
            <h1 className="text-xl font-semibold">{tour.name}</h1>
            <p className="text-sm text-muted-foreground">
              {tour.start_date ? `${tour.start_date} → ${tour.end_date ?? "?"}` : "Chưa xác định ngày"}
              {" · "}
              {TOUR_TYPE_LABEL[tour.tour_type]}
            </p>
            <div className="mt-2">
              <StatusBadge status={tour.status} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DeleteTourButton tourId={tourId} tourName={tour.name} />
        </div>
      </div>

      {tour.summary && (
        <Card>
          <CardContent className="py-4 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tóm tắt</p>
            {tour.summary}
          </CardContent>
        </Card>
      )}

      {tour.source_url && (
        <Card>
          <CardContent className="py-3 text-sm">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nguồn web</p>
            <a href={tour.source_url} target="_blank" rel="noreferrer" className="break-all text-primary underline">
              {tour.source_title || tour.source_url}
            </a>
            <p className="mt-1 text-xs text-muted-foreground">Brave Search (nếu được cấu hình) chỉ được dùng để bổ sung thông tin tham khảo.</p>
          </CardContent>
        </Card>
      )}

      <CoverImageCard tourId={tourId} hasCoverImage={tour.has_cover_image} onChanged={load} />

      {isProcessing && (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            🤖 Agent đang phân tích tài liệu và dựng timeline — trang sẽ tự cập nhật...
          </CardContent>
        </Card>
      )}

      {tour.status === "failed" && (
        <Card className="border-destructive">
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm text-destructive">Xử lý lỗi: {tour.process_error}</p>
            <Button size="sm" onClick={handleReprocess} className="self-start">
              Thử xử lý lại
            </Button>
          </CardContent>
        </Card>
      )}

      {isReadyForTimeline && (
        <>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Lịch trình</CardTitle>
              <div className="flex items-center gap-2">
                {tour.status === "review" && !editing && (
                  <Button size="sm" onClick={handleConfirm} disabled={saving}>
                    {saving ? "Đang xác nhận..." : "Xác nhận lịch trình"}
                  </Button>
                )}
                {tour.status === "ready_to_send" && !editing && (
                  <Button size="sm" variant="outline" onClick={handleReopen} disabled={saving}>
                    {saving ? "Đang mở lại..." : "Sửa lại lịch trình"}
                  </Button>
                )}
                {tour.status === "review" && (
                  <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
                    {editing ? "Xong" : "Sửa"}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {editing ? (
                <>
                  <TimelineBuilder events={events} onChange={setEvents} />
                  <div className="mt-4 flex items-center gap-3">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? "Đang lưu..." : "Lưu timeline"}
                    </Button>
                    {saveMessage && <span className="text-sm text-success">{saveMessage}</span>}
                  </div>
                </>
              ) : (
                <TimelineView
                  tourId={tourId}
                  startDate={tour.start_date}
                  events={events}
                  weather={weather}
                  mapPoints={tour.map_points ?? []}
                  zaloConnected={zaloConnected}
                />
              )}
            </CardContent>
          </Card>

          {tour.tour_type === "tourism" && (
            <RoomTypeManager
              tourId={tourId}
              roomTypes={roomTypes}
              onChanged={loadRoomTypes}
              onGuestsChanged={load}
            />
          )}

          <Card>
            <CardHeader>
              <CardTitle>Danh sách khách ({tour.guests.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <GuestSelector
                tourId={tourId}
                guests={tour.guests}
                selectedIds={new Set()}
                onToggle={() => {}}
                onToggleAll={() => {}}
                onGuestsChanged={load}
                roomTypes={roomTypes}
              />
              <div className="mt-4">
                <Link href={`/tours/${tourId}/dispatch`}>
                  <Button>Sang bước gửi thông báo →</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <button
            onClick={() => setShowQuickUpdate(true)}
            className="fixed bottom-8 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-2xl text-secondary-foreground shadow-lg"
            aria-label="Cập nhật nhanh"
            title="Cập nhật nhanh"
          >
            ⚡
          </button>

          {showQuickUpdate && (
            <QuickUpdateSheet
              tourId={tourId}
              guestCount={tour.guests.length}
              zaloConnected={zaloConnected}
              onClose={() => setShowQuickUpdate(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
