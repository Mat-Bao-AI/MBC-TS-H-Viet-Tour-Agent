"use client";

// Xoá tour — trước đây KHÔNG có chức năng này (thiếu hẳn, không phải khó
// tìm). Cho xoá ở MỌI trạng thái kể cả đã gửi (quyết định đã chốt với user,
// backend không tự chặn) — bù lại bằng xác nhận 2 BƯỚC ở đây để giảm rủi ro
// bấm nhầm mất dữ liệu tour đang chạy thật.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

type Step = "closed" | "confirm1" | "confirm2";

export function DeleteTourButton({ tourId, tourName }: { tourId: string; tourName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("closed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirmDelete() {
    setBusy(true);
    setError(null);
    try {
      await api.deleteTour(tourId);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setStep("confirm1")}
        className="text-destructive hover:bg-destructive/10"
      >
        🗑️ Xoá tour
      </Button>

      {step !== "closed" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setStep("closed")}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-card p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {step === "confirm1" ? (
              <>
                <h2 className="text-lg font-bold">Xoá tour này?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  "{tourName}" cùng toàn bộ danh sách khách, lịch trình sẽ bị xoá.
                </p>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep("closed")}>
                    Huỷ
                  </Button>
                  <Button
                    size="sm"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => setStep("confirm2")}
                  >
                    Tiếp tục xoá
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold text-destructive">Không thể hoàn tác</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Xác nhận lần cuối — xoá xong sẽ KHÔNG lấy lại được, kể cả khi đã gửi thông báo cho khách.
                </p>
                {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep("closed")} disabled={busy}>
                    Huỷ
                  </Button>
                  <Button
                    size="sm"
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleConfirmDelete}
                    disabled={busy}
                  >
                    {busy ? "Đang xoá..." : "Xoá vĩnh viễn"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
