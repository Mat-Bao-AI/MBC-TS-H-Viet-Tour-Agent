from fastapi import APIRouter, Depends

from app.api.v1 import account, admin_settings, admin_users, agent, auth, changelog, dashboard, tours, zalo
from app.core.security import get_current_user

# Mọi route trong đây yêu cầu đăng nhập app thật (JWT) — thay require_api_key
# cũ. account.login_router (không cần token) mount riêng ở app/main.py.
# admin_settings.router tự khai báo thêm Depends(require_admin) riêng — chỉ
# Admin, không phải mọi User đăng nhập đều vào được.
api_router = APIRouter(prefix="/api/v1", dependencies=[Depends(get_current_user)])
api_router.include_router(auth.router)
api_router.include_router(account.me_router)
api_router.include_router(account.users_router)
api_router.include_router(tours.router)
api_router.include_router(agent.router)
api_router.include_router(zalo.router)
api_router.include_router(dashboard.router)
api_router.include_router(changelog.router)
api_router.include_router(admin_settings.router)
api_router.include_router(admin_users.router)
