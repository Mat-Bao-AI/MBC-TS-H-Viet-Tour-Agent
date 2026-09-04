import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppChrome } from "@/components/app-chrome";
import { AuthProvider } from "@/lib/auth";
import { getCompanyInfoServer } from "@/lib/server-api";
import "./globals.css";

// Font chuẩn design system Stitch — tối ưu riêng cho dấu tiếng Việt (xem
// docs/STITCH-DESIGN.md mục Typography).
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});

// Tiêu đề tab trình duyệt = tên công ty (white-label) — fetch server-side vì
// đây là root layout metadata, chạy trước khi client có company info.
export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanyInfoServer();
  return {
    title: company?.name ?? "VietTour Agent Zalo",
    description: "Soạn timeline tour từ tài liệu thô và gửi thông báo qua Zalo",
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      {/* Material Symbols — dùng trong Sidebar (components/sidebar.tsx) và mọi
          nơi khác cần icon nhất quán với thiết kế Stitch desktop. Nạp ở root
          vì Sidebar hiện trên MỌI trang đã đăng nhập, không riêng 1 route. */}
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&display=swap"
        rel="stylesheet"
      />
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <AppChrome>{children}</AppChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
