"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, EventWeather, RoomType, TimelineEvent, TourDetail, ZaloLoginStatus } from "@/lib/api";
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
      if (data.start_date && (data.status === "review" || data.status === "dispatched")) {
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
        if (current && (current.status === "review" || current.status === "dispatched" || current.status === "failed")) {
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

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!tour) return <p className="text-sm text-muted-foreground">Đang tải...</p>;

  const isProcessing = tour.status === "draft" || tour.status === "parsing";
  const isReadyForTimeline = tour.status === "review" || tour.status === "dispatched";
  const zaloConnected = zaloStatus?.status === "success";

  return (
    <div className="relative flex flex-col gap-4 pb-16 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
            ←
          </button>
          <div>
            <h1 className="text-xl font-semibold">{tour.name}</h1>
            <p className="text-sm text-muted-foreground">
              {tour.start_date ? `${tour.start_date} → ${tour.end_date ?? "?"}` : "Chưa xác định ngày"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={tour.status} />
          <DeleteTourButton tourId={tourId} tourName={tour.name} />
        </div>
      </div>

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
              <Button size="sm" variant="outline" onClick={() => setEditing((v) => !v)}>
                {editing ? "Xong" : "✏️ Sửa"}
              </Button>
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
                  zaloConnected={zaloConnected}
                />
              )}
            </CardContent>
          </Card>

          <RoomTypeManager
            tourId={tourId}
            roomTypes={roomTypes}
            onChanged={loadRoomTypes}
            onGuestsChanged={load}
          />

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
