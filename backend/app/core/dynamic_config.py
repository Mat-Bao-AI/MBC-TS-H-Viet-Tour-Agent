"""dynamic_config.py — nguồn THẬT SỰ để đọc config AI provider lúc runtime
(app/core/llm.py PHẢI đọc qua đây, không đọc thẳng Settings cho các field
này nữa).

Ưu tiên: giá trị Admin đã lưu qua UI (DB, mã hoá — app/core/crypto.py) LUÔN
dùng trước nếu có; chưa cấu hình qua UI thì rơi về .env (Settings) — deploy
cũ dùng .env vẫn chạy tiếp bình thường, không bị gãy ngay sau migration này,
Admin có thể chuyển dần sang UI khi rảnh.

Không cache — mỗi lần gọi là 1 query DB thật (nhanh, có primary key), đổi
gì trong Admin panel áp dụng NGAY cho lần gọi AI tiếp theo, không cần
restart container (đúng yêu cầu ban đầu: "để người dùng dễ dàng thay đổi
thông tin ngay trên UI")."""

import json

from sqlalchemy import select

from app.core.config import get_settings, is_configured_value
from app.core.crypto import decrypt, encrypt
from app.core.database import AsyncSessionLocal, SyncSessionLocal
from app.models.ai_provider_config import AIProviderConfig
from app.models.app_setting import AppSetting

# ---------------------------------------------------------------- app_settings

async def get_app_setting(key: str) -> str | None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AppSetting).where(AppSetting.key == key))
        row = result.scalar_one_or_none()
    if row is None or not row.value_encrypted:
        return None
    return decrypt(row.value_encrypted)


def get_app_setting_sync(key: str) -> str | None:
    """Bản sync — dùng trong Celery worker (chạy ngoài event loop, xem
    app/tasks/celery_worker.py: format_guest_message cần chữ ký công ty)."""
    with SyncSessionLocal() as db:
        row = db.execute(select(AppSetting).where(AppSetting.key == key)).scalar_one_or_none()
    if row is None or not row.value_encrypted:
        return None
    return decrypt(row.value_encrypted)


async def set_app_setting(key: str, value: str | None) -> None:
    """value=None hoặc rỗng — xoá giá trị đã lưu (fallback lại .env), không
    lưu chuỗi rỗng đã mã hoá (không có ý nghĩa gì)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AppSetting).where(AppSetting.key == key))
        row = result.scalar_one_or_none()
        encrypted = encrypt(value) if value and value.strip() else None
        if row is None:
            db.add(AppSetting(key=key, value_encrypted=encrypted))
        else:
            row.value_encrypted = encrypted
        await db.commit()


# ----------------------------------------------------------------- AI providers

async def get_ai_provider_config(provider: str) -> dict | None:
    """dict field thô (đã giải mã) Admin lưu qua UI cho `provider` — None nếu
    chưa cấu hình qua UI (không có nghĩa là provider không dùng được, xem
    get_gemini_api_key/get_azure_openai_config bên dưới có fallback .env)."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AIProviderConfig).where(
                AIProviderConfig.provider == provider, AIProviderConfig.is_enabled.is_(True)
            )
        )
        row = result.scalar_one_or_none()
    if row is None:
        return None
    return json.loads(decrypt(row.config_encrypted))


async def set_ai_provider_config(provider: str, config: dict) -> None:
    payload = encrypt(json.dumps(config))
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AIProviderConfig).where(AIProviderConfig.provider == provider))
        row = result.scalar_one_or_none()
        if row is None:
            db.add(AIProviderConfig(provider=provider, config_encrypted=payload, is_enabled=True))
        else:
            row.config_encrypted = payload
            row.is_enabled = True
        await db.commit()


async def clear_ai_provider_config(provider: str) -> None:
    """Tắt config Admin đã lưu qua UI — rơi về lại .env (nếu có) thay vì xoá
    hẳn row (giữ lịch sử, đơn giản hoá logic hơn phải xử lý "chưa từng có"
    khác "đã tắt")."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(AIProviderConfig).where(AIProviderConfig.provider == provider))
        row = result.scalar_one_or_none()
        if row is not None:
            row.is_enabled = False
            await db.commit()


async def get_gemini_api_key() -> str:
    cfg = await get_ai_provider_config("gemini")
    if cfg and cfg.get("api_key"):
        return cfg["api_key"]
    return get_settings().gemini_api_key


async def gemini_configured() -> bool:
    return is_configured_value(await get_gemini_api_key())


async def get_azure_openai_config() -> dict:
    cfg = await get_ai_provider_config("azure_openai") or {}
    settings = get_settings()
    return {
        "endpoint": cfg.get("endpoint") or settings.azure_openai_endpoint,
        "api_key": cfg.get("api_key") or settings.azure_openai_api_key,
        "deployment": cfg.get("deployment") or settings.azure_openai_deployment,
        "model": cfg.get("model") or settings.azure_openai_model,
        "api_version": cfg.get("api_version") or settings.azure_openai_api_version,
    }


async def azure_openai_configured() -> bool:
    cfg = await get_azure_openai_config()
    return all(is_configured_value(v) for v in (cfg["endpoint"], cfg["api_key"], cfg["deployment"]))


async def get_brave_search_api_key() -> str:
    cfg = await get_ai_provider_config("brave_search")
    if cfg and cfg.get("api_key"):
        return cfg["api_key"]
    return get_settings().brave_search_api_key


async def brave_search_configured() -> bool:
    return is_configured_value(await get_brave_search_api_key())


async def configured_llm_providers() -> list[str]:
    providers = []
    if await gemini_configured():
        providers.append("gemini")
    if await azure_openai_configured():
        providers.append("azure_openai")
    return providers


async def get_llm_primary_provider_preference() -> str:
    return await get_app_setting("llm_primary_provider") or get_settings().llm_primary_provider


async def set_llm_primary_provider_preference(provider: str) -> None:
    await set_app_setting("llm_primary_provider", provider)


async def effective_primary_llm_provider() -> str | None:
    """Provider THỰC SỰ được dùng đầu tiên — khác preference (chỉ là mong
    muốn) khi provider đó chưa thật sự cấu hình xong. Xem docstring gốc ở
    Settings.effective_primary_llm_provider (app/core/config.py) — cùng logic,
    chỉ đổi nguồn đọc sang DB-first."""
    providers = await configured_llm_providers()
    if not providers:
        return None
    preferred = await get_llm_primary_provider_preference()
    return preferred if preferred in providers else providers[0]
