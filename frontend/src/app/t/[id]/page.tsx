"use client";

// Trang lịch trình công khai — 1 URL DÙNG CHUNG cho cả đoàn khách, KHÔNG cần
// đăng nhập (xem backend app/api/v1/public.py).
//
// Redesign (2026-08-31): dựng lại đúng theo screen thật lấy về từ Stitch MCP
// (project 8575116696704742662, screen "Khám phá Vịnh Hạ Long 3N2Đ" —
// projects/8575116696704742662/screens/6bff2c1cb4da48d9a371f0351858a82e) —
// lần thiết kế trước tool báo timeout nên tôi tưởng nhầm là thất bại và tự
// code tay thay thế; job thật vẫn chạy xong phía Stitch, chỉ là chưa lấy về
// dùng. Font Material Symbols/Public Sans/Inter nạp ở layout.tsx cùng cấp.
//
// 2 chỗ CHỦ ĐỘNG lệch so với bản Stitch gốc (không bịa thêm dữ liệu):
// - Bỏ ảnh minh hoạ AI-generated trên mỗi mốc thời gian — hệ thống chưa có
//   pipeline sinh/lưu ảnh cho từng event, không giả ảnh.
// - Nhãn thẻ thời tiết dùng "THAM KHẢO" (thay vì "DỰ BÁO" như bản gốc) và
//   luôn 1 kiểu hiển thị cho mọi ngày — theo đúng phản hồi user (không phân
//   biệt dự báo thật/trung bình nhiều năm trên UI, tránh cảm giác thiếu
//   chuyên nghiệp khi tour còn xa ngày).
//
// ⚠️ KHÔNG được thêm hiển thị danh sách khách/SĐT/ghế/phòng vào trang này —
// API public/tours/{id} chủ động không trả các field đó, giữ đúng quyết định
// bảo mật "1 link chung cho cả đoàn".
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { api, EventWeather, PublicTourView } from "@/lib/api";

// Khớp đúng tập mô tả thời tiết backend trả về (weather_service._WEATHER_CODE_VI)
const WEATHER_ICON: Record<string, string> = {
  "Trời quang, nắng đẹp": "light_mode",
  "Ít mây": "partly_cloudy_day",
  "Có mây": "cloud",
  "Nhiều mây, âm u": "cloud",
  "Sương mù": "foggy",
  "Sương mù đóng băng": "foggy",
  "Mưa phùn nhẹ": "rainy",
  "Mưa phùn": "rainy",
  "Mưa phùn dày": "rainy",
  "Mưa nhẹ": "rainy",
  "Mưa vừa": "rainy",
  "Mưa to": "rainy",
  "Mưa rào nhẹ": "rainy",
  "Mưa rào": "rainy",
  "Mưa rào lớn": "rainy",
  "Dông": "thunderstorm",
  "Dông kèm mưa đá": "thunderstorm",
  "Dông kèm mưa đá lớn": "thunderstorm",
};

function groupByDay(events: PublicTourView["timeline_events"]) {
  const days = new Map<number, typeof events>();
  for (const e of events) {
    if (!days.has(e.day_index)) days.set(e.day_index, []);
    days.get(e.day_index)!.push(e);
  }
  return [...days.entries()].sort((a, b) => a[0] - b[0]);
}

