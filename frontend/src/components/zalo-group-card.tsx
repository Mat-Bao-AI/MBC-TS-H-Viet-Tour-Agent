"use client";

// "Gửi Zalo Group" — tính năng mới (Phase 2 cũ). Dùng API thật của zca-js
// (createGroup + sendMessage ThreadType.Group) qua backend, KHÔNG mock: tạo
// nhóm Zalo thật gồm các khách đã resolve được zalo_id, gửi tin 1 lần thay
// vì N tin 1-1.
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  tourId: string;
  groupId: string | null;
  zaloConnected: boolean;
  onGroupCreated: () => void;
};

export function ZaloGroupCard({ tourId, groupId, zaloConnected, onGroupCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setCreateError(null);
    setCreateResult(null);
    try {
      const res = await api.createTourGroup(tourId);
      setCreateResult(`Đã tạo nhóm — thêm ${res.added} khách${res.failed > 0 ? `, lỗi ${res.failed}` : ""}.`);
      onGroupCreated();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleSend() {
    if (!message.trim()) return;
    setSending(true);
    setSendError(null);
    setSendResult(null);
    try {
      await api.sendGroupMessage(tourId, message.trim());
      setSendResult("Đã gửi tới nhóm.");
      setMessage("");
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <p className="text-sm font-semibold">Nhóm Zalo</p>

      {!zaloConnected && (
        <p className="text-xs text-destructive">⚠️ Cần kết nối Zalo cá nhân trước khi tạo nhóm.</p>
      )}

      {!groupId ? (
        <>
          <p className="text-xs text-muted-foreground">
            Chưa có nhóm — tạo 1 nhóm Zalo gồm các khách có SĐT/Zalo ID để gửi thông báo chung 1 lần thay vì gửi
            riêng từng người.
          </p>
          {createError && <p className="text-xs text-destructive">{createError}</p>}
          {createResult && <p className="text-xs text-success">{createResult}</p>}
          <Button size="sm" onClick={handleCreate} disabled={creating || !zaloConnected} className="self-start">
            {creating ? "Đang tạo..." : "+ Tạo nhóm Zalo"}
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-success">✓ Đã có nhóm ({groupId})</p>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Nội dung gửi tới cả nhóm..."
            rows={3}
          />
          {sendError && <p className="text-xs text-destructive">{sendError}</p>}
          {sendResult && <p className="text-xs text-success">{sendResult}</p>}
          <Button size="sm" onClick={handleSend} disabled={sending || !message.trim()} className="self-start">
            {sending ? "Đang gửi..." : "▶ Gửi Zalo Group"}
          </Button>
        </>
      )}
    </div>
  );
}
