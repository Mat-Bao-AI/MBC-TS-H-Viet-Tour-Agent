"""Khởi tạo LLM dùng chung cho các agent (parser, timeline) — đa provider.

Hỗ trợ Gemini và Azure OpenAI. Tự phát hiện provider nào đã cấu hình thật
(app/core/dynamic_config.py — ưu tiên Admin đã nhập qua UI, fallback .env).
Nếu ≥2 provider cùng lúc: dùng provider chính (llm_primary_provider) trước,
tự động fallback sang provider còn lại nếu provider chính lỗi (rate limit,
timeout, API error...) qua cơ chế `.with_fallbacks()` chuẩn của LangChain.

KHÔNG cache Runnable đã build (khác bản cũ dùng @lru_cache) — Admin có thể
đổi key qua UI bất kỳ lúc nào, cache sẽ giữ key CŨ và âm thầm gọi sai
tài khoản cho tới khi restart. Chi phí build lại (chỉ tạo object Python,
chưa gọi network) không đáng kể so với rủi ro đó.
"""

import logging
import re

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import AzureChatOpenAI

from app.core import dynamic_config

logger = logging.getLogger(__name__)

# Các model "reasoning" đời mới (GPT-5, o1, o3, o4...) chỉ chấp nhận
# temperature mặc định (1) — set giá trị khác sẽ bị OpenAI/Azure trả 400
# "Unsupported value: 'temperature' ... Only the default (1) value is
# supported." Phát hiện qua tên model/deployment để biết khi nào PHẢI bỏ
# tham số temperature thay vì gửi lên và ăn lỗi.
_FIXED_TEMPERATURE_MODEL_RE = re.compile(r"(^|[^a-z0-9])(gpt-5|o1|o3|o4)([^a-z0-9]|$)", re.IGNORECASE)


def _supports_custom_temperature(*names: str) -> bool:
    return not any(_FIXED_TEMPERATURE_MODEL_RE.search(name) for name in names if name)


async def _build_gemini(temperature: float) -> ChatGoogleGenerativeAI:
    api_key = await dynamic_config.get_gemini_api_key()
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=api_key,
        temperature=temperature,
    )


async def _build_azure_openai(temperature: float) -> AzureChatOpenAI:
    cfg = await dynamic_config.get_azure_openai_config()
    kwargs = dict(
        azure_endpoint=cfg["endpoint"],
        api_key=cfg["api_key"],
        azure_deployment=cfg["deployment"],
        api_version=cfg["api_version"],
    )
    if _supports_custom_temperature(cfg["model"], cfg["deployment"]):
        kwargs["temperature"] = temperature
    else:
        logger.info(
            "Model Azure OpenAI '%s' (deployment '%s') chỉ hỗ trợ temperature mặc định — bỏ qua tham số temperature=%s.",
            cfg["model"],
            cfg["deployment"],
            temperature,
        )
    return AzureChatOpenAI(**kwargs)


_PROVIDER_BUILDERS = {
    "gemini": _build_gemini,
    "azure_openai": _build_azure_openai,
}


async def log_llm_provider_status() -> None:
    """Gọi 1 lần lúc app khởi động (app/main.py) — cảnh báo nếu ≥2 provider
    được cấu hình thật cùng lúc, để không ai vô tình trả tiền/quota cho cả 2
    mà không biết cái nào đang thực sự được dùng."""
    providers = await dynamic_config.configured_llm_providers()

    if not providers:
        logger.warning(
            "⚠️ Chưa cấu hình LLM provider nào (Gemini/Azure OpenAI, xem UI Admin hoặc .env) "
            "— agent trích xuất/sinh timeline sẽ lỗi khi gọi."
        )
    elif len(providers) > 1:
        primary = await dynamic_config.effective_primary_llm_provider()
        logger.warning(
            "⚠️ Phát hiện %d LLM provider được cấu hình cùng lúc: %s — dùng '%s' "
            "làm chính, tự động chuyển sang provider còn lại nếu provider chính lỗi.",
            len(providers),
            providers,
            primary,
        )
    else:
        logger.info("LLM provider đang dùng: %s", providers[0])


async def get_structured_llm(schema, temperature: float = 0.2):
    """Trả về 1 Runnable đã bind structured output theo `schema`, tự fallback
    nếu >=2 provider được cấu hình.

    QUAN TRỌNG: `.with_structured_output()` được gọi TRÊN TỪNG provider TRƯỚC
    khi ghép `.with_fallbacks()` — `RunnableWithFallbacks` không có method
    `.with_structured_output()` (đó là method riêng của BaseChatModel), nên
    thứ tự ngược lại sẽ lỗi.
    """
    providers = await dynamic_config.configured_llm_providers()
    primary = await dynamic_config.effective_primary_llm_provider()

    if not providers or primary is None:
        raise RuntimeError(
            "Chưa cấu hình LLM provider nào — cần Gemini API key hoặc đủ bộ "
            "Azure OpenAI endpoint/key/deployment (nhập qua UI Admin hoặc .env)."
        )

    # Provider chính đứng đầu, các provider còn lại làm fallback theo thứ tự.
    ordered = [primary] + [p for p in providers if p != primary]

    built = [await _PROVIDER_BUILDERS[name](temperature) for name in ordered]
    structured_models = [m.with_structured_output(schema) for m in built]

    if len(structured_models) == 1:
        return structured_models[0]

    return structured_models[0].with_fallbacks(structured_models[1:])
