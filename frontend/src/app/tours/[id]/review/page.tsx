"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, TimelineEvent, TourDetail } from "@/lib/api";
import { TimelineBuilder } from "@/components/timeline-builder";
import { GuestSelector } from "@/components/guest-selector";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ReviewTourPage() {
  const params = useParams<{ id: string }>();
  const tourId = params.id;

  const [tour, setTour] = useState<TourDetail | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  async function load() {
    try {
      const data = await api.getTour(tourId);
      setTour(data);
      setEvents(data.timeline_events);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    load();
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{tour.name}</h1>
          <p className="text-sm text-muted-foreground">
            {tour.start_date ? `${tour.start_date} → ${tour.end_date ?? "?"}` : "Chưa xác định ngày"}
          </p>
        </div>
        <StatusBadge status={tour.status} />
      </div>

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

      {(tour.status === "review" || tour.status === "dispatched") && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineBuilder events={events} onChange={setEvents} />
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Đang lưu..." : "Lưu timeline"}
                </Button>
                {saveMessage && <span className="text-sm text-green-700">{saveMessage}</span>}
              </div>
            </CardContent>
          </Card>

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
              />
              <div className="mt-4">
                <Link href={`/tours/${tourId}/dispatch`}>
                  <Button>Sang bước gửi Zalo →</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
