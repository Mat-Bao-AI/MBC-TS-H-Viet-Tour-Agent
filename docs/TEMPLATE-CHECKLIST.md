# Checklist trước khi push template public

## Tiêu chí nội dung (`tieu-chi-template`)

- [x] **Bản địa hóa** — UI/nội dung 100% tiếng Việt, hướng đúng đối tượng HDV/khách Việt Nam.
- [x] **Giá trị sử dụng thực tế** — README mục 1 đã trả lời rõ vấn đề → giải pháp → đối tượng → giá trị.
- [x] **Không thuộc nhóm Game** — xác nhận, đây là công cụ vận hành tour.
- [x] **Phân loại nhóm chủ đề** — đã gán `category` ở `docs/VIBEHOST-SUBMIT.md` mục 2 — ⚠️ tự rà lại cho khớp định hướng danh mục hiện tại trước khi nộp.
- [x] **Mô tả kỹ thuật rõ ràng** — README mục 3 (công nghệ), mục 4 (yêu cầu môi trường), mục 5 (cài đặt).

## Kỹ thuật nộp mẫu deploy (`yc-deploy.html`)

- [ ] ⚠️ Đã xác nhận với đội Vibe Host: nền tảng nhận `docker-compose.yml` nhiều service, hay bắt buộc 1 ảnh Docker duy nhất (xem cảnh báo đầu `docs/VIBEHOST-SUBMIT.md`).
- [x] Repo chứa `docker-compose.yml` chạy được thật (đã dùng xuyên suốt quá trình phát triển).
- [x] README đủ 6 mục bắt buộc ở phần Triển khai.
- [ ] ⚠️ `ram`/`cpu` — cần đo thật (chưa benchmark chính thức), xem `docs/VIBEHOST-SUBMIT.md` mục 3.
- [ ] `iconUrl` — chuẩn bị logo public nếu muốn hiện khác icon mặc định.
- [ ] Repo đã chuyển sang **public** trên GitHub trước khi nộp (bắt buộc nếu đi đường Git — repo riêng tư sẽ hỏng lúc khách deploy).
- [ ] Xác nhận `name` không trùng mẫu đã có trên hệ.

## Bằng chứng đã chạy thật (3 mục KHÔNG được bỏ qua)

- [ ] ⚠️ Deploy thử thành công thật trên môi trường Vibe Host (không phải chỉ local) — kèm ảnh chụp/link.
- [ ] ⚠️ Đăng nhập được bằng tài khoản admin thật theo đúng cách đã khai (mục 6).
- [ ] ⚠️ Đo thời gian thật từ lúc bấm deploy tới lúc dùng được.

## Bảo mật (đã quét lúc đóng gói — 2026-09-04)

- [x] Không có secret/API key hardcode trong code.
- [x] `.env.example` chỉ chứa placeholder, không giá trị thật.
- [x] Không có URL/IP nội bộ Mắt Bão hardcode trong code.
- [x] `.gitignore` chặn `.env`, `uploads/`, `storage/`, `*.log`.
- [x] Không có file `.env` thật bị git track.
- [x] Không có email/tên người thật hardcode trong code.
- [ ] ⚠️ Cân nhắc đổi `MYSQL_ROOT_PASSWORD`/`MYSQL_PASSWORD` mặc định trong `.env.example` (`root_password_123`/`tourguide_pass`) sang dạng placeholder rõ ràng hơn (`change-me-...`) — hiện không phải secret thật (MySQL không publish port ra host) nhưng nên nhất quán với các biến secret khác trong file.

## Trước khi push

- [ ] `git remote add origin <github-url-cua-team-product>`
- [ ] `git push -u origin main`
- [ ] Nộp `docs/VIBEHOST-SUBMIT.md` vào form Vibe Host
