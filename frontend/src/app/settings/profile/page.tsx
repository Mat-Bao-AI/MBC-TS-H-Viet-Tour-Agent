"use client";

// Hồ sơ cá nhân (Phase 3) — HDV tự sửa thông tin liên hệ + avatar. Thông
// tin này (tên/SĐT/Zalo) được ghép vào chữ ký cuối tin nhắn Zalo gửi khách
// (backend/app/agents/zalo_format_agent.py) — không phải chỉ để trưng, ảnh
// hưởng trực tiếp tới nội dung khách nhận được.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { BackIcon } from "@/components/navigation-icons";

export default function ProfilePage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [facebook, setFacebook] = useState(user?.facebook_url ?? "");
  const [zalo, setZalo] = useState(user?.zalo_link ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarRefreshKey, setAvatarRefreshKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Cần nhập họ tên.");
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await api.updateMe({
        full_name: fullName.trim(),
        phone_number: phone.trim(),
        facebook_url: facebook.trim(),
        zalo_link: zalo.trim(),
      });
      await refreshUser();
      setNotice("Đã lưu hồ sơ.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarBusy(true);
    setError(null);
    try {
      await api.setMyAvatar(file);
      await refreshUser();
      setAvatarRefreshKey((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    setError(null);
    try {
      await api.clearMyAvatar();
      await refreshUser();
      setAvatarRefreshKey((v) => v + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAvatarBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
          <BackIcon />
        </button>
        <h1 className="text-xl font-bold">Hồ sơ cá nhân</h1>
      </div>

      <p className="text-xs text-muted-foreground">
        Tên và thông tin liên hệ ở đây sẽ hiện trong chữ ký cuối tin nhắn Zalo gửi cho khách của các tour bạn phụ
        trách.
      </p>

      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
        <UserAvatar
          userId={user.id}
          fullName={user.full_name}
          hasAvatar={user.has_avatar}
          refreshKey={avatarRefreshKey}
          className="h-16 w-16 rounded-full object-cover"
        />
        <div className="flex gap-2">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={avatarBusy}>
            {user.has_avatar ? "Đổi ảnh" : "Tải ảnh lên"}
          </Button>
          {user.has_avatar && (
            <Button variant="outline" size="sm" onClick={handleRemoveAvatar} disabled={avatarBusy}>
              Xoá ảnh
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">Họ tên *</span>
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">Số điện thoại</span>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="090xxxxxxx" />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">Link Zalo cá nhân</span>
          <Input value={zalo} onChange={(e) => setZalo(e.target.value)} placeholder="https://zalo.me/..." />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="font-medium text-foreground">Link Facebook</span>
          <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {notice && <p className="text-sm text-success">{notice}</p>}

        <Button onClick={handleSave} disabled={saving} className="mt-1 self-start">
          {saving ? "Đang lưu..." : "Lưu hồ sơ"}
        </Button>
      </div>
    </div>
  );
}
