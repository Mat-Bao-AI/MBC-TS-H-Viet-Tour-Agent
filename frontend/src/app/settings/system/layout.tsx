// Nạp Material Symbols cho trang Cài đặt hệ thống (icon smart_toy/send/
// check_circle...) — cùng cách làm với app/signin/layout.tsx, app/t/[id]/layout.tsx.
export default function SystemSettingsLayout({ children }: { children: React.ReactNode }) {
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
