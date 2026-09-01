// Layout riêng cho route /t/[id] — nạp Public Sans + Inter (đúng font Stitch
// dùng cho screen "Lịch trình công khai", xem projects/8575116696704742662
// screen fed217df.../be26ebde... trên Stitch MCP). Material Symbols đã nạp
// chung ở root layout.tsx (dùng cho Sidebar mọi trang) nên không lặp lại ở
// đây nữa. KHÔNG đụng tới font Be Vietnam Pro của root layout cho phần chữ
// thường — trang công khai này cố ý có ngôn ngữ thiết kế riêng, tách biệt
// app nội bộ HDV.
export default function PublicTourLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;700&family=Inter:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  );
}
