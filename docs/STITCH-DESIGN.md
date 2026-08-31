# Thiết kế nguồn — Google Stitch

> Nguồn duy nhất (source of truth) cho giao diện. Kéo trực tiếp qua MCP `stitch`
> ngày 2026-08-31 từ project **"Viet Tour Agent Zalo"**
> (`projects/8575116696704742662`). Không tự chế thêm màu/spacing ngoài file này.

## 8 màn hình đã thiết kế (đủ, không còn khoảng trống)

| # | Tên màn hình (Stitch) | Screen ID | Ánh xạ trang | Trạng thái |
|---|---|---|---|---|
| 1 | Màn hình Tổng quan (Dashboard) | `a0a80176fced4026a94f95c32a7ee4fe` | `/dashboard` | Có sẵn từ đầu |
| 2 | Lịch trình Tour (Timeline) | `e46d00935ac846719f91a64f29a4c62a` | `/tours/[id]/review` | Có sẵn từ đầu |
| 3 | Danh sách khách & Zalo (RSVP) | `6bff2c1cb4da48d9a371f0351858a82e` | `/tours/[id]/dispatch` (phần khách) | Có sẵn từ đầu |
| 4 | Xem trước tin nhắn Zalo (Preview) | `bcb02fa90bca401492eaac59e3397aaa` | `/tours/[id]/dispatch` (phần preview) | Có sẵn từ đầu |
| 5 | Danh sách Tour (Tour List) | `d6b2f5a499fd478d819f3ec5d916721c` | `/tours` (**trang mới**) | Generate thêm 2026-08-31 |
| 6 | Cài đặt (Settings) | `895865a7ef1e4a53854bb67b03aff29d` | `/settings` (**trang mới**) | Generate thêm 2026-08-31 |
| 7 | Đăng nhập Zalo (QR Connection) | `0a99ec125b924e2eab9527988945b66c` | `/login` (**trang mới**, thay UI QR hiện có) | Generate thêm 2026-08-31 |
| 8 | Tạo Tour mới (Create Tour) | `3bc83d2e9ded407eb323408fada57387` | `/tours/create` (thay UI hiện có) | Generate thêm 2026-08-31 |

Lấy HTML code thật của từng màn hình qua `mcp__stitch__get_screen` khi bắt tay
dựng UI (bước Phase 2), không convert từ ảnh chụp.

## Ghi chú 4 màn mới generate

- **Danh sách Tour:** search bar, chip lọc trạng thái (Tất cả/Đang diễn ra/Sắp
  tới/Đã hoàn thành), card tour (ảnh, ngày, số khách, tiến độ gửi Zalo), FAB
  "+" tạo tour mới, bottom nav tab Tours active.
- **Cài đặt:** hồ sơ HDV, card trạng thái kết nối Zalo cá nhân (Đã kết nối /
  Ngắt kết nối), list Thông báo / Bảo mật & API key / Trợ giúp / Về ứng dụng /
  Ngôn ngữ, nút Đăng xuất đỏ ở cuối.
- **Đăng nhập Zalo (QR):** khung QR lớn giữa màn hình (ảnh QR thật generate
  runtime, không phải ảnh tĩnh), trạng thái "Đang chờ quét mã...", 3 bước
  hướng dẫn, nút "Làm mới mã QR". Không có bottom nav (trước khi đăng nhập).
- **Tạo Tour mới:** 2 khung upload kéo-thả (tài liệu lịch trình + danh sách
  khách), nút chính "Agent AI phân tích & tạo lịch trình".

## Ghi chú nội dung từng màn hình (từ ảnh chụp thật)

**1. Dashboard:** chào theo tên HDV, card tour đang chạy (ảnh, khoảng ngày,
tiến độ "Nộp: 2/3"), nút chính "Gửi thông báo nhanh", 3 thao tác nhanh (Tải
lịch trình / Danh sách khách / Thống kê Zalo), feed "Hoạt động gần đây", bottom
nav 3 tab: **Dashboard / Tours / Settings**.

**2. Timeline:** tab theo ngày (Ngày 1/2/3), mỗi mốc giờ có trạng thái (Đã hoàn
thành / Sắp diễn ra), **thời tiết inline** (vd "28°C, nắng đẹp" + ảnh) — khớp
`backend/app/services/weather_service.py` đã có sẵn nhưng chưa nối vào UI. Mỗi
event có nút Sửa + **Gửi Zalo riêng lẻ**. FAB cam "**Cập nhật nhanh**" nổi góc
dưới — đây chính là tính năng "Instant Quick-Update" trong README (chưa làm).

**3. Danh sách khách (RSVP):** ô tìm kiếm, 3 tab đếm số theo trạng thái (**Đã
gửi / Đã xem / Đã xác nhận**) — đây là "RSVP tracking dashboard" (chưa làm).
Mỗi khách: avatar, tên, ghế/phòng, badge Zalo, badge trạng thái riêng. 2 nút
đáy: "Gửi riêng khách chưa xem" + "Gửi thông báo toàn đoàn".

**4. Xem trước tin nhắn Zalo:** chọn người nhận, badge "AI Tối ưu", bong bóng
chat preview nội dung thật, nút "Chỉnh sửa nội dung", **"Gửi Zalo Group"** (gửi
nhóm — chưa làm, README liệt kê Phase 2), "Gửi Zalo cá nhân".

## Design tokens (rút từ Stitch DESIGN.md)

- **Màu chính:** Travel Blue `#0058bc` (primary, trùng tông Zalo) · Sun Orange
  `#fe9400` (secondary, dùng cho FAB/cảnh báo) · Leaf Green `#006b27`
  (tertiary, trạng thái thành công/đã xác nhận) · nền `#faf9fe`.
- **Font:** Be Vietnam Pro (duy nhất — tối ưu dấu tiếng Việt). Headline 32/24px
  bold, body 16/14px, label bold 12px.
- **Bo góc:** thẻ/input 0.5rem (8px), nút/chip 1rem hoặc pill.
- **Elevation:** không đổ bóng nặng — viền mảnh 1px `#c1c6d7` cho card cấp 1,
  bóng rất nhẹ (4px/12px, 5% đen) chỉ cho nút nổi/FAB.
- **Spacing:** nhịp 8px, gutter mobile 16px / desktop 40px, khoảng cách giữa
  mốc timeline 24px.
- **Component chuẩn:** Tour Item Card, Timeline Event (line dọc 2px nối node
  tròn), Status Badge (pill, nền 10% opacity), RSVP step-indicator (Gray →
  Blue → Green).

Toàn bộ YAML gốc (đầy đủ named colors) đã lưu trong Stitch project — gọi lại
`mcp__stitch__get_project` khi cần đối chiếu chi tiết.

## Khoảng trống — Stitch CHƯA thiết kế

Bottom nav có tab **Tours** và **Settings** nhưng Stitch chưa có màn hình
riêng cho: danh sách Tours, Settings, màn hình đăng nhập QR Zalo, màn hình
upload tài liệu tạo tour (`/tours/create`). → cần quyết định ở Phase 1 (xin
Stitch design tiếp hay giữ UI hiện tại cho các màn này).
