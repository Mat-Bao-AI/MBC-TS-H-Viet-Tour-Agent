"""FastAPI entrypoint."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.api.v1.account import login_router
from app.api.v1.company import router as company_router
from app.api.v1.public import router as public_router
from app.core import dynamic_config
from app.core.config import get_settings
from app.core.llm import log_llm_provider_status
from app.core.seed import seed_admin_if_configured

logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(name)s: %(message)s")

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await log_llm_provider_status()  # cảnh báo ngay lúc khởi động nếu ≥2 LLM provider cùng cấu hình
    await seed_admin_if_configured()  # tạo Admin đầu tiên nếu SEED_ADMIN_EMAIL được cấu hình
    yield


app = FastAPI(
    title="viet-tour-agent-zalo API",
    description="Agent AI soạn timeline tour từ tài liệu thô và gửi thông báo qua Zalo.",
    version="0.1.0",
    lifespan=lifespan,
)

# allow_credentials=False vì auth dùng header Authorization: Bearer (JWT lưu
# localStorage phía FE), không phải cookie —
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
    providers = await dynamic_config.configured_llm_providers()
    primary = await dynamic_config.effective_primary_llm_provider()
    return {
        "status": "ok",
        "environment": settings.environment,
        "llm_providers": {
            "configured": providers,
            "primary": primary,
            "fallback_active": len(providers) > 1,
        },
    }


app.include_router(api_router)

# 3 router dưới đây KHÔNG mount qua api_router — cố tình đứng ngoài dependency
# get_current_user (mọi router khác trong api/v1 đều bắt buộc JWT, xem
# app/api/v1/__init__.py). Đây là các lối đi công khai DUY NHẤT của backend:
# - public_router: trang lịch trình cho khách xem (app/api/v1/public.py)
# - login_router: chicken-and-egg — chưa đăng nhập thì chưa có JWT để gửi
#   (app/api/v1/account.py). Chỉ có /auth/login, KHÔNG có endpoint đăng ký.
# - company_router: GET công khai (cần hiện logo/tên ở /signin TRƯỚC khi đăng
#   nhập, và ở /t/[id] cho khách xem) — PUT/DELETE tự thêm require_admin
#   riêng từng route (app/api/v1/company.py), KHÔNG phải cả router public.
app.include_router(public_router, prefix="/api/v1")
app.include_router(login_router, prefix="/api/v1")
app.include_router(company_router, prefix="/api/v1")
