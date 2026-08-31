"""Schema cho UI Admin quản lý cấu hình hệ thống (app/api/v1/admin_settings.py)
— AI provider key, Telegram bot. GET không bao giờ trả giá trị đã lưu (chỉ
đã cấu hình hay chưa + đang dùng nguồn nào) — tránh lộ secret thật ra
response, kể cả cho Admin đang xem lại chính config mình vừa lưu."""

from pydantic import BaseModel


class AIProviderStatus(BaseModel):
    provider: str
    label: str
    configured: bool
    # "db" = Admin đã lưu qua UI, "env" = đang dùng fallback .env, "none" = chưa cấu hình gì.
    source: str


class SystemSettingsOut(BaseModel):
    ai_providers: list[AIProviderStatus]
    llm_primary_provider: str
    effective_primary_provider: str | None
    telegram_configured: bool
    telegram_source: str


class GeminiConfigIn(BaseModel):
    api_key: str


class AzureOpenAIConfigIn(BaseModel):
    endpoint: str
    api_key: str
    deployment: str
    model: str
    api_version: str = "2024-12-01-preview"


class TelegramConfigIn(BaseModel):
    bot_token: str
    webhook_secret: str


class LlmPrimaryProviderIn(BaseModel):
    provider: str
