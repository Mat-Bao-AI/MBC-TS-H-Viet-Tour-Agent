import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { AppChrome } from "@/components/app-chrome";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

// Font chuẩn design system Stitch — tối ưu riêng cho dấu tiếng Việt (xem
// docs/STITCH-DESIGN.md mục Typography).
const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "VietTour Agent Zalo",
  description: "Soạn timeline tour từ tài liệu thô và gửi thông báo qua Zalo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          <AppChrome>{children}</AppChrome>
        </AuthProvider>
      </body>
    </html>
  );
}
