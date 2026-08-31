"use client";

// Đăng nhập tài khoản APP thật (Admin/HDV) — khác /login (đó là quét QR kết
// nối Zalo cá nhân dùng để GỬI tin, xem backend app/api/v1/auth.py). Không
// có form đăng ký — Admin tạo tài khoản HDV, tài khoản Admin đầu tiên được
// backend tự tạo lúc khởi động (SEED_ADMIN_EMAIL, xem app/core/seed.py).
//
// UI lấy nguyên cấu trúc từ screen thật generate qua Stitch MCP (project
// 8575116696704742662, screen "Đăng nhập Nội bộ (Internal Login)",
// projects/.../screens/e397b686401842bc9f36e2d96219a3f8) — màu/spacing dùng
// design tokens đã có sẵn trong globals.css (bg-background/text-primary/
// border-border/bg-card khớp đúng bg-surface/text-primary/border-outline-
// variant/bg-surface-container-lowest bên Stitch, cùng 1 design system).
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInPageInner />
    </Suspense>
  );
}

function SignInPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground antialiased md:p-10">
      <main className="flex w-full max-w-md flex-1 flex-col items-center justify-center">
        <header className="mb-8 flex w-full flex-col items-center text-center">
          <h1 className="mb-1 text-2xl font-bold tracking-tight text-primary">VietTour Agent</h1>
          <p className="text-sm text-muted-foreground">Đăng nhập để quản lý tour</p>
        </header>

        <form onSubmit={handleSubmit} className="relative z-10 flex w-full flex-col gap-6 rounded-xl border border-border bg-card p-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-bold text-foreground">
              Email
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 text-muted-foreground">mail</span>
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Nhập email nội bộ"
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-bold text-foreground">
              Mật khẩu
            </label>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 text-muted-foreground">lock</span>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-10 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus:outline-none"
              >
                <span className="material-symbols-outlined">{showPassword ? "visibility_off" : "visibility"}</span>
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 flex w-full items-center justify-center rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>
      </main>

      <footer className="mt-auto w-full py-6 text-center">
        <p className="text-xs text-muted-foreground">Tài khoản do Admin cấp</p>
      </footer>
    </div>
  );
}