function formatVi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function formatShortVi(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// Fallback khi ngày đó chưa có weather (vd tour chưa xác định địa điểm nào
// geocode được) — suy ra ngày dương lịch từ start_date + day_index, KHÔNG
// bịa nhiệt độ, chỉ dùng để hiển thị nhãn ngày trên tab.
function fallbackDayDate(startDate: string | null, dayIndex: number): string | null {
  if (!startDate) return null;
  const d = new Date(`${startDate}T00:00:00`);
  d.setDate(d.getDate() + (dayIndex - 1));
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export default function PublicTourPage() {
  const params = useParams<{ id: string }>();
  const [tour, setTour] = useState<PublicTourView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [shared, setShared] = useState(false);

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

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: tour?.name ?? "Lịch trình tour", url });
        return;
      } catch {
        return; // user huỷ share sheet — không phải lỗi
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      prompt("Sao chép link lịch trình:", url);
    }
  }

  if (notFound) {
    return (
      <PageShell tour={null} onShare={handleShare} shared={shared}>
        <div className="py-24 text-center text-gray-500">
          <p className="text-3xl">🔍</p>
          <p className="mt-3 font-semibold">Không tìm thấy lịch trình này</p>
          <p className="mt-1 text-sm">Đường link có thể sai hoặc lịch trình đã bị xoá.</p>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell tour={null} onShare={handleShare} shared={shared}>
        <p className="py-24 text-center text-sm text-[#ba1a1a]">{error}</p>
      </PageShell>
    );
  }

  if (!tour) {
    return (
      <PageShell tour={null} onShare={handleShare} shared={shared}>
        <p className="py-24 text-center text-sm text-gray-500">Đang tải...</p>
      </PageShell>
    );
  }

  const activeWeather = activeDay !== null ? weatherByDay.get(activeDay) : undefined;
  const activeEvents = dayGroups.find(([d]) => d === activeDay)?.[1] ?? [];

  function dayTabLabel(day: number): string {
    const date = weatherByDay.get(day)?.date ?? fallbackDayDate(tour!.start_date, day);
    return date ? `Ngày ${day} (${formatShortIfIso(date)})` : `Ngày ${day}`;
  }

  function formatShortIfIso(date: string): string {
    return date.includes("-") ? formatShortVi(date) : date;
  }

  return (
    <PageShell tour={tour} onShare={handleShare} shared={shared}>
      {!tour.ready && (
        <div className="rounded-xl border border-dashed border-[#e5e5e5] bg-white py-10 text-center text-sm text-gray-500">
          🤖 Lịch trình đang được HDV chuẩn bị — quay lại xem sau nhé.
        </div>
      )}

      {tour.ready && (
        <>
          {activeWeather && <WeatherCard weather={activeWeather} />}

          {/* Tab chọn ngày — desktop */}
          <nav
            aria-label="Chọn ngày"
            className="sticky top-16 z-40 mb-6 hidden gap-2 rounded-xl border border-[#e5e5e5] bg-[#f7f6f3]/90 p-2 backdrop-blur-sm md:flex"
          >
            {dayGroups.map(([day]) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-1 rounded-lg px-4 py-2 text-center text-sm font-bold transition-colors ${
                  activeDay === day ? "bg-[#e0f2e9] text-[#1a6b4e] shadow-sm" : "text-gray-500 hover:bg-white"
                }`}
              >
                {dayTabLabel(day)}
              </button>
            ))}
          </nav>

          <div className="rounded-xl border border-[#e5e5e5] bg-white p-6 shadow-sm md:p-8">
            <h2 className="mb-8 border-b border-[#e5e5e5] pb-4 text-2xl font-bold text-[#1a6b4e]">
              Hành trình Ngày {activeDay}
            </h2>
            <div className="relative ml-4 space-y-10 border-l-2 border-[#e5e5e5] pb-4">
              {activeEvents.map((e, i) => (
                <div key={i} className="relative pl-8">
                  <div className="absolute -left-[11px] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#1a6b4e] ring-4 ring-white">
                    <div className="h-2 w-2 rounded-full bg-white" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-baseline gap-3">
                      <h3 className="text-xl font-bold text-[#1a6b4e]">{e.start_time}</h3>
                      <h4 className="text-lg font-bold text-gray-900">{e.title}</h4>
                    </div>
                    {e.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="material-symbols-outlined text-base">location_on</span>
                        <span>{e.location}</span>
                      </div>
                    )}
                    {e.notes && (
                      <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <span className="material-symbols-outlined text-[#d97706]">info</span>
                        <p className="text-sm text-gray-600">{e.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tab chọn ngày — mobile, thanh cố định đáy màn hình */}
          <nav
            aria-label="Chọn ngày"
            className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch justify-around overflow-x-auto border-t border-[#e5e5e5] bg-white shadow-md md:hidden"
          >
            {dayGroups.map(([day]) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex min-w-[72px] flex-1 flex-col items-center justify-center gap-1 pt-2 text-xs font-medium transition-colors ${
                  activeDay === day ? "border-t-2 border-[#1a6b4e] text-[#1a6b4e]" : "text-gray-500"
                }`}
              >
                <span className="material-symbols-outlined text-xl">event</span>
                <span>Ngày {day}</span>
              </button>
            ))}
          </nav>
        </>
      )}
    </PageShell>
  );
}

function WeatherCard({ weather }: { weather: EventWeather }) {
  const icon = WEATHER_ICON[weather.description] ?? "device_thermostat";
  return (
    <section className="relative mb-6 overflow-hidden rounded-xl border border-[#e5e5e5] bg-[#dbeafe] p-5">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#2563eb]/10 blur-2xl" />
      <div className="relative z-10 flex items-start gap-4">
        <span className="material-symbols-outlined text-5xl text-[#2563eb]" style={{ fontVariationSettings: "'FILL' 1" }}>
          {icon}
        </span>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span className="rounded-full bg-[#2563eb] px-2 py-0.5 text-xs font-bold text-white">THAM KHẢO</span>
            <span className="text-2xl font-bold text-[#2563eb]">
              {Math.round(weather.temp_min)}–{Math.round(weather.temp_max)}°C
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {weather.description} · {weather.location}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Dự báo thời tiết mang tính chất tham khảo, tuỳ vào tình hình cụ thể nơi bạn sắp đến.
          </p>
        </div>
      </div>
    </section>
  );
}

function PageShell({
  tour,
  onShare,
  shared,
  children,
}: {
  tour: PublicTourView | null;
  onShare: () => void;
  shared: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f7f6f3]">
      <header className="sticky top-0 z-50 border-b border-[#e5e5e5] bg-white">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="material-symbols-outlined shrink-0 text-[#1a6b4e]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              map
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold italic text-[#1a6b4e]">
                {tour?.name ?? "VietTour Agent"}
              </h1>
              {tour?.start_date && (
                <p className="text-xs text-gray-500">
                  {formatVi(tour.start_date)} - {tour.end_date ? formatVi(tour.end_date) : "?"}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xl font-bold text-[#1a6b4e] md:block">VietTour</span>
            <button
              type="button"
              onClick={onShare}
              aria-label="Chia sẻ lịch trình"
              className="rounded-full p-2 text-gray-500 hover:bg-[#f7f6f3] hover:text-[#1a6b4e]"
            >
              <span className="material-symbols-outlined text-xl">{shared ? "check" : "share"}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-24 md:pb-8">{children}</main>

      <footer className="mb-16 flex w-full flex-col items-center gap-2 border-t border-[#e5e5e5] bg-[#f7f6f3] py-8 text-center md:mb-0">
        <div className="text-xl font-bold text-[#1a6b4e]">VietTour Agent</div>
        <p className="text-sm text-gray-500">Trải nghiệm hành trình trọn vẹn</p>
      </footer>
    </div>
  );
}
