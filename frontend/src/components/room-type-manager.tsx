"use client";

// Quản lý loại phòng (Phase 3) — tồn kho HDV khai báo cho tour (vd "Phòng
// đơn" x2, "Phòng đôi" x5), nền tảng cho thuật toán tự động xếp phòng theo
// travel_group của khách (Phase 4, xem backend/app/models/room_type.py).
import { useState } from "react";
import { api, AutoAssignRoomsResponse, RoomType } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  tourId: string;
  roomTypes: RoomType[];
  onChanged: () => void;
  /** Gọi lại sau khi tự động xếp phòng thành công — parent tự fetch lại guests (room_type_id đổi). */
  onGuestsChanged: () => void;
};

const EMPTY_FORM = { name: "", capacity: "", quantity: "" };

export function RoomTypeManager({ tourId, roomTypes, onChanged, onGuestsChanged }: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<AutoAssignRoomsResponse | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);

  async function handleAutoAssign() {
    setAssigning(true);
    setAssignError(null);
    setAssignResult(null);
    try {
      const res = await api.autoAssignRooms(tourId);
      setAssignResult(res);
      onGuestsChanged();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : String(err));
    } finally {
      setAssigning(false);
    }
  }

  async function handleAddSubmit() {
    const capacity = parseInt(form.capacity, 10);
    const quantity = parseInt(form.quantity, 10);
    if (!form.name.trim()) {
      setError("Cần nhập tên loại phòng.");
      return;
    }
    if (!capacity || capacity <= 0 || !quantity || quantity <= 0) {
      setError("Sức chứa và số lượng phải là số lớn hơn 0.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.createRoomType(tourId, { name: form.name.trim(), capacity, quantity });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  function startEdit(rt: RoomType) {
    setEditingId(rt.id);
    setEditForm({ name: rt.name, capacity: String(rt.capacity), quantity: String(rt.quantity) });
  }

  async function handleEditSubmit(roomTypeId: string) {
    const capacity = parseInt(editForm.capacity, 10);
    const quantity = parseInt(editForm.quantity, 10);
    if (!editForm.name.trim() || !capacity || capacity <= 0 || !quantity || quantity <= 0) {
      alert("Tên/sức chứa/số lượng không hợp lệ.");
      return;
    }
    try {
      await api.updateRoomType(tourId, roomTypeId, { name: editForm.name.trim(), capacity, quantity });
      setEditingId(null);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleDelete(roomTypeId: string) {
    if (!confirm("Xoá loại phòng này?")) return;
    setDeletingId(roomTypeId);
    try {
      await api.deleteRoomType(tourId, roomTypeId);
      onChanged();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  const totalRooms = roomTypes.reduce((sum, rt) => sum + rt.quantity, 0);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Loại phòng</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          + Thêm loại phòng
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          Khai báo các loại phòng khách sạn có sẵn cho tour này — nhấn "Tự động xếp phòng" bên dưới để hệ thống
          gợi ý loại phòng cho từng nhóm khách (theo Nhóm đi cùng).
        </p>

        {roomTypes.length === 0 ? (
          <p className="rounded-md border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
            Chưa khai báo loại phòng nào.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Tên loại phòng</th>
                  <th className="px-3 py-2">Sức chứa (người/phòng)</th>
                  <th className="px-3 py-2">Số lượng</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((rt) =>
                  editingId === rt.id ? (
                    <tr key={rt.id} className="border-t border-border">
                      <td className="px-3 py-2">
                        <Input
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={editForm.capacity}
                          onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => handleEditSubmit(rt.id)}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          className="ml-3 text-xs text-muted-foreground hover:underline"
                          onClick={() => setEditingId(null)}
                        >
                          Huỷ
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={rt.id} className="border-t border-border">
                      <td className="px-3 py-2 font-medium">{rt.name}</td>
                      <td className="px-3 py-2 text-muted-foreground">{rt.capacity}</td>
                      <td className="px-3 py-2 text-muted-foreground">{rt.quantity}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => startEdit(rt)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="ml-3 text-xs text-destructive hover:underline disabled:opacity-50"
                          disabled={deletingId === rt.id}
                          onClick={() => handleDelete(rt.id)}
                        >
                          Xoá
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {roomTypes.length > 0 && (
          <p className="text-xs text-muted-foreground">Tổng cộng: {totalRooms} phòng.</p>
        )}

        {roomTypes.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={assigning}
              onClick={handleAutoAssign}
            >
              {assigning ? "Đang xếp phòng..." : "🤖 Tự động xếp phòng"}
            </Button>

            {assignError && <p className="text-sm text-destructive">{assignError}</p>}

            {assignResult && (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm">
                {assignResult.assigned.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-success">
                      ✓ Đã gán {assignResult.assigned.length} nhóm:
                    </p>
                    <ul className="ml-4 list-disc space-y-0.5 text-xs text-muted-foreground">
                      {assignResult.assigned.map((g, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{g.group_label}</span> ({g.guest_ids.length}{" "}
                          người) → {g.room_type_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {assignResult.unassigned.length > 0 && (
                  <div>
                    <p className="mb-1 font-medium text-destructive">
                      ⚠ {assignResult.unassigned.length} nhóm chưa xếp được:
                    </p>
                    <ul className="ml-4 list-disc space-y-0.5 text-xs text-muted-foreground">
                      {assignResult.unassigned.map((g, i) => (
                        <li key={i}>
                          <span className="font-medium text-foreground">{g.group_label}</span> — {g.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Thêm loại phòng</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Input
                placeholder="Tên loại phòng (vd Phòng đôi) *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  placeholder="Sức chứa (người/phòng) *"
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
                <Input
                  placeholder="Số lượng phòng *"
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleAddSubmit} disabled={saving} className="mt-1">
                {saving ? "Đang lưu..." : "Lưu loại phòng"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </Card>
  );
}
