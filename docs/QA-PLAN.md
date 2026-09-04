# QA Plan — viet-tour-agent-zalo
> Cập nhật: 2026-09-04 · Phạm vi: Toàn app (backend FastAPI + frontend Next.js + zalo-bridge)

## 1. Mục tiêu chất lượng

Audit toàn diện — app đã tích luỹ nhiều tính năng lớn qua nhiều phase (auth,
multi-tenant, quản trị user, thương hiệu công ty, AI provider đa nhà cung
cấp, white-label) mà chưa audit tổng thể lần nào:

1. Chức năng đúng (functional) — luồng chính upload → duyệt → gửi khách.
2. Bảo mật — auth JWT, multi-tenant, secret mã hoá, route công khai.
3. UX/accessibility — responsive mobile/desktop, thông báo lỗi rõ ràng.

## 2. Phạm vi & môi trường

- Phạm vi: toàn app — backend (FastAPI), frontend (Next.js 16), zalo-bridge (Node.js/zca-js).
- Môi trường: DEV ✓ (`docker compose up`, `.env`) | UAT chưa có | Staging chưa có
- ⚠️ Rủi ro môi trường: chỉ test được trên DEV — chưa có Staging để diễn tập
  trước khi lên production thật. `.env.example` ghi rõ các biến bắt buộc đổi
  giá trị thật khi deploy (`SECRET_KEY`, `CONFIG_ENCRYPTION_KEY`, `API_KEY`,
  `ALLOWED_ORIGIN`) — phải tự kiểm tra thủ công trước go-live, không có gate
  tự động chặn deploy với giá trị mặc định.

## 3. Rủi ro chính (ưu tiên test trước)

| Rủi ro | Vì sao | Căn cứ code | Mức ưu tiên |
|---|---|---|---|
| Multi-tenant rò rỉ dữ liệu | HDV A có thể thấy/sửa tour của HDV B nếu lọc `owner_id` sai 1 chỗ | `app/core/access.py:16` (`get_owned_tour`) | Cao |
| Route công khai lộ dữ liệu khách | `/t/[id]` không cần JWT — phải đảm bảo tuyệt đối không trả SĐT/ghế/phòng khách | `backend/app/main.py:76` (`public_router`), `app/api/v1/public.py` | Cao |
| Xoá user gây mất dữ liệu/khoá hệ thống | Xoá HDV đang sở hữu tour hoặc xoá Admin cuối cùng nếu thiếu chặn | `app/api/v1/admin_users.py` (`delete_user`) | Cao |
| JWT/secret cấu hình yếu | `SECRET_KEY`/`CONFIG_ENCRYPTION_KEY` để mặc định = ai cũng giả mạo token/giải mã được config đã lưu | `app/core/security.py:42-45`, `app/core/crypto.py:23-38` | Cao |
| Upload file (itinerary/avatar/logo/cover/guest-list) | 5 endpoint upload khác nhau — kiểm tra giới hạn dung lượng, loại file, path traversal tên file | `app/api/v1/tours.py:52,130,295,448`, `app/api/v1/account.py:79`, `app/api/v1/company.py:52` | Cao |
| Zalo API không chính thức (zca-js) | Vi phạm ToS Zalo — tài khoản có thể bị khoá bất kỳ lúc nào, ảnh hưởng luồng gửi chính | README mục "Lưu ý rủi ro", `zalo-bridge/src/zaloClient.js` | Trung bình (đã biết, không thể khắc phục triệt để) |
| AI provider đổi model/quota | Google/Azure có thể đổi tên model hoặc hết quota bất kỳ lúc nào — đã xảy ra thật với `gemini-1.5-flash` | `app/core/llm.py` (`test_provider`, `_PROVIDER_BUILDERS`) | Trung bình (đã có cơ chế "Kiểm tra kết nối" giảm thiểu) |

## 4. Loại test & lịch chạy

| Loại test | Cách chạy | Độ ưu tiên | Khi nào chạy |
|---|---|---|---|
| Functional | `/my-qc full` | Cao | Mỗi lần trước release |
| UI/UX | `/my-qc ui` | Trung bình | Mỗi lần đổi giao diện |
| Bảo mật | `/my-sec` | Cao | Trước mỗi lần deploy |
| Performance | `/my-qc perf` (smoke) | Thấp (app nội bộ, ít user đồng thời) | Trước go-live |
| SEO | `/my-qc seo` | Thấp — chỉ `/t/[id]` là trang public | Trước go-live |

**Tiêu chí Pass/Fail chung**: 0 lỗi Critical/High còn mở khi release; Medium
có kế hoạch fix rõ ràng; Low ghi nhận, không block.

## 5. Test case luồng nghiệp vụ chính

