import express from "express";
import { startQrLogin, getStatus, findUserByPhone, sendTextMessage } from "./zaloClient.js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/login/qr/start", (_req, res) => {
  res.json(startQrLogin());
});

app.get("/login/status", (_req, res) => {
  res.json(getStatus());
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
