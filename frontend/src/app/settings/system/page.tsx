"use client";

// Cài đặt hệ thống — Admin nhập/đổi AI provider key + Telegram bot NGAY TRÊN
// UI, áp dụng liền không cần sửa .env/restart container (xem backend
// app/core/dynamic_config.py: DB ưu tiên, fallback .env nếu Admin chưa cấu
// hình qua đây). CHỈ Admin — backend tự chặn 403 cho User thường, ở đây
// thêm chặn phía FE để không hiện form vô nghĩa.
//
// Field bí mật (API key/token) luôn để TRỐNG khi mở form — không hiện lại
// giá trị đã lưu (đã mã hoá phía backend, và show lại là thói quen xấu cho
// UI quản lý secret). Badge trạng thái cho biết ĐANG DÙNG NGUỒN NÀO (đã lưu
// qua UI hay đang fallback .env), không phải giá trị thật.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, AIProviderStatus, SystemSettings } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function StatusBadge({ configured, source }: { configured: boolean; source: string }) {
  if (!configured) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        <span className="material-symbols-outlined text-sm">radio_button_unchecked</span>
        Chưa cấu hình
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
      <span className="material-symbols-outlined text-sm">check_circle</span>
      Đã cấu hình ({source === "db" ? "qua UI" : "qua .env"})
    </span>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium text-foreground">{label}</span>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function ProviderCard({
  status,
  onSaved,
}: {
  status: AIProviderStatus;
  onSaved: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [geminiKey, setGeminiKey] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [azureKey, setAzureKey] = useState("");
  const [deployment, setDeployment] = useState("");
  const [model, setModel] = useState("");
  const [apiVersion, setApiVersion] = useState("2024-12-01-preview");

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      if (status.provider === "gemini") {
        if (!geminiKey.trim()) throw new Error("Nhập API key trước khi lưu.");
        await api.setGeminiConfig(geminiKey.trim());
      } else {
        if (!endpoint.trim() || !azureKey.trim() || !deployment.trim()) {
          throw new Error("Điền đủ Endpoint/API Key/Deployment.");
        }
        await api.setAzureOpenAIConfig({
          endpoint: endpoint.trim(),
          api_key: azureKey.trim(),
          deployment: deployment.trim(),
          model: model.trim(),
          api_version: apiVersion.trim(),
        });
      }
      setEditing(false);
      setGeminiKey("");
      setAzureKey("");
      onSaved(`Đã lưu ${status.label}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    setError(null);
    try {
      if (status.provider === "gemini") await api.clearGeminiConfig();
      else await api.clearAzureOpenAIConfig();
      onSaved(`Đã xoá cấu hình ${status.label} khỏi DB (rơi về .env nếu có).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">smart_toy</span>
          <span className="font-semibold">{status.label}</span>
        </div>
        <StatusBadge configured={status.configured} source={status.source} />
      </div>

      {!editing ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Sửa
          </Button>
          {status.source === "db" && (
            <Button variant="outline" size="sm" onClick={handleClear} disabled={busy}>
              Xoá khỏi DB
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {status.provider === "gemini" ? (
            <Field label="API Key" type="password" value={geminiKey} onChange={setGeminiKey} placeholder="AIza..." />
          ) : (
            <>
              <Field
                label="Endpoint"
                value={endpoint}
                onChange={setEndpoint}
                placeholder="https://<resource>.cognitiveservices.azure.com/"
              />
              <Field label="API Key" type="password" value={azureKey} onChange={setAzureKey} placeholder="••••••••" />
              <Field label="Deployment" value={deployment} onChange={setDeployment} placeholder="gpt-5-chat" />
              <Field label="Model" value={model} onChange={setModel} placeholder="gpt-5-chat" />
              <Field label="API Version" value={apiVersion} onChange={setApiVersion} placeholder="2024-12-01-preview" />
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy}>
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrimaryProviderSelector({
  providers,
  value,
  effective,
  onSaved,
}: {
  providers: AIProviderStatus[];
  value: string;
  effective: string | null;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleChange(provider: string) {
    setBusy(true);
    try {
      await api.setLlmPrimaryProvider(provider);
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div>
        <p className="text-sm font-semibold">Provider chính</p>
        <p className="text-xs text-muted-foreground">Đang dùng thật: {effective ?? "—"}</p>
      </div>
      <select
        className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        value={value}
        disabled={busy}
        onChange={(e) => handleChange(e.target.value)}
      >
        {providers.map((p) => (
          <option key={p.provider} value={p.provider}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TelegramCard({
  configured,
  source,
  onSaved,
}: {
  configured: boolean;
  source: string;
  onSaved: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [botToken, setBotToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      if (!botToken.trim() || !webhookSecret.trim()) throw new Error("Điền đủ Bot Token và Webhook Secret.");
      await api.setTelegramConfig(botToken.trim(), webhookSecret.trim());
      setEditing(false);
      setBotToken("");
      setWebhookSecret("");
      onSaved("Đã lưu cấu hình Telegram.");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleClear() {
    setBusy(true);
    setError(null);
    try {
      await api.clearTelegramConfig();
      onSaved("Đã xoá cấu hình Telegram khỏi DB (rơi về .env nếu có).");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">send</span>
          <span className="font-semibold">Telegram Bot</span>
        </div>
        <StatusBadge configured={configured} source={source} />
      </div>

      {!editing ? (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Sửa
          </Button>
          {source === "db" && (
            <Button variant="outline" size="sm" onClick={handleClear} disabled={busy}>
              Xoá khỏi DB
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Field label="Bot Token" type="password" value={botToken} onChange={setBotToken} placeholder="123456:ABC-DEF..." />
          <Field
            label="Webhook Secret"
            type="password"
            value={webhookSecret}
            onChange={setWebhookSecret}
            placeholder="chuỗi bí mật tự đặt"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={busy}>
              {busy ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy}>
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SystemSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function reload() {
    try {
      setSettings(await api.getSystemSettings());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user && user.role !== "admin") {
    return (
      <div className="flex flex-col items-center gap-3 pt-16 text-center">
        <p className="text-sm text-muted-foreground">Chỉ Admin mới xem được trang này.</p>
        <Button variant="outline" onClick={() => router.back()}>
          ← Quay lại
        </Button>
      </div>
    );
  }

  const configuredProviders = settings?.ai_providers.filter((p) => p.configured) ?? [];

  return (
    <div className="flex flex-col gap-5 pt-2 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
          ←
        </button>
        <h1 className="text-xl font-bold">Cài đặt hệ thống</h1>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-success">{notice}</p>}

      {!settings ? (
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      ) : (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nhà cung cấp AI</h2>
            {settings.ai_providers.map((p) => (
              <ProviderCard
                key={p.provider}
                status={p}
                onSaved={(msg) => {
                  setNotice(msg);
                  reload();
                }}
              />
            ))}
            {configuredProviders.length > 1 && (
              <PrimaryProviderSelector
                providers={configuredProviders}
                value={settings.llm_primary_provider}
                effective={settings.effective_primary_provider}
                onSaved={() => {
                  setNotice("Đã cập nhật provider chính.");
                  reload();
                }}
              />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Telegram</h2>
            <TelegramCard
              configured={settings.telegram_configured}
              source={settings.telegram_source}
              onSaved={(msg) => {
                setNotice(msg);
                reload();
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}
