"use client";

// Thương hiệu công ty (Phase 2) — tên + logo, dùng chung toàn workspace.
// Hiện ở Sidebar/`/signin`/`/t/[id]` (xem lib/api.ts getCompanyInfo) và làm
// chữ ký cuối tin nhắn Zalo (Phase 3, backend/app/agents/zalo_format_agent.py).
import { useEffect, useRef, useState } from "react";
import { api, API_BASE, CompanyInfo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompassIcon } from "@/components/navigation-icons";

export function CompanyBrandingCard() {
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [name, setName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cacheBust, setCacheBust] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    try {
      const data = await api.getCompanyInfo();
      setInfo(data);
      setName(data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSaveName() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.setCompanyInfo(name.trim());
      setEditingName(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await api.setCompanyLogo(file);
      setCacheBust((v) => v + 1);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveLogo() {
    setBusy(true);
    setError(null);
    try {
      await api.clearCompanyLogo();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!info) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">storefront</span>
        <span className="font-semibold">Thương hiệu công ty</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Hiện ở menu chính, trang đăng nhập, trang lịch trình khách xem — và làm chữ ký cuối tin nhắn Zalo gửi khách.
      </p>

      <div className="flex items-center gap-3">
        {info.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`${API_BASE}${info.logo_url}?v=${cacheBust}`}
            alt="Logo công ty"
            className="h-14 w-14 rounded-md border border-border object-contain bg-white"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border text-2xl">
            <CompassIcon />
          </div>
        )}
        <div className="flex gap-2">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
            {info.logo_url ? "Đổi logo" : "Tải logo lên"}
          </Button>
          {info.logo_url && (
            <Button variant="outline" size="sm" onClick={handleRemoveLogo} disabled={busy}>
              Xoá logo
            </Button>
          )}
        </div>
      </div>

      {editingName ? (
        <div className="flex items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
          <Button size="sm" onClick={handleSaveName} disabled={busy}>
            Lưu
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingName(false);
              setName(info.name);
            }}
            disabled={busy}
          >
            Huỷ
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-sm">Tên công ty: {info.name}</span>
          <button
            type="button"
            className="text-xs text-primary hover:underline"
            onClick={() => setEditingName(true)}
          >
            Sửa
          </button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
