/**
 * zaloClient — quản lý 1 phiên đăng nhập Zalo Personal (unofficial, qua QR)
 * bằng thư viện zca-js, và expose các thao tác backend Python cần dùng:
 * đăng nhập QR, tìm user theo SĐT, gửi tin nhắn 1-1.
 *
 * ⚠️ Thư viện không chính thức, vi phạm ToS Zalo — dùng cho tài khoản cá nhân
 * của chính HDV, có rủi ro bị khoá tài khoản (xem README gốc).
 *
 * ⚠️ GIỚI HẠN ĐÃ XÁC NHẬN (đọc dist/zalo.d.ts của zca-js@2.1.2): việc đăng
 * nhập lại bằng cookie đã lưu (`loginCookie`) là method PRIVATE trong class
 * Zalo — không có API public để tái sử dụng session mà không quét QR lại.
 * Vì vậy Phase 1 CẦN quét QR lại mỗi khi container này restart. Có lưu lại
 * {cookie, imei, userAgent} vào storage/session.json để tham khảo / dùng thủ
 * công nếu cần, nhưng KHÔNG tự động nạp lại — tránh gọi 1 API private có thể
 * đổi/gỡ bất kỳ lúc nào ở bản sau. Việc này để Phase 2 khi có xác nhận chính
 * thức từ tài liệu zca-js.
 *
 * Giới hạn khác: 1 process chỉ giữ được 1 phiên đăng nhập tại 1 thời điểm —
 * đủ cho MVP 1 HDV / 1 workspace. Multi-tenant là việc của Phase 2.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Zalo, ThreadType, LoginQRCallbackEventType } from "zca-js";

const SESSION_FILE = path.resolve("./storage/session.json");

/**
 * @type {{
 *   status: "idle"|"qr_pending"|"qr_scanned"|"success"|"error",
 *   qrDataUrl: string|null,
 *   displayName: string|null,
 *   error: string|null,
 *   api: any,
 * }}
 */
let state = { status: "idle", qrDataUrl: null, displayName: null, error: null, api: null };

/**
 * ⚠️ BẢO MẬT: {cookie, imei} tương đương credential đăng nhập Zalo cá nhân —
 * lưu ra storage/session.json dưới dạng PLAINTEXT (không mã hoá), chỉ để
 * tham khảo/dùng thủ công, KHÔNG tự động nạp lại (xem ghi chú đầu file). Đã
 * gitignore, nhưng nếu server bị xâm nhập, ai đọc được file này có thể chiếm
 * phiên Zalo. Không copy file này ra ngoài, không log nội dung ra console.
 */
async function persistLoginInfo({ cookie, imei, userAgent }) {
  try {
    await fs.mkdir(path.dirname(SESSION_FILE), { recursive: true });
    await fs.writeFile(
      SESSION_FILE,
      JSON.stringify({ cookie, imei, userAgent, savedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
  } catch (err) {
    console.error("[zalo-bridge] Không lưu được session (không chặn luồng đăng nhập):", err);
  }
}

function handleLoginQrEvent(event) {
  switch (event.type) {
    case LoginQRCallbackEventType.QRCodeGenerated:
      state.status = "qr_pending";
      // zca-js (dist/apis/loginQR.js) TỰ STRIP tiền tố "data:image/png;base64,"
      // khỏi event.data.image trước khi gọi callback — event.data.image chỉ là
      // base64 thuần, phải tự thêm lại tiền tố mới render được như <img src>.
      // Thiếu bước này khiến browser hiểu chuỗi base64 là 1 URL/path và cố gọi
      // HTTP request với path dài hàng chục KB -> lỗi 431 Request Header Fields
      // Too Large (đã gặp thật, xem lịch sử debug).
      state.qrDataUrl = `data:image/png;base64,${event.data.image}`;
      break;
    case LoginQRCallbackEventType.QRCodeExpired:
      state.status = "error";
      state.error = "Mã QR đã hết hạn — gọi lại POST /login/qr/start để lấy mã mới.";
      break;
    case LoginQRCallbackEventType.QRCodeScanned:
      state.status = "qr_scanned";
      state.displayName = event.data.display_name || null;
      break;
    case LoginQRCallbackEventType.QRCodeDeclined:
      state.status = "error";
      state.error = "Đã từ chối đăng nhập trên điện thoại.";
      break;
    case LoginQRCallbackEventType.GotLoginInfo:
      // Best-effort — xem ghi chú giới hạn ở đầu file, KHÔNG dùng để tự nạp lại session.
      void persistLoginInfo(event.data);
      break;
    default:
      break;
  }
}

export function startQrLogin() {
  if (state.status === "success" || state.status === "qr_pending" || state.status === "qr_scanned") {
    return getStatus();
  }

  state = { status: "qr_pending", qrDataUrl: null, displayName: null, error: null, api: null };

  const zalo = new Zalo({ selfListen: false, checkUpdate: true, logging: true });

  zalo
    .loginQR({}, handleLoginQrEvent)
    .then((api) => {
      state.status = "success";
      state.api = api;
      state.qrDataUrl = null;
      try {
        api.listener?.start?.();
      } catch (err) {
        console.error("[zalo-bridge] Không start được listener (không chặn gửi tin 1 chiều):", err);
      }
    })
    .catch((err) => {
      state.status = "error";
      state.error = err?.message || String(err);
    });

  return getStatus();
}

export function getStatus() {
  return {
    status: state.status,
    qrDataUrl: state.qrDataUrl,
    displayName: state.displayName,
    error: state.error,
  };
}

/**
 * Ngắt kết nối tài khoản Zalo đang đăng nhập (dùng cho nút "Ngắt kết nối" /
 * "Đăng xuất" ở Settings). Best-effort dừng listener rồi reset state về
 * "idle" — KHÔNG xoá storage/session.json (chỉ tham khảo, xem ghi chú đầu
 * file), lần đăng nhập tiếp theo vẫn phải quét QR mới như bình thường.
 */
export function logout() {
  try {
    state.api?.listener?.stop?.();
  } catch (err) {
    console.error("[zalo-bridge] Lỗi khi dừng listener lúc logout (không chặn logout):", err);
  }
  state = { status: "idle", qrDataUrl: null, displayName: null, error: null, api: null };
  return getStatus();
}

function requireLoggedIn() {
  if (state.status !== "success" || !state.api) {
    const err = new Error("Chưa đăng nhập Zalo — gọi POST /login/qr/start và quét QR trước.");
    err.statusCode = 409;
    throw err;
  }
  return state.api;
}

export async function findUserByPhone(phoneNumber) {
  const api = requireLoggedIn();
  return api.findUser(phoneNumber);
}

export async function sendTextMessage(zaloId, text) {
  const api = requireLoggedIn();
  return api.sendMessage({ msg: text }, zaloId, ThreadType.User);
}
