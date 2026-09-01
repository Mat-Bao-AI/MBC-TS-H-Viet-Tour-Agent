"use client";

// Tổng quan — theo thiết kế Stitch "Màn hình Tổng quan (Dashboard)".
// Mọi số liệu (tour đang làm dở, tiến độ gửi Zalo, hoạt động gần đây) lấy
// thật từ GET /api/v1/dashboard — không có field nào bịa/hardcode.
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, DashboardSummary, ZaloLoginStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { CopyPublicLinkButton } from "@/components/copy-public-link-button";
import { parseApiDate } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - parseApiDate(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

const ACTIVITY_ICON: Record<string, string> = {
  tour_created: "🆕",
  guest_dispatched: "✅",
  tour_failed: "⚠️",
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [zaloStatus, setZaloStatus] = useState<ZaloLoginStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getDashboard().then(setSummary).catch((err) => setError(err instanceof Error ? err.message : String(err)));
    api.getZaloLoginStatus().then(setZaloStatus).catch(() => {});
  }, []);

  const tour = summary?.active_tour;
  const progressPct = tour && tour.guests_total > 0 ? Math.round((tour.guests_sent / tour.guests_total) * 100) : 0;

  const activityList = summary && summary.recent_activities.length > 0 && (
    <div>
      <p className="mb-2 text-sm font-semibold">Hoạt động gần đây</p>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
        {summary.recent_activities.map((a, i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 text-sm">
            <span>{ACTIVITY_ICON[a.type] ?? "•"}</span>
            <div className="flex-1">
              <p>{a.text}</p>
              <p className="text-xs text-muted-foreground">{timeAgo(a.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between lg:hidden">
        <span className="text-lg font-semibold text-primary">VietTour Agent</span>
      </div>

      <div>
        <h1 className="text-xl font-bold lg:text-2xl">
          Xin chào{zaloStatus?.status === "success" && zaloStatus.display_name ? `, ${zaloStatus.display_name}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground lg:mt-1">Sẵn sàng cho chuyến đi tuyệt vời hôm nay?</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {summary === null && !error && <p className="text-sm text-muted-foreground">Đang tải...</p>}

      {summary && !tour && (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Chưa có tour nào.{" "}
          <Link href="/tours/create" className="text-primary underline">
            Tạo tour đầu tiên
          </Link>
          .
        </div>
      )}

      {/* Desktop: tour đang làm (2/3) + hoạt động gần đây (1/3) cạnh nhau. Mobile: xếp chồng. */}
      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
        {tour && (
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 lg:col-span-2">
            <div className="flex h-28 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-secondary/20 text-4xl lg:h-36">
              🏞️
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-headline text-lg font-bold">{tour.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tour.start_date ? `${tour.start_date} → ${tour.end_date ?? "?"}` : "Chưa xác định ngày"}
                  {" · "}
                  {tour.guests_total} khách
                </p>
              </div>
              <StatusBadge status={tour.status} />
            </div>

            {tour.guests_total > 0 && (
              <div className="flex flex-col gap-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Đã gửi thông báo: {tour.guests_sent}/{tour.guests_total}
                </p>
              </div>
            )}

            <div className="lg:flex lg:gap-3">
              <Link href={`/tours/${tour.id}/dispatch`} className="lg:flex-1">
                <Button className="w-full">Gửi thông báo nhanh</Button>
              </Link>
              <div className="lg:flex-1">
                <CopyPublicLinkButton tourId={tour.id} />
              </div>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold">Thao tác nhanh</p>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <Link
                  href={`/tours/${tour.id}/review`}
                  className="flex flex-col items-center gap-1 rounded-md border border-border py-3 hover:bg-muted"
                >
                  <span className="text-lg">📋</span>
                  Xem lịch trình
                </Link>
                <Link
                  href={`/tours/${tour.id}/dispatch`}
                  className="flex flex-col items-center gap-1 rounded-md border border-border py-3 hover:bg-muted"
                >
                  <span className="text-lg">👥</span>
                  Danh sách khách
                </Link>
                <Link
                  href={`/tours/${tour.id}/dispatch`}
                  className="flex flex-col items-center gap-1 rounded-md border border-border py-3 hover:bg-muted"
                >
                  <span className="text-lg">📊</span>
                  Thống kê gửi tin
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className={tour ? "lg:col-span-1" : "lg:col-span-3"}>{activityList}</div>
      </div>
    </div>
  );
}
