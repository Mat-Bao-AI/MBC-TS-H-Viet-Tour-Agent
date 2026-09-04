# viet-tour-agent-zalo

Agent AI hỗ trợ hướng dẫn viên du lịch (HDV) biến tài liệu lịch trình thô
(Word/PDF/Excel) thành timeline chi tiết theo từng mốc giờ, và tự động gửi
thông báo cá nhân hoá tới khách hàng qua **Zalo cá nhân**, hoặc trang lịch
trình công khai xem trực tiếp trên web — không cần kết nối gì (xem mục
Phase 4 bên dưới).

> Tài liệu mô tả sản phẩm gốc: [viet-tour-agent-zalo.txt](./viet-tour-agent-zalo.txt)

## Trạng thái hiện tại

✅ **Phase 1 — MVP lõi** (upload → agent → duyệt timeline → gửi Zalo 1-1) đã
dựng xong, chạy được qua `docker compose up`, smoke-test end-to-end pass.

✅ **Phase 2 — giao diện dựng lại theo thiết kế Google Stitch (MCP) +
các tính năng RSVP/thời tiết/gửi nhanh/gửi nhóm** (2026-08-31, xem
[docs/STITCH-DESIGN.md](docs/STITCH-DESIGN.md) — nguồn thiết kế + design
token đầy đủ):

- Giao diện mobile-first theo đúng 8 màn Stitch: Dashboard, Danh sách Tour,
  Tạo Tour, Lịch trình, RSVP, Cài đặt, Đăng nhập QR — bottom nav 3 tab.
- **Thời tiết thật** trên timeline (Open-Meteo, miễn phí, không cần key) —
  geocode địa danh + dự báo theo ngày, ẩn đi (không bịa số) nếu ngoài phạm
  vi dự báo hoặc tour chưa có ngày.
- **Instant Quick-Update**: gửi tin khẩn tức thời (tự soạn, hoặc ghép từ 1
  mốc timeline) tới cả đoàn, không cần soạn lại toàn bộ lịch trình.
- **RSVP tracking**: 3 tab Đã gửi/Đã xem/Đã xác nhận theo `dispatch_status`
  thật. Đã xem/Đã xác nhận do HDV tự đánh dấu tay (chưa có webhook
  seen-message tự động từ Zalo ở Phase 2 — xem ghi chú trong
  `GuestStatusUpdateRequest`).
- **Gửi Zalo Group**: tạo 1 nhóm Zalo thật (zca-js `createGroup`) gồm khách
  đã resolve được zalo_id, gửi tin chung 1 lần thay vì N tin 1-1.

✅ **Phase 3 — đa kênh gửi thông báo** (2026-08-31): Zalo (`zca-js`) gặp lỗi
thật khó chẩn đoán lúc HDV test thật (gửi tin thất bại âm thầm, tạo nhóm
502 "Không tìm thấy" — API không chính thức, nghi do giới hạn nền tảng yêu
cầu là bạn bè Zalo, chưa xác nhận 100%) → tách Zalo thành 1 trong nhiều
kênh qua interface `NotificationSender` (`backend/app/services/notification/`)
thay vì phụ thuộc hoàn toàn, và thêm Telegram Bot API làm kênh thứ 2.

✅ **Phase 4 — bỏ Telegram, tập trung Zalo + URL công khai** (2026-09-03):
test thật cho thấy Telegram cản trở trải nghiệm — khách bắt buộc phải tự
bấm link mời + Start với bot trước khi nhận được tin (Telegram không cho
tra chat_id theo SĐT như Zalo), trong khi đa số khách Việt Nam đã dùng Zalo
sẵn. Quyết định bỏ hẳn kênh Telegram (xoá `telegram_service.py`,
`telegram_webhook.py`, cột `guests.telegram_chat_id`/`notification_channel`,
`users.telegram_username` — xem migration `0008_drop_telegram`), tập trung
2 hình thức:

