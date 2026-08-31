"use client";

// Trang lịch trình công khai — 1 URL DÙNG CHUNG cho cả đoàn khách, KHÔNG cần
// đăng nhập (xem backend app/api/v1/public.py). Style lấy cảm hứng từ
// docs/Demo-tour.html (tông ấm, card viền mảnh, timeline chấm tròn) — CỐ Ý
// khác hệ màu xanh Stitch dùng cho app nội bộ HDV, vì đây là trải nghiệm cho
// khách bên ngoài, không phải màn hình trong app.
//
// Redesign (2026-08-31, theo phản hồi user): tab điều hướng theo ngày thay
// vì cuộn qua toàn bộ lịch trình 1 lần + khối thời tiết nổi bật đầu trang.
// Đã thử dùng Stitch MCP thiết kế cấu trúc này nhưng dịch vụ timeout 3 lần
// liên tiếp lúc thực hiện — code trực tiếp theo đúng ngôn ngữ thiết kế đã mô
// tả cho Stitch (tông ấm/xanh lá giữ nguyên, chỉ đổi cấu trúc).
//
// ⚠️ KHÔNG được thêm hiển thị danh sách khách/SĐT/ghế/phòng vào trang này —
// API public/tours/{id} chủ động không trả các field đó, giữ đúng quyết định
// bảo mật "1 link chung cho cả đoàn".
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, EventWeather, PublicTourView } from "@/lib/api";

const WEATHER_ICON: Record<string, string> = {
  "Nắng": "☀️",
  "Nắng nhẹ": "🌤️",
  "Có mây": "⛅",
  "Nhiều mây": "☁️",
  "Sương mù": "🌫️",
  "Mưa": "🌧️",
  "Mưa rào": "🌦️",
  "Dông": "⛈️",
};

function groupByDay(events: PublicTourView["timeline_events"]) {
  const days = new Map<number, typeof events>();
  for (const e of events) {
    if (!days.has(e.day_index)) days.set(e.day_index, []);
    days.get(e.day_index)!.push(e);
  }
  return [...days.entries()].sort((a, b) => a[0] - b[0]);
}

export default function PublicTourPage() {
  const params = useParams<{ id: string }>();
  const [tour, setTour] = useState<PublicTourView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);

  useEffect(() => {
    api
      .getPublicTour(params.id)
      .then((data) => {
        setTour(data);
        const firstDay = data.timeline_events[0]?.day_index ?? null;
        setActiveDay(firstDay);
      })
      .catch((err) => {
        if (err instanceof Error && err.message === "NOT_FOUND") setNotFound(true);
        else setError(err instanceof Error ? err.message : String(err));
      });
  }, [params.id]);

  const dayGroups = useMemo(() => (tour ? groupByDay(tour.timeline_events) : []), [tour]);

  const weatherByDay = useMemo(() => {
    const map = new Map<number, EventWeather>();
    if (tour) for (const w of tour.weather) if (!map.has(w.day_index)) map.set(w.day_index, w);
    return map;
  }, [tour]);

  if (notFound) {
    return (
      <PageShell>
        <div className="py-24 text-center text-[#6b6b6b]">
          <p className="text-3xl">🔍</p>
          <p className="mt-3 font-semibold">Không tìm thấy lịch trình này</p>
          <p className="mt-1 text-sm">Đường link có thể sai hoặc lịch trình đã bị xoá.</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <p className="py-24 text-center text-sm text-[#dc2626]">{error}</p>
      </PageShell>
    );
  }

  if (!tour) {
    return (
      <PageShell>
        <p className="py-24 text-center text-sm text-[#6b6b6b]">Đang tải...</p>
      </PageShell>
    );
  }

  const activeWeather = activeDay !== null ? weatherByDay.get(activeDay) : undefined;
  const activeEvents = dayGroups.find(([d]) => d === activeDay)?.[1] ?? [];

  return (
    <PageShell>
      <div className="py-8 text-center">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#1a6b4e] px-3.5 py-1.5 text-xs font-semibold text-white">
          📋 LỊCH TRÌNH TOUR
        </div>
        <h1 className="text-2xl font-bold text-[#1a1a1a]">{tour.name}</h1>
        <p className="mt-1.5 text-sm text-[#6b6b6b]">
          {tour.start_date ? (
            <>
              {formatVi(tour.start_date)} → {tour.end_date ? formatVi(tour.end_date) : "?"}
            </>
          ) : (
            "Chưa xác định ngày"
          )}
        </p>
      </div>

      {!tour.ready && (
        <div className="rounded-xl border border-dashed border-[#e5e5e5] bg-white py-10 text-center text-sm text-[#6b6b6b]">
          🤖 Lịch trình đang được HDV chuẩn bị — quay lại xem sau nhé.
        </div>
      )}

      {tour.ready && (
        <>
          {/* Khối thời tiết nổi bật — luôn phản ánh đúng ngày TAB đang chọn bên dưới */}
          {activeWeather && <WeatherCard weather={activeWeather} />}

          {/* Tab điều hướng theo ngày — sticky, chỉ hiện timeline của 1 ngày tại 1 thời điểm */}
          <div className="sticky top-0 z-10 -mx-4 mb-4 flex gap-2 overflow-x-auto bg-[#f7f6f3]/95 px-4 py-3 backdrop-blur">
            {dayGroups.map(([day]) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeDay === day
                    ? "bg-[#1a6b4e] text-white"
                    : "border border-[#e5e5e5] bg-white text-[#6b6b6b]"
                }`}
              >
                Ngày {day}
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-[#e5e5e5] bg-white p-5">
            <div className="relative flex flex-col gap-4 pl-7">
              <div className="absolute bottom-1.5 left-2 top-1.5 w-0.5 bg-[#e5e5e5]" />
              {activeEvents.map((e, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-[2.5px] border-[#1a6b4e] bg-white" />
                  <p className="text-xs font-semibold text-[#1a6b4e]">{e.start_time}</p>
                  <p className="text-sm font-semibold text-[#1a1a1a]">{e.title}</p>
                  {e.location && <p className="mt-0.5 text-[13px] text-[#6b6b6b]">📍 {e.location}</p>}
                  {e.notes && (
                    <p className="mt-1 rounded-md bg-[#fef3c7] px-2.5 py-1.5 text-xs text-[#92400e]">💡 {e.notes}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <p className="py-8 text-center text-xs text-[#6b6b6b]">Tạo bởi VietTour Agent</p>
    </PageShell>
  );
}

function WeatherCard({ weather }: { weather: EventWeather }) {
  const icon = WEATHER_ICON[weather.description] ?? weather.icon ?? "🌡️";
  return (
    <div
      className="mb-4 flex items-center gap-4 rounded-xl bg-gradient-to-br from-[#2563eb] to-[#3b82f6] p-5 text-white"
    >
      <div className="text-4xl">{icon}</div>
      <div className="flex-1">
        <p className="text-lg font-bold">
          {Math.round(weather.temp_min)}–{Math.round(weather.temp_max)}°C
        </p>
        <p className="text-sm text-white/90">
          {weather.description} · {weather.location}
        </p>
        <p className="mt-1 text-xs text-white/75">
          Dự báo thời tiết mang tính chất tham khảo, tuỳ vào tình hình cụ thể nơi bạn sắp đến.
        </p>
      </div>
    </div>
  );
}

function formatVi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <div className="mx-auto max-w-[800px] px-4">{children}</div>
    </div>
  );
}
