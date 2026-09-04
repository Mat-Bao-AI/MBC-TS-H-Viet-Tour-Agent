"use client";

// AuthProvider — quản lý phiên đăng nhập app THẬT (JWT), khác Zalo QR login
// (đó là kết nối tài khoản Zalo cá nhân dùng để gửi tin, xem /login). Bọc
// TOÀN BỘ app ở root layout.tsx; AppChrome dùng useAuth() để chặn truy cập
// khi chưa đăng nhập (trừ /signin và /t/[id] — trang công khai không cần
// biết gì về phiên đăng nhập).
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getStoredToken, setStoredToken, UserOut } from "@/lib/api";

type AuthState = {
  user: UserOut | null;
  loading: boolean; // đang xác thực token đã lưu lúc mount — chưa biết kết quả
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Gọi lại sau khi HDV tự sửa hồ sơ/avatar (Phase 3, /settings/profile) —
   * để Sidebar/AppChrome phản ánh ngay, không cần reload trang. */
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .getMe()
      .then(setUser)
      .catch(() => setStoredToken(null)) // token hỏng/hết hạn — xoá, useAuth() sẽ đưa về /signin
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    setStoredToken(data.access_token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setUser(await api.getMe());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() phải gọi trong <AuthProvider>");
  return ctx;
}
