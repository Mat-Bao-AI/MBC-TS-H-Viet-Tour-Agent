# VietTour Agent — Trợ lý AI cho Hướng dẫn viên Du lịch

Agent AI giúp hướng dẫn viên (HDV) biến tài liệu lịch trình thô (Word/PDF/Excel)
thành timeline chi tiết theo từng mốc giờ, và tự động gửi thông báo cá nhân hoá
tới khách hàng qua **Zalo cá nhân** hoặc **trang lịch trình công khai** — khách
xem trực tiếp trên web, không cần cài gì, không cần đăng nhập.

---

## 1. Giới thiệu chức năng

### 1.1 Trích xuất lịch trình bằng AI
HDV tải lên tài liệu lịch trình thô (Word/PDF/Excel) — Agent AI (Gemini hoặc
Azure OpenAI, cấu hình linh hoạt) tự đọc và dựng thành timeline có cấu trúc:
ngày, giờ, địa điểm, ghi chú theo từng mốc.

**Lợi ích nghiệp vụ:** loại bỏ thao tác gõ tay từng dòng lịch trình vào hệ
thống; rút ngắn thời gian chuẩn bị tour từ hàng giờ xuống vài phút.

### 1.2 Duyệt & chỉnh sửa timeline
HDV xem lại timeline AI dựng, sửa/thêm/xoá mốc trước khi gửi cho khách — AI
hỗ trợ chứ không thay thế quyết định cuối cùng của HDV.

### 1.3 Gửi thông báo qua Zalo cá nhân
Kết nối tài khoản Zalo cá nhân qua quét mã QR (thư viện `zca-js`), gửi tin
nhắn cá nhân hoá tới từng khách hoặc tạo 1 nhóm Zalo chung cho cả đoàn.

**Lợi ích nghiệp vụ:** khách nhận thông tin tour ngay trên kênh chat họ đã
quen dùng hằng ngày, không cần cài thêm app mới.

### 1.4 Trang lịch trình công khai
Mỗi tour có 1 đường dẫn công khai (`/t/<tour_id>`) — khách mở xem trực tiếp
trên trình duyệt, không cần đăng nhập, không lộ thông tin cá nhân của khách
khác (không có SĐT/số ghế/số phòng). HDV chỉ cần copy link gửi qua bất kỳ
kênh nào (SMS, email, in QR...).

**Lợi ích nghiệp vụ:** vẫn phục vụ được khách không dùng Zalo, hoặc dùng làm
kênh dự phòng khi Zalo gặp sự cố.

### 1.5 Theo dõi RSVP
3 tab Đã gửi / Đã xem / Đã xác nhận theo từng khách — HDV biết ai đã nhận
được thông tin, ai còn cần nhắc lại.

### 1.6 Gửi tin khẩn (Quick Update)
Soạn 1 tin nhắn khẩn (hoặc ghép từ 1 mốc timeline có sẵn) gửi ngay tới cả
đoàn khi có thay đổi đột xuất — không cần soạn lại toàn bộ lịch trình.

### 1.7 Thời tiết thật theo lịch trình
Ghép dự báo thời tiết thật (Open-Meteo, miễn phí) vào từng mốc theo địa danh
+ ngày cụ thể trong tour, tự ẩn nếu ngoài phạm vi dự báo — không bịa số.

### 1.8 Quản lý loại phòng & tự động xếp phòng
Khai báo các loại phòng (đơn/đôi/gia đình...) cho tour, hệ thống tự động gán
phòng cho khách theo nhóm đi cùng và sức chứa.

**Lợi ích nghiệp vụ:** giảm thao tác xếp phòng thủ công dễ nhầm lẫn khi đoàn
đông người.

### 1.9 Quản lý người dùng (Admin/HDV)
Admin tạo/sửa/khoá/xoá tài khoản Admin hoặc HDV khác, reset mật khẩu. Mỗi
HDV chỉ thấy/thao tác tour do chính mình tạo (multi-tenant), Admin thấy toàn
bộ.

### 1.10 Thương hiệu công ty (white-label)
Admin đổi tên + logo công ty ngay trên UI — áp dụng đồng bộ ở menu chính,
trang đăng nhập, trang lịch trình công khai, tiêu đề tab trình duyệt, và tự
động ký tên cuối mỗi tin nhắn Zalo gửi khách.

**Lợi ích nghiệp vụ:** công cụ mang thương hiệu chính công ty lữ hành đang
dùng, không phải thương hiệu của bên phát triển phần mềm.

### 1.11 Hồ sơ HDV & chữ ký tin nhắn
Mỗi HDV tự upload avatar + thông tin liên hệ (SĐT, Zalo, Facebook) — tự động
ghép vào chữ ký cuối tin nhắn Zalo cùng tên công ty, khách biết ngay ai phụ
trách đoàn và liên hệ thế nào khi cần.

