"use client";

// Về ứng dụng — tên hiển thị = tên công ty (white-label, xem
// lib/use-company-name.ts), mô tả/phiên bản tĩnh + đơn vị phát triển thật
// (tĩnh, theo yêu cầu: "Mắt Bão Corporation") + changelog THẬT, Admin tự
// nhập qua UI (GET mở cho mọi User, POST/PUT/DELETE chỉ Admin — xem
// backend/app/api/v1/changelog.py).
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ChangelogEntry } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCompanyName } from "@/lib/use-company-name";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Khớp version trong backend/app/main.py + frontend/package.json — cập nhật
// thủ công cả 3 chỗ khi bump version (chưa có cơ chế đọc version tự động
// dùng chung giữa 2 service).
const APP_VERSION = "0.1.0";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function AboutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const companyName = useCompanyName();
  const isAdmin = user?.role === "admin";

  const [entries, setEntries] = useState<ChangelogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    try {
      setEntries(await api.listChangelog());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAddSubmit() {
    if (!title.trim()) {
      setAddError("Cần nhập tiêu đề.");
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      await api.createChangelogEntry({ title: title.trim(), description: description.trim() || undefined });
      setTitle("");
      setDescription("");
      setShowAddForm(false);
      load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(entryId: string) {
    if (!confirm("Xoá mục changelog này?")) return;
    setDeletingId(entryId);
    try {
      await api.deleteChangelogEntry(entryId);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
          ←
        </button>
        <h1 className="text-xl font-bold">Về ứng dụng</h1>
      </div>

      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card p-6 text-center">
        <span className="text-3xl">🧭</span>
        <p className="text-lg font-bold text-primary">{companyName}</p>
        <p className="text-sm text-muted-foreground">
          Agent AI hỗ trợ hướng dẫn viên du lịch soạn lịch trình và gửi thông báo cho khách qua Zalo.
        </p>
        <div className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span>Phiên bản {APP_VERSION}</span>
          <span>Phát triển bởi Mắt Bão Corporation</span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Lịch sử cập nhật
          </h2>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
              + Thêm mục
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {entries === null && !error && <p className="text-sm text-muted-foreground">Đang tải...</p>}

        {entries && entries.length === 0 && (
          <p className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            Chưa có mục cập nhật nào.
          </p>
        )}

        {entries && entries.length > 0 && (
          <div className="flex flex-col gap-2">
            {entries.map((e) => (
              <div key={e.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{e.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(e.created_at)}</p>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="shrink-0 text-xs text-destructive hover:underline disabled:opacity-50"
                      disabled={deletingId === e.id}
                      onClick={() => handleDelete(e.id)}
                    >
                      Xoá
                    </button>
                  )}
                </div>
                {e.description && <p className="mt-1.5 text-sm text-muted-foreground">{e.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Thêm mục changelog</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                ✕
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Input placeholder="Tiêu đề *" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              <Textarea
                placeholder="Mô tả (tuỳ chọn)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
              {addError && <p className="text-sm text-destructive">{addError}</p>}
              <Button onClick={handleAddSubmit} disabled={saving} className="mt-1">
                {saving ? "Đang lưu..." : "Lưu"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