- **Zalo cá nhân** (`app/services/notification/zalo_sender.py`) — kênh gửi
  chính, mọi khách ngầm định gửi qua đây.
- **Trang lịch trình công khai** `/t/<tour_id>` — 1 URL dùng chung cho cả
  đoàn, không cần đăng nhập gì, không lộ danh sách khách/SĐT/ghế/phòng (API
  `GET /api/v1/public/tours/{id}` cố tình đứng ngoài cổng JWT). Style
  lấy cảm hứng từ `docs/Demo-tour.html`. HDV bấm "Sao chép link" ở Dashboard
  hoặc trang RSVP để gửi qua bất kỳ kênh nào (SMS, email, in QR...).

✅ **Phase 5 — quản trị đa người dùng, thương hiệu công ty, white-label**
(2026-09-04):

- **Quản lý người dùng** (Admin) — tạo/sửa/khoá/xoá tài khoản Admin/HDV,
  reset mật khẩu, đổi vai trò. Xoá tài khoản có chặn an toàn: không tự xoá
  chính mình, không xoá Admin active cuối cùng, không xoá HDV đang sở hữu
  tour (tránh vỡ dữ liệu).
- **Thương hiệu công ty** — Admin đổi tên + logo công ty ngay trên UI, hiện ở
  Sidebar, trang đăng nhập, trang lịch trình công khai, và tự động ký tên
  cuối mỗi tin nhắn Zalo gửi khách.
- **Hồ sơ HDV** — mỗi HDV tự upload avatar + thông tin liên hệ (SĐT, Zalo,
  Facebook), tự động ghép vào chữ ký tin nhắn cùng tên công ty (khách nhận
  tin biết ngay ai phụ trách đoàn và liên hệ thế nào).
- **Cài đặt hệ thống chia theo tab** (Thương hiệu / Người dùng / AI) tại
  `/settings/system` — Admin only, tách bạch khỏi `/settings` (khu vực cá
  nhân dùng chung mọi vai trò: hồ sơ, kết nối Zalo, thông báo).
- **Kiểm tra kết nối AI provider** — nút "Kiểm tra kết nối" gọi thử thật
  ngay khi lưu Gemini/Azure OpenAI key, báo lỗi/thành công tức thì thay vì
  đợi 1 tour thật parse lỗi mới biết (bắt được đúng lúc Google đổi tên model
  gemini-1.5-flash → gemini-3.6-flash giữa chừng, xem `app/core/llm.py`).
- **White-label toàn app** — tên công ty (không còn "VietTour Agent" cứng)
  hiện đồng bộ ở mọi nơi: tiêu đề tab trình duyệt, trang "Về ứng dụng",
  header mobile, trang đăng nhập Zalo, mô tả SEO khi chia sẻ link tour.
- **Quản lý loại phòng + tự động xếp phòng** (`room-types`,
  `auto-assign-rooms`) và thông tin khách mở rộng (tuổi, nhóm đi cùng, ghi
  chú ăn kiêng).
- **Ảnh bìa tour** hiện trên trang lịch trình công khai và preview khi dán
  link vào Zalo/Messenger (Open Graph).
- **Lịch sử cập nhật** (changelog) — Admin tự ghi mục cập nhật, hiện ở trang
  "Về ứng dụng" cho mọi User xem.
- **Hướng dẫn onboarding tương tác** (react-joyride) cho người dùng lần đầu
  vào Dashboard, tự cập nhật theo tên công ty đã cấu hình.

Chưa làm (còn lại, để backlog): OCR ảnh chụp lịch trình, VietQR, Zalo OA
chính thức, tự động hoá "Đã xem" qua webhook `seen_messages` thật của
zca-js (đã xác nhận API tồn tại, chưa triển khai).

