"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, TourListItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/badge";

type Phase = "all" | "ongoing" | "upcoming" | "done";

const CHIPS: { key: Phase; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "ongoing", label: "Đang diễn ra" },
  { key: "upcoming", label: "Sắp tới" },
  { key: "done", label: "Đã hoàn thành" },
];

// Suy trạng thái theo thời gian THẬT từ start_date/end_date (khác
// TourStatus — trạng thái xử lý tài liệu). Tour chưa xác định ngày (agent
// không trích được, hoặc tour vừa tạo) xếp chung nhóm "Sắp tới".
function tripPhase(tour: TourListItem): Phase {
  if (!tour.start_date || !tour.end_date) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(tour.start_date);
  const end = new Date(tour.end_date);
  if (today < start) return "upcoming";
  if (today > end) return "done";
  return "ongoing";
}

export default function HomePage() {
  const [tours, setTours] = useState<TourListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("all");

  async function load() {
    try {
      setTours(await api.listTours());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000); // poll nhẹ để thấy status "parsing" tự cập nhật
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (!tours) return null;
    return tours.filter((t) => {
      if (phase !== "all" && tripPhase(t) !== phase) return false;
      if (query.trim() && !t.name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [tours, query, phase]);

  return (
    <div className="relative flex flex-col gap-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold lg:text-2xl">Chuyến đi của tôi</h1>
        <Link
          href="/tours/create"
          className="hidden items-center gap-1.5 rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground hover:opacity-90 lg:inline-flex"
        >
          + Tạo tour mới
        </Link>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm kiếm chuyến đi..."
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {CHIPS.map((c) => (
          <button
            key={c.key}
            onClick={() => setPhase(c.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              phase === c.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {tours === null && !error && <p className="text-sm text-muted-foreground">Đang tải...</p>}

      {filtered?.length === 0 && (
        <div className="rounded-lg border border-dashed border-border bg-card py-8 text-center text-sm text-muted-foreground">
          {tours?.length === 0
            ? 'Chưa có tour nào. Bấm nút "+" để tải lên tài liệu lịch trình đầu tiên.'
            : "Không có chuyến đi nào khớp bộ lọc."}
        </div>
      )}

      <div className="flex flex-col gap-3 pb-4 lg:grid lg:grid-cols-3 lg:gap-4">
        {filtered?.map((tour) => {
          const progressPct = tour.guests_total > 0 ? Math.round((tour.guests_sent / tour.guests_total) * 100) : 0;
          return (
            <Link key={tour.id} href={`/tours/${tour.id}/review`}>
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50">
                <div className="flex h-24 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-secondary/20 text-3xl">
                  🏞️
                </div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold leading-snug">{tour.name}</p>
                  <StatusBadge status={tour.status} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {tour.start_date ? `📅 ${tour.start_date} → ${tour.end_date ?? "?"}` : "📅 Chưa xác định ngày"}
                  {" · "}👥 {tour.guests_total} khách
                </p>
                {tour.guests_total > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Đã gửi {tour.guests_sent}/{tour.guests_total}
                    </span>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/tours/create"
        className="fixed bottom-24 right-6 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-2xl font-bold text-secondary-foreground shadow-lg lg:hidden"
        aria-label="Tạo tour mới"
      >
        +
      </Link>
    </div>
  );
}
