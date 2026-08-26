"use client";

import { useRef, useState } from "react";
import { api, Guest } from "@/lib/api";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  tourId: string;
  guests: Guest[];
  selectedIds: Set<string>;
  onToggle: (guestId: string) => void;
  onToggleAll: () => void;
  onPreview?: (guestId: string) => void;
  /** Gọi lại sau khi thêm/xoá/import khách thành công — parent tự fetch lại tour. */
  onGuestsChanged: () => void;
};

const EMPTY_FORM = { full_name: "", phone_number: "", seat_number: "", room_number: "", dietary_note: "" };

export function GuestSelector({
  tourId,
  guests,
  selectedIds,
  onToggle,
  onToggleAll,
  onPreview,
  onGuestsChanged,
}: Props) {
  const allSelected = guests.length > 0 && guests.every((g) => selectedIds.has(g.id));

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAddSubmit() {
    if (!form.full_name.trim()) {
      setAddError("Cần nhập tên khách.");
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      await api.addGuest(tourId, {
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim() || undefined,
        seat_number: form.seat_number.trim() || undefined,
        room_number: form.room_number.trim() || undefined,
        dietary_note: form.dietary_note.trim() || undefined,
      });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      onGuestsChanged();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleImportFile(file: File) {
    setImporting(true);
    setImportError(null);
    setImportMessage(null);
    try {
      const res = await api.importGuestList(tourId, file);
      setImportMessage(`Đã thêm ${res.added} khách mới, cập nhật ${res.updated} khách đã có.`);
      onGuestsChanged();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(guestId: string) {
    if (!confirm("Xoá khách này khỏi tour?")) return;
    setDeletingId(guestId);
    try {
      await api.deleteGuest(tourId, guestId);
      onGuestsChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          + Thêm khách
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={importing}
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? "Đang nhập..." : "Nhập danh sách (Excel/TXT)"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.txt"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImportFile(file);
          }}
        />
      </div>

      {importMessage && <p className="text-sm text-green-700">{importMessage}</p>}
      {importError && <p className="text-sm text-destructive">{importError}</p>}

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
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selectedIds.has(guest.id)} onChange={() => onToggle(guest.id)} />
                </td>
                <td className="px-3 py-2 font-medium">{guest.full_name}</td>
                <td className="px-3 py-2 text-muted-foreground">{guest.phone_number ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{guest.seat_number ?? "—"}</td>
                <td className="px-3 py-2 text-muted-foreground">{guest.room_number ?? "—"}</td>
                <td className="px-3 py-2">
                  <StatusBadge status={guest.dispatch_status} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {onPreview && (
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => onPreview(guest.id)}
                    >
                      Xem trước
                    </button>
                  )}
                  <button
                    type="button"
                    className="ml-3 text-xs text-destructive hover:underline disabled:opacity-50"
                    disabled={deletingId === guest.id}
                    onClick={() => handleDelete(guest.id)}
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
            {guests.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  Chưa có khách nào — bấm "+ Thêm khách" để nhập tay, hoặc "Nhập danh sách" để tải file lên.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Thêm khách</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Input
                placeholder="Họ tên *"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                autoFocus
              />
              <Input
                placeholder="Số điện thoại"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Số ghế"
                  value={form.seat_number}
                  onChange={(e) => setForm({ ...form, seat_number: e.target.value })}
                />
                <Input
                  placeholder="Số phòng"
                  value={form.room_number}
                  onChange={(e) => setForm({ ...form, room_number: e.target.value })}
                />
              </div>
              <Input
                placeholder="Lưu ý ăn uống"
                value={form.dietary_note}
                onChange={(e) => setForm({ ...form, dietary_note: e.target.value })}
              />
              {addError && <p className="text-sm text-destructive">{addError}</p>}
              <Button onClick={handleAddSubmit} disabled={saving} className="mt-1">
                {saving ? "Đang lưu..." : "Lưu khách"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
