// Layout riêng cho route /t/[id] — nạp Material Symbols + Public Sans + Inter
// (đúng font Stitch dùng cho screen "Lịch trình công khai", xem
// projects/8575116696704742662 screen fed217df.../be26ebde... trên Stitch MCP)
// KHÔNG đụng tới font Be Vietnam Pro của root layout — trang công khai này cố
// ý có ngôn ngữ thiết kế riêng, tách biệt app nội bộ HDV.
export default function PublicTourLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:FILL@0..1&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;700&family=Inter:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
