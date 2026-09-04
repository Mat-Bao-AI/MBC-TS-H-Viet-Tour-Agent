"use client";

// Tour hướng dẫn tương tác lần đầu đăng nhập — highlight ngay trên UI thật
// (không phải ảnh chụp/mô phỏng), dùng react-joyride v3. Gói gọn trong 1
// trang (Dashboard) để không cần điều hướng liên trang phức tạp — mọi anchor
// (nút "Tạo tour đầu tiên", 3 mục điều hướng) đều có sẵn ngay khi vào
// Dashboard, không phụ thuộc dữ liệu tour đã có hay chưa.
//
// Mount 1 LẦN DUY NHẤT ở AppChrome (không phải mỗi trang) — mọi anchor cần
// tìm đều nằm trong Sidebar/BottomNav (luôn render sẵn) hoặc Dashboard, nên
// không cần Joyride sống lại theo route.
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Joyride, STATUS, type EventData, type Step } from "react-joyride";
import { api } from "@/lib/api";

const DEFAULT_COMPANY_NAME = "VietTour Agent";

const SEEN_KEY = "vta_onboarding_seen";
const RESTART_EVENT = "vta:restart-onboarding";

// Sidebar (desktop) và BottomNav (mobile) CÙNG tồn tại trong DOM lúc nào
// cũng vậy (chỉ ẩn/hiện bằng CSS theo breakpoint, xem sidebar.tsx/
// bottom-nav.tsx) — phải tự chọn đúng cái đang HIỂN THỊ (offsetParent khác
// null), querySelector thường sẽ luôn trúng bản desktop dù đang bị ẩn.
function visibleTarget(...selectors: string[]): () => HTMLElement | null {
  return () => {
    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.offsetParent !== null) return el;
    }
    return null;
  };
}

function buildSteps(companyName: string): Step[] {
  return [
  {
    target: "body",
    placement: "center",
    title: `Chào mừng đến ${companyName} 👋`,
    content: "Xem nhanh 4 khu vực chính trong app — bấm \"Bỏ qua\" bất kỳ lúc nào, có thể xem lại ở trang Trợ giúp.",
  },
  {
    target: visibleTarget('[data-tour="create-tour-cta"]'),
    title: "Tạo tour đầu tiên",
    content: "Tải lên tài liệu lịch trình thô (Word/PDF/Excel) — Agent AI tự đọc và dựng timeline chi tiết cho bạn.",
  },
  {
    target: visibleTarget('[data-tour="nav-tours-desktop"]', '[data-tour="nav-tours-mobile"]'),
    title: "Chuyến đi",
    content: "Toàn bộ tour bạn đã tạo nằm ở đây — xem lại lịch trình, danh sách khách, xếp phòng bất kỳ lúc nào.",
  },
  {
    target: visibleTarget('[data-tour="nav-settings-desktop"]', '[data-tour="nav-settings-mobile"]'),
    title: "Cài đặt",
    content: "Kết nối tài khoản Zalo để gửi tin, xem lại Trợ giúp, hoặc (Admin) cấu hình nhà cung cấp AI.",
  },
  ];
}

const VI_LOCALE = {
  back: "Quay lại",
  close: "Đóng",
  last: "Xong",
  next: "Tiếp",
  nextWithProgress: "Tiếp ({current} / {total})",
  open: "Mở hộp thoại",
  skip: "Bỏ qua",
};

export function OnboardingTour() {
  const pathname = usePathname();
  const [run, setRun] = useState(false);
  const [companyName, setCompanyName] = useState(DEFAULT_COMPANY_NAME);

  useEffect(() => {
    api
      .getCompanyInfo()
      .then((info) => setCompanyName(info.name))
      .catch(() => {
        // giữ tên mặc định nếu chưa đăng nhập/lỗi mạng — không chặn tour hiện.
      });
  }, []);

  function start() {
    // Chờ 1 nhịp cho Dashboard render xong (nav + nút CTA đã có trong DOM)
    // trước khi Joyride đi tìm target — tránh miss ngay bước đầu.
    setTimeout(() => setRun(true), 600);
  }

  useEffect(() => {
    // Bước 2 (nút "Tạo tour đầu tiên") chỉ tồn tại ở Dashboard — tự bật CHỈ
    // khi đang ở đó, tránh tour mở giữa chừng 1 trang khác không liên quan.
    if (pathname !== "/dashboard") return;
    try {
      if (!localStorage.getItem(SEEN_KEY)) start();
    } catch {
      // localStorage không khả dụng (private mode chặn...) — không tự bật.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    function onRestart() {
      try {
        localStorage.removeItem(SEEN_KEY);
      } catch {
        // best-effort
      }
      start();
    }
    window.addEventListener(RESTART_EVENT, onRestart);
    return () => window.removeEventListener(RESTART_EVENT, onRestart);
  }, []);

  function handleEvent(data: EventData) {
    if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
      setRun(false);
      try {
        localStorage.setItem(SEEN_KEY, "1");
      } catch {
        // best-effort — không chặn việc đóng tour nếu lưu lỗi
      }
    }
  }

  return (
    <Joyride
      steps={buildSteps(companyName)}
      run={run}
      continuous
      onEvent={handleEvent}
      locale={VI_LOCALE}
      options={{
        zIndex: 10000,
        primaryColor: "#16a34a",
        showProgress: true,
        buttons: ["back", "close", "skip", "primary"],
      }}
    />
  );
}

/** Gọi từ bất kỳ trang nào (vd nút "Xem lại hướng dẫn" ở /help) để bật lại tour. */
export function restartOnboardingTour() {
  window.dispatchEvent(new Event(RESTART_EVENT));
}