⚠️ **Lưu ý rủi ro:** Phase 1 dùng Zalo Personal Client không chính thức
(`zca-js`, đăng nhập quét QR) — vi phạm Điều khoản dịch vụ của Zalo, tài khoản
Zalo dùng để chạy có rủi ro bị khoá nếu gửi tin tần suất cao. Hệ thống có
hàng đợi Celery giới hạn tốc độ gửi để giảm rủi ro, nhưng không loại bỏ hoàn
toàn.

## Kiến trúc

- **Backend:** Python 3.11+ / FastAPI (async) / LangGraph + LangChain (agent
  orchestration) / SQLAlchemy Async + MySQL 8.0 / Celery + Redis
- **Frontend:** Next.js 16 (App Router) / TypeScript / TailwindCSS / shadcn-ui
- **LLM Engine:** Gemini (mặc định `gemini-3.6-flash`) hoặc Azure OpenAI —
  Admin đổi provider/model qua UI (`/settings/system` → tab AI) không cần
  sửa code/redeploy, xem `app/core/llm.py`
- **Gửi thông báo:** `app/services/notification/` (interface chung, hiện chỉ
  1 implementation `zalo_sender.py`) — xem chi tiết mục Phase 4 ở trên.
  - **Zalo:** `zca-js` (unofficial Personal Client, QR login) chạy trong
    service Node.js riêng `zalo-bridge/` — backend Python gọi qua HTTP nội bộ
    (`ZALO_BRIDGE_URL`). Lý do tách service: `zca-js` chỉ có bản JS, thư viện
    Python thuần (`zlapi`) không hỗ trợ đăng nhập QR như tài liệu mô tả (chỉ
    nhập cookie/IMEI thủ công từ trình duyệt).
    ⚠️ Giới hạn đã xác nhận: chưa có API public để đăng nhập lại bằng session
    đã lưu — cần quét QR lại mỗi khi `zalo_bridge` restart (chi tiết trong
    `zalo-bridge/src/zaloClient.js`).
- **2 lối đi công khai** (KHÔNG cần JWT, cố tình tách khỏi `api_router` —
  xem `app/main.py`): `GET /api/v1/public/tours/{id}` (trang lịch trình cho
  khách) và `POST /api/v1/auth/login` (chicken-and-egg — chưa đăng nhập thì
  chưa có JWT để gửi).
- **Auth app thật (2026-08-31):** đăng nhập bằng email/mật khẩu
  (`app/api/v1/account.py`) cấp JWT (`Authorization: Bearer`, xem
  `app/core/security.py`), 2 vai trò Admin/User (HDV). Multi-tenant theo
  HDV — mỗi User chỉ thấy/thao tác tour do chính mình tạo (`Tour.owner_id`,
  lọc qua `app/core/access.py`), Admin thấy mọi tour. Không có form tự đăng
  ký — tài khoản Admin đầu tiên tạo tự động lúc khởi động nếu
  `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` được cấu hình
  (`app/core/seed.py`); từ đó Admin tự tạo thêm tài khoản khác qua UI
  (`/settings/system` → tab Người dùng, `app/api/v1/admin_users.py`).

Chi tiết cấu trúc thư mục: xem mục 5 trong
[viet-tour-agent-zalo.txt](./viet-tour-agent-zalo.txt).

## Quickstart

```bash
cp .env.example .env
# 1. Điền GEMINI_API_KEY vào .env
# 2. Tạo API_KEY (bắt buộc — backend/zalo_bridge từ chối chạy nếu thiếu):
#      openssl rand -hex 32
#    Dán giá trị vào cả API_KEY trong .env

docker compose up -d --build
```

- Frontend (giao diện HDV): http://localhost:3000
- Backend API docs (Swagger): http://localhost:8000/docs

Hoặc dùng script tiện lợi (tự in URL sau khi start/restart):

```bash
scripts/app.sh start     # build lại nếu code đổi + khởi động toàn bộ
scripts/app.sh stop      # dừng + gỡ container
scripts/app.sh restart   # restart container đang chạy, KHÔNG rebuild
scripts/app.sh status    # xem trạng thái hiện tại
```

