"use client";

// Danh sách khách & RSVP — theo thiết kế Stitch "Danh sách khách & Zalo
// (RSVP)". Trạng thái tính TRỰC TIẾP từ Guest.dispatch_status thật (không
// bảng phụ) — 3 tab lồng nhau (Đã xác nhận ⊂ Đã xem ⊂ Đã gửi), khớp cách
// đếm trong thiết kế gốc. "Đã xem"/"Đã xác nhận" do HDV tự đánh dấu tay
// (Phase 1 chưa có webhook seen-message tự động từ Zalo — xem
// GuestStatusUpdateRequest ở backend).
import { useMemo, useState } from "react";
import { api, DispatchGuestStatus, Guest, NotificationChannel, TelegramInfo } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Tab = "all" | "sent" | "read" | "confirmed";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "sent", label: "Đã gửi" },
  { key: "read", label: "Đã xem" },
  { key: "confirmed", label: "Đã xác nhận" },
];

function matchesTab(status: DispatchGuestStatus, tab: Tab): boolean {
  if (tab === "all") return true;
  if (tab === "sent") return status === "sent" || status === "read" || status === "confirmed";
  if (tab === "read") return status === "read" || status === "confirmed";
  return status === "confirmed";
}

function countForTab(guests: Guest[], tab: Tab): number {
  return guests.filter((g) => matchesTab(g.dispatch_status, tab)).length;
}

type Props = {
  tourId: string;
  guests: Guest[];
  selectedIds: Set<string>;
  onToggle: (guestId: string) => void;
  onPreview: (guestId: string) => void;
  onGuestsChanged: () => void;
  // null = đang tải/chưa xác định — ẩn tuỳ chọn Telegram để tránh nháy UI.
  telegramInfo: TelegramInfo | null;
};

export function RsvpGuestList({
  tourId,
  guests,
  selectedIds,
  onToggle,
  onPreview,
  onGuestsChanged,
  telegramInfo,
}: Props) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return guests.filter((g) => {
      if (!matchesTab(g.dispatch_status, tab)) return false;
      if (query.trim() && !g.full_name.toLowerCase().includes(query.trim().toLowerCase())) return false;
      return true;
    });
  }, [guests, tab, query]);

  async function markStatus(guestId: string, status: DispatchGuestStatus) {
    setUpdatingId(guestId);
    try {
      await api.updateGuestStatus(tourId, guestId, status);
      onGuestsChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function setChannel(guestId: string, notification_channel: NotificationChannel) {
    setUpdatingId(guestId);
    try {
      await api.updateGuest(tourId, guestId, { notification_channel });
      onGuestsChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setUpdatingId(null);
    }
  }

  async function copyInviteLink(guest: Guest) {
    if (!telegramInfo?.bot_username) return;
    const url = `https://t.me/${telegramInfo.bot_username}?start=${guest.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInviteId(guest.id);
      setTimeout(() => setCopiedInviteId(null), 2000);
    } catch {
      prompt("Sao chép link mời Telegram — gửi cho khách qua SMS/kênh khác:", url);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Tìm tên, số điện thoại..."
        className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {t.label} ({countForTab(guests, t.key)})
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((guest) => (
          <div key={guest.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(guest.id)}
                onChange={() => onToggle(guest.id)}
                className="h-4 w-4 shrink-0"
              />
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm">
                👤
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{guest.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {guest.seat_number && `Ghế ${guest.seat_number}`}
                  {guest.seat_number && guest.room_number && " · "}
                  {guest.room_number && `Phòng ${guest.room_number}`}
                  {!guest.seat_number && !guest.room_number && (guest.phone_number ?? "—")}
                </p>
              </div>
              <StatusChip status={guest.dispatch_status} />
            </div>

            <div className="flex items-center gap-2 pl-16">
              <ChannelToggle
                value={guest.notification_channel}
                disabled={updatingId === guest.id}
                telegramAvailable={!!telegramInfo?.configured}
                onChange={(ch) => setChannel(guest.id, ch)}
              />
              {guest.notification_channel === "telegram" &&
                (guest.telegram_chat_id ? (
                  <span className="text-[11px] text-success">✓ Đã kết nối</span>
                ) : telegramInfo?.configured ? (
                  <button
                    type="button"
                    className="text-[11px] text-primary hover:underline"
                    onClick={() => copyInviteLink(guest)}
                  >
                    {copiedInviteId === guest.id ? "✓ Đã sao chép" : "Sao chép link mời"}
                  </button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Chưa cấu hình Bot</span>
                ))}
            </div>

            {guest.dispatch_status === "failed" && guest.dispatch_error && (
              <p className="pl-16 text-[11px] text-destructive">⚠️ {guest.dispatch_error}</p>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 pl-16">
              <button
                type="button"
                className="text-[11px] text-primary hover:underline"
                onClick={() => onPreview(guest.id)}
              >
                Xem trước
              </button>
              {guest.dispatch_status === "sent" && (
                <button
                  type="button"
                  disabled={updatingId === guest.id}
                  className="text-[11px] text-primary hover:underline"
                  onClick={() => markStatus(guest.id, "read")}
                >
                  Đánh dấu đã xem
                </button>
              )}
              {(guest.dispatch_status === "sent" || guest.dispatch_status === "read") && (
                <button
                  type="button"
                  disabled={updatingId === guest.id}
                  className="text-[11px] text-success hover:underline"
                  onClick={() => markStatus(guest.id, "confirmed")}
                >
                  Đánh dấu đã xác nhận
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">Không có khách nào khớp.</p>
        )}
      </div>
    </div>
  );
}

function ChannelToggle({
  value,
  disabled,
  telegramAvailable,
  onChange,
}: {
  value: NotificationChannel;
  disabled: boolean;
  telegramAvailable: boolean;
  onChange: (channel: NotificationChannel) => void;
}) {
  const options: { key: NotificationChannel; label: string }[] = [
    { key: "zalo", label: "Zalo" },
    { key: "telegram", label: telegramAvailable ? "Telegram" : "Telegram ⚠" },
  ];
  return (
    <div className="inline-flex rounded-full border border-border p-0.5 text-[11px]">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.key)}
          className={`rounded-full px-2.5 py-1 font-medium transition-colors disabled:opacity-50 ${
            value === opt.key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StatusChip({ status }: { status: DispatchGuestStatus }) {
  const map: Record<DispatchGuestStatus, { label: string; cls: string }> = {
    pending: { label: "Chưa gửi", cls: "bg-muted text-muted-foreground" },
    sent: { label: "Đã gửi", cls: "bg-primary/10 text-primary" },
    read: { label: "Đã xem", cls: "bg-secondary/10 text-secondary-foreground" },
    confirmed: { label: "Đã xác nhận", cls: "bg-success/10 text-success" },
    failed: { label: "Gửi lỗi", cls: "bg-destructive/10 text-destructive" },
  };
  const info = map[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${info.cls}`}>{info.label}</span>;
}
