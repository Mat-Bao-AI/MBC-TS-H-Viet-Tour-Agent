"use client";

// Trợ giúp — FAQ tĩnh viết theo ĐÚNG tính năng thật đã có trong app (không
// bịa tính năng chưa làm). Dùng <details>/<summary> gốc — accordion không
// cần JS, nhẹ, accessible sẵn.
import { useRouter } from "next/navigation";
import { restartOnboardingTour } from "@/components/onboarding-tour";
import { Button } from "@/components/ui/button";

type FaqItem = { q: string; a: React.ReactNode };
type FaqSection = { title: string; items: FaqItem[] };

const SECTIONS: FaqSection[] = [
  {
    title: "Tạo & xử lý tour",
    items: [
      {
        q: "Tạo tour mới thế nào?",
        a: "Vào Dashboard hoặc menu → \"Tạo tour\" → tải lên tài liệu lịch trình thô (Word/PDF/Excel), có thể kèm danh sách khách. Agent AI tự đọc và dựng timeline chi tiết theo từng mốc giờ — không cần gõ tay.",
      },
      {
        q: "Tour báo \"Lỗi\" thì làm sao?",
        a: "Mở tour → xem chi tiết lỗi ngay trên màn hình (thường do file hỏng, không đọc được, hoặc AI provider hết quota/sai key). Sửa xong file hoặc cấu hình rồi bấm \"Thử xử lý lại\".",
      },
      {
        q: "Tour đang \"Chờ duyệt\" mãi, làm sao chuyển sang \"Đã gửi\"?",
        a: "Không cần bấm nút riêng — chỉ cần gửi thông báo thành công cho ít nhất 1 khách (qua Zalo, gửi nhóm, hoặc cập nhật nhanh), tour tự động chuyển \"Đã gửi\".",
      },
      {
        q: "Xoá tour tạo nhầm/trùng thế nào?",
        a: "Vào trang chi tiết tour (Review) → nút \"🗑️ Xoá tour\" ở góc trên → xác nhận 2 lần. Xoá vĩnh viễn, không hoàn tác được — kể cả tour đã gửi thông báo cho khách.",
      },
    ],
  },
  {
    title: "Danh sách khách",
    items: [
      {
        q: "Import danh sách khách theo mẫu nào?",
        a: (
          <>
            Vào trang Review → mục \"Danh sách khách\" → bấm <b>\"📄 Tải file mẫu\"</b> để tải file Excel mẫu (Họ
            tên, Tuổi, SĐT, Nhóm đi cùng, Ghi chú ăn uống). Không bắt buộc đúng khuôn — AI đọc tự do cả
            Word/PDF/Excel/TXT — nhưng càng nhiều cột như <b>Tuổi</b>/<b>Nhóm đi cùng</b> thì xếp phòng tự động
            càng chính xác.
          </>
        ),
      },
      {
        q: "\"Nhóm đi cùng\" là gì, điền sao cho đúng?",
        a: "Đặt CÙNG 1 nhãn (vd \"Gia đình anh Long\") cho những khách đi chung 1 phòng — dùng để xếp phòng thông minh sau này. Khách đi 1 mình có thể để trống.",
      },
      {
        q: "Thêm/sửa/xoá khách sau khi đã import được không?",
        a: "Được — bấm \"+ Thêm khách\" để thêm tay từng người, hoặc bấm \"Sửa\"/\"Xoá\" ngay trên từng dòng trong bảng.",
      },
    ],
  },
  {
    title: "Xếp phòng thông minh",
    items: [
      {
        q: "Xếp phòng tự động hoạt động thế nào?",
        a: "Trước tiên khai báo các loại phòng khách sạn có sẵn (tên, sức chứa, số lượng) ở mục \"Loại phòng\". Sau đó bấm \"🤖 Tự động xếp phòng\" — hệ thống gom khách theo Nhóm đi cùng, chọn loại phòng vừa đủ nhất cho từng nhóm (gia đình 3 người → phòng lớn, 2 người đi chung → phòng đôi...).",
      },
      {
        q: "Vì sao có nhóm báo \"chưa xếp được\"?",
        a: "Khi không còn loại phòng nào đủ sức chứa hoặc đã hết tồn kho cho nhóm đó — lý do cụ thể hiện ngay trong kết quả. Thêm/sửa loại phòng rồi bấm xếp lại.",
      },
      {
        q: "Kết quả xếp phòng có phải số phòng thật không?",
        a: "Không — đây chỉ là LOẠI phòng gợi ý. Số phòng thật (cột \"Phòng\") do HDV tự điền tay sau khi khách sạn xác nhận lúc check-in, không bị thuật toán đụng tới.",
      },
    ],
  },
  {
    title: "Gửi thông báo qua Zalo",
    items: [
      {
        q: "Cần chuẩn bị gì trước khi gửi Zalo?",
        a: "Vào Cài đặt → \"Kết nối lại qua QR\" → quét mã bằng Zalo cá nhân trên điện thoại. Tài khoản này dùng để GỬI TIN, khác tài khoản đăng nhập app.",
      },
      {
        q: "Gửi cho khách bị lỗi \"Không tìm thấy\"?",
        a: "Thường do SĐT sai, khách chưa dùng Zalo với SĐT đó, hoặc chưa là bạn bè Zalo với tài khoản đang dùng để gửi. Kiểm tra lại SĐT hoặc kết bạn Zalo với khách trước.",
      },
      {
        q: "Không muốn gửi Zalo cho ai thì sao?",
        a: "Dùng \"🔗 Sao chép link\" hoặc \"📱 QR\" ở mục lịch trình công khai — gửi link/QR này qua bất kỳ kênh nào (SMS, email, in giấy...), khách tự mở xem không cần kết nối gì.",
      },
    ],
  },
];

export default function HelpPage() {
  const router = useRouter();

  function handleReplayTour() {
    // Tour anchor vào nút "Tạo tour đầu tiên" chỉ có ở Dashboard — điều
    // hướng về đó trước rồi mới bật lại (xem components/onboarding-tour.tsx).
    router.push("/dashboard");
    setTimeout(() => restartOnboardingTour(), 400);
  }

  return (
    <div className="flex flex-col gap-5 pt-2 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
            ←
          </button>
          <h1 className="text-xl font-bold">Trợ giúp</h1>
        </div>
        <Button variant="outline" size="sm" onClick={handleReplayTour}>
          ▶ Xem lại hướng dẫn
        </Button>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</h2>
          <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-card">
            {section.items.map((item) => (
              <details key={item.q} className="group px-4 py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                  {item.q}
                  <span className="ml-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                    ▾
                  </span>
                </summary>
                <div className="mt-2 text-sm text-muted-foreground">{item.a}</div>
              </details>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
