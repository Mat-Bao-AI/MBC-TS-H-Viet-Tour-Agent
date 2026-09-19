"use client";

// Xem lịch trình theo thiết kế Stitch "Lịch trình Tour (Timeline)" — tab
// theo ngày, node tròn nối nhau, trạng thái Đã hoàn thành/Sắp diễn ra tính
// từ giờ THẬT (tour.start_date + event.start_time so với hiện tại), thời
// tiết thật từ Open-Meteo, gửi thông báo từng mốc riêng lẻ qua Zalo.
import { useMemo, useState } from "react";
import { api, EventWeather, MapPoint, TimelineEvent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { EventProgramButton } from "@/components/event-program-button";

type Props = {
  tourId: string;
  startDate: string | null;
  events: TimelineEvent[];
  weather: EventWeather[];
  mapPoints: MapPoint[];
  zaloConnected: boolean;
};

function openDirections(destination: string): void {
  const tab = window.open("about:blank", "_blank");
  const openMap = (origin?: string) => {
    const params = new URLSearchParams({ api: "1", destination, travelmode: "driving" });
    if (origin) params.set("origin", origin);
    const url = `https://www.google.com/maps/dir/?${params.toString()}`;
    if (tab && !tab.closed) tab.location.href = url;
    else window.open(url, "_blank");
  };
  if (!navigator.geolocation) {
    openMap();
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => openMap(`${position.coords.latitude},${position.coords.longitude}`),
    () => openMap(),
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 },
  );
}

function eventDateTime(startDate: string, event: TimelineEvent): Date {
  const d = new Date(startDate);
  d.setDate(d.getDate() + (event.day_index - 1));
  const [h, m] = event.start_time.split(":").map((n) => parseInt(n, 10) || 0);
  d.setHours(h, m, 0, 0);
  return d;
}

function composeEventMessage(event: TimelineEvent, weather?: EventWeather): string {
  let msg = `📅 Cập nhật lịch trình — Ngày ${event.day_index}\n\n⏰ ${event.start_time} — ${event.title}`;
  if (event.location) msg += ` (${event.location})`;
  if (weather) {
    msg += `\n${weather.icon} Thời tiết dự kiến: ${weather.description}, ${Math.round(weather.temp_min)}–${Math.round(weather.temp_max)}°C`;
  }
  if (event.notes) msg += `\n⚠️ ${event.notes}`;
  return msg;
}

export function TimelineView({ tourId, startDate, events, weather, mapPoints, zaloConnected }: Props) {
  const dayIndexes = useMemo(
    () => Array.from(new Set(events.map((e) => e.day_index))).sort((a, b) => a - b),
    [events]
  );
  const [activeDay, setActiveDay] = useState(dayIndexes[0] ?? 1);
  const [confirmingIndex, setConfirmingIndex] = useState<number | null>(null);
  const [sendingIndex, setSendingIndex] = useState<number | null>(null);
  const [sentIndexes, setSentIndexes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const weatherByKey = useMemo(() => {
    const map = new Map<string, EventWeather>();
    weather.forEach((w) => map.set(`${w.day_index}|${w.location}`, w));
    return map;
  }, [weather]);

  const now = Date.now();

  async function handleSendEvent(globalIndex: number, event: TimelineEvent) {
    setSendingIndex(globalIndex);
    setError(null);
    try {
      const w = event.location ? weatherByKey.get(`${event.day_index}|${event.location}`) : undefined;
      await api.quickUpdate(tourId, composeEventMessage(event, w));
      setSentIndexes((prev) => new Set(prev).add(globalIndex));
      setConfirmingIndex(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSendingIndex(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dayIndexes.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              activeDay === day
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            Ngày {day}
          </button>
        ))}
      </div>

      {!zaloConnected && (
        <p className="text-xs text-muted-foreground">
          ⚠️ Chưa kết nối Zalo — nút &quot;Gửi&quot; sẽ xếp hàng nhưng chưa gửi được cho tới khi kết nối.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="relative flex flex-col gap-4 pl-3">
        <div className="absolute bottom-2 left-[7px] top-2 w-0.5 bg-border" />
        {events.map((event, globalIndex) => {
          if (event.day_index !== activeDay) return null;
          const dt = startDate ? eventDateTime(startDate, event) : null;
          const status = dt ? (dt.getTime() < now ? "done" : "upcoming") : null;
          const w = event.location ? weatherByKey.get(`${event.day_index}|${event.location}`) : undefined;
          const mapPoint = event.location
            ? mapPoints.find((point) => point.day_index === event.day_index && point.location === event.location)
            : undefined;
          const isConfirming = confirmingIndex === globalIndex;
          const isSent = sentIndexes.has(globalIndex);

          return (
            <div key={globalIndex} className="relative flex gap-3">
              <span
                className={`z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-card ${
                  status === "done" ? "bg-success" : status === "upcoming" ? "bg-primary" : "bg-muted-foreground"
                }`}
              />
              <div className="flex flex-1 flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{event.start_time}</span>
                  {status && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        status === "done" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                      }`}
                    >
                      {status === "done" ? "Đã hoàn thành" : "Sắp diễn ra"}
                    </span>
                  )}
                </div>
                <p className="font-semibold">{event.title}</p>
                {event.location && (
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <p>📍 {event.location}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-5">
                      <span>{mapPoint?.display_name || "Mở bản đồ để xem địa chỉ chi tiết"}</span>
                      {mapPoint ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${mapPoint.latitude},${mapPoint.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          Xem trên bản đồ ↗
                        </a>
                      ) : (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-primary hover:underline"
                        >
                          Xem trên bản đồ ↗
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openDirections(mapPoint ? `${mapPoint.latitude},${mapPoint.longitude}` : event.location ?? "")}
                        className="font-medium text-primary hover:underline"
                      >
                        Chỉ đường đến đây ↗
                      </button>
                    </div>
                  </div>
                )}
                {w && (
                  <p className="text-xs text-muted-foreground">
                    {w.icon} {w.description}, {Math.round(w.temp_min)}–{Math.round(w.temp_max)}°C
                  </p>
                )}
                {event.notes && <p className="text-xs text-muted-foreground">⚠️ {event.notes}</p>}

                {event.program && (
                  <EventProgramButton
                    title={event.title}
                    timeLabel={`Ngày ${event.day_index} · ${event.start_time}`}
                    program={event.program}
                  />
                )}

                {isSent ? (
                  <p className="text-xs text-success">✓ Đã xếp hàng gửi cập nhật mốc này</p>
                ) : isConfirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Gửi cập nhật mốc này cho cả đoàn?</span>
                    <Button size="sm" variant="outline" onClick={() => setConfirmingIndex(null)}>
                      Huỷ
                    </Button>
                    <Button size="sm" onClick={() => handleSendEvent(globalIndex, event)} disabled={sendingIndex === globalIndex}>
                      {sendingIndex === globalIndex ? "Đang gửi..." : "Gửi"}
                    </Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" className="self-start" onClick={() => setConfirmingIndex(globalIndex)}>
                    ▶ Gửi thông báo
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
