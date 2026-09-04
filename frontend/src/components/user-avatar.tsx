"use client";

// Avatar HDV — ảnh yêu cầu đăng nhập (khác logo công ty/ảnh bìa tour, không
// public), nên phải fetch bằng fetch() có header Authorization rồi tạo
// object URL, không dùng <img src="/api/...veryone"> trực tiếp được. Dùng
// chung ở Sidebar + trang Hồ sơ (Phase 3).
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1]?.[0] ?? "";
  const first = parts[0]?.[0] ?? "";
  return (first + last).toUpperCase();
}

type Props = {
  userId: string;
  fullName: string;
  hasAvatar: boolean;
  /** Tăng để ép tải lại ảnh (vd sau khi vừa upload avatar mới). */
  refreshKey?: number;
  className?: string;
};

export function UserAvatar({ userId, fullName, hasAvatar, refreshKey, className }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAvatar) {
      setObjectUrl(null);
      return;
    }
    let revoked = "";
    api.getUserAvatarBlob(userId).then((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      revoked = url;
      setObjectUrl(url);
    });
    return () => {
      if (revoked) URL.revokeObjectURL(revoked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, hasAvatar, refreshKey]);

  if (objectUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={objectUrl} alt={fullName} className={className ?? "h-10 w-10 rounded-full object-cover"} />;
  }

  return (
    <div
      className={
        className ??
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
      }
    >
      {initials(fullName)}
    </div>
  );
}
