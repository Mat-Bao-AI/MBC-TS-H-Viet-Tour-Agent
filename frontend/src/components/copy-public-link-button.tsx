"use client";

// Nút sao chép link lịch trình công khai (/t/[id]) — kênh không phụ thuộc
// Zalo, dùng được ngay (không cần đăng nhập gì). Dùng chung ở Dashboard +
// trang RSVP. Kèm QR code (qrcode.react, render client-side, không gọi
// service ngoài) để HDV in/chiếu cho cả đoàn quét trực tiếp thay vì phải gửi
// link qua tin nhắn.
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";

export function CopyPublicLinkButton({ tourId }: { tourId: string }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  function publicUrl(): string {
    return `${window.location.origin}/t/${tourId}`;
  }

  async function handleCopy() {
    const url = publicUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Sao chép link lịch trình:", url);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full gap-2">
        <Button type="button" variant="outline" onClick={handleCopy} className="flex-1">
          {copied ? "✓ Đã sao chép link" : "🔗 Sao chép link"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowQr((v) => !v)}>
          {showQr ? "Ẩn QR" : "📱 QR"}
        </Button>
      </div>
      {showQr && (
        <div className="rounded-lg border border-border bg-white p-3">
          <QRCodeSVG value={publicUrl()} size={160} />
        </div>
      )}
    </div>
  );
}
