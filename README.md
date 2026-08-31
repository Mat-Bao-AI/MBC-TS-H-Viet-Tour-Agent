# viet-tour-agent-zalo

Agent AI hỗ trợ hướng dẫn viên du lịch (HDV) biến tài liệu lịch trình thô
(Word/PDF/Excel) thành timeline chi tiết theo từng mốc giờ, và tự động gửi
thông báo cá nhân hoá tới khách hàng qua Zalo.

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
- **Frontend:** Next.js 14 (App Router) / TypeScript / TailwindCSS / shadcn-ui
- **LLM Engine:** Gemini 1.5 Flash
- **Zalo:** `zca-js` (unofficial Personal Client, QR login) chạy trong service
  Node.js riêng `zalo-bridge/` — backend Python gọi qua HTTP nội bộ
  (`ZALO_BRIDGE_URL`). Lý do tách service: `zca-js` chỉ có bản JS, thư viện
  Python thuần (`zlapi`) không hỗ trợ đăng nhập QR như tài liệu mô tả (chỉ
  nhập cookie/IMEI thủ công từ trình duyệt).
  ⚠️ Giới hạn đã xác nhận: chưa có API public để đăng nhập lại bằng session đã
  lưu — cần quét QR lại mỗi khi `zalo_bridge` restart (chi tiết trong
  `zalo-bridge/src/zaloClient.js`).

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

- ✅ **API key tối thiểu** (`X-API-Key`) chặn toàn bộ `/api/v1/*` và `zalo-bridge` —
  xem `app/core/security.py`. ⚠️ Không phải auth đầy đủ (chưa có user/role),
  và `NEXT_PUBLIC_API_KEY` bị inline vào bundle trình duyệt nên không bí mật
  với người đã mở được trang. Đủ cho scope MVP 1 HDV/1 workspace chạy nội bộ —
  **không deploy public rộng rãi khi chưa có auth thật (user/session/role)**.
- ✅ 4 dependency có CVE đã biết (`pypdf`, `python-multipart`, `aiomysql`,
  `starlette` qua `fastapi` cũ) đã bump lên bản vá, `pip-audit` xác nhận 0 CVE.
- ✅ MySQL/Redis không còn publish port ra host (chỉ Docker network nội bộ).
- ✅ Giới hạn dung lượng file upload (`MAX_UPLOAD_SIZE_MB`, mặc định 20MB).
- ✅ Session Zalo (`zalo-bridge/storage/session.json`) đã ghi rõ cảnh báo lưu
  plaintext trên disk, không log ra console, đã gitignore.
- ⚠️ CORS production đọc từ `ALLOWED_ORIGIN` — **phải set domain thật khi
  deploy**, để trống sẽ chặn hết kể cả frontend thật.

## Quy trình sử dụng (Phase 1)

1. Đăng nhập, quét mã QR để kết nối tài khoản Zalo cá nhân.
2. Tải lên tài liệu lịch trình thô (Word/PDF/Excel) và danh sách khách.
3. Agent AI phân tích và tự động tạo timeline chi tiết.
4. HDV duyệt/chỉnh sửa trên giao diện.
5. Nhấn Gửi Zalo — Celery worker xếp hàng và gửi tin nhắn cá nhân hoá tới
   từng khách.
