"use client";

// Tổng quan — desktop dựng theo đúng screen thật lấy từ Stitch MCP (project
// 8575116696704742662, screen "Dashboard (Desktop)" —
// projects/.../screens/2d31fc623f0449cb85a7766b33acc999); mobile giữ theo
// "Màn hình Tổng quan (Dashboard)" cũ. Mọi số liệu (tour đang làm dở, tiến
// độ gửi thông báo, hoạt động gần đây) lấy thật từ GET /api/v1/dashboard —
// không có field nào bịa/hardcode.
//
// 2 chỗ CHỦ ĐỘNG khác bản Stitch gốc: không dùng ảnh cover AI-generated cho
// card tour (chưa có pipeline sinh/lưu ảnh theo tour); danh sách "Hoạt động
// gần đây" chỉ hiện 3 loại hoạt động THẬT sự có trong dữ liệu (tạo tour, đã
// gửi thông báo, lỗi xử lý) — bản Stitch có thêm loại "khách xác nhận điểm
// đón"/"đổi giờ khởi hành" mà hệ thống chưa ghi nhận được, không bịa thêm.
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, DashboardSummary, ZaloLoginStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { CopyPublicLinkButton } from "@/components/copy-public-link-button";
import { parseApiDate, tripPhase, TRIP_PHASE_LABEL } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - parseApiDate(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.round(hours / 24)} ngày trước`;
}

// Icon Material Symbols khớp icon-timeline trong bản Stitch gốc — chỉ 3
// loại hoạt động thật hệ thống có (xem ghi chú đầu file).
const ACTIVITY_MATERIAL_ICON: Record<string, string> = {
  tour_created: "add_task",
  guest_dispatched: "send",
  tour_failed: "error",
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
  const pending = tour ? tour.guests_total - tour.guests_sent : 0;
  const phase = tour ? tripPhase(tour) : null;

  const activityList = summary && summary.recent_activities.length > 0 && (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-2 border-b border-border pb-2 text-base font-bold">
        <span className="material-symbols-outlined text-primary">history</span>
        Hoạt động gần đây
      </h3>
      <div className="relative flex flex-col gap-5 pl-1">
        <div className="absolute bottom-2 left-4 top-2 w-px bg-border" />
        {summary.recent_activities.map((a, i) => (
          <div key={i} className="relative z-10 flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-card bg-primary/15">
              <span className="material-symbols-outlined text-base text-primary">
                {ACTIVITY_MATERIAL_ICON[a.type] ?? "notifications"}
              </span>
            </div>
            <div>
              <p className="text-sm">{a.text}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(a.timestamp)}</p>
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
        <h1 className="text-xl font-bold lg:text-3xl">
          Xin chào{zaloStatus?.status === "success" && zaloStatus.display_name ? `, ${zaloStatus.display_name}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground lg:mt-1 lg:text-base">Sẵn sàng cho chuyến đi tuyệt vời hôm nay?</p>
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
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:col-span-2 lg:p-5">
            <div className="relative flex h-28 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 to-secondary/20 text-4xl lg:h-40">
              🏞️
              {phase && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-card px-3 py-1 text-xs font-bold text-primary shadow-sm">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {TRIP_PHASE_LABEL[phase]}
                </span>
              )}
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-lg font-bold lg:text-xl">{tour.name}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground lg:text-sm">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">calendar_today</span>
                    {tour.start_date ? `${tour.start_date} → ${tour.end_date ?? "?"}` : "Chưa xác định ngày"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">group</span>
                    {tour.guests_total} khách
                  </span>
                </div>
              </div>
              <StatusBadge status={tour.status} />
            </div>

            {tour.guests_total > 0 && (
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
                  <span className="text-muted-foreground">Tiến độ thông báo</span>
                  <span className="text-primary">
                    {tour.guests_sent}/{tour.guests_total} khách
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Đã gửi thông báo cho {tour.guests_sent} khách.{" "}
                  {pending > 0 ? `${pending} khách chưa nhận được.` : "Đã gửi đủ cho cả đoàn."}
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

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/tours/${tour.id}/review`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                Xem lịch trình
              </Link>
              <Link
                href={`/tours/${tour.id}/dispatch`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary/5"
              >
                <span className="material-symbols-outlined text-base">list_alt</span>
                Danh sách khách
              </Link>
              <Link
                href={`/tours/${tour.id}/dispatch`}
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold text-primary hover:bg-muted lg:ml-auto"
              >
                <span className="material-symbols-outlined text-base">bar_chart</span>
                Thống kê gửi tin
              </Link>
            </div>
          </div>
        )}

        <div className={tour ? "lg:col-span-1" : "lg:col-span-3"}>{activityList}</div>
      </div>
    </div>
  );
}
