"use client";

// Tạo Tour mới — theo thiết kế Stitch "Tạo Tour mới" (2 khung upload kéo-thả
// + nút CTA lớn). Giữ nguyên logic upload/agent thật (POST /tours), chỉ đổi
// giao diện.
import { DragEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Dropzone({
  label,
  hint,
  accept,
  file,
  onChange,
}: {
  label: string;
  hint: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onChange(dropped);
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center gap-1 rounded-md border-2 border-dashed py-6 text-center transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <span className="text-2xl text-primary">☁️⬆</span>
        <span className="text-sm font-medium text-primary">Nhấn để tải lên</span>
        <span className="text-xs text-muted-foreground">Kéo thả hoặc chọn file</span>
        <span className="mt-1 text-xs font-medium">{file ? file.name : "Chưa chọn file"}</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

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
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
          ←
        </button>
        <h1 className="text-lg font-bold">Tạo Tour mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Tên tour (không bắt buộc)</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Tour Đà Lạt 3N2Đ tháng 9"
          />
        </div>

        <Dropzone
          label="Tài liệu lịch trình tour"
          hint="Tải lên lịch trình mẫu để AI học hỏi và tạo lịch trình tương tự."
          accept=".pdf,.docx,.xlsx,.txt"
          file={itineraryFile}
          onChange={setItineraryFile}
        />

        <Dropzone
          label="Danh sách khách hàng"
          hint="Cung cấp danh sách để AI tự động phân bổ phòng và ghi chú đặc biệt."
          accept=".xlsx,.txt"
          file={guestListFile}
          onChange={setGuestListFile}
        />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting} size="lg" className="w-full">
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              Agent đang phân tích tài liệu...
            </span>
          ) : (
            "✨ Agent AI phân tích & tạo lịch trình"
          )}
        </Button>
      </form>
    </div>
  );
}
