"use client";

import { Guest } from "@/lib/api";
import { StatusBadge } from "@/components/ui/badge";

type Props = {
  guests: Guest[];
  selectedIds: Set<string>;
  onToggle: (guestId: string) => void;
  onToggleAll: () => void;
  onPreview?: (guestId: string) => void;
};

export function GuestSelector({ guests, selectedIds, onToggle, onToggleAll, onPreview }: Props) {
  const allSelected = guests.length > 0 && guests.every((g) => selectedIds.has(g.id));

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="w-8 px-3 py-2">
              <input type="checkbox" checked={allSelected} onChange={onToggleAll} />
            </th>
            <th className="px-3 py-2">Khách</th>
            <th className="px-3 py-2">SĐT</th>
            <th className="px-3 py-2">Ghế</th>
            <th className="px-3 py-2">Phòng</th>
            <th className="px-3 py-2">Trạng thái gửi</th>
            {onPreview && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody>
          {guests.map((guest) => (
            <tr key={guest.id} className="border-t border-border">
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(guest.id)}
                  onChange={() => onToggle(guest.id)}
                />
              </td>
              <td className="px-3 py-2 font-medium">{guest.full_name}</td>
              <td className="px-3 py-2 text-muted-foreground">{guest.phone_number ?? "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{guest.seat_number ?? "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{guest.room_number ?? "—"}</td>
              <td className="px-3 py-2">
                <StatusBadge status={guest.dispatch_status} />
              </td>
              {onPreview && (
                <td className="px-3 py-2">
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => onPreview(guest.id)}
                  >
                    Xem trước
                  </button>
                </td>
              )}
            </tr>
          ))}
          {guests.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                Chưa có khách nào — agent chưa trích xuất được hoặc chưa upload danh sách đoàn.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
