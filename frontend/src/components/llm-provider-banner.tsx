"use client";

import { useEffect, useState } from "react";
import { api, HealthStatus } from "@/lib/api";

const PROVIDER_LABEL: Record<string, string> = {
  gemini: "Gemini",
  azure_openai: "Azure OpenAI",
};

/**
 * Cảnh báo khi ≥2 LLM provider được cấu hình cùng lúc (vd vừa thêm Azure
 * OpenAI trong khi Gemini vẫn còn key) — cho HDV/admin biết hệ thống đang tự
 * dùng provider nào làm chính + tự fallback khi cần (xem app/core/llm.py).
 */
export function LlmProviderBanner() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    api.getHealth().catch(() => null).then((h) => h && setHealth(h));
  }, []);

  if (!health || !health.llm_providers.fallback_active) return null;

  const { configured, primary } = health.llm_providers;
  const labels = configured.map((p) => PROVIDER_LABEL[p] ?? p);

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      ⚠️ Đang cấu hình song song {labels.length} LLM provider ({labels.join(" + ")}) — dùng{" "}
      <strong>{PROVIDER_LABEL[primary ?? ""] ?? primary}</strong> làm chính, tự động chuyển sang
      provider còn lại nếu provider chính lỗi.
    </div>
  );
}
