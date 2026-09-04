"use client";

// Quản lý người dùng — CHỈ Admin. Tách từ app/settings/users/page.tsx (route
// cũ đã gộp vào tab "Người dùng" của /settings/system, xem trang đó).
// Tạo tài khoản HDV (mật khẩu tạm Admin tự đặt, tự gửi cho HDV qua kênh khác
// — không có hạ tầng gửi email), đổi role/khoá tài khoản, reset mật khẩu.
// Backend tự chặn 403 cho User thường (app/api/v1/admin_users.py).
import { useEffect, useState } from "react";
import { api, UserOut, UserRole } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const EMPTY_FORM = { email: "", password: "", full_name: "", phone_number: "", role: "user" as UserRole };

export function UserManagementPanel() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState<UserOut[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetPasswordId, setResetPasswordId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<UserOut | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddSubmit() {
    if (!form.email.trim() || !form.password.trim() || !form.full_name.trim()) {
      setAddError("Cần nhập đủ email, mật khẩu, họ tên.");
      return;
    }
    if (form.password.length < 8) {
      setAddError("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      await api.createUser({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        phone_number: form.phone_number.trim() || undefined,
        role: form.role,
      });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(u: UserOut) {
    setBusyId(u.id);
    try {
      await api.updateUser(u.id, { is_active: !u.is_active });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleChangeRole(u: UserOut, role: UserRole) {
    setBusyId(u.id);
    try {
      await api.updateUser(u.id, { role });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  }

  async function handleResetPassword(userId: string) {
    if (newPassword.length < 8) {
      alert("Mật khẩu tối thiểu 8 ký tự.");
      return;
    }
    setBusyId(userId);
    try {
      await api.resetUserPassword(userId, newPassword);
      setResetPasswordId(null);
      setNewPassword("");
      alert("Đã đặt mật khẩu mới — tự gửi cho user qua kênh khác (SMS/Zalo...).");
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
          + Thêm tài khoản
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {users === null && !error && <p className="text-sm text-muted-foreground">Đang tải...</p>}

      {users && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Họ tên</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Vai trò</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 font-medium">
                    {u.full_name}
                    {u.id === me?.id && <span className="ml-1.5 text-xs text-muted-foreground">(bạn)</span>}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email}</td>
                  <td className="px-3 py-2">
                    <select
                      value={u.role}
                      disabled={busyId === u.id}
                      onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                    >
                      <option value="user">HDV</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => handleToggleActive(u)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.is_active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                      }`}
                    >
                      {u.is_active ? "Đang hoạt động" : "Đã khoá"}
                    </button>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {resetPasswordId === u.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="password"
                          placeholder="Mật khẩu mới"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-7 w-32 text-xs"
                        />
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => handleResetPassword(u.id)}
                        >
                          Lưu
                        </button>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={() => {
                            setResetPasswordId(null);
                            setNewPassword("");
                          }}
                        >
                          Huỷ
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => setResetPasswordId(u.id)}
                        >
                          Đặt lại mật khẩu
                        </button>
                        <button
                          type="button"
                          className="text-xs text-destructive hover:underline"
                          onClick={() => {
                            setDeleteError(null);
                            setDeleteTarget(u);
                          }}
                        >
                          Xoá
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Xoá tài khoản?</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Bạn sắp xoá vĩnh viễn tài khoản <span className="font-medium text-foreground">{deleteTarget.full_name}</span>{" "}
                ({deleteTarget.email}). Hành động này <span className="font-medium text-destructive">không thể hoàn tác</span>.
              </p>
              {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteError(null);
                  }}
                  disabled={deleting}
                >
                  Huỷ
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? "Đang xoá..." : "Xoá vĩnh viễn"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Thêm tài khoản</CardTitle>
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
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                type="password"
                placeholder="Mật khẩu tạm * (tối thiểu 8 ký tự)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Input
                placeholder="Số điện thoại"
                value={form.phone_number}
                onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
              />
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="user">HDV</option>
                <option value="admin">Admin</option>
              </select>
              {addError && <p className="text-sm text-destructive">{addError}</p>}
              <Button onClick={handleAddSubmit} disabled={saving} className="mt-1">
                {saving ? "Đang lưu..." : "Tạo tài khoản"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
