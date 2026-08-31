# viet-tour-agent-zalo

Agent AI hỗ trợ hướng dẫn viên du lịch (HDV) biến tài liệu lịch trình thô
(Word/PDF/Excel) thành timeline chi tiết theo từng mốc giờ, và tự động gửi
thông báo cá nhân hoá tới khách hàng — **đa kênh**: Zalo cá nhân, Telegram,
hoặc trang lịch trình công khai xem trực tiếp trên web (không phụ thuộc 1
kênh duy nhất, xem mục Phase 3 bên dưới).

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
cầu là bạn bè Zalo, chưa xác nhận 100%) → tách Zalo thành **1 trong nhiều
kênh** thay vì phụ thuộc hoàn toàn:

- **Interface `NotificationSender`** (`backend/app/services/notification/`)
  — mỗi khách chọn 1 kênh (`notification_channel`: zalo/telegram), Celery
  task gọi qua interface chung, không biết/không cần biết đang gửi kênh nào.
- **Telegram** (`app/services/telegram_service.py`) — dùng Bot API chính
  thức (có tài liệu, ổn định hơn `zca-js`), không cần service bridge riêng.
  Khách tự bấm deep-link `t.me/<bot>?start=<mã khách>` để kết nối (giới hạn
  thật của nền tảng — bot không tự tìm được chat_id từ SĐT như Zalo). Cần tự
  tạo Bot qua @BotFather + cấu hình `.env`, xem hướng dẫn trong
  `.env.example`.
- **Trang lịch trình công khai** `/t/<tour_id>` — 1 URL dùng chung cho cả
  đoàn, không cần đăng nhập gì, không lộ danh sách khách/SĐT/ghế/phòng (API
  `GET /api/v1/public/tours/{id}` cố tình đứng ngoài cổng `X-API-Key`). Style
  lấy cảm hứng từ `docs/Demo-tour.html`. HDV bấm "Sao chép link" ở Dashboard
  hoặc trang RSVP để gửi qua bất kỳ kênh nào (SMS, email, in QR...).
- **RSVP page** hết khoá cứng theo Zalo — nút gửi chỉ chặn khi CẢ Zalo lẫn
  Telegram đều chưa sẵn sàng; mỗi khách có công tắc chọn kênh riêng.

Chưa làm (còn lại, để backlog): OCR ảnh chụp lịch trình, VietQR, Zalo OA
chính thức, tự động hoá "Đã xem" qua webhook `seen_messages` thật của
zca-js (đã xác nhận API tồn tại, chưa triển khai), test Telegram thật (cần
user tự tạo Bot + deploy domain HTTPS để đăng ký webhook).

⚠️ **Lưu ý rủi ro:** Phase 1 dùng Zalo Personal Client không chính thức
(`zca-js`, đăng nhập quét QR) — vi phạm Điều khoản dịch vụ của Zalo, tài khoản
Zalo dùng để chạy có rủi ro bị khoá nếu gửi tin tần suất cao. Hệ thống có
hàng đợi Celery giới hạn tốc độ gửi để giảm rủi ro, nhưng không loại bỏ hoàn
toàn.

## Kiến trúc

- **Backend:** Python 3.11+ / FastAPI (async) / LangGraph + LangChain (agent
  orchestration) / SQLAlchemy Async + MySQL 8.0 / Celery + Redis
- **Frontend:** Next.js 14 (App Router) / TypeScript / TailwindCSS / shadcn-ui
- **LLM Engine:** Gemini 1.5 Flash
- **Đa kênh thông báo:** `app/services/notification/` (interface chung) —
  xem chi tiết mục Phase 3 ở trên.
  - **Zalo:** `zca-js` (unofficial Personal Client, QR login) chạy trong
    service Node.js riêng `zalo-bridge/` — backend Python gọi qua HTTP nội bộ
    (`ZALO_BRIDGE_URL`). Lý do tách service: `zca-js` chỉ có bản JS, thư viện
    Python thuần (`zlapi`) không hỗ trợ đăng nhập QR như tài liệu mô tả (chỉ
    nhập cookie/IMEI thủ công từ trình duyệt).
    ⚠️ Giới hạn đã xác nhận: chưa có API public để đăng nhập lại bằng session
    đã lưu — cần quét QR lại mỗi khi `zalo_bridge` restart (chi tiết trong
    `zalo-bridge/src/zaloClient.js`).
  - **Telegram:** `app/services/telegram_service.py` gọi thẳng Bot API chính
    thức bằng `httpx`, không cần service riêng.
- **2 lối đi công khai** (KHÔNG cần `X-API-Key`, cố tình tách khỏi
  `api_router` — xem `app/main.py`): `GET /api/v1/public/tours/{id}` (trang
  lịch trình cho khách) và `POST /api/v1/telegram/webhook` (Telegram gọi
  vào, xác thực bằng secret token riêng thay vì API key).

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

- ✅ **API key tối thiểu** (`X-API-Key`) chặn `/api/v1/*` và `zalo-bridge` —
  xem `app/core/security.py`. **Trừ 2 route công khai cố ý** (xem mục Kiến
  trúc): trang lịch trình cho khách (không có field cá nhân nào) + Telegram
  webhook (xác thực bằng secret token riêng). ⚠️ Không phải auth đầy đủ (chưa
  có user/role), và `NEXT_PUBLIC_API_KEY` bị inline vào bundle trình duyệt
  nên không bí mật với người đã mở được trang. Đủ cho scope MVP 1 HDV/1
  workspace chạy nội bộ — **không deploy public rộng rãi khi chưa có auth
  thật (user/session/role)**.
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
4. Chọn kênh gửi cho từng khách (mặc định Zalo):
   - **Zalo:** quét mã QR kết nối tài khoản cá nhân.
   - **Telegram:** khách tự bấm link mời (`t.me/<bot>?start=...`) trước.
   - **Không muốn gửi tin cho ai:** chỉ cần copy link lịch trình công khai
     (`/t/<tour_id>`) gửi qua bất kỳ đâu — khách tự mở xem, không cần kênh nào.
5. Nhấn Gửi — Celery worker xếp hàng và gửi tin nhắn cá nhân hoá tới từng
   khách theo đúng kênh đã chọn.
