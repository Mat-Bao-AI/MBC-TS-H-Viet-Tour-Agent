import { redirect } from "next/navigation";

// Danh sách tour (dashboard) đã implement ở "/" (app/page.tsx) — route này giữ
// đúng theo cấu trúc thư mục trong tài liệu sản phẩm, redirect để tránh trùng code.
export default function DashboardPage() {
  redirect("/");
}
