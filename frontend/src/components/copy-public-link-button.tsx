"use client";

// Nút sao chép link lịch trình công khai (/t/[id]) — kênh không phụ thuộc
// Zalo/Telegram, dùng được ngay (không cần đăng nhập gì). Dùng chung ở
// Dashboard + trang RSVP.
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyPublicLinkButton({ tourId }: { tourId: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/t/${tourId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Sao chép link lịch trình:", url);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleCopy} className="w-full">
      {copied ? "✓ Đã sao chép link" : "🔗 Sao chép link lịch trình công khai"}
    </Button>
  );
}
