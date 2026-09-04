"use client";

// Tên công ty hiển thị khắp app (header mobile, trang Về ứng dụng, đăng nhập
// Zalo...) — rơi về DEFAULT_COMPANY_NAME nếu chưa cấu hình/lỗi mạng. Chỉ
// dùng cho các vị trí CHƯA có sẵn fetch company info riêng (Sidebar/signin/
// tour-public-client tự fetch, không đổi để tránh xáo trộn code đang chạy).
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export const DEFAULT_COMPANY_NAME = "VietTour Agent";

export function useCompanyName(): string {
  const [name, setName] = useState(DEFAULT_COMPANY_NAME);

  useEffect(() => {
    api
      .getCompanyInfo()
      .then((info) => setName(info.name))
      .catch(() => {
        // giữ tên mặc định — best-effort, không chặn render trang.
      });
  }, []);

  return name;
}
