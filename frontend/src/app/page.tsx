"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, TourListItem } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const [tours, setTours] = useState<TourListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Danh sách tour</h1>
        <Link href="/tours/create">
          <Button>+ Tour mới</Button>
        </Link>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {tours === null && !error && <p className="text-sm text-muted-foreground">Đang tải...</p>}

      {tours?.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Chưa có tour nào. Bấm "+ Tour mới" để tải lên tài liệu lịch trình đầu tiên.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {tours?.map((tour) => (
          <Link key={tour.id} href={`/tours/${tour.id}/review`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">{tour.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tour.start_date ? `${tour.start_date} → ${tour.end_date ?? "?"}` : "Chưa xác định ngày"}
                  </p>
                </div>
                <StatusBadge status={tour.status} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
