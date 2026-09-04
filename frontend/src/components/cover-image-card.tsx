"use client";

// Ảnh bìa tour — tuỳ chọn, dùng cho Open Graph preview khi dán link công
// khai (/t/<id>) vào Zalo/Messenger, và hiển thị trên chính trang đó (xem
// backend/app/api/v1/public.py, frontend/src/app/t/[id]/page.tsx).
import { useRef, useState } from "react";
import { api, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  tourId: string;
  hasCoverImage: boolean;
  onChanged: () => void;
};

export function CoverImageCard({ tourId, hasCoverImage, onChanged }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bust cache ảnh sau khi thay — trình duyệt cache theo URL, đổi ảnh mới vẫn
  // cùng URL /cover nên phải tự thêm query param để ép tải lại.
  const [cacheBust, setCacheBust] = useState(0);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await api.setCoverImage(tourId, file);
      setCacheBust((v) => v + 1);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    setBusy(true);
    setError(null);
    try {
      await api.clearCoverImage(tourId);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ảnh bìa tour</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Hiện trên trang lịch trình công khai và khi dán link vào Zalo/Messenger. Không bắt buộc.
        </p>
        {hasCoverImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_BASE}/api/v1/public/tours/${tourId}/cover?v=${cacheBust}`}
            alt="Ảnh bìa tour"
            className="h-40 w-full rounded-lg border border-border object-cover"
          />
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? "Đang xử lý..." : hasCoverImage ? "Đổi ảnh" : "Tải ảnh lên"}
          </Button>
          {hasCoverImage && (
            <Button variant="outline" size="sm" onClick={handleRemove} disabled={busy}>
              Xoá
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
