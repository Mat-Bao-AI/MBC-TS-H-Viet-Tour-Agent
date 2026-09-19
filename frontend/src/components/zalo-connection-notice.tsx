"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ZaloConnectionNotice({ open, onCancel, onConfirm }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">⚠️</span>
          <div>
            <h2 className="text-lg font-bold">Lưu ý trước khi kết nối Zalo</h2>
            <p className="mt-1 text-sm text-muted-foreground">Vui lòng đọc và xác nhận trước khi quét mã QR.</p>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-sm leading-6">
          <section>
            <p className="font-semibold">Ứng dụng đang sử dụng công nghệ gì?</p>
            <p className="text-muted-foreground">
              Ứng dụng dùng <span className="font-medium text-foreground">zca-js</span>, một thư viện mã nguồn mở
              giấy phép MIT do cộng đồng phát triển để mô phỏng thao tác trên Zalo Web cho tài khoản cá nhân.
              Đây không phải API chính thức của Zalo/VNG và không có cam kết được Zalo bảo trợ hay công nhận.
            </p>
          </section>
          <section>
            <p className="font-semibold">Trách nhiệm khi kết nối</p>
            <p className="text-muted-foreground">
              Khi quét QR, bạn chủ động cấp quyền phiên đăng nhập Zalo cá nhân cho ứng dụng. Bạn xác nhận đã hiểu
              và tự chịu trách nhiệm về dữ liệu cá nhân, nội dung tin nhắn, người nhận và mọi rủi ro hạn chế/khoá tài
              khoản có thể phát sinh từ việc dùng tích hợp không chính thức.
            </p>
          </section>
          <section className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="font-semibold text-primary">Khuyến nghị an toàn hơn</p>
            <p className="text-muted-foreground">
              Với việc gửi lịch trình cho hành khách, nên dùng URL lịch trình công khai để họ tự xem. Cách này không
              cần kết nối Zalo cá nhân và không phải xử lý dữ liệu tài khoản Zalo của hành khách.
            </p>
          </section>
        </div>

        <label className="mt-5 flex cursor-pointer items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          <span>Tôi đã đọc, hiểu thông tin trên và tự chịu trách nhiệm khi tiếp tục kết nối Zalo.</span>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Huỷ</Button>
          <Button disabled={!confirmed} onClick={onConfirm}>Tôi hiểu, tiếp tục</Button>
        </div>
      </div>
    </div>
  );
}
