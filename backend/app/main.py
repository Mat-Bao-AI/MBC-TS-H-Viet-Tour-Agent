"""FastAPI entrypoint."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title="viet-tour-agent-zalo API",
    description="Agent AI soạn timeline tour từ tài liệu thô và gửi thông báo qua Zalo.",
    version="0.1.0",
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
    return {"status": "ok", "environment": settings.environment}


app.include_router(api_router)
