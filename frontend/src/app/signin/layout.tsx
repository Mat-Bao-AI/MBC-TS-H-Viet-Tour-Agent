// Nạp Material Symbols cho icon mail/lock/visibility trên form đăng nhập
// (screen thật lấy từ Stitch MCP, project 8575116696704742662, screen
// "Đăng nhập Nội bộ (Internal Login)"). Be Vietnam Pro đã có sẵn ở root
// layout, không cần nạp lại.
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
