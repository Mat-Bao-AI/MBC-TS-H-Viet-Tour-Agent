# Changelog

## [Unreleased]

### Added

- Quản lý người dùng (Admin): tạo/sửa/khoá/xoá tài khoản Admin/HDV, đổi vai trò, reset mật khẩu.
- Thương hiệu công ty: Admin đổi tên + logo, hiện ở Sidebar/đăng nhập/trang lịch trình công khai, tự ký tên cuối tin nhắn Zalo.
- Hồ sơ HDV: upload avatar + thông tin liên hệ (SĐT, Zalo, Facebook), tự ghép vào chữ ký tin nhắn gửi khách.
- Cài đặt hệ thống chia theo tab (Thương hiệu / Người dùng / AI), tách khỏi khu vực Cài đặt cá nhân dùng chung mọi vai trò.
- Nút "Kiểm tra kết nối" cho từng AI provider — gọi thử thật ngay khi lưu key, báo lỗi/thành công tức thì.
- White-label: tên công ty thay "VietTour Agent" ở mọi nơi hiển thị (tab trình duyệt, Về ứng dụng, header mobile, đăng nhập Zalo, SEO link tour).
- Quản lý loại phòng + tự động xếp phòng cho khách theo tour.
- Thông tin khách mở rộng: tuổi, nhóm đi cùng, ghi chú ăn kiêng, loại phòng.
- Ảnh bìa tour — hiện trên trang lịch trình công khai và preview Zalo/Messenger (Open Graph).
- Lịch sử cập nhật (changelog) tự nhập qua UI, hiện ở trang "Về ứng dụng".
- Hướng dẫn onboarding tương tác (react-joyride) cho lần đầu vào Dashboard.
- Trang Hồ sơ cá nhân (`/settings/profile`) dùng chung cho mọi vai trò.

### Fixed

- Model Gemini `gemini-1.5-flash` bị Google khai tử → cập nhật `gemini-3.6-flash`, sửa lỗi 404 khi phân tích tour.
- Trang "Về ứng dụng" và trang quản lý người dùng cũ gộp lại đúng cấu trúc Admin/cá nhân, tránh hiển thị nhầm chức năng hệ thống trong khu vực cá nhân.

### Changed

- Bỏ kênh Telegram, tập trung Zalo cá nhân + link công khai (đã ghi trong README mục Phase 4).
