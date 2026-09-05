"use client";

// Tạo Tour mới — theo thiết kế Stitch "Tạo Tour mới" (2 khung upload kéo-thả
// + nút CTA lớn). Tài liệu lịch trình nhận TỐI ĐA 5 file (gộp thành 1 bộ
// nguồn duy nhất — AI đọc hết rồi hợp nhất, xem backend/app/api/v1/agent.py)
// để phục vụ cả trường hợp có nhiều tài liệu rời (vé máy bay, khách sạn,
// giấy mời, agenda...), không chỉ 1 file lịch trình tour truyền thống.
import { DragEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MAX_ITINERARY_FILES = 5;
const MAX_ITINERARY_FILE_SIZE_MB = 10;

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

function MultiDropzone({
  label,
  hint,
  accept,
  files,
  onChange,
  error,
}: {
  label: string;
  hint: string;
  accept: string;
  files: File[];
  onChange: (files: File[]) => void;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function addFiles(newFiles: FileList | File[]) {
    onChange([...files, ...Array.from(newFiles)]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeAt(index: number) {
    onChange(files.filter((_, i) => i !== index));
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
        <span className="text-xs text-muted-foreground">
          Kéo thả hoặc chọn file — tối đa {MAX_ITINERARY_FILES} file, mỗi file ≤{MAX_ITINERARY_FILE_SIZE_MB}MB
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center justify-between rounded-md bg-muted px-2.5 py-1.5 text-xs"
            >
              <span className="truncate">{f.name}</span>
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Bỏ ${f.name}`}
                className="ml-2 shrink-0 text-muted-foreground hover:text-destructive"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Yêu cầu #2: nói rõ giới hạn kỹ thuật để không ai kỳ vọng nhầm AI đọc
          được ảnh chụp lịch trình/agenda — chỉ đọc text thuần. */}
      <p className="text-xs text-muted-foreground">
        ℹ️ Hệ thống chỉ phân tích được <b>chữ (text)</b> trong file — chưa đọc được nội dung trong hình ảnh
        (ảnh chụp, ảnh chèn trong Word/PDF). Nếu tài liệu là ảnh chụp, hãy gõ lại thành văn bản trước khi tải lên.
      </p>
    </div>
  );
}

export default function CreateTourPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [itineraryFiles, setItineraryFiles] = useState<File[]>([]);
  const [guestListFile, setGuestListFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filesError, setFilesError] = useState<string | null>(null);

  function handleItineraryFilesChange(next: File[]) {
    if (next.length > MAX_ITINERARY_FILES) {
      setFilesError(`Chỉ được chọn tối đa ${MAX_ITINERARY_FILES} file — đã bỏ bớt file thừa.`);
      next = next.slice(0, MAX_ITINERARY_FILES);
    } else {
      const tooBig = next.find((f) => f.size > MAX_ITINERARY_FILE_SIZE_MB * 1024 * 1024);
      setFilesError(tooBig ? `File "${tooBig.name}" vượt quá ${MAX_ITINERARY_FILE_SIZE_MB}MB.` : null);
    }
    setItineraryFiles(next);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (itineraryFiles.length === 0) {
      setError("Cần chọn ít nhất 1 tài liệu lịch trình (PDF/DOCX/XLSX/TXT).");
      return;
    }
    if (itineraryFiles.some((f) => f.size > MAX_ITINERARY_FILE_SIZE_MB * 1024 * 1024)) {
      setError(`Có file vượt quá ${MAX_ITINERARY_FILE_SIZE_MB}MB — vui lòng bỏ bớt trước khi gửi.`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      if (name) formData.append("name", name);
      for (const f of itineraryFiles) formData.append("itinerary_files", f);
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

        <MultiDropzone
          label="Tài liệu lịch trình"
          hint="Tải lên 1-5 tài liệu để AI học hỏi và tạo lịch trình: lịch trình tour, vé máy bay, đặt phòng khách sạn, giấy mời, agenda hội thảo..."
          accept=".pdf,.docx,.xlsx,.txt"
          files={itineraryFiles}
          onChange={handleItineraryFilesChange}
          error={filesError}
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