### 1.12 Cấu hình AI provider linh hoạt
Admin nhập/đổi API key Gemini hoặc Azure OpenAI ngay trên UI, áp dụng ngay
không cần sửa code/restart. Nút "Kiểm tra kết nối" gọi thử thật ngay lúc lưu
key — biết ngay key có dùng được không, không phải đợi 1 tour thật lỗi mới
biết.

---

## 2. Đối tượng sử dụng

| Vai trò | Việc chính thực hiện trên hệ thống |
|---|---|
| Admin | Cấu hình hệ thống (thương hiệu, AI provider), quản lý toàn bộ tài khoản người dùng, xem/thao tác mọi tour |
| Hướng dẫn viên (HDV / User) | Tạo tour từ tài liệu thô, duyệt timeline, gửi thông báo Zalo/link công khai, quản lý hồ sơ cá nhân |
| Khách du lịch | Xem lịch trình công khai qua link được chia sẻ — không cần tài khoản |

---

## 3. Công nghệ sử dụng

<!-- AUTO-GENERATED: do not edit -->

**Backend (`backend/`)**
- Python 3.11 + FastAPI (async) + Uvicorn
- SQLAlchemy 2.0 (async) + Alembic (migration) + MySQL 8.0
- Celery 5 + Redis 7 (hàng đợi gửi tin nhắn)
- Agent orchestration: LangChain 1.x + LangGraph 1.x
- AI provider: `langchain-google-genai` (Gemini) / `langchain-openai` (Azure OpenAI) — chọn 1 hoặc cả 2 qua UI Admin
- Parsing tài liệu: `pypdf`, `python-docx`, `openpyxl`
- Auth: JWT (`PyJWT`) + `bcrypt`
- Mã hoá config nhạy cảm lưu DB: `cryptography` (Fernet)

**Frontend (`frontend/`)**
- Next.js 16 (App Router) + React 18 + TypeScript
- TailwindCSS, `react-joyride` (onboarding tương tác)

**Zalo bridge (`zalo-bridge/`)**
- Node.js 22 + `zca-js` (Zalo Personal Client không chính thức, hỗ trợ đăng nhập quét QR) — service riêng vì thư viện Python thuần không hỗ trợ QR login

**Database**
- MySQL 8.0 (dữ liệu chính), Redis 7 (hàng đợi Celery)

<!-- /AUTO-GENERATED -->

---

## 4. Yêu cầu môi trường

- Docker + Docker Compose (cách chạy chính thức, khuyến nghị)
- Nếu chạy thủ công không qua Docker: Python 3.11+, Node.js 22+, MySQL 8.0, Redis 7
- Tài khoản Google AI Studio (Gemini API key) **hoặc** Azure OpenAI — cần ít nhất 1 trong 2 để agent trích xuất/sinh timeline hoạt động

---

## 5. Cài đặt và chạy thử (local)

```bash
cp .env.example .env
```

Điền vào `.env` (tối thiểu để chạy được):

```bash
# Bắt buộc — tự sinh giá trị ngẫu nhiên, KHÔNG dùng giá trị mẫu
SECRET_KEY=$(openssl rand -hex 32)
API_KEY=$(openssl rand -hex 32)
CONFIG_ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")

# Tài khoản Admin đầu tiên (backend tự tạo lúc khởi động)
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=<mật khẩu mạnh tự đặt>

# Ít nhất 1 trong 2 — có thể để trống và cấu hình sau qua UI Admin
GEMINI_API_KEY=<gemini key thật, lấy tại aistudio.google.com>
```

Chạy toàn bộ hệ thống:

```bash
docker compose up -d --build
```

- Frontend (giao diện HDV): http://localhost:3000
- Backend API docs (Swagger): http://localhost:8000/docs

Nếu thêm/đổi `GEMINI_API_KEY` trong `.env` sau khi đã `docker compose up`,
cần build lại + tạo mới container để đọc `.env` mới (`docker restart` KHÔNG
đủ):

```bash
docker compose build backend celery_worker
docker compose up -d --force-recreate backend celery_worker
```

Hoặc dùng script tiện lợi:

```bash
scripts/app.sh start     # build lại nếu code đổi + khởi động toàn bộ
scripts/app.sh stop      # dừng + gỡ container
scripts/app.sh restart   # restart container đang chạy, KHÔNG rebuild
scripts/app.sh status    # xem trạng thái hiện tại
```

---

## 6. Build bản production

```bash
docker compose build
```

Mỗi service (`backend`, `frontend`, `zalo_bridge`) có `Dockerfile` riêng,
build multi-stage — không cần bước build thủ công ngoài lệnh trên.

---

## 7. Triển khai (Deploy)

**Yêu cầu trước:** Python 3.11, Node.js 22, MySQL 8.0, Redis 7 — đúng bản đã
chạy thật trong `docker-compose.yml`.

**Lệnh dựng & chạy:**
```bash
cp .env.example .env
# điền SECRET_KEY / API_KEY / CONFIG_ENCRYPTION_KEY / SEED_ADMIN_* / GEMINI_API_KEY thật
docker compose up -d --build
```