Nếu bạn thêm `GEMINI_API_KEY` thật sau khi đã `up`, cần
`docker compose restart backend celery_worker` để container đọc lại `.env`.

### Đã kiểm thử (smoke test)

- ✅ Build Docker thành công cả 4 service (backend, celery_worker, zalo_bridge, frontend)
- ✅ `alembic upgrade head` chạy thật, tạo đúng bảng `tours`/`guests`/`timelines` trên MySQL
- ✅ Upload tài liệu → agent xử lý nền → lỗi Gemini (do key giả) được bắt đúng, ghi vào `process_error`, `status=failed` — không crash
- ✅ Đăng nhập Zalo QR: `zalo_bridge` sinh mã QR thật (ảnh PNG base64 hợp lệ) qua `zca-js`
- ✅ Toàn bộ trang frontend (`/`, `/tours/create`, `/tours/[id]/review`, `/tours/[id]/dispatch`) render HTTP 200
- ⏳ Chưa test được: agent trích xuất/sinh timeline thật (cần `GEMINI_API_KEY` thật), quét QR bằng điện thoại thật để hoàn tất đăng nhập, gửi tin Zalo thật

## Bảo mật

Đã chạy `/my-sec` audit (2026-08-25) và sửa các mục tìm được:

- ✅ **Auth thật (JWT, 2026-08-31)** chặn `/api/v1/*` — đăng nhập
  email/mật khẩu, 2 vai trò Admin/User, multi-tenant theo HDV (xem mục Kiến
  trúc). **Trừ 2 route công khai cố ý**: trang lịch trình cho khách (không
  có field cá nhân nào) và `POST /auth/login` (chưa đăng nhập thì chưa có
  JWT). Token lưu `localStorage` phía trình duyệt (không phải cookie) — vẫn
  có rủi ro lộ nếu trang dính XSS, chấp nhận đánh đổi này ở quy mô công cụ
  nội bộ hiện tại.
- ✅ **Secret nội bộ backend↔zalo-bridge** (`API_KEY` trong `.env`) tách
  riêng khỏi auth người dùng — 2 service Docker biết, không liên quan gì
  tới trình duyệt/HDV.
- ✅ 4 dependency có CVE đã biết (`pypdf`, `python-multipart`, `aiomysql`,
  `starlette` qua `fastapi` cũ) đã bump lên bản vá, `pip-audit` xác nhận 0 CVE.
- ✅ MySQL/Redis không còn publish port ra host (chỉ Docker network nội bộ).
- ✅ Giới hạn dung lượng file upload (`MAX_UPLOAD_SIZE_MB`, mặc định 20MB).
- ✅ Session Zalo (`zalo-bridge/storage/session.json`) đã ghi rõ cảnh báo lưu
  plaintext trên disk, không log ra console, đã gitignore.
- ⚠️ CORS production đọc từ `ALLOWED_ORIGIN` — **phải set domain thật khi
  deploy**, để trống sẽ chặn hết kể cả frontend thật.

## Quy trình sử dụng

1. Tải lên tài liệu lịch trình thô (Word/PDF/Excel) và danh sách khách.
2. Agent AI phân tích và tự động tạo timeline chi tiết.
3. HDV duyệt/chỉnh sửa trên giao diện.
4. Gửi qua 1 trong 2 hình thức:
   - **Zalo:** quét mã QR kết nối tài khoản cá nhân, gửi tin cá nhân hoá tới
     từng khách.
   - **Link công khai:** chỉ cần copy link lịch trình (`/t/<tour_id>`) gửi
     qua bất kỳ đâu (SMS, email, in QR...) — khách tự mở xem, không cần kết
     nối gì.
5. Nhấn Gửi — Celery worker xếp hàng và gửi tin nhắn cá nhân hoá tới từng
   khách theo đúng kênh đã chọn.
