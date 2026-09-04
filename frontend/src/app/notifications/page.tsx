"use client";

// Thông báo — toàn bộ lịch sử hoạt động (khác Dashboard chỉ hiện 5 cái mới
// nhất). Cùng nguồn dữ liệu thật (GET /api/v1/dashboard/activities), không
// bảng riêng — xem backend/app/api/v1/dashboard.py.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, DashboardActivity } from "@/lib/api";
import { ActivityTimeline } from "@/components/activity-timeline";

export default function NotificationsPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<DashboardActivity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getActivities()
      .then(setActivities)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
          ←
        </button>
        <h1 className="text-xl font-bold">Thông báo</h1>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {activities === null && !error && <p className="text-sm text-muted-foreground">Đang tải...</p>}

      {activities && (
        <div className="rounded-xl border border-border bg-card p-4">
          <ActivityTimeline activities={activities} />
        </div>
      )}
    </div>
  );
}