**Dấu hiệu đã chạy:** `GET http://<host>:8000/health` trả `200`; mở
`http://<host>:3000` thấy trang đăng nhập.

**Tài khoản đầu tiên:** đăng nhập bằng đúng `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` đã đặt trong `.env` — backend tự tạo tài khoản Admin
này lúc khởi động (idempotent, chỉ tạo nếu email đó chưa tồn tại). Từ đó vào
`/settings/system` → tab Người dùng để tạo thêm tài khoản khác.

**Nâng cấp & lùi bản:** kéo code mới → `docker compose build` → `docker
compose up -d`. Dữ liệu MySQL nằm ở Docker volume `mysql_data`, không mất
khi rebuild/redeploy. Alembic tự chạy migration khi backend khởi động — lùi
bản (rollback code cũ) không tự lùi schema DB, cần `alembic downgrade` thủ
công nếu migration mới đã chạy.

**Lỗi thường gặp:**
- **`docker compose build` báo `ENOSPC: no space left on device`** — build
  cache Docker tích luỹ qua nhiều lần build. Dọn bằng
  `docker builder prune -af` (an toàn, chỉ xoá cache build) trước khi build
  lại.
- **Agent báo lỗi `404 models/... is not found` khi phân tích tour** — nhà
  cung cấp AI (đặc biệt Google) đổi tên/khai tử model theo thời gian, kể cả
  model đang dùng ổn định trước đó. Vào `/settings/system` → tab AI → bấm
  "Kiểm tra kết nối" để xác nhận key/model còn dùng được **trước khi** báo
  cho HDV; nếu lỗi, cần cập nhật tên model trong `backend/app/core/llm.py`
  theo model hiện hành nhà cung cấp đang hỗ trợ.

### ⚠️ Lưu ý rủi ro — Zalo Personal Client không chính thức

Kênh gửi Zalo dùng `zca-js` (đăng nhập quét QR) — **không phải API chính
thức của Zalo**. Tài khoản Zalo dùng để chạy có
rủi ro bị khoá nếu gửi tin tần suất cao. Hệ thống có hàng đợi Celery giới
hạn tốc độ gửi để giảm rủi ro, nhưng không loại bỏ hoàn toàn. Chưa hỗ trợ tự
đăng nhập lại bằng session đã lưu — cần quét QR lại mỗi khi service
`zalo_bridge` restart.

### Bảo mật đã kiểm tra

- Auth JWT thật (`Authorization: Bearer`), 2 vai trò Admin/User, multi-tenant
  theo HDV. Chỉ 2 route công khai cố ý: trang lịch trình khách xem
  (`GET /api/v1/public/tours/{id}`, không có field cá nhân nào) và
  `POST /auth/login`.
- Secret nội bộ backend↔zalo-bridge (`API_KEY`) tách riêng khỏi auth người
  dùng.
- MySQL/Redis không publish port ra host — chỉ Docker network nội bộ.
- Giới hạn dung lượng file upload (`MAX_UPLOAD_SIZE_MB`, mặc định 20MB).
- CORS production đọc từ `ALLOWED_ORIGIN` — **phải set domain thật khi
  deploy**, để trống sẽ chặn hết kể cả frontend thật.

---

## 8. Cấu trúc thư mục

```
viet-tour-agent-zalo/
├── backend/                 # FastAPI + SQLAlchemy + Celery
│   ├── app/
│   │   ├── agents/          # Agent AI trích xuất/sinh timeline, format tin nhắn Zalo
│   │   ├── api/v1/          # Route: tours, auth, admin_users, company, changelog, zalo...
│   │   ├── core/            # config, security (JWT), crypto, dynamic_config, llm (đa provider)
│   │   ├── models/          # SQLAlchemy models (Tour, Guest, User, RoomType...)
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # notification/ (Zalo sender), room_assignment
│   │   └── tasks/           # Celery worker
│   └── alembic/versions/    # Migration DB
├── frontend/                # Next.js App Router
│   └── src/
│       ├── app/             # Route theo file-based routing (dashboard, settings, t/[id]...)
│       ├── components/      # UI components dùng chung
│       └── lib/             # api client, auth context, server-side fetch helper
├── zalo-bridge/              # Node.js sidecar bọc zca-js (QR login + gửi tin thật)
├── docs/                     # QA-PLAN, QC-REPORT, VIBEHOST-SUBMIT, STITCH-DESIGN
├── scripts/                  # app.sh (start/stop/restart/status tiện lợi)
└── docker-compose.yml
```

---

## 9. Tài liệu liên quan

- `docs/QA-PLAN.md` — kế hoạch QA, rủi ro chính, test case luồng nghiệp vụ
- `docs/QC-REPORT-2026-09-04.md` — kết quả QC gần nhất
- `docs/VIBEHOST-SUBMIT.md` — thông số điền sẵn để nộp mẫu deploy
- `docs/STITCH-DESIGN.md` — nguồn thiết kế UI (Google Stitch) + design token

---

