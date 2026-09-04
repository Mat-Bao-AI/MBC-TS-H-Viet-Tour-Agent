"use client";

// FAB "Cập nhật nhanh" — soạn 1 tin tự do, gửi tức thời tới toàn đoàn (hoặc
// khách được chọn) qua POST /zalo/tours/{id}/quick-update. Modal mở +
// bấm "Gửi" là 2 bước rõ ràng, không tự gửi khi vừa mở.
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  tourId: string;
  guestCount: number;
  zaloConnected: boolean;
  onClose: () => void;
};

export function QuickUpdateSheet({ tourId, guestCount, zaloConnected, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ queued: number; skipped: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await api.quickUpdate(tourId, `🚨 Cập nhật nhanh:\n\n${message.trim()}`);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="w-full rounded-t-xl bg-card p-4 pb-6"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "28rem", margin: "0 auto" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">Cập nhật nhanh</h2>
          <button onClick={onClose} aria-label="Đóng" className="text-lg text-muted-foreground">
            ✕
          </button>
        </div>

        {!zaloConnected && (
          <p className="mb-3 text-sm text-destructive">
            ⚠️ Chưa kết nối Zalo — tin sẽ được xếp hàng nhưng không gửi được cho tới khi kết nối.
          </p>
        )}

        {result ? (
          <p className="text-sm text-success">
            Đã xếp hàng gửi tới {result.queued} khách.
            {result.skipped.length > 0 && ` Bỏ qua ${result.skipped.length} khách thiếu zalo_id/SĐT.`}
          </p>
        ) : (
          <>
            <p className="mb-2 text-sm text-muted-foreground">
              Gửi ngay tới toàn bộ {guestCount} khách trong đoàn — dùng cho thay đổi khẩn (đổi giờ, đổi điểm hẹn...).
            </p>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="VD: Đổi giờ khởi hành sang 15:00 do thời tiết, quý khách vui lòng có mặt sớm 15 phút."
              rows={4}
              autoFocus
            />
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <Button
              className="mt-3 w-full"
              onClick={handleSend}
              disabled={sending || !message.trim() || guestCount === 0}
            >
              {sending ? "Đang gửi..." : `Gửi tới ${guestCount} khách`}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
