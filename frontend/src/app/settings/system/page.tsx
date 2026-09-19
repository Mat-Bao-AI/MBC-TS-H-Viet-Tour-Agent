"use client";

// Cài đặt hệ thống — CHỈ Admin, tập trung mọi cấu hình toàn ứng dụng (khác
// /settings — khu vực cá nhân dùng chung Admin+User, xem trang đó). Theo
// đúng screen Stitch "Cài đặt hệ thống" (project 8575116696704742662, screen
// projects/.../screens/a1d30b1c91734e97946c63cb21f2db1e): 1 thanh tab ngang
// (Thương hiệu / Người dùng / AI) thay vì 3 trang rời — dồn 1 chỗ vì đây đều
// là cấu hình admin-only, tránh rải rác nhiều route.
//
// AI provider key NGAY TRÊN UI, áp dụng liền không cần sửa .env/restart
// container (xem backend app/core/dynamic_config.py: DB ưu tiên, fallback
// .env nếu Admin chưa cấu hình qua đây). Backend tự chặn 403 cho User
// thường, ở đây thêm chặn phía FE để không hiện form vô nghĩa.
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
import { BackIcon } from "@/components/navigation-icons";
import { Input } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import { CompanyBrandingCard } from "@/components/company-branding-card";
import { UserManagementPanel } from "@/components/user-management-panel";

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

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function runTest() {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await api.testAiProvider(status.provider));
    } catch (err) {
      setTestResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setTesting(false);
    }
  }

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
      runTest();
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
      setTestResult(null);
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
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Sửa
            </Button>
            {status.source === "db" && (
              <Button variant="outline" size="sm" onClick={handleClear} disabled={busy}>
                Xoá khỏi DB
              </Button>
            )}
            {status.configured && (
              <Button variant="outline" size="sm" onClick={runTest} disabled={testing}>
                {testing ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
              </Button>
            )}
          </div>
          {testResult && (
            <p className={`text-xs ${testResult.ok ? "text-success" : "text-destructive"}`}>
              {testResult.ok ? "✅ " : "❌ "}
              {testResult.message}
            </p>
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
  allProviders,
  configuredProviders,
  value,
  effective,
  onSaved,
}: {
  allProviders: AIProviderStatus[];
  configuredProviders: AIProviderStatus[];
  value: string;
  effective: string | null;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const effectiveLabel = allProviders.find((p) => p.provider === effective)?.label ?? effective ?? "—";
  const canChoose = configuredProviders.length > 1;

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
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Provider đang dùng</p>
          <p className="text-xs text-muted-foreground">
            Tin nhắn/timeline hiện đang được AI tạo bằng: <span className="font-medium text-foreground">{effectiveLabel}</span>
          </p>
        </div>
        {canChoose && (
          <select
            className="rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            value={value}
            disabled={busy}
            onChange={(e) => handleChange(e.target.value)}
          >
            {configuredProviders.map((p) => (
              <option key={p.provider} value={p.provider}>
                {p.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {canChoose && (
        <p className="text-xs text-muted-foreground">
          Đã cấu hình {configuredProviders.length} provider cùng lúc — hệ thống dùng provider chính (chọn ở trên)
          trước, chỉ tự động chuyển sang provider còn lại nếu provider chính bị lỗi (hết quota, timeout...).
        </p>
      )}
    </div>
  );
}

function BraveSearchCard({ status, onSaved }: { status: AIProviderStatus; onSaved: (msg: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function save() {
    if (!apiKey.trim()) return setResult("Nhập Brave Search API key trước khi lưu.");
    setBusy(true);
    try {
      await api.setBraveSearchConfig(apiKey.trim());
      setApiKey("");
      setEditing(false);
      onSaved("Đã lưu Brave Search. Agent sẽ chỉ dùng để bổ sung nguồn web.");
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    try {
      const response = await api.testBraveSearch();
      setResult(`${response.ok ? "✅" : "❌"} ${response.message}`);
    } catch (err) {
      setResult(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div><p className="font-semibold">{status.label}</p><p className="text-xs text-muted-foreground">Tuỳ chọn — không có key vẫn tạo tour từ URL được.</p></div>
        <StatusBadge configured={status.configured} source={status.source} />
      </div>
      {editing ? (
        <div className="flex flex-col gap-2"><Field label="API Key" type="password" value={apiKey} onChange={setApiKey} placeholder="BSA..." /><div className="flex gap-2"><Button size="sm" onClick={save} disabled={busy}>Lưu</Button><Button size="sm" variant="outline" onClick={() => setEditing(false)} disabled={busy}>Huỷ</Button></div></div>
      ) : <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setEditing(true)}>Sửa</Button>{status.configured && <><Button size="sm" variant="outline" onClick={test} disabled={busy}>Kiểm tra kết nối</Button>{status.source === "db" && <Button size="sm" variant="outline" onClick={async () => { await api.clearBraveSearchConfig(); onSaved("Đã xoá Brave Search khỏi DB."); }}>Xoá khỏi DB</Button>}</>}</div>}
      {result && <p className="text-xs text-muted-foreground">{result}</p>}
    </div>
  );
}

const TABS = [
  { key: "brand", label: "Thương hiệu" },
  { key: "users", label: "Người dùng" },
  { key: "ai", label: "AI" },
];

export default function SystemSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState("brand");
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
          <BackIcon /> Quay lại
        </Button>
      </div>
    );
  }

  const configuredProviders = settings?.ai_providers.filter((p) => p.configured) ?? [];

  return (
    <div className="flex flex-col gap-5 pt-2 pb-10">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Quay lại" className="text-lg">
          <BackIcon />
        </button>
        <h1 className="text-xl font-bold">Cài đặt hệ thống</h1>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {notice && <p className="text-sm text-success">{notice}</p>}

      <Tabs items={TABS} value={tab} onChange={setTab} />

      {tab === "brand" && (
        <section className="flex flex-col gap-3">
          <CompanyBrandingCard />
        </section>
      )}

      {tab === "users" && (
        <section className="flex flex-col gap-3">
          <UserManagementPanel />
        </section>
      )}

      {tab === "ai" &&
        (!settings ? (
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        ) : (
          <section className="flex flex-col gap-3">
            {configuredProviders.length >= 1 && (
              <PrimaryProviderSelector
                allProviders={settings.ai_providers}
                configuredProviders={configuredProviders}
                value={settings.llm_primary_provider}
                effective={settings.effective_primary_provider}
                onSaved={() => {
                  setNotice("Đã cập nhật provider chính.");
                  reload();
                }}
              />
            )}
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
            <BraveSearchCard status={settings.brave_search} onSaved={(msg) => { setNotice(msg); reload(); }} />
          </section>
        ))}

    </div>
  );
}
