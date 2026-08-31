import express from "express";
import { startQrLogin, getStatus, logout, findUserByPhone, sendTextMessage } from "./zaloClient.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;
const API_KEY = process.env.API_KEY || "";

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// API key tối thiểu — cùng cơ chế với backend (app/core/security.py). Service
// này gọi trực tiếp được API gửi tin Zalo cá nhân nên đặc biệt cần chặn truy
// cập ngẫu nhiên nếu port 4000 lỡ lộ ra ngoài mạng nội bộ.
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (!API_KEY) {
    return res.status(500).json({ error: "API_KEY chưa được cấu hình cho zalo-bridge." });
  }
  if (req.get("x-api-key") !== API_KEY) {
    return res.status(401).json({ error: "Thiếu hoặc sai x-api-key." });
  }
  next();
});

app.post("/login/qr/start", (_req, res) => {
  res.json(startQrLogin());
});

app.get("/login/status", (_req, res) => {
  res.json(getStatus());
});

app.post("/login/logout", (_req, res) => {
  res.json(logout());
});

app.get("/users/resolve", async (req, res) => {
  const phone = req.query.phone;
  if (!phone) {
    return res.status(400).json({ error: "Thiếu query param 'phone'" });
  }
  try {
    const user = await findUserByPhone(String(phone));
    if (!user || !user.uid) {
      return res.status(404).json({ error: `Không tìm thấy user Zalo cho SĐT ${phone}` });
    }
    res.json({ zaloId: user.uid, displayName: user.display_name || user.zalo_name || null });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || String(err) });
  }
});

app.post("/messages/send", async (req, res) => {
  const { zaloId, text } = req.body || {};
  if (!zaloId || !text) {
    return res.status(400).json({ error: "Thiếu 'zaloId' hoặc 'text' trong body" });
  }
  try {
    await sendTextMessage(zaloId, text);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`[zalo-bridge] listening on :${PORT}`);
});
