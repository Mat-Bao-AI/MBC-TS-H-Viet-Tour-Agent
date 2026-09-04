"""admin_settings.py — Admin xem/sửa cấu hình hệ thống (AI provider key) NGAY
TRÊN UI, không cần sửa .env/restart container (xem app/core/dynamic_config.py
cho logic ưu tiên DB/fallback .env thật).

Toàn bộ route CHỈ Admin — dependencies=[Depends(require_admin)] ở router,
không phải User thường (HDV) dù đã đăng nhập."""

from fastapi import APIRouter, Depends, HTTPException

from app.core import dynamic_config, llm
from app.core.config import get_settings
from app.core.security import require_admin
from app.schemas.settings import (
    AIProviderStatus,
    AzureOpenAIConfigIn,
    GeminiConfigIn,
    LlmPrimaryProviderIn,
    ProviderTestResult,
    SystemSettingsOut,
)

router = APIRouter(prefix="/admin/settings", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("", response_model=SystemSettingsOut)
async def get_system_settings() -> SystemSettingsOut:
    settings = get_settings()

    gemini_db = await dynamic_config.get_ai_provider_config("gemini")
    gemini_configured = await dynamic_config.gemini_configured()
    gemini_source = "db" if gemini_db else ("env" if settings.gemini_configured else "none")

    azure_db = await dynamic_config.get_ai_provider_config("azure_openai")
    azure_configured = await dynamic_config.azure_openai_configured()
    azure_source = "db" if azure_db else ("env" if settings.azure_openai_configured else "none")

    return SystemSettingsOut(
        ai_providers=[
            AIProviderStatus(provider="gemini", label="Google Gemini", configured=gemini_configured, source=gemini_source),
            AIProviderStatus(
                provider="azure_openai", label="Azure OpenAI", configured=azure_configured, source=azure_source
            ),
        ],
        llm_primary_provider=await dynamic_config.get_llm_primary_provider_preference(),
        effective_primary_provider=await dynamic_config.effective_primary_llm_provider(),
    )


@router.put("/ai-providers/gemini", status_code=204)
async def set_gemini_config(payload: GeminiConfigIn) -> None:
    await dynamic_config.set_ai_provider_config("gemini", {"api_key": payload.api_key})


@router.delete("/ai-providers/gemini", status_code=204)
async def clear_gemini_config() -> None:
    await dynamic_config.clear_ai_provider_config("gemini")


@router.put("/ai-providers/azure-openai", status_code=204)
async def set_azure_openai_config(payload: AzureOpenAIConfigIn) -> None:
    await dynamic_config.set_ai_provider_config(
        "azure_openai",
        {
            "endpoint": payload.endpoint,
            "api_key": payload.api_key,
            "deployment": payload.deployment,
            "model": payload.model,
            "api_version": payload.api_version,
        },
    )


@router.delete("/ai-providers/azure-openai", status_code=204)
async def clear_azure_openai_config() -> None:
    await dynamic_config.clear_ai_provider_config("azure_openai")


@router.put("/llm-primary-provider", status_code=204)
async def set_llm_primary_provider(payload: LlmPrimaryProviderIn) -> None:
    await dynamic_config.set_llm_primary_provider_preference(payload.provider)


@router.post("/ai-providers/{provider}/test", response_model=ProviderTestResult)
async def test_ai_provider(provider: str) -> ProviderTestResult:
    if provider not in ("gemini", "azure_openai"):
        raise HTTPException(status_code=404, detail=f"Provider '{provider}' không tồn tại.")

    configured = await dynamic_config.configured_llm_providers()
    if provider not in configured:
        return ProviderTestResult(ok=False, message="Chưa cấu hình — nhập và lưu key trước khi kiểm tra.")

    ok, message = await llm.test_provider(provider)
    return ProviderTestResult(ok=ok, message=message)
