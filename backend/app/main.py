"""FastAPI entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.api.v1.public import router as public_router
from app.core.config import get_settings
from app.core.llm import log_llm_provider_status

logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(name)s: %(message)s")

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    log_llm_provider_status()  # cảnh báo ngay lúc khởi động nếu ≥2 LLM provider cùng cấu hình
    yield


app = FastAPI(
    title="viet-tour-agent-zalo API",
    description="Agent AI soạn timeline tour từ tài liệu thô và gửi thông báo qua Zalo.",
    version="0.1.0",
    lifespan=lifespan,
)

# allow_credentials=False vì auth dùng header X-API-Key (không phải cookie) —
# tránh luôn tổ hợp allow_origins="*" + allow_credentials=True (trình duyệt
# chặn, và là anti-pattern CORS phổ biến).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.allowed_origin] if settings.is_production else ["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    providers = settings.configured_llm_providers
    return {
        "status": "ok",
        "environment": settings.environment,
        "llm_providers": {
            "configured": providers,
            "primary": settings.effective_primary_llm_provider,
            "fallback_active": len(providers) > 1,
        },
    }


app.include_router(api_router)

# public_router KHÔNG mount qua api_router — cố tình đứng ngoài dependency
# require_api_key (mọi router khác trong api/v1 đều bắt buộc X-API-Key, xem
# app/api/v1/__init__.py). Đây là lối đi công khai DUY NHẤT của toàn bộ
# backend, xem cảnh báo bảo mật ở đầu app/api/v1/public.py.
app.include_router(public_router, prefix="/api/v1")
