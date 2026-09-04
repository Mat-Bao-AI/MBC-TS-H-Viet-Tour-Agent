"use client";

// Danh sách "hoạt động" dạng timeline — dùng chung ở Dashboard (top 5, xem
// dashboard/page.tsx) và trang Thông báo (/notifications, toàn bộ lịch sử).
// Tách ra đây để không lặp lại icon mapping + format thời gian ở 2 nơi.
import { DashboardActivity } from "@/lib/api";
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

// Chỉ 3 loại hoạt động THẬT hệ thống có (tạo tour, đã gửi thông báo, lỗi xử
// lý) — xem app/api/v1/dashboard.py build_recent_activities().
const ACTIVITY_MATERIAL_ICON: Record<string, string> = {
  tour_created: "add_task",
  guest_dispatched: "send",
  tour_failed: "error",
};

export function ActivityTimeline({ activities }: { activities: DashboardActivity[] }) {
  if (activities.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có hoạt động nào.</p>;
  }

  return (
    <div className="relative flex flex-col gap-5 pl-1">
      <div className="absolute bottom-2 left-4 top-2 w-px bg-border" />
      {activities.map((a, i) => (
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
  );
}
