from fastapi import APIRouter, Depends

from app.api.v1 import account, agent, auth, dashboard, telegram, tours, zalo
from app.core.security import get_current_user

# Mọi route trong đây yêu cầu đăng nhập app thật (JWT) — thay require_api_key
# cũ. account.login_router (không cần token) mount riêng ở app/main.py.
api_router = APIRouter(prefix="/api/v1", dependencies=[Depends(get_current_user)])
api_router.include_router(auth.router)
api_router.include_router(account.me_router)
api_router.include_router(tours.router)
api_router.include_router(agent.router)
api_router.include_router(zalo.router)
api_router.include_router(dashboard.router)
api_router.include_router(telegram.router)
