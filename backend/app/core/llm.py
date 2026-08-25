"""Khởi tạo Gemini 1.5 Flash dùng chung cho các agent (parser, timeline).

Tách riêng để agent code không phải biết chi tiết cấu hình LLM — đổi model
provider sau này chỉ sửa 1 chỗ.
"""

from functools import lru_cache

from langchain_google_genai import ChatGoogleGenerativeAI

from app.core.config import get_settings


@lru_cache
def get_llm(temperature: float = 0.2) -> ChatGoogleGenerativeAI:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError(
            "GEMINI_API_KEY chưa được cấu hình trong .env — cần key để agent trích xuất/sinh timeline."
        )
    return ChatGoogleGenerativeAI(
        model="gemini-1.5-flash",
        google_api_key=settings.gemini_api_key,
        temperature=temperature,
    )
