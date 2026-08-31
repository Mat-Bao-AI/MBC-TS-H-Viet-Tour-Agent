"use client";

// Trang lịch trình công khai — 1 URL DÙNG CHUNG cho cả đoàn khách, KHÔNG cần
// đăng nhập (xem backend app/api/v1/public.py). Style lấy cảm hứng từ
// docs/Demo-tour.html (tông ấm, card viền mảnh, timeline chấm tròn) — CỐ Ý
// khác hệ màu xanh Stitch dùng cho app nội bộ HDV, vì đây là trải nghiệm cho
// khách bên ngoài, không phải màn hình trong app.
//
// ⚠️ KHÔNG được thêm hiển thị danh sách khách/SĐT/ghế/phòng vào trang này —
// API public/tours/{id} chủ động không trả các field đó, giữ đúng quyết định
// bảo mật "1 link chung cho cả đoàn".
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, PublicTourView } from "@/lib/api";

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

  useEffect(() => {
    api
      .getPublicTour(params.id)
      .then(setTour)
      .catch((err) => {
        if (err instanceof Error && err.message === "NOT_FOUND") setNotFound(true);
        else setError(err instanceof Error ? err.message : String(err));
      });
  }, [params.id]);

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

  const dayGroups = groupByDay(tour.timeline_events);
  const weatherByDay = new Map<number, PublicTourView["weather"][number]>();
  for (const w of tour.weather) if (!weatherByDay.has(w.day_index)) weatherByDay.set(w.day_index, w);

  return (
    <PageShell>
      <div className="py-10 text-center">
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

      {tour.ready &&
        dayGroups.map(([day, events]) => {
          const weather = weatherByDay.get(day);
          return (
            <div key={day} className="mb-4 rounded-xl border border-[#e5e5e5] bg-white p-5">
              <div className="mb-3.5 flex items-center gap-3 border-b border-[#e5e5e5] pb-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f5ee] text-lg text-[#1a6b4e]">
                  📅
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-[#1a1a1a]">Ngày {day}</p>
                  {weather && (
                    <p className="text-xs text-[#6b6b6b]">
                      {WEATHER_ICON[weather.description] ?? "🌡️"} {weather.description} · {Math.round(weather.temp_min)}
                      –{Math.round(weather.temp_max)}°C tại {weather.location}
                    </p>
                  )}
                </div>
              </div>

              <div className="relative flex flex-col gap-4 pl-7">
                <div className="absolute bottom-1.5 left-2 top-1.5 w-0.5 bg-[#e5e5e5]" />
                {events.map((e, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[22px] top-1 h-3 w-3 rounded-full border-[2.5px] border-[#1a6b4e] bg-white" />
                    <p className="text-xs font-semibold text-[#1a6b4e]">{e.start_time}</p>
                    <p className="text-sm font-semibold text-[#1a1a1a]">{e.title}</p>
                    {e.location && <p className="mt-0.5 text-[13px] text-[#6b6b6b]">📍 {e.location}</p>}
                    {e.notes && (
                      <p className="mt-1 rounded-md bg-[#fef3c7] px-2.5 py-1.5 text-xs text-[#92400e]">
                        💡 {e.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      <p className="py-8 text-center text-xs text-[#6b6b6b]">Tạo bởi VietTour Agent</p>
    </PageShell>
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
