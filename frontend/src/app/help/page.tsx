"use client";

// Trợ giúp — FAQ tĩnh viết theo ĐÚNG tính năng thật đã có trong app (không
// bịa tính năng chưa làm). Dùng <details>/<summary> gốc — accordion không
// cần JS, nhẹ, accessible sẵn.
import { useRouter } from "next/navigation";
import { restartOnboardingTour } from "@/components/onboarding-tour";
import { Button } from "@/components/ui/button";
import { BackIcon } from "@/components/navigation-icons";

type FaqItem = { q: string; a: React.ReactNode };
type FaqSection = { title: string; items: FaqItem[] };

const SECTIONS: FaqSection[] = [
  {
    title: "Tạo & xử lý tour",
    items: [
      {
        q: "Tạo tour mới thế nào?",
        a: "Vào Chuyến đi → Tạo tour mới. Bạn có thể tải tài liệu lịch trình (Word/PDF/Excel/TXT), có thể kèm danh sách khách, hoặc chọn Từ URL để nhập một đường link công khai. Agent AI sẽ đọc nguồn và dựng timeline để bạn kiểm tra trước khi gửi.",
      },
      {
        q: "Tạo tour từ URL cần lưu ý gì?",
        a: "URL cần là trang HTML hoặc PDF công khai có thông tin liên quan đến chuyến đi như điểm đến, tour tham khảo, lưu trú, điểm tham quan hoặc agenda du lịch. Chưa hỗ trợ link yêu cầu đăng nhập, mạng xã hội, Google Maps hoặc file riêng tư. Với cách tạo từ URL, cần nhập ngày đi và ngày về; ngày về không được trước ngày đi, còn tour trong ngày phải được xác nhận.",
      },
      {
        q: "Brave Search có bắt buộc khi tạo tour từ URL không?",
        a: "Không bắt buộc. Hệ thống vẫn tạo tour từ nội dung URL nếu chưa cấu hình Brave Search. Nếu có API key hợp lệ, Brave Search chỉ bổ sung thông tin tham khảo và hình ảnh; không thay thế nguồn URL người dùng nhập.",
      },
      {
        q: "Tour báo \"Lỗi\" thì làm sao?",
        a: "Mở tour → xem chi tiết lỗi ngay trên màn hình (thường do file hỏng, không đọc được, hoặc AI provider hết quota/sai key). Sửa xong file hoặc cấu hình rồi bấm \"Thử xử lý lại\".",
      },
      {
        q: "Tour đang \"Cần kiểm tra\" thì phải làm gì?",
        a: "Mở tour, kiểm tra timeline, ngày giờ, địa điểm, danh sách khách và chỉnh sửa nếu cần. Sau khi kiểm tra xong, bấm \"Xác nhận lịch trình\". Tour sẽ chuyển sang \"Sẵn sàng gửi\" và các nút gửi thông báo mới được mở.",
      },
      {
        q: "\"Sẵn sàng gửi\" có nghĩa là gì?",
        a: "Đây là trạng thái HDV đã chủ động xác nhận nội dung lịch trình sau khi kiểm tra. Nếu cần chỉnh sửa lại, bấm \"Sửa lại lịch trình\"; sau khi lưu thay đổi, tour sẽ quay về \"Cần kiểm tra\" và cần xác nhận lại.",
      },
      {
        q: "Khi nào tour chuyển sang \"Đã gửi\"?",
        a: "Sau khi có ít nhất một tin nhắn được gửi thành công qua Zalo, tour sẽ chuyển sang \"Đã gửi\". Việc gửi chạy nền nên có thể mất vài giây. Nếu chưa xác nhận lịch trình hoặc chưa gửi thành công, hệ thống sẽ không tự chuyển trạng thái.",
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
            Vào trang Review → mục \"Danh sách khách\" → bấm <b>\"Tải file mẫu\"</b> để tải file Excel mẫu (Họ
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
        a: "Trước hết hãy kiểm tra và bấm \"Xác nhận lịch trình\". Sau đó vào Cài đặt → Kết nối lại qua QR → đọc thông báo cảnh báo và xác nhận → quét mã bằng Zalo cá nhân trên điện thoại. Tài khoản này dùng để gửi tin, khác tài khoản đăng nhập ứng dụng.",
      },
      {
        q: "Gửi cho khách bị lỗi \"Không tìm thấy\"?",
        a: "Thường do SĐT sai, khách chưa dùng Zalo với SĐT đó, hoặc chưa là bạn bè Zalo với tài khoản đang dùng để gửi. Kiểm tra lại SĐT hoặc kết bạn Zalo với khách trước.",
      },
      {
        q: "Không muốn gửi Zalo cho ai thì sao?",
        a: "Dùng \"Sao chép link\" hoặc \"QR\" ở mục lịch trình công khai. Mã QR hiện trong popup ở giữa màn hình; bạn có thể gửi link qua SMS/email hoặc cho khách quét mã để tự xem lịch trình, không cần kết nối Zalo.",
      },
      {
        q: "Kết nối Zalo có ý nghĩa gì?",
        a: "Ứng dụng dùng thư viện zca-js để kết nối tài khoản Zalo cá nhân và gửi tin. Đây không phải tích hợp Zalo Official Account chính thức. Khi quét QR, bạn cần đọc và xác nhận cảnh báo; chủ tài khoản tự chịu trách nhiệm về phiên đăng nhập và dữ liệu cá nhân. Nếu muốn an toàn và đơn giản hơn, hãy dùng link hoặc QR lịch trình công khai.",
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
            <BackIcon />
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
