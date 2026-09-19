"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api, API_BASE, TourListItem } from "@/lib/api";
import { StatusBadge } from "@/components/ui/badge";
import { tripPhase } from "@/lib/utils";

type Phase = "all" | "ongoing" | "upcoming" | "done";

const CHIPS: { key: Phase; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "ongoing", label: "Đang diễn ra" },
  { key: "upcoming", label: "Sắp tới" },
  { key: "done", label: "Đã hoàn thành" },
];

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

      <div className="relative">
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
        {/* Gợi ý còn tab bị che bên phải khi hàng pill tràn (mobile hẹp) — QC
            2026-09-04: overflow-x-auto cuộn được nhưng không có tín hiệu trực
            quan, dễ tưởng "Đã hoàn thành" bị mất chứ không phải cuộn được. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent"
        />
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
                <div className="relative h-24 overflow-hidden rounded-md bg-gradient-to-br from-primary/20 to-secondary/20">
                  {tour.cover_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${API_BASE}${tour.cover_image_url}`}
                      alt={`Ảnh bìa ${tour.name}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-3xl">🏞️</div>
                  )}
                  <span className="absolute right-2 top-2">
                    <StatusBadge status={tour.status} />
                  </span>
                </div>
                <p className="font-semibold leading-snug">{tour.name}</p>
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
