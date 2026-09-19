"use client";

// Nút sao chép link lịch trình công khai (/t/[id]) — kênh không phụ thuộc
// Zalo, dùng được ngay (không cần đăng nhập gì). Dùng chung ở Dashboard +
// trang RSVP. Kèm QR code (qrcode.react, render client-side, không gọi
// service ngoài) để HDV in/chiếu cho cả đoàn quét trực tiếp thay vì phải gửi
// link qua tin nhắn.
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { CloseIcon, LinkIcon, QrIcon } from "@/components/action-icons";

export function CopyPublicLinkButton({ tourId }: { tourId: string }) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    if (!showQr) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowQr(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showQr]);

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
          <LinkIcon />
          {copied ? "Đã sao chép link" : "Sao chép link"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowQr(true)}>
          <QrIcon />
          QR
        </Button>
      </div>
      {showQr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowQr(false);
          }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="qr-dialog-title" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p id="qr-dialog-title" className="font-semibold">Mã QR lịch trình</p>
                <p className="mt-1 text-sm text-muted-foreground">Khách quét mã để mở lịch trình công khai.</p>
              </div>
              <button type="button" onClick={() => setShowQr(false)} aria-label="Đóng mã QR" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
                <CloseIcon />
              </button>
            </div>
            <div className="mt-5 flex justify-center rounded-xl border border-border bg-white p-5">
              <QRCodeSVG value={publicUrl()} size={220} level="M" />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">Nhấn Esc hoặc chạm ra ngoài để đóng</p>
          </div>
        </div>
      )}
    </div>
  );
}
