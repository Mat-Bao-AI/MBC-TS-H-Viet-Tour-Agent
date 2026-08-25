"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateTourPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [itineraryFile, setItineraryFile] = useState<File | null>(null);
  const [guestListFile, setGuestListFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!itineraryFile) {
      setError("Cần chọn tài liệu lịch trình (PDF/DOCX/XLSX/TXT).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      if (name) formData.append("name", name);
      formData.append("itinerary_file", itineraryFile);
      if (guestListFile) formData.append("guest_list_file", guestListFile);

      const result = await api.createTour(formData);
      router.push(`/tours/${result.id}/review`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Tạo tour mới</CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload tài liệu lịch trình thô — Agent AI sẽ tự động phân tích và tạo timeline chi tiết.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Tên tour (không bắt buộc)</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Tour Đà Lạt 3N2Đ tháng 9"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Tài liệu lịch trình <span className="text-destructive">*</span>
              </label>
              <Input
                type="file"
                accept=".pdf,.docx,.xlsx,.txt"
                onChange={(e) => setItineraryFile(e.target.files?.[0] ?? null)}
                required
              />
              <p className="text-xs text-muted-foreground">Hỗ trợ PDF, DOCX, XLSX, TXT</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Danh sách đoàn (không bắt buộc, file riêng)</label>
              <Input
                type="file"
                accept=".xlsx,.txt"
                onChange={(e) => setGuestListFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang tải lên..." : "Tải lên & phân tích"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
