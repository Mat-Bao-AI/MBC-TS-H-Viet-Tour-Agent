"""Khởi tạo LLM dùng chung cho các agent (parser, timeline) — đa provider.

Hỗ trợ Gemini và Azure OpenAI. Tự phát hiện provider nào đã cấu hình thật
(app/core/config.py: Settings.configured_llm_providers). Nếu ≥2 provider cùng
lúc: dùng provider chính (LLM_PRIMARY_PROVIDER) trước, tự động fallback sang
provider còn lại nếu provider chính lỗi (rate limit, timeout, API error...) —
qua cơ chế `.with_fallbacks()` chuẩn của LangChain.
"""

import logging
from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import AzureChatOpenAI

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def _build_gemini(temperature: float) -> ChatGoogleGenerativeAI:
    settings = get_settings()
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=settings.gemini_api_key,
        temperature=temperature,
    )


def _build_azure_openai(temperature: float) -> AzureChatOpenAI:
    settings = get_settings()
    return AzureChatOpenAI(
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        azure_deployment=settings.azure_openai_deployment,
        api_version=settings.azure_openai_api_version,
        temperature=temperature,
    )


_PROVIDER_BUILDERS = {
    "gemini": _build_gemini,
    "azure_openai": _build_azure_openai,
}


def log_llm_provider_status() -> None:
    """Gọi 1 lần lúc app khởi động (app/main.py) — cảnh báo nếu ≥2 provider
    được cấu hình thật cùng lúc, để không ai vô tình trả tiền/quota cho cả 2
    mà không biết cái nào đang thực sự được dùng."""
    settings = get_settings()
    providers = settings.configured_llm_providers

    if not providers:
        logger.warning(
            "⚠️ Chưa cấu hình LLM provider nào (GEMINI_API_KEY / AZURE_OPENAI_*) "
            "— agent trích xuất/sinh timeline sẽ lỗi khi gọi."
        )
    elif len(providers) > 1:
        logger.warning(
            "⚠️ Phát hiện %d LLM provider được cấu hình cùng lúc: %s — dùng '%s' "
            "làm chính, tự động chuyển sang provider còn lại nếu provider chính lỗi.",
            len(providers),
            providers,
            settings.effective_primary_llm_provider,
        )
    else:
        logger.info("LLM provider đang dùng: %s", providers[0])


@lru_cache(maxsize=16)
def get_structured_llm(schema, temperature: float = 0.2):
    """Trả về 1 Runnable đã bind structured output theo `schema`, tự fallback
    nếu >=2 provider được cấu hình.

    QUAN TRỌNG: `.with_structured_output()` được gọi TRÊN TỪNG provider TRƯỚC
    khi ghép `.with_fallbacks()` — `RunnableWithFallbacks` không có method
    `.with_structured_output()` (đó là method riêng của BaseChatModel), nên
    thứ tự ngược lại sẽ lỗi.
    """
    settings = get_settings()
    providers = settings.configured_llm_providers
    primary = settings.effective_primary_llm_provider

    if not providers or primary is None:
        raise RuntimeError(
            "Chưa cấu hình LLM provider nào — cần GEMINI_API_KEY hoặc đủ bộ "
            "AZURE_OPENAI_ENDPOINT/API_KEY/DEPLOYMENT trong .env."
        )

    # Provider chính đứng đầu, các provider còn lại làm fallback theo thứ tự.
    ordered = [primary] + [p for p in providers if p != primary]

    structured_models = [_PROVIDER_BUILDERS[name](temperature).with_structured_output(schema) for name in ordered]

    if len(structured_models) == 1:
        return structured_models[0]

    return structured_models[0].with_fallbacks(structured_models[1:])