| # | Luồng | Bước | Đạt khi |
|---|---|---|---|
| 1 | Đăng nhập app | Đăng nhập đúng email/mật khẩu Admin/HDV; sai mật khẩu; tài khoản bị khoá (`is_active=false`) | Đúng → vào Dashboard; sai/khoá → báo lỗi rõ, không lộ chi tiết (không phân biệt "sai email" vs "sai mật khẩu") |
| 2 | Multi-tenant cô lập | Đăng nhập HDV A tạo tour → đăng nhập HDV B → gọi `GET /tours/{id}` của tour A | HDV B nhận 403/404, không thấy dữ liệu tour A. Admin thấy được cả 2 |
| 3 | Upload → parse AI → duyệt | Upload file lịch trình thật (Word/PDF/Excel) | Status chuyển `parsing` → `review`, timeline có mốc giờ hợp lý, không mất dữ liệu ngày/giờ |
| 4 | Upload file lỗi | Upload file rỗng, file vượt `MAX_UPLOAD_SIZE_MB`, file sai định dạng | Báo lỗi rõ ràng phía UI, tour chuyển `status=failed` kèm `process_error` đọc được, không crash backend |
| 5 | Gửi Zalo cá nhân | Kết nối QR thật → gửi tin 1 khách đã có `zalo_id` | Khách nhận đúng tin, `dispatch_status` cập nhật đúng, chữ ký cuối tin có tên công ty + thông tin HDV |
| 6 | Trang lịch trình công khai | Mở `/t/{tour_id}` không đăng nhập | Xem được lịch trình, KHÔNG thấy SĐT/ghế/phòng khách nào, hiện đúng logo/tên công ty |
| 7 | Quản lý người dùng — tạo/sửa | Admin tạo HDV mới, đổi role, khoá tài khoản, reset mật khẩu | Tài khoản mới đăng nhập được đúng mật khẩu tạm; đổi role/khoá có hiệu lực ngay; reset mật khẩu login được bằng mật khẩu mới |
| 8 | Quản lý người dùng — xoá (3 nhánh chặn) | (a) Admin tự xoá chính mình; (b) xoá Admin active cuối cùng; (c) xoá HDV đang sở hữu tour | Cả 3 đều bị chặn 400 kèm lý do rõ ràng, không xoá được |
| 9 | Thương hiệu công ty | Admin đổi tên + logo | Cập nhật ngay ở Sidebar, `/signin`, `/t/[id]`, tab trình duyệt, chữ ký tin nhắn — không cần rebuild/restart |
| 10 | Hồ sơ HDV + avatar | HDV tự sửa SĐT/Zalo/Facebook + upload avatar | Lưu đúng, avatar hiện ở Sidebar/hồ sơ, xuất hiện trong chữ ký tin nhắn của đúng tour do HDV đó phụ trách |
| 11 | Cấu hình AI provider | Nhập key Gemini/Azure sai → bấm "Kiểm tra kết nối"; nhập đúng → kiểm tra lại | Key sai → ❌ kèm lý do thật; key đúng → ✅; provider chính đổi đúng khi có ≥2 provider |
| 12 | Phân quyền Admin-only | User thường (HDV) gọi trực tiếp API `/admin/users`, `/admin/settings/*` | Nhận 403, không thấy/sửa được dữ liệu |
| 13 | Xếp phòng tự động | Tạo loại phòng, chạy "Tự động xếp phòng" cho tour có khách theo nhóm | Khách được gán phòng hợp lý theo sức chứa, không trùng/thiếu |
| 14 | Responsive UI | Mở app trên mobile (< lg breakpoint) và desktop | Sidebar/BottomNav không hiện cùng lúc, không vỡ layout ở màn hình hẹp |

## 6. Quy trình quản lý bug

| Severity | Định nghĩa | SLA fix | Ai xử lý |
|---|---|---|---|
| 🔴 Critical | Chặn luồng chính, mất dữ liệu, lỗ hổng bảo mật khai thác được (vd rò rỉ dữ liệu khách/tour giữa các HDV) | Trước khi release, không waive | Fix ngay |
| 🟠 High | Ảnh hưởng luồng phụ, không có workaround (vd 1 provider AI lỗi nhưng còn provider khác) | Trong sprint/trước release | Ưu tiên |
| 🟡 Medium | Có workaround, ảnh hưởng UX | Sprint kế tiếp | Lên lịch |
| 🟢 Low | Cosmetic, không ảnh hưởng chức năng | Khi rảnh | Backlog |

**Workflow báo lỗi**: `/my-qc` phát hiện → ghi vào report → severity
Critical/High → xử lý ngay bằng `/my-qf` (không chờ), theo đúng SLA ở bảng
trên; Medium/Low → ghi trong report, gom sửa theo lịch. Toàn bộ tracking nằm
trong report của project (`docs/QC-REPORT-*.md`), không cần hệ thống ticket
riêng.

## 7. Go-live checklist (self-check, không cần gate manager riêng)

Trước khi release: chạy `/my-qc prerelease` — tự kiểm bug Critical/High đã
đóng, regression luồng chính (mục 5), `/my-sec` đã sạch, và riêng project
này cần thêm:

- Đã đổi `SECRET_KEY`/`CONFIG_ENCRYPTION_KEY`/`API_KEY` khỏi giá trị mặc định trong `.env.example`.
- `ALLOWED_ORIGIN` đã set đúng domain thật (để trống sẽ chặn hết CORS).
- Đã cấu hình ≥1 AI provider thật qua UI và bấm "Kiểm tra kết nối" xác nhận ✅.
- Đã hiểu rõ rủi ro Zalo unofficial API (README mục "Lưu ý rủi ro") trước khi vận hành thật.
